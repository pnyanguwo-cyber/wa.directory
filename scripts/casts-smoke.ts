// Regression checks for the cast command parser (pure logic only — no DB,
// no env needed). Run: npx -y tsx scripts/casts-smoke.ts
import { parseCastSpec, scheduledForIso, type CastSpec } from '../lib/casts'

let passed = 0
let failed = 0
function ok(cond: boolean, label: string, extra?: unknown) {
  if (cond) {
    passed++
    console.log(`OK   ${label}`)
  } else {
    failed++
    console.log(`FAIL ${label}${extra !== undefined ? ` (got: ${JSON.stringify(extra)})` : ''}`)
  }
}

const specOf = (arg: string): CastSpec | null => parseCastSpec(arg).spec

// 1 — plain broadcast
{
  const s = specOf('Good morning Zimbabwe!')
  ok(!!s, 'plain cast parses')
  ok(s?.segment === 'all' && !s?.filter, 'plain cast: everyone, no filter')
  ok(s?.body === 'Good morning Zimbabwe!', 'plain cast body kept', s?.body)
}

// 2 — segment keyword is not eaten from the body
{
  const s = specOf('owners Big restock today!')
  ok(s?.segment === 'owners', 'owners segment', s?.segment)
  ok(s?.filter === '', 'no filter for non-city word', s?.filter)
  ok(s?.body === 'Big restock today!', 'body keeps "Big restock today!"', s?.body)
}

// 3 — city filter
{
  const s = specOf('owners harare Big restock today!')
  ok(s?.segment === 'owners' && s?.filter === 'harare', 'city filter captured', s?.filter)
  ok(s?.body === 'Big restock today!', 'body after city filter', s?.body)
}

// 4 — category filter (keyword hit)
{
  const s = specOf('owners jewellery diamonds sale')
  ok(s?.filter === 'jewellery', 'category filter captured', s?.filter)
  ok(s?.body === 'diamonds sale', 'body after category filter', s?.body)
}

// 5 — buyers segment
{
  const s = specOf('buyers New shops this week!')
  ok(s?.segment === 'buyers' && s?.body === 'New shops this week!', 'buyers segment parses')
}

// 6 — scheduling
{
  const s = specOf('owners today 15:30 Come to our stand')
  ok(!!s?.scheduledFor, 'today schedule parses', s?.scheduledFor)
  ok(s?.body === 'Come to our stand', 'scheduled body', s?.body)
  ok(s?.filter === '', 'no filter on scheduled cast')
}
{
  const s = specOf('buyers tomorrow 9am Flash deals')
  const iso = s?.scheduledFor || ''
  const d = new Date(iso)
  ok(d.getUTCHours() === 7 && d.getUTCMinutes() === 0, 'tomorrow 9am Harare → 07:00 UTC', iso)
  ok(s?.body === 'Flash deals', 'scheduled body kept')
}
{
  const s = specOf('owners harare today 9am Shop tours')
  ok(s?.filter === 'harare' && !!s?.scheduledFor && s?.body === 'Shop tours', 'filter + schedule combo', s)
}
{
  const s = specOf('owners today')
  ok(!s, 'bare schedule keyword rejected')
}
{
  const s = specOf('owners today 25:00 x')
  ok(!s, 'invalid hour rejected')
}

// 7 — scheduledForIso conversions
{
  const iso = scheduledForIso('today', 16, 30)
  const d = new Date(iso)
  ok(d.getUTCHours() === 14 && d.getUTCMinutes() === 30, '16:30 Harare → 14:30 UTC', iso)
}
{
  const iso = scheduledForIso('tomorrow', 12, 0, 'pm')
  const d = new Date(iso)
  ok(d.getUTCHours() === 10, '12pm Harare → 10:00 UTC', iso)
}
{
  const iso = scheduledForIso('tomorrow', 8, 0, 'am')
  const d = new Date(iso)
  ok(d.getUTCHours() === 6, '8am Harare → 06:00 UTC', iso)
}

// 8 — am/pm single hours, minutes with dot
{
  const s = specOf('owners today 9.30pm Night market')
  const iso = s?.scheduledFor || ''
  const d = new Date(iso)
  ok(d.getUTCHours() === 19 && d.getUTCMinutes() === 30, '9.30pm → 19:30 UTC', iso)
}

// 9 — empty input
{
  ok(!specOf(''), 'empty cast errors')
}

console.log(`\n${failed === 0 ? 'all green' : `${failed} failing`}`)
process.exit(failed === 0 ? 0 : 1)
