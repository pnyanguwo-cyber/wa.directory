#!/usr/bin/env node
/**
 * Backfill product embeddings (migration 034).
 *
 * Existing listings were created before the `embedding` column existed, so
 * photo search can only match them after this runs. Safe to re-run: a product
 * whose text has not changed is skipped.
 *
 * Usage:
 *   node scripts/backfill-embeddings.mjs            # only products with no embedding
 *   node scripts/backfill-embeddings.mjs --all      # re-embed everything (model change)
 *   node scripts/backfill-embeddings.mjs --limit 50 # cap this run
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and
 * GEMINI_API_KEY (in .env.local or the environment).
 */

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

function loadEnv() {
  try {
    const env = readFileSync('.env.local', 'utf8')
    const vars = {}
    for (const line of env.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      vars[trimmed.slice(0, eq)] = trimmed.slice(eq + 1)
    }
    return vars
  } catch {
    return {}
  }
}

const env = { ...process.env, ...loadEnv() }
const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY
const geminiKey = env.GEMINI_API_KEY
const model = env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001'
const dimensions = 768

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
if (!geminiKey) {
  console.error('Missing GEMINI_API_KEY — embeddings are produced by the Gemini embedding model.')
  process.exit(1)
}

const args = process.argv.slice(2)
const all = args.includes('--all')
const limitArg = args.indexOf('--limit')
const limit = limitArg !== -1 ? Number(args[limitArg + 1]) || 0 : 0

const supabase = createClient(url, key)
const PAGE = 100
const CONCURRENCY = 4

const CONDITION_WORDS = {
  new: 'new',
  used: 'used / second-hand',
  refurbished: 'refurbished',
}

// Must match productEmbeddingText() in lib/embeddings.ts, otherwise every run
// would look like a change and re-embed the whole catalogue.
function productEmbeddingText(item) {
  const name = (item.name || '').trim()
  if (!name) return ''
  const lines = [name]
  if (item.brand) lines.push(`Brand: ${item.brand.trim()}`)
  if (item.category) {
    const sub = item.subcategory ? ` / ${item.subcategory.trim()}` : ''
    lines.push(`Category: ${item.category.trim()}${sub}`)
  }
  const condition = CONDITION_WORDS[(item.item_condition || '').toLowerCase()]
  if (condition) lines.push(`Condition: ${condition}`)
  if (item.description) lines.push(item.description.trim())
  return lines.join('\n').slice(0, 8000)
}

function normalize(values) {
  let sum = 0
  for (const v of values) sum += v * v
  const norm = Math.sqrt(sum)
  return norm > 0 ? values.map((v) => v / norm) : values
}

async function embed(text, attempt = 1) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 15000)
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${model}`,
          content: { parts: [{ text }] },
          taskType: 'RETRIEVAL_DOCUMENT',
          outputDimensionality: dimensions,
        }),
        signal: ctrl.signal,
      }
    )
    if (res.status === 429 && attempt <= 3) {
      clearTimeout(timer)
      await new Promise((r) => setTimeout(r, attempt * 2000))
      return embed(text, attempt + 1)
    }
    if (!res.ok) return { error: `HTTP ${res.status}` }
    const data = await res.json()
    const values = data?.embedding?.values
    if (!Array.isArray(values) || values.length !== dimensions) {
      return { error: 'unexpected embedding shape' }
    }
    return { vector: normalize(values) }
  } catch (err) {
    if (attempt <= 2) {
      await new Promise((r) => setTimeout(r, attempt * 1000))
      return embed(text, attempt + 1)
    }
    return { error: String(err?.message || err) }
  } finally {
    clearTimeout(timer)
  }
}

async function fetchPage(from) {
  // `embedding` is deliberately never selected: pgvector returns a long text
  // literal and we only need to know whether it is set.
  let query = supabase
    .from('business_items')
    .select('id, name, description, category, subcategory, brand, item_condition, embedding_text')
    .order('created_at', { ascending: true })
    .range(from, from + PAGE - 1)

  if (!all) query = query.is('embedding', null)

  const { data, error } = await query
  if (error) {
    if (/column .*embedding.* does not exist/i.test(error.message)) {
      console.error('Migration 034 has not been applied yet. Run supabase/migrations/034_product_embeddings.sql first.')
    } else {
      console.error('Query error:', error.message)
    }
    process.exit(1)
  }
  return data || []
}

async function main() {
  console.log(`Backfilling embeddings with ${model} (${dimensions} dims)${all ? ' — all products' : ' — only products missing one'}`)

  let offset = 0
  let embedded = 0
  let skipped = 0
  let failed = 0
  let stop = false

  while (!stop) {
    const rows = await fetchPage(offset)
    if (rows.length === 0) break

    for (let i = 0; i < rows.length; i += CONCURRENCY) {
      const batch = rows.slice(i, i + CONCURRENCY)
      await Promise.all(
        batch.map(async (item) => {
          const text = productEmbeddingText(item)
          if (!text) {
            skipped++
            return
          }
          if (!all && item.embedding_text === text) {
            skipped++
            return
          }

          const result = await embed(text)
          if (result.error) {
            console.log(`  FAIL ${item.name}: ${result.error}`)
            failed++
            return
          }

          const { error } = await supabase
            .from('business_items')
            .update({
              // PostgREST needs pgvector's text form, not a JSON array.
              embedding: JSON.stringify(result.vector),
              embedding_text: text,
              embedding_model: model,
              embedding_updated_at: new Date().toISOString(),
            })
            .eq('id', item.id)

          if (error) {
            console.log(`  FAIL ${item.name}: ${error.message}`)
            failed++
          } else {
            console.log(`  OK   ${item.name}`)
            embedded++
          }
        })
      )
      if (limit && embedded >= limit) {
        stop = true
        break
      }
    }

    offset += rows.length
    if (rows.length < PAGE) break
  }

  console.log(`\nDone: ${embedded} embedded, ${skipped} skipped, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main()
