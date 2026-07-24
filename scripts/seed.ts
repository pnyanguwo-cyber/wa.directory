import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const businesses = [
  { name: "John's Plumbing Solutions", slug: "johns-plumbing-solutions", bio: "Reliable plumbing services in Harare. We fix leaks, install pipes, unblock drains, and handle all residential and commercial plumbing needs.", category: ["Plumbing", "Construction & Renovation"], location: "Harare, Zimbabwe", country_code: "+263", city: "Harare", area: "CBD", phone: "263772123456", whatsapp_link: "https://wa.me/263772123456?text=Hi%2C%20I%20found%20you%20on%20WA%20Directory", verified: true, rating: 4.2, review_count: 15, price_range: "$10 - $50" },
  { name: "Glamour Cuts Salon", slug: "glamour-cuts-salon", bio: "Premium unisex hair salon offering braiding, styling, barber cuts, weaves, and nail art.", category: ["Salons & Spas"], location: "Bulawayo, Zimbabwe", country_code: "+263", city: "Bulawayo", area: "City Centre", phone: "263773234567", whatsapp_link: "https://wa.me/263773234567?text=Hi%2C%20I%20found%20you%20on%20WA%20Directory", verified: true, rating: 4.5, review_count: 28, price_range: "$5 - $30" },
  { name: "SolarTech Zimbabwe", slug: "solartech-zimbabwe", bio: "Leading solar energy installer. We supply and install solar panels, inverters, batteries, and backup power systems.", category: ["Solar & Power", "Electrical"], location: "Harare, Zimbabwe", country_code: "+263", city: "Harare", area: "Borrowdale", phone: "263774345678", whatsapp_link: "https://wa.me/263774345678?text=Hi%2C%20I%20found%20you%20on%20WA%20Directory", verified: true, rating: 4.8, review_count: 42, price_range: "$50 - $500" },
  { name: "Tasty Bites Catering", slug: "tasty-bites-catering", bio: "Full-service catering for weddings, corporate events, and parties. Traditional Zimbabwean dishes and international cuisine.", category: ["Catering", "Restaurants & Food"], location: "Harare, Zimbabwe", country_code: "+263", city: "Harare", area: "Mabelreign", phone: "263775456789", whatsapp_link: "https://wa.me/263775456789?text=Hi%2C%20I%20found%20you%20on%20WA%20Directory", verified: true, rating: 4.3, review_count: 19, price_range: "$15 - $100" },
  { name: "QuickFix Auto Repairs", slug: "quickfix-auto-repairs", bio: "Expert auto repair and maintenance. Engine diagnostics, brake repairs, oil changes, tire fitting, and body work.", category: ["Auto Repairs & Mechanics"], location: "Harare, Zimbabwe", country_code: "+263", city: "Harare", area: "Msasa", phone: "263776567890", whatsapp_link: "https://wa.me/263776567890?text=Hi%2C%20I%20found%20you%20on%20WA%20Directory", verified: true, rating: 4.0, review_count: 33, price_range: "$20 - $200" },
  { name: "FreshFarm Grocery", slug: "freshfarm-grocery", bio: "Farm-fresh produce delivered to your door. Organic vegetables, fruits, free-range eggs, and dairy.", category: ["Restaurants & Food", "Agriculture & Farming"], location: "Harare, Zimbabwe", country_code: "+263", city: "Harare", area: "Greendale", phone: "263777678901", whatsapp_link: "https://wa.me/263777678901?text=Hi%2C%20I%20found%20you%20on%20WA%20Directory", verified: true, rating: 4.6, review_count: 51, price_range: "$10 - $40" },
  { name: "Elite Real Estate Agency", slug: "elite-real-estate", bio: "Property sales and rentals in Harare and Bulawayo. Houses, flats, commercial properties, and land.", category: ["Real Estate & Property"], location: "Harare, Zimbabwe", country_code: "+263", city: "Harare", area: "Eastlea", phone: "263778789012", whatsapp_link: "https://wa.me/263778789012?text=Hi%2C%20I%20found%20you%20on%20WA%20Directory", verified: true, rating: 4.1, review_count: 22, price_range: "$50 - $500" },
  { name: "Bright Smile Dental Clinic", slug: "bright-smile-dental", bio: "Comprehensive dental care for the whole family. Cleanings, fillings, extractions, braces, and teeth whitening.", category: ["Health & Medical"], location: "Harare, Zimbabwe", country_code: "+263", city: "Harare", area: "Avondale", phone: "263779890123", whatsapp_link: "https://wa.me/263779890123?text=Hi%2C%20I%20found%20you%20on%20WA%20Directory", verified: true, rating: 4.7, review_count: 37, price_range: "$20 - $150" },
  { name: "KwikAirtime & Phone Repairs", slug: "kwikairtime-phone-repairs", bio: "Airtime, data bundles, and phone repairs. Cracked screens, battery replacements, unlocked phones, accessories.", category: ["Tech & Phones", "Mobile & Accessories"], location: "Bulawayo, Zimbabwe", country_code: "+263", city: "Bulawayo", area: "Nkulumane", phone: "263780901234", whatsapp_link: "https://wa.me/263780901234?text=Hi%2C%20I%20found%20you%20on%20WA%20Directory", verified: true, rating: 3.9, review_count: 14, price_range: "$5 - $80" },
  { name: "The Legal Helpline", slug: "the-legal-helpline", bio: "Affordable legal advice and representation. Conveyancing, contracts, family law, debt recovery, business registration.", category: ["Legal & Insurance"], location: "Harare, Zimbabwe", country_code: "+263", city: "Harare", area: "CBD", phone: "263781012345", whatsapp_link: "https://wa.me/263781012345?text=Hi%2C%20I%20found%20you%20on%20WA%20Directory", verified: true, rating: 4.4, review_count: 25, price_range: "$30 - $200" },
  { name: "Countryside Tours & Travel", slug: "countryside-tours-travel", bio: "Curated tour experiences across Zimbabwe. Victoria Falls, Great Zimbabwe, Hwange Safari, Eastern Highlands.", category: ["Travel & Accommodation", "Events & Entertainment"], location: "Harare, Zimbabwe", country_code: "+263", city: "Harare", area: "Belgravia", phone: "263782123456", whatsapp_link: "https://wa.me/263782123456?text=Hi%2C%20I%20found%20you%20on%20WA%20Directory", verified: true, rating: 4.9, review_count: 63, price_range: "$100 - $500" },
  { name: "EduCentre Tutoring", slug: "educentre-tutoring", bio: "Quality after-school tutoring for primary and secondary students. Maths, English, Science, and exam preparation.", category: ["Education & Training"], location: "Harare, Zimbabwe", country_code: "+263", city: "Harare", area: "Hatfield", phone: "263783234567", whatsapp_link: "https://wa.me/263783234567?text=Hi%2C%20I%20found%20you%20on%20WA%20Directory", verified: true, rating: 4.3, review_count: 18, price_range: "$5 - $30" },
  { name: "GreenThumb Landscaping", slug: "greenthumb-landscaping", bio: "Professional landscaping and garden design. Lawn maintenance, tree pruning, irrigation systems, garden makeovers.", category: ["Agriculture & Farming"], location: "Harare, Zimbabwe", country_code: "+263", city: "Harare", area: "Mount Pleasant", phone: "263784345678", whatsapp_link: "https://wa.me/263784345678?text=Hi%2C%20I%20found%20you%20on%20WA%20Directory", verified: true, rating: 4.0, review_count: 11, price_range: "$20 - $200" },
  { name: "Elegant Events Decor", slug: "elegant-events-decor", bio: "Event decoration and planning. Weddings, birthdays, corporate galas. Full decor, seating, lighting, and setup.", category: ["Events & Entertainment"], location: "Harare, Zimbabwe", country_code: "+263", city: "Harare", area: "Newlands", phone: "263785456789", whatsapp_link: "https://wa.me/263785456789?text=Hi%2C%20I%20found%20you%20on%20WA%20Directory", verified: true, rating: 4.6, review_count: 31, price_range: "$100 - $500" },
  { name: "Wheels & Deals Motors", slug: "wheels-deals-motors", bio: "Quality used cars for sale. Imported, inspected, with financing options and 3-month warranty.", category: ["Auto Repairs & Mechanics"], location: "Harare, Zimbabwe", country_code: "+263", city: "Harare", area: "Willowvale", phone: "263786567890", whatsapp_link: "https://wa.me/263786567890?text=Hi%2C%20I%20found%20you%20on%20WA%20Directory", verified: true, rating: 3.8, review_count: 45, price_range: "$500 - $5000" },
  { name: "SafeGuard Insurance Brokers", slug: "safeguard-insurance-brokers", bio: "Comprehensive insurance solutions. Vehicle, home, business, and life insurance. We compare top providers.", category: ["Legal & Insurance"], location: "Harare, Zimbabwe", country_code: "+263", city: "Harare", area: "CBD", phone: "263787678901", whatsapp_link: "https://wa.me/263787678901?text=Hi%2C%20I%20found%20you%20on%20WA%20Directory", verified: true, rating: 4.2, review_count: 20, price_range: "$10 - $200" },
  { name: "CyberZone Internet Cafe", slug: "cyberzone-internet-cafe", bio: "Printing, scanning, photocopying, internet access, computer rentals, passport photos, CV typing.", category: ["Tech & Phones"], location: "Harare, Zimbabwe", country_code: "+263", city: "Harare", area: "CBD", phone: "263788789012", whatsapp_link: "https://wa.me/263788789012?text=Hi%2C%20I%20found%20you%20on%20WA%20Directory", verified: true, rating: 3.7, review_count: 9, price_range: "$1 - $10" },
  { name: "Divine Designs Fashion", slug: "divine-designs-fashion", bio: "Custom tailoring and fashion design. Traditional and modern outfits, wedding gowns, suits, and casual wear.", category: ["Fashion & Clothing"], location: "Harare, Zimbabwe", country_code: "+263", city: "Harare", area: "Mbare", phone: "263789890123", whatsapp_link: "https://wa.me/263789890123?text=Hi%2C%20I%20found%20you%20on%20WA%20Directory", verified: true, rating: 4.4, review_count: 26, price_range: "$15 - $100" },
  { name: "All Hours Pharmacy", slug: "all-hours-pharmacy", bio: "24-hour pharmacy serving Harare. Prescription medicines, OTC drugs, health supplements, baby care. Free CBD delivery.", category: ["Health & Medical"], location: "Harare, Zimbabwe", country_code: "+263", city: "Harare", area: "Avenues", phone: "263790901234", whatsapp_link: "https://wa.me/263790901234?text=Hi%2C%20I%20found%20you%20on%20WA%20Directory", verified: true, rating: 4.1, review_count: 17, price_range: "$2 - $50" },
  { name: "Prime Properties Furnishers", slug: "prime-properties-furnishers", bio: "Quality home and office furniture. Sofas, beds, tables, chairs, cabinets, and decor items. Nationwide delivery.", category: ["Furniture & Home"], location: "Harare, Zimbabwe", country_code: "+263", city: "Harare", area: "Glenview", phone: "263791012345", whatsapp_link: "https://wa.me/263791012345?text=Hi%2C%20I%20found%20you%20on%20WA%20Directory", verified: true, rating: 4.0, review_count: 13, price_range: "$30 - $300" },
]

async function main() {
  console.log(`Seeding ${businesses.length} businesses...\n`)

  let inserted = 0
  let skipped = 0

  for (const b of businesses) {
    const { data: existing } = await supabase
      .from('businesses')
      .select('id')
      .eq('slug', b.slug)
      .single()

    if (existing) {
      console.log(`  SKIP ${b.slug} (already exists)`)
      skipped++
      continue
    }

    const { error } = await supabase
      .from('businesses')
      .insert({
        ...b,
        edit_token: crypto.randomUUID(),
      })

    if (error) {
      console.log(`  FAIL ${b.slug}: ${error.message}`)
    } else {
      console.log(`  OK   ${b.name}`)
      inserted++
    }
  }

  const { count } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })

  console.log(`\nDone: ${inserted} inserted, ${skipped} skipped, ${count} total businesses in DB`)
}

main().catch(console.error)
