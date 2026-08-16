// Runs SQL against a Supabase project via the Management API
// Usage: node scripts/run-sql.mjs <path-to-sql-file>
// Env:  SUPABASE_PAT (personal access token), PROJECT_REF (project ref)
import { readFileSync } from 'node:fs'

const file = process.argv[2]
if (!file) {
  console.error('Usage: node scripts/run-sql.mjs <sql-file>')
  process.exit(1)
}

const pat = process.env.SUPABASE_PAT
const ref = process.env.PROJECT_REF
if (!pat || !ref) {
  console.error('Missing SUPABASE_PAT or PROJECT_REF env vars')
  process.exit(1)
}

const sql = readFileSync(file, 'utf8').replace(/^\uFEFF/, '')
console.log(`Executing ${sql.length} chars of SQL on project ${ref}...`)

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${pat}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
})

const text = await res.text()
console.log(`HTTP ${res.status}`)
console.log(text.slice(0, 2000))
if (!res.ok) process.exit(1)