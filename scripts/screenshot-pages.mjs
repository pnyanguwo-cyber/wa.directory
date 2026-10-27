// Temporary helper: screenshot every public page on the local dev server.
// Usage: node scripts/screenshot-pages.mjs [baseUrl]
// Output: screenshots/<name>.png
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const BASE = process.argv[2] || 'http://localhost:3001'
const OUT = join(here, '..', 'screenshots')
mkdirSync(OUT, { recursive: true })

const BIZ = 'msasa-motors-service-centre'

// 1 screenshot per unique page; dynamic collections get one example each.
const pages = [
  { path: '/', name: '01-home' },
  { path: '/list', name: '02-list' },
  { path: '/yellow-pages', name: '03-yellow-pages' },
  { path: '/categories', name: '04-categories' },
  { path: '/category/plumber-harare', name: '05-category-plumber-harare' },
  { path: '/map', name: '06-map' },
  { path: '/search', name: '07-search' },
  { path: '/login', name: '08-login' },
  { path: '/admin-login', name: '09-admin-login' },
  { path: `/business/${BIZ}`, name: '10-business-profile' },
  { path: `/my-qr/${BIZ}`, name: '11-my-qr' },
  { path: '/account-setup', name: '12-account-setup' },
  { path: '/edit', name: '13-edit' },
  { path: '/pay', name: '14-pay' },
  { path: '/admin', name: '15-admin' },
  { path: '/portal', name: '16-portal-overview' },
  { path: '/portal/billing', name: '17-portal-billing' },
  { path: '/portal/branches', name: '18-portal-branches' },
  { path: '/portal/card', name: '19-portal-card' },
  { path: '/portal/conversations', name: '20-portal-conversations' },
  { path: '/portal/improve', name: '21-portal-improve' },
  { path: '/portal/ranking', name: '22-portal-ranking' },
  { path: '/portal/shop', name: '23-portal-shop' },
  { path: '/portal/site', name: '24-portal-site' },
]

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await context.newPage()

const results = []
for (const { path, name } of pages) {
  const started = Date.now()
  try {
    await page.goto(BASE + path, { waitUntil: 'load', timeout: 60000 })
    // Let the route finish hydrating; dev compiles on first hit.
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    await page.evaluate(() => document.fonts.ready).catch(() => {})

    // Scroll through the page so scroll-triggered Reveal components fire,
    // then back to top before capturing.
    await page.evaluate(async () => {
      const step = window.innerHeight
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y)
        await new Promise(r => setTimeout(r, 60))
      }
      window.scrollTo(0, 0)
      await new Promise(r => setTimeout(r, 300))
    })

    await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true })
    results.push(`OK    ${name}  (${((Date.now() - started) / 1000).toFixed(1)}s)`)
  } catch (err) {
    results.push(`FAIL  ${name}  ${String(err).split('\n')[0].slice(0, 120)}`)
  }
}

console.log(results.join('\n'))
const failed = results.filter(r => r.startsWith('FAIL')).length
console.log(`\n${results.length - failed} saved, ${failed} failed -> ${OUT}`)
await browser.close()
process.exit(0)
