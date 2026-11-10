import 'dotenv/config'
import path from 'path'
import { config } from 'dotenv'

// Load .env.local before tests
config({ path: path.resolve(__dirname, '../.env.local') })

// Verify env vars loaded
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('NEXT_PUBLIC_SUPABASE_URL not found in .env.local')
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY not found in .env.local')
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY not found in .env.local')
}