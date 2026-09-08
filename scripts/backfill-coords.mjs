#!/usr/bin/env node
/**
 * Backfill lat/lng for existing businesses based on their city field.
 * Uses city-center coordinates with small random offsets so markers
 * in the same city don't stack on top of each other.
 *
 * Usage: node scripts/backfill-coords.mjs
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

// Parse .env.local manually (no dotenv dependency)
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

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, key)

// Zimbabwe city center coordinates (lat, lng)
const CITY_COORDS = {
  'harare': [-17.8252, 31.0335],
  'bulawayo': [-20.1325, 28.5803],
  'chitungwiza': [-17.9911, 31.0486],
  'mutare': [-18.9689, 32.6276],
  'gweru': [-19.4500, 29.8167],
  'kwekwe': [-18.9286, 29.8149],
  'kadoma': [-18.3364, 29.9172],
  'masvingo': [-20.0623, 30.8564],
  'chinhoyi': [-17.3667, 30.2000],
  'bindura': [-17.3000, 31.3333],
  'chegutu': [-18.1333, 30.1500],
  'marondera': [-18.1853, 31.5519],
  'victoria falls': [-17.9243, 25.8572],
  'victoriafalls': [-17.9243, 25.8572],
  'kariba': [-16.5200, 28.8000],
  'zvishavane': [-20.3333, 30.0333],
  'hwange': [-18.3667, 26.5000],
  'norton': [-17.8833, 30.7000],
  'rusape': [-18.5333, 32.1333],
  'beitbridge': [-22.2167, 30.0000],
  'chiredzi': [-21.0500, 31.6667],
  'lupane': [-18.9333, 27.8000],
  'gwanda': [-20.9333, 29.0000],
  'plumtree': [-20.4833, 27.8167],
  'chipinge': [-20.2000, 32.6167],
  'shurugwi': [-19.6667, 30.0000],
  'nyanga': [-18.2167, 32.7333],
  'ruwa': [-17.8833, 31.2500],
  'redcliff': [-18.0333, 29.9500],
  'buhera': [-19.3667, 31.8667],
  'chimanimani': [-19.8000, 32.8667],
  'mutasa': [-18.5833, 32.7167],
  'centenary': [-16.7333, 31.1167],
  'guruve': [-16.5833, 30.6333],
  'mazowe': [-17.5167, 30.9833],
  'mt darwin': [-16.7833, 31.5833],
  'mtdarwin': [-16.7833, 31.5833],
  'rushinga': [-16.5167, 32.1500],
  'shamva': [-17.3167, 31.5833],
  'chikomba': [-18.8167, 31.0667],
  'goromonzi': [-17.8167, 31.2167],
  'mudzi': [-17.2000, 32.5333],
  'murehwa': [-17.6500, 31.7833],
  'uzumba-maramba-pfungwe': [-17.3667, 31.9167],
  'uzumba': [-17.3667, 31.9167],
  'wedza': [-19.0833, 31.4667],
  'hurungwe': [-16.4333, 29.5333],
  'makonde': [-17.0667, 29.8833],
  'zvimba': [-17.4167, 29.9167],
  'bikita': [-20.1333, 31.9333],
  'chivi': [-20.5667, 30.7167],
  'gutu': [-19.6333, 31.0833],
  'mwenezi': [-21.1833, 31.5333],
  'zaka': [-21.2333, 31.4833],
  'binga': [-17.6167, 27.9667],
  'bubi': [-19.5333, 28.7500],
  'nkayi': [-19.0333, 28.8833],
  'tsholotsho': [-19.7667, 27.7500],
  'umguza': [-19.8500, 28.5167],
  'bulilima': [-20.3500, 27.6333],
  'insiza': [-20.2833, 29.2167],
  'mangwe': [-21.1167, 27.7500],
  'matobo': [-20.7167, 28.8833],
  'umzingwane': [-20.8667, 28.9167],
  'chirumhanzu': [-19.6167, 30.4667],
  'gokwe north': [-18.1333, 28.8833],
  'gokwe south': [-18.2667, 28.9333],
  'mberengwa': [-20.6333, 30.0667],
}

// Random offset within ~2km (≈0.018 degrees)
function randomOffset() {
  return (Math.random() - 0.5) * 0.036
}

async function main() {
  console.log('Fetching businesses without coordinates...')

  const { data: businesses, error } = await supabase
    .from('businesses')
    .select('id, name, city')
    .or('lat.is.null,lng.is.null')

  if (error) {
    console.error('Query error:', error.message)
    process.exit(1)
  }

  if (!businesses || businesses.length === 0) {
    console.log('All businesses already have coordinates. Nothing to do.')
    return
  }

  console.log(`Found ${businesses.length} businesses without coordinates.`)

  let updated = 0
  let skipped = 0

  for (const b of businesses) {
    const cityKey = (b.city || '').toLowerCase().trim()
    const coords = CITY_COORDS[cityKey]

    if (!coords) {
      console.log(`  ⏭ ${b.name} — unknown city "${b.city}", skipping`)
      skipped++
      continue
    }

    const lat = coords[0] + randomOffset()
    const lng = coords[1] + randomOffset()

    const { error: updateError } = await supabase
      .from('businesses')
      .update({ lat, lng })
      .eq('id', b.id)

    if (updateError) {
      console.error(`  ❌ ${b.name} — update failed: ${updateError.message}`)
    } else {
      console.log(`  ✅ ${b.name} — ${b.city} → ${lat.toFixed(4)}, ${lng.toFixed(4)}`)
      updated++
    }
  }

  console.log(`\nDone! Updated: ${updated}, Skipped: ${skipped}`)
}

main()
