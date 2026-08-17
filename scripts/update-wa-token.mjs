import { readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const token = process.argv[2]
if (!token || token.length < 100) {
  console.error('Usage: node scripts/update-wa-token.mjs <WHATSAPP_ACCESS_TOKEN>')
  process.exit(1)
}

const projectId = 'prj_41iK4P040DRTLKaWNcFPudFVGCbY'
const authPath = join(process.env.APPDATA, 'xdg.data', 'com.vercel.cli', 'auth.json')
const { token: vercelToken } = JSON.parse(readFileSync(authPath, 'utf8'))
const headers = { Authorization: `Bearer ${vercelToken}`, 'Content-Type': 'application/json' }

const envs = (await (await fetch(`https://api.vercel.com/v9/projects/${projectId}/env`, { headers })).json()).envs
const existing = envs.find((e) => e.key === 'WHATSAPP_ACCESS_TOKEN')
if (existing) {
  await fetch(`https://api.vercel.com/v9/projects/${projectId}/env/${existing.id}`, { method: 'DELETE', headers })
  console.log('removed old token from Vercel')
}
const body = { key: 'WHATSAPP_ACCESS_TOKEN', value: token, type: 'sensitive', target: ['production', 'preview'] }
const res = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env`, { method: 'POST', headers, body: JSON.stringify(body) })
if (!res.ok) {
  console.error('Vercel env update failed:', res.status, await res.text())
  process.exit(1)
}
console.log('added new token to Vercel')

const envPath = join(process.cwd(), '.env.local')
let content = readFileSync(envPath, 'utf8')
content = content.replace(/^WHATSAPP_ACCESS_TOKEN=.*$/m, `WHATSAPP_ACCESS_TOKEN=${token}`)
writeFileSync(envPath, content)
console.log('updated .env.local')

console.log('DONE - run: vercel deploy --prod --yes')