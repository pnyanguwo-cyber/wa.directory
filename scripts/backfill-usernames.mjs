import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_NEW_URL
const key = process.env.SUPABASE_NEW_KEY

if (!url || !key) {
  console.error('Missing env: SUPABASE_NEW_URL, SUPABASE_NEW_KEY')
  process.exit(1)
}

const usernames = {
  'johns-plumbing-solutions': 'johnsplumbing',
  'glamour-cuts-salon': 'glamourcuts',
  'solartech-zimbabwe': 'solartechzw',
  'tasty-bites-catering': 'tastybites',
  'quickfix-auto-repairs': 'quickfixautos',
  'freshfarm-grocery': 'freshfarm',
  'elite-real-estate': 'eliterealestate',
  'bright-smile-dental': 'brightsmile',
  'kwikairtime-phone-repairs': 'kwikairtime',
  'the-legal-helpline': 'legalhelpline',
  'countryside-tours-travel': 'countrysidezw',
  'educentre-tutoring': 'educentre',
  'greenthumb-landscaping': 'greenthumb',
  'elegant-events-decor': 'elegantevents',
  'wheels-deals-motors': 'wheelsdeals',
  'safeguard-insurance-brokers': 'safeguard',
  'cyberzone-internet-cafe': 'cyberzone',
  'divine-designs-fashion': 'divinedesigns',
  'all-hours-pharmacy': 'allhourspharm',
  'prime-properties-furnishers': 'primeprops',
}

const supabase = createClient(url, key)

let updated = 0
let failed = 0

for (const [slug, username] of Object.entries(usernames)) {
  const { error } = await supabase
    .from('businesses')
    .update({ whatsapp_username: username })
    .eq('slug', slug)
    .or('whatsapp_username.is.null,whatsapp_username.eq.')

  if (error) {
    console.log(`  FAIL ${slug}: ${error.message}`)
    failed++
  } else {
    console.log(`  OK   ${slug} -> @${username}`)
    updated++
  }
}

console.log(`\nDone: ${updated} updated, ${failed} failed`)
if (failed > 0) process.exit(1)