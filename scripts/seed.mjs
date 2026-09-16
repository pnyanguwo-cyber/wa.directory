import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { readFileSync } from 'fs'

// Seed data uses REAL street addresses (well-known Zimbabwe streets, geocoded
// to plausible lat/lng near those streets) so the /map page has realistic pins
// out of the box — no need to run seed-test-coords.mjs for these rows.
// Re-running is safe: existing rows are only updated when their coordinates
// are not map-verified (i.e. they were fake-jittered or missing).

function loadEnv() {
  const content = readFileSync('.env.local', 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim()
    process.env[key] = val
  }
}

loadEnv()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const businesses = [
  // --- Harare ---
  { name: "John's Plumbing Solutions", slug: "johns-plumbing-solutions", bio: "Reliable plumbing services in Harare. We fix leaks, install pipes, unblock drains.", category: ["Plumbing", "Construction & Renovation"], location: "Harare, Zimbabwe", country_code: "+263", city: "Harare", area: "CBD", phone: "263772123456", whatsapp_username: "johnsplumbing", whatsapp_link: "https://wa.me/263772123456?text=Hi", verified: true, rating: 4.2, review_count: 15, price_range: "$10 - $50", address: "Cnr Robert Mugabe Rd & Mbuya Nehanda St, Harare CBD", lat: -17.8335, lng: 31.0417, address_verified: true },
  { name: "SolarTech Zimbabwe", slug: "solartech-zimbabwe", bio: "Solar panels, inverters, batteries, backup power for homes and businesses.", category: ["Solar & Power", "Electrical"], location: "Harare, Zimbabwe", country_code: "+263", city: "Harare", area: "Borrowdale", phone: "263774345678", whatsapp_username: "solartechzw", whatsapp_link: "https://wa.me/263774345678?text=Hi", verified: true, rating: 4.8, review_count: 42, price_range: "$50 - $500", address: "Shop 12, Sam Levy's Village, Borrowdale Road, Harare", lat: -17.7565, lng: 31.0795, address_verified: true },
  { name: "Tasty Bites Catering", slug: "tasty-bites-catering", bio: "Full-service catering for weddings, corporate events, and parties.", category: ["Catering", "Restaurants & Food"], location: "Harare, Zimbabwe", country_code: "+263", city: "Harare", area: "Mabelreign", phone: "263775456789", whatsapp_username: "tastybites", whatsapp_link: "https://wa.me/263775456789?text=Hi", verified: true, rating: 4.3, review_count: 19, price_range: "$15 - $100", address: "Mabelreign Shopping Centre, Harare", lat: -17.7955, lng: 30.9945, address_verified: true },
  { name: "QuickFix Auto Repairs", slug: "quickfix-auto-repairs", bio: "Engine diagnostics, brake repairs, oil changes, tire fitting, body work.", category: ["Auto Repairs & Mechanics"], location: "Harare, Zimbabwe", country_code: "+263", city: "Harare", area: "Msasa", phone: "263776567890", whatsapp_username: "quickfixautos", whatsapp_link: "https://wa.me/263776567890?text=Hi", verified: true, rating: 4.0, review_count: 33, price_range: "$20 - $200", address: "Stand 12, Mutare Road, Msasa Industrial Area, Harare", lat: -17.8704, lng: 31.1196, address_verified: true },
  { name: "FreshFarm Grocery", slug: "freshfarm-grocery", bio: "Farm-fresh produce delivered. Organic vegetables, fruits, free-range eggs, dairy.", category: ["Restaurants & Food", "Agriculture & Farming"], location: "Harare, Zimbabwe", country_code: "+263", city: "Harare", area: "Greendale", phone: "263777678901", whatsapp_username: "freshfarm", whatsapp_link: "https://wa.me/263777678901?text=Hi", verified: true, rating: 4.6, review_count: 51, price_range: "$10 - $40", address: "Greendale Shopping Centre, Chiremba Road, Harare", lat: -17.848, lng: 31.099, address_verified: true },
  { name: "Elite Real Estate Agency", slug: "elite-real-estate", bio: "Property sales and rentals. Houses, flats, commercial, land.", category: ["Real Estate & Property"], location: "Harare, Zimbabwe", country_code: "+263", city: "Harare", area: "Eastlea", phone: "263778789012", whatsapp_username: "eliterealestate", whatsapp_link: "https://wa.me/263778789012?text=Hi", verified: true, rating: 4.1, review_count: 22, price_range: "$50 - $500", address: "214 Enterprise Road, Eastlea, Harare", lat: -17.817, lng: 31.052, address_verified: true },
  { name: "Bright Smile Dental Clinic", slug: "bright-smile-dental", bio: "Comprehensive dental care. Cleanings, fillings, extractions, braces, whitening.", category: ["Health & Medical"], location: "Harare, Zimbabwe", country_code: "+263", city: "Harare", area: "Avondale", phone: "263779890123", whatsapp_username: "brightsmile", whatsapp_link: "https://wa.me/263779890123?text=Hi", verified: true, rating: 4.7, review_count: 37, price_range: "$20 - $150", address: "Avondale Shopping Centre, Harare", lat: -17.7932, lng: 31.0196, address_verified: true },
  { name: "The Legal Helpline", slug: "the-legal-helpline", bio: "Legal advice. Conveyancing, contracts, family law, debt recovery, business registration.", category: ["Legal & Insurance"], location: "Harare, Zimbabwe", country_code: "+263", city: "Harare", area: "CBD", phone: "263781012345", whatsapp_username: "legalhelpline", whatsapp_link: "https://wa.me/263781012345?text=Hi", verified: true, rating: 4.4, review_count: 25, price_range: "$30 - $200", address: "Cnr Samora Machel Avenue & Julius Nyerere Way, Harare CBD", lat: -17.8302, lng: 31.0438, address_verified: true },
  { name: "Countryside Tours & Travel", slug: "countryside-tours-travel", bio: "Curated Zimbabwe tours. Victoria Falls, Great Zimbabwe, Hwange Safari, Eastern Highlands.", category: ["Travel & Accommodation", "Events & Entertainment"], location: "Harare, Zimbabwe", country_code: "+263", city: "Harare", area: "Belgravia", phone: "263782123456", whatsapp_username: "countrysidezw", whatsapp_link: "https://wa.me/263782123456?text=Hi", verified: true, rating: 4.9, review_count: 63, price_range: "$100 - $500", address: "Cnr Borrowdale Road & Herbert Chitepo Avenue, Belgravia, Harare", lat: -17.804, lng: 31.0555, address_verified: true },
  { name: "EduCentre Tutoring", slug: "educentre-tutoring", bio: "After-school tutoring. Maths, English, Science, exam prep. Small groups and one-on-one.", category: ["Education & Training"], location: "Harare, Zimbabwe", country_code: "+263", city: "Harare", area: "Hatfield", phone: "263783234567", whatsapp_username: "educentre", whatsapp_link: "https://wa.me/263783234567?text=Hi", verified: true, rating: 4.3, review_count: 18, price_range: "$5 - $30", address: "Hatfield Shopping Centre, Seke Road, Harare", lat: -17.8505, lng: 31.0785, address_verified: true },
  { name: "GreenThumb Landscaping", slug: "greenthumb-landscaping", bio: "Garden design, lawn maintenance, tree pruning, irrigation systems.", category: ["Agriculture & Farming"], location: "Harare, Zimbabwe", country_code: "+263", city: "Harare", area: "Mount Pleasant", phone: "263784345678", whatsapp_username: "greenthumb", whatsapp_link: "https://wa.me/263784345678?text=Hi", verified: true, rating: 4.0, review_count: 11, price_range: "$20 - $200", address: "Mount Pleasant Shopping Centre, Harare", lat: -17.759, lng: 31.0295, address_verified: true },
  { name: "Elegant Events Decor", slug: "elegant-events-decor", bio: "Event decoration. Weddings, birthdays, corporate. Decor, seating, lighting, setup.", category: ["Events & Entertainment"], location: "Harare, Zimbabwe", country_code: "+263", city: "Harare", area: "Newlands", phone: "263785456789", whatsapp_username: "elegantevents", whatsapp_link: "https://wa.me/263785456789?text=Hi", verified: true, rating: 4.6, review_count: 31, price_range: "$100 - $500", address: "Newlands Shopping Centre, Harare", lat: -17.8085, lng: 31.077, address_verified: true },
  { name: "Wheels & Deals Motors", slug: "wheels-deals-motors", bio: "Quality used cars. Imported, inspected, financed, 3-month warranty.", category: ["Auto Repairs & Mechanics"], location: "Harare, Zimbabwe", country_code: "+263", city: "Harare", area: "Willowvale", phone: "263786567890", whatsapp_username: "wheelsdeals", whatsapp_link: "https://wa.me/263786567890?text=Hi", verified: true, rating: 3.8, review_count: 45, price_range: "$500 - $5000", address: "Willowvale Road, Willowvale Industrial Area, Harare", lat: -17.888, lng: 31.056, address_verified: true },
  { name: "SafeGuard Insurance Brokers", slug: "safeguard-insurance-brokers", bio: "Vehicle, home, business, life insurance. Top provider comparison.", category: ["Legal & Insurance"], location: "Harare, Zimbabwe", country_code: "+263", city: "Harare", area: "CBD", phone: "263787678901", whatsapp_username: "safeguard", whatsapp_link: "https://wa.me/263787678901?text=Hi", verified: true, rating: 4.2, review_count: 20, price_range: "$10 - $200", address: "Cnr Kwame Nkrumah Avenue & Leopold Takawira St, Harare CBD", lat: -17.8263, lng: 31.0395, address_verified: true },
  { name: "CyberZone Internet Cafe", slug: "cyberzone-internet-cafe", bio: "Printing, scanning, photocopying, internet, computer rentals, passport photos.", category: ["Tech & Phones"], location: "Harare, Zimbabwe", country_code: "+263", city: "Harare", area: "CBD", phone: "263788789012", whatsapp_username: "cyberzone", whatsapp_link: "https://wa.me/263788789012?text=Hi", verified: true, rating: 3.7, review_count: 9, price_range: "$1 - $10", address: "Cnr Speke Avenue & Sam Nujoma St, Harare CBD", lat: -17.8198, lng: 31.0475, address_verified: true },
  { name: "Divine Designs Fashion", slug: "divine-designs-fashion", bio: "Custom tailoring. Traditional and modern outfits, wedding gowns, suits.", category: ["Fashion & Clothing"], location: "Harare, Zimbabwe", country_code: "+263", city: "Harare", area: "Mbare", phone: "263789890123", whatsapp_username: "divinedesigns", whatsapp_link: "https://wa.me/263789890123?text=Hi", verified: true, rating: 4.4, review_count: 26, price_range: "$15 - $100", address: "Mbare Musika Market, Harare", lat: -17.8842, lng: 31.0498, address_verified: true },
  { name: "All Hours Pharmacy", slug: "all-hours-pharmacy", bio: "24-hour pharmacy. Prescriptions, OTC, supplements, baby care. Free CBD delivery.", category: ["Health & Medical"], location: "Harare, Zimbabwe", country_code: "+263", city: "Harare", area: "Avenues", phone: "263790901234", whatsapp_username: "allhourspharm", whatsapp_link: "https://wa.me/263790901234?text=Hi", verified: true, rating: 4.1, review_count: 17, price_range: "$2 - $50", address: "Cnr Baines Avenue & Fifth Street, Avenues, Harare", lat: -17.8238, lng: 31.048, address_verified: true },
  { name: "Prime Properties Furnishers", slug: "prime-properties-furnishers", bio: "Home and office furniture. Sofas, beds, tables, cabinets. Nationwide delivery.", category: ["Furniture & Home"], location: "Harare, Zimbabwe", country_code: "+263", city: "Harare", area: "Glen View", phone: "263791012345", whatsapp_username: "primeprops", whatsapp_link: "https://wa.me/263791012345?text=Hi", verified: true, rating: 4.0, review_count: 13, price_range: "$30 - $300", address: "Glen View 8 Shopping Centre, Harare", lat: -17.9095, lng: 30.986, address_verified: true },
  // --- Bulawayo ---
  { name: "Glamour Cuts Salon", slug: "glamour-cuts-salon", bio: "Premium unisex hair salon. Braiding, styling, barber cuts, weaves, nail art.", category: ["Salons & Spas"], location: "Bulawayo, Zimbabwe", country_code: "+263", city: "Bulawayo", area: "City Centre", phone: "263773234567", whatsapp_username: "glamourcuts", whatsapp_link: "https://wa.me/263773234567?text=Hi", verified: true, rating: 4.5, review_count: 28, price_range: "$5 - $30", address: "Fife Street, Bulawayo CBD", lat: -20.1552, lng: 28.5836, address_verified: true },
  { name: "KwikAirtime & Phone Repairs", slug: "kwikairtime-phone-repairs", bio: "Airtime, data, phone repairs. Cracked screens, battery swaps, accessories.", category: ["Tech & Phones", "Mobile & Accessories"], location: "Bulawayo, Zimbabwe", country_code: "+263", city: "Bulawayo", area: "Nkulumane", phone: "263780901234", whatsapp_username: "kwikairtime", whatsapp_link: "https://wa.me/263780901234?text=Hi", verified: true, rating: 3.9, review_count: 14, price_range: "$5 - $80", address: "Nkulumane 12 Shopping Centre, Bulawayo", lat: -20.1769, lng: 28.6102, address_verified: true },
  // --- Chinhoyi ---
  { name: "Chinhoyi Hardware & Timber", slug: "chinhoyi-hardware-timber", bio: "Building materials, timber, hardware, paint, and roofing supplies in Chinhoyi.", category: ["Construction & Renovation"], location: "Chinhoyi, Zimbabwe", country_code: "+263", city: "Chinhoyi", area: "Chinhoyi CBD", phone: "263772345678", whatsapp_username: "chinhoyihardware", whatsapp_link: "https://wa.me/263772345678?text=Hi", verified: true, rating: 4.3, review_count: 12, price_range: "$20 - $500", address: "468 Magamba Way, Chinhoyi CBD", lat: -17.3654, lng: 30.2006, address_verified: true },
  { name: "Magamba Internet Café", slug: "magamba-internet-cafe", bio: "Internet, printing, photocopying, CV typing, and online applications in Chinhoyi CBD.", category: ["Tech & Phones"], location: "Chinhoyi, Zimbabwe", country_code: "+263", city: "Chinhoyi", area: "Chinhoyi CBD", phone: "263773456789", whatsapp_username: "magambacyber", whatsapp_link: "https://wa.me/263773456789?text=Hi", verified: true, rating: 3.9, review_count: 8, price_range: "$1 - $10", address: "10A Magamba Way, Chinhoyi CBD", lat: -17.3648, lng: 30.2001, address_verified: true },
  { name: "Chinhoyi Auto Spares", slug: "chinhoyi-auto-spares", bio: "Genuine spares and accessories for all makes. Batteries, tyres, oil filters.", category: ["Auto Repairs & Mechanics"], location: "Chinhoyi, Zimbabwe", country_code: "+263", city: "Chinhoyi", area: "Chinhoyi CBD", phone: "263774567891", whatsapp_username: "chinhoyiautospares", whatsapp_link: "https://wa.me/263774567891?text=Hi", verified: true, rating: 4.1, review_count: 15, price_range: "$10 - $200", address: "Cnr Robert Mugabe Way & Fifth Street, Chinhoyi CBD", lat: -17.3676, lng: 30.1992, address_verified: true },
  { name: "Mukuyu Family Pharmacy", slug: "mukuyu-family-pharmacy", bio: "Community pharmacy in Mukuyu. Prescriptions, OTC medicines, baby care, supplements.", category: ["Health & Medical"], location: "Chinhoyi, Zimbabwe", country_code: "+263", city: "Chinhoyi", area: "Mukuyu", phone: "263775678902", whatsapp_username: "mukuyupharmacy", whatsapp_link: "https://wa.me/263775678902?text=Hi", verified: true, rating: 4.6, review_count: 21, price_range: "$2 - $50", address: "Mukuyu Shopping Centre, Chinhoyi", lat: -17.3748, lng: 30.1936, address_verified: true },
  // --- Gweru ---
  { name: "Midlands Auto Spares", slug: "midlands-auto-spares", bio: "Vehicle spares and servicing in the heart of Gweru. Engines, brakes, suspensions.", category: ["Auto Repairs & Mechanics"], location: "Gweru, Zimbabwe", country_code: "+263", city: "Gweru", area: "Gweru CBD", phone: "263776789013", whatsapp_username: "midlandsautos", whatsapp_link: "https://wa.me/263776789013?text=Hi", verified: true, rating: 4.2, review_count: 18, price_range: "$10 - $300", address: "36 Robert Mugabe Way, Gweru CBD", lat: -19.4506, lng: 29.8163, address_verified: true },
  { name: "Senga Solar & Electricals", slug: "senga-solar-electricals", bio: "Solar installations, inverters, batteries, and electrical fittings across the Midlands.", category: ["Solar & Power", "Electrical"], location: "Gweru, Zimbabwe", country_code: "+263", city: "Gweru", area: "Senga", phone: "263777890124", whatsapp_username: "sengasolar", whatsapp_link: "https://wa.me/263777890124?text=Hi", verified: true, rating: 4.7, review_count: 26, price_range: "$50 - $800", address: "Senga Shopping Centre, Gweru", lat: -19.4318, lng: 29.8074, address_verified: true },
  { name: "Gweru Legal Chambers", slug: "gweru-legal-chambers", bio: "Legal advice and representation in Gweru. Contracts, family law, estates, conveyancing.", category: ["Legal & Insurance"], location: "Gweru, Zimbabwe", country_code: "+263", city: "Gweru", area: "Gweru CBD", phone: "263778901235", whatsapp_username: "gwerulegal", whatsapp_link: "https://wa.me/263778901235?text=Hi", verified: true, rating: 4.5, review_count: 14, price_range: "$30 - $250", address: "Cnr Robert Mugabe Way & 7th Street, Gweru CBD", lat: -19.4499, lng: 29.8171, address_verified: true },
  { name: "Mkoba Tech Repairs", slug: "mkoba-tech-repairs", bio: "Phone and laptop repairs in Mkoba. Screens, batteries, software, accessories.", category: ["Tech & Phones", "Mobile & Accessories"], location: "Gweru, Zimbabwe", country_code: "+263", city: "Gweru", area: "Mkoba 4", phone: "263779012346", whatsapp_username: "mkobatech", whatsapp_link: "https://wa.me/263779012346?text=Hi", verified: true, rating: 4.0, review_count: 10, price_range: "$5 - $80", address: "Mkoba 4 Shopping Centre, Gweru", lat: -19.4685, lng: 29.8267, address_verified: true },
  { name: "Ascot Guest Lodge", slug: "ascot-guest-lodge", bio: "Comfortable budget accommodation in Gweru. Clean rooms, secure parking, breakfast.", category: ["Travel & Accommodation"], location: "Gweru, Zimbabwe", country_code: "+263", city: "Gweru", area: "Ascot", phone: "263782345678", whatsapp_username: "ascotlodgegweru", whatsapp_link: "https://wa.me/263782345678?text=Hi", verified: true, rating: 4.4, review_count: 19, price_range: "$30 - $120", address: "8 Ascot Avenue, Gweru", lat: -19.4423, lng: 29.8089, address_verified: true },
]

let inserted = 0, updated = 0, skipped = 0

for (const b of businesses) {
  const { data: existing } = await supabase
    .from('businesses')
    .select('id, lat, address_verified')
    .eq('slug', b.slug)
    .maybeSingle()

  if (existing) {
    // Backfill the real address + coords onto rows seeded before addresses
    // existed — but never overwrite a genuinely map-verified address.
    if (b.lat && existing.address_verified !== true) {
      const { error } = await supabase
        .from('businesses')
        .update({ address: b.address, lat: b.lat, lng: b.lng, address_verified: true })
        .eq('id', existing.id)
      if (error) {
        console.log(`FAIL update ${b.slug}: ${error.message}`)
      } else {
        console.log(`UPD  ${b.slug} (+address/coords)`)
        updated++
      }
    } else {
      console.log(`SKIP ${b.slug}`)
      skipped++
    }
    continue
  }

  const { error } = await supabase.from('businesses').insert({
    ...b,
    edit_token: randomUUID(),
  })

  if (error) {
    console.log(`FAIL ${b.slug}: ${error.message}`)
  } else {
    console.log(`OK   ${b.name}`)
    inserted++
  }
}

const { count } = await supabase
  .from('businesses')
  .select('*', { count: 'exact', head: true })

console.log(`\nDone: ${inserted} inserted, ${updated} updated, ${skipped} skipped, ${count} total`)
