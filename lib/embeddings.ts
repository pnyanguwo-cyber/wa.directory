import { getSupabase } from '@/lib/supabase-server'

/**
 * Product embeddings (migration 034).
 *
 * A product is embedded from its own text, and a customer's photo is embedded
 * from the vision model's description of that photo. Both land in the same
 * vector space, so "red leather handbag" from a picture can match a listing
 * called "Ladies tote" without a single shared keyword.
 *
 * Everything here is optional by design: with no API key, or before 034 is
 * applied, every function returns null/false and callers fall back to the
 * existing keyword search. Search must never break because embeddings are
 * unavailable.
 */

export const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001'
// Matches business_items.embedding vector(768). gemini-embedding-001 is trained
// with Matryoshka truncation, so 768 keeps almost all retrieval quality at a
// quarter of the storage.
export const EMBEDDING_DIMENSIONS = 768

// Cosine similarity floor for a semantic hit.
//
// Calibrated against gemini-embedding-001 (768d), not guessed: a photo of a
// leather handbag scored 0.78 against a "Brown leather ladies bag" listing but
// 0.52-0.56 against a gas stove, an iPhone and a birthday cake. Unrelated retail
// text sits high in this space, so the floor has to be well above 0.55 or every
// product matches every photo. Raise it with a labelled set before lowering it.
export const SEMANTIC_MIN_SIMILARITY = 0.7

const EMBEDDING_TIMEOUT_MS = 10_000

export type EmbeddingTaskType = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY' | 'SEMANTIC_SIMILARITY'

export function hasEmbeddingKey(): boolean {
  return !!process.env.GEMINI_API_KEY
}

/** Truncated embeddings must be re-normalised before cosine distance is meaningful. */
function l2Normalize(values: number[]): number[] {
  let sum = 0
  for (const v of values) sum += v * v
  const norm = Math.sqrt(sum)
  if (!Number.isFinite(norm) || norm === 0) return values
  return values.map((v) => v / norm)
}

/**
 * Embeds one piece of text. Returns null on any transport, timeout, shape or
 * key problem so the caller can degrade to keyword search.
 */
export async function embedText(text: string, taskType: EmbeddingTaskType = 'SEMANTIC_SIMILARITY'): Promise<number[] | null> {
  const trimmed = text.trim().slice(0, 8_000)
  if (!trimmed || !hasEmbeddingKey()) return null

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), EMBEDDING_TIMEOUT_MS)
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${EMBEDDING_MODEL}`,
          content: { parts: [{ text: trimmed }] },
          taskType,
          outputDimensionality: EMBEDDING_DIMENSIONS,
        }),
        signal: ctrl.signal,
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    const values = data?.embedding?.values
    if (!Array.isArray(values) || values.length !== EMBEDDING_DIMENSIONS) return null
    const numbers = values.map((v: unknown) => Number(v))
    if (numbers.some((n: number) => !Number.isFinite(n))) return null
    return l2Normalize(numbers)
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

interface EmbeddableItem {
  name: string
  description?: string | null
  category?: string | null
  subcategory?: string | null
  brand?: string | null
  item_condition?: string | null
}

const CONDITION_WORDS: Record<string, string> = {
  new: 'new',
  used: 'used / second-hand',
  refurbished: 'refurbished',
}

/**
 * The text a product is embedded from. Deliberately factual and free of price,
 * seller name and stock state: those change constantly and must not move the
 * vector. Order is name first because it carries the most signal.
 */
export function productEmbeddingText(item: EmbeddableItem): string {
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
  return lines.join('\n').slice(0, 8_000)
}

/**
 * Re-embeds one product when its text changed. Called after a product write, so
 * "similar items" never points at stale copy. Never throws: a failed embedding
 * must not fail the seller's save.
 */
export async function syncProductEmbedding(itemId: string): Promise<boolean> {
  if (!hasEmbeddingKey() || !itemId) return false
  const supabase = getSupabase()

  const { data: item, error } = await supabase
    .from('business_items')
    .select('id, name, description, category, subcategory, brand, item_condition, embedding_text')
    .eq('id', itemId)
    .maybeSingle()

  // A missing column means migration 034 has not been applied yet.
  if (error || !item) return false

  const text = productEmbeddingText(item as EmbeddableItem)
  if (!text) return false
  if ((item as { embedding_text?: string }).embedding_text === text) return true

  const vector = await embedText(text, 'RETRIEVAL_DOCUMENT')
  if (!vector) return false

  const { error: writeError } = await supabase
    .from('business_items')
    .update({
      // pgvector accepts its text form; supabase-js would otherwise send a JSON
      // array and PostgREST would reject it for type `vector`.
      embedding: JSON.stringify(vector),
      embedding_text: text,
      embedding_model: EMBEDDING_MODEL,
      embedding_updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)

  if (writeError) {
    console.error('[embeddings] product update failed:', writeError.message)
    return false
  }
  return true
}

export interface SemanticMatch {
  id: string
  similarity: number
}

/**
 * Nearest products to an embedding, already filtered to discoverable listings
 * by match_business_items(). Returns null when semantic search is unavailable
 * (no key, no migration), which is different from "nothing matched".
 */
export async function matchProductsByEmbedding(
  embedding: number[],
  options: { limit?: number; minSimilarity?: number; category?: string } = {}
): Promise<SemanticMatch[] | null> {
  if (!embedding?.length) return null
  const { data, error } = await getSupabase().rpc('match_business_items', {
    p_embedding: JSON.stringify(embedding),
    p_match_count: Math.min(Math.max(options.limit ?? 24, 1), 100),
    p_min_similarity: options.minSimilarity ?? SEMANTIC_MIN_SIMILARITY,
    p_category: options.category || null,
  })

  if (error) {
    // Missing function = 034 not applied. Logged once per call, not thrown.
    console.error('[embeddings] match failed:', error.message)
    return null
  }
  return (data as SemanticMatch[] | null) || []
}

/** Embeds a search phrase or a photo description, then matches products. */
export async function matchProductsByText(
  text: string,
  options: { limit?: number; minSimilarity?: number; category?: string } = {}
): Promise<SemanticMatch[] | null> {
  const trimmed = text.trim()
  if (!trimmed) return []
  const embedding = await embedText(trimmed, 'RETRIEVAL_QUERY')
  if (!embedding) return null
  return matchProductsByEmbedding(embedding, options)
}
