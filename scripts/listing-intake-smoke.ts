import {
  parseListingMessage,
  isSinglePriceRange,
  renderListingForm,
  missingRequired,
} from '../lib/listing-intake'
import { bestNameSimilarity } from '../lib/admin-verify'

// Regression smoke for the WhatsApp listing intake (run: npx tsx scripts/listing-intake-smoke.ts)

let failed = 0
function ok(cond: boolean, label: string, extra = '') {
  if (cond) console.log(`OK   ${label}`)
  else {
    failed++
    console.log(`FAIL ${label}${extra ? ` — ${extra}` : ''}`)
  }
}

// 1) The exact message that went wrong in production.
const MSG = [
  'Name Diamond tradings',
  'Category jewellery',
  'City : whole country',
  'Phone 263773791864',
  'I sell diamong jewellery origina',
  'Price 100- 200',
].join('\n')

const { state: s } = parseListingMessage(MSG, '263773791864')
ok(s.name === 'Diamond tradings', `label "Name" stripped from name (got: ${s.name})`)
ok(!!s.categories?.includes('Jewelry'), `Jewelry detected (got: ${s.categories?.join(', ')})`)
ok(!s.categories?.includes('Real Estate'), `no Real Estate over-match (got: ${s.categories?.join(', ')})`)
ok(s.whole_country === true && s.city === undefined, `whole country captured (city: ${s.city})`)
ok(s.phone === '263773791864', `phone normalized (got: ${s.phone})`)
ok(s.price_range === '$100 - $200', `price range parsed (got: ${s.price_range})`)
ok(!!s.description && s.description.toLowerCase().includes('jewel'), `description kept (got: ${s.description})`)

// 2) Single price → needs the range prompt.
const single = parseListingMessage('Price 100', '263773791864').state
ok(isSinglePriceRange(single.price_range), `single price detected (got: ${single.price_range})`)

// 3) Catalog link, labeled and bare.
const cat = parseListingMessage('Catalog: wa.me/c/263771234567', '263773791864').state
ok(cat.catalog === 'https://wa.me/c/263771234567', `catalog normalized (got: ${cat.catalog})`)
const cat2 = parseListingMessage('Visit us, catalog wa.me/c/263771234567, City Harare', '263773791864').state
ok(cat2.catalog === 'https://wa.me/c/263771234567', `catalog found in compound line (got: ${cat2.catalog})`)
ok(cat2.city === 'Harare', `city still parsed in compound line (got: ${cat2.city})`)

// 4) Fuzzy admin name matching.
ok(bestNameSimilarity('diamond tradngs', 'Diamond tradings') >= 0.8, 'typo still matches (0.8+)')
ok(bestNameSimilarity('diamond trading', 'Diamond Tradings') >= 0.8, 'near-equal names score high')
ok(bestNameSimilarity('diamond tradings', 'Diamond Tradings') === 1, 'normalized equality')
ok(bestNameSimilarity('bread', "Mbuya's Kitchen") < 0.5, 'unrelated names score low')

// 5) Card + gating sanity.
ok(renderListingForm(s, '263773791864').includes('/10 ready'), 'card counts 10 fields')
const empty = parseListingMessage('', '263773791864').state
ok(JSON.stringify(missingRequired(empty)) === JSON.stringify(['name', 'category', 'phone']), 'mandatory set')

if (failed) {
  console.log(`\n${failed} failing`)
  process.exit(1)
}
console.log('\nall green')
