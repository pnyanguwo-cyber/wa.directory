// Full-feature reseed: nukes all businesses (cascades to items, accounts, stats,
// ratings, bids, ranks, subscriptions), wipes ai_cache/chat_sessions/banners,
// then seeds 30 businesses across 12 cities covering 30 distinct approved
// categories from data/categories.ts — every one with an active auto-website,
// a stocked mini-shop (business_items) and a demo portal login.
//
// Demo portal credentials: phone as seeded + password "Demo1234".
// Safe to re-run from scratch any time (it re-nukes first).

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { readFileSync } from 'fs'
import bcrypt from 'bcryptjs'

const DEMO_PASSWORD = 'Demo1234'
const EMPTY_UUID = '00000000-0000-0000-0000-000000000000'

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

// ---- helpers (mirror the app: lib/utils, lib/username, lib/business-id) ----

const slugify = (text, maxLength = 60) =>
  (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, maxLength)

const normalizeUsername = (input) =>
  (input || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, '')
    .replace(/[\s_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30)

const BIZ_ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const generateBusinessId = () => {
  let id = 'WA-'
  for (let i = 0; i < 6; i++) id += BIZ_ID_CHARS[Math.floor(Math.random() * BIZ_ID_CHARS.length)]
  return id
}

// ---- seed data: 30 businesses / 12 cities / 30 distinct approved categories ----

const businesses = [
  // --- Harare ---
  {
    name: 'Chiedza Plumbing & Drainage', city: 'Harare', area: 'CBD',
    category: ['Plumber'],
    bio: 'Blocked drains, geyser repairs and new pipe installations handled by certified plumbers, same day.',
    price_range: '$10 - $180', rating: 4.5, review_count: 28,
    address: 'Cnr Leopold Takawira St & Kwame Nkrumah Ave, Harare CBD', lat: -17.8292, lng: 31.0422,
    hero: 'Fast, tidy plumbing from a Harare crew that answers. Licensed plumbers, honest quotes, and work that does not come back to bite you.',
    services: ['Emergency drain unblocking', 'Geyser repair and replacement', 'Blocked sewer and storm drains', 'New pipe installations and refits', 'Leak detection and sealing'],
    items: [['Emergency Drain Unblocking', 25], ['Geyser Installation', 120], ['Standalone Leak Repair', 35], ['Bathroom Piping Refit', 180], ['Septic Tank Pump-Out', 70]],
  },
  {
    name: 'Mbuya Nehanda Bakehouse', city: 'Harare', area: 'Avondale',
    category: ['Baker'],
    bio: 'Fresh bread, cakes and pastries baked every morning in Avondale, with delivery across Harare.',
    price_range: '$2 - $55', rating: 4.8, review_count: 51,
    address: '7 King George Road, Avondale, Harare', lat: -17.793, lng: 31.0215,
    hero: 'Everything we bake is out of the oven that morning. Order a cake for Friday and collect it warm.',
    services: ['Fresh bread and rolls daily', 'Celebration and wedding cakes', 'Scones, vetko and pastries', 'Custom birthday cakes', 'Bulk orders for events'],
    items: [['White Bread Loaf', 1.5], ['Whole Wheat Loaf', 2.2], ['Chocolate Fudge Cake (1kg)', 18], ['Dozen Scones', 8], ['Dozen Vetko', 6], ['Two-Tier Wedding Cake', 55]],
  },
  {
    name: 'Msasa Motors & Service Centre', city: 'Harare', area: 'Msasa',
    category: ['Automotive'],
    bio: 'Full-service garage in the Msasa industrial area. Servicing, brakes, suspension and fleet contracts.',
    price_range: '$20 - $300', rating: 4.2, review_count: 34,
    address: 'Stand 8, Coventry Road, Msasa Industrial Area, Harare', lat: -17.871, lng: 31.1215,
    hero: 'Workshop-grade servicing for everyday cars and company fleets. Drop it off in the morning, collect it the same day.',
    services: ['Full vehicle services', 'Brake and suspension repairs', 'Engine diagnostics', 'Fleet maintenance contracts', 'Tyre fitting and balancing'],
    items: [['Full Service (Oil & Filters)', 60], ['Brake Pad Replacement', 45], ['Engine Diagnostics', 25], ['Wheel Alignment', 30], ['Battery Fitting', 20]],
  },
  {
    name: 'Kwamambo Family Kitchen', city: 'Harare', area: 'Mount Pleasant',
    category: ['Food & Restaurant'],
    bio: 'Homestyle Zimbabwean cooking, dine-in or delivered hot. Sadza, stews, grills and family platters.',
    price_range: '$5 - $15', rating: 4.6, review_count: 44,
    address: '172 Mount Pleasant Heights, Mount Pleasant, Harare', lat: -17.7592, lng: 31.03,
    hero: 'Sunday lunch any day of the week. Cooked fresh from morning, plated generous.',
    services: ['Dine-in sadza platters', 'Family delivery orders', 'Event catering', 'Daily specials', 'Vegetarian options'],
    items: [['Sadza Platter with Beef Stew', 8.5], ['Grilled Chicken & Chips', 9], ['Family Buffet (Per Head)', 15], ['Vegetarian Plate', 6.5], ['Homemade Fruit Juice', 2.5]],
  },
  {
    name: 'Sable Byte Digital', city: 'Harare', area: 'Eastlea',
    category: ['IT & Web'],
    bio: 'Websites, online stores and business email for Zimbabwean SMEs. Built fast, priced in USD.',
    price_range: '$50 - $800', rating: 4.7, review_count: 22,
    address: '209 Enterprise Road, Eastlea, Harare', lat: -17.8165, lng: 31.0515,
    hero: 'A proper website for your business, live in under two weeks. Hosting, email and support sorted in one package.',
    services: ['Starter business websites', 'Online store setup', 'Business email (Google Workspace)', 'Logo and brand design', 'Monthly hosting and support'],
    items: [['Starter Website Package', 350], ['E-Commerce Store Setup', 650], ['Business Email Setup', 80], ['Logo Design', 120], ['Monthly Hosting & Care', 45]],
  },
  {
    name: 'Ruvheneko Legal Chambers', city: 'Harare', area: 'CBD',
    category: ['Legal Services'],
    bio: 'Contracts, conveyancing, debt recovery and company registration from registered legal practitioners.',
    price_range: '$30 - $450', rating: 4.4, review_count: 25,
    address: '48 Samora Machel Avenue, Harare CBD', lat: -17.831, lng: 31.0445,
    hero: 'Plain-language legal help for businesses and families. Registered practitioners, fixed fees where possible.',
    services: ['Contract drafting and review', 'Property transfers', 'Company registration', 'Debt recovery', 'Family law matters'],
    items: [['Contract Review', 100], ['Property Transfer', 450], ['Company Registration', 180], ['Debt Recovery Letter', 60], ['Family Law Consultation', 120]],
    socials: { linkedin: true },
  },
  {
    name: 'Iron Rhino Gym', city: 'Harare', area: 'Borrowdale',
    category: ['Fitness & Gym'],
    bio: 'Serious training floor plus friendly coaches. Weights, classes, and personal training in Borrowdale.',
    price_range: '$5 - $105', rating: 4.5, review_count: 39,
    address: "Shop 23, Sam Levy's Village, Borrowdale, Harare", lat: -17.756, lng: 31.079,
    hero: 'No egos, no waiting for machines. A clean big-box gym with coaches who push you just enough.',
    services: ['Strength and cardio floor', 'Personal training', 'Group classes', 'Fitness assessments', 'Student specials'],
    items: [['Monthly Membership', 40], ['Personal Training Session', 12], ['Day Pass', 5], ['3-Month Membership', 105], ['Fitness Assessment', 10]],
  },
  {
    name: 'Harare Vet & Pet Care', city: 'Harare', area: 'Greendale',
    category: ['Pet Services'],
    bio: 'Vaccinations, surgery and grooming for dogs and cats, with emergency visits by arrangement.',
    price_range: '$6 - $45', rating: 4.4, review_count: 31,
    address: 'Greendale Shopping Centre, Chiremba Road, Harare', lat: -17.848, lng: 31.099,
    hero: 'Calm vets, calm pets. From puppy shots to surgery, your animals are handled gently.',
    services: ['Vaccinations and check-ups', 'Spay and neuter surgery', 'Grooming and dips', 'Emergency visits', 'Deworming and tick control'],
    items: [['Dog Vaccination', 15], ['Full Grooming (Small Breed)', 20], ['Cat Spay/Neuter', 45], ['Pet Check-Up', 12], ['Deworming', 6]],
  },
  // --- Bulawayo ---
  {
    name: 'Ndebele Rose Hair Studio', city: 'Bulawayo', area: 'City Centre',
    category: ['Hair & Beauty'],
    bio: 'Braids, weaves, silk press and barber cuts in a clean, friendly city-centre salon.',
    price_range: '$5 - $35', rating: 4.6, review_count: 41,
    address: 'Fife Street, Bulawayo CBD', lat: -20.1552, lng: 28.5836,
    hero: 'Sit down, drink tea, leave transformed. Booked appointments run on time.',
    services: ['Full-head braiding', 'Weave installation', 'Silk press and treatments', 'Barber cuts', 'Manicure and pedicure'],
    items: [['Full-Head Braiding', 25], ['Silk Press', 15], ['Weave Installation', 35], ['Barber Cut', 5], ['Manicure', 8]],
  },
  {
    name: 'Matobo Electronics & Gadgets', city: 'Bulawayo', area: 'Nkulumane',
    category: ['Electronics'],
    bio: 'Phones, accessories and honest repairs. Screens, batteries and software fixes while you wait.',
    price_range: '$5 - $45', rating: 4.1, review_count: 27,
    address: 'Nkulumane 12 Shopping Centre, Bulawayo', lat: -20.1769, lng: 28.6102,
    hero: 'Fixes done in front of you, prices on the wall, and a 30-day warranty on repairs.',
    services: ['Phone and tablet repairs', 'Genuine accessories', 'Laptop battery swaps', 'Software and unlock help', 'Trade-ins welcome'],
    items: [['Smartphone Screen Repair', 35], ['Wireless Headphones', 28], ['Power Bank 20000mAh', 22], ['Laptop Battery Replacement', 45], ['Bluetooth Speaker', 18]],
  },
  {
    name: 'Bulawayo Heritage Hotel', city: 'Bulawayo', area: 'City Centre',
    category: ['Hotel & Lodging'],
    bio: 'Comfortable rooms and full breakfast in a restored building minutes from the station.',
    price_range: '$55 - $130', rating: 4.3, review_count: 58,
    address: 'Cnr Fife Street & 9th Avenue, Bulawayo CBD', lat: -20.1548, lng: 28.585,
    hero: 'Old-building charm with new-building comfort. Secure parking, quiet nights, hot showers.',
    services: ['Standard and deluxe rooms', 'Full English breakfast', 'Secure parking', 'Airport and bus transfers', 'Conference room'],
    items: [['Standard Room (Per Night)', 55], ['Deluxe Room (Per Night)', 85], ['Executive Suite (Per Night)', 130], ['Airport Transfer', 25], ['Full English Breakfast', 8]],
  },
  {
    name: 'Matobo Brew Co.', city: 'Bulawayo', area: 'Belmont',
    category: ['Brewery'],
    bio: 'Craft lager, IPA and traditional sorghum beer brewed and bottled in Belmont, Bulawayo.',
    price_range: '$4 - $80', rating: 4.7, review_count: 33,
    address: 'Belmont Industrial Area, Bulawayo', lat: -20.152, lng: 28.604,
    hero: 'Brewed slow, sold cold. Walk-in tastings every Saturday afternoon.',
    services: ['Craft lager and IPA', 'Traditional sorghum beer', 'Brewery tours and tastings', 'Event kegs', 'Custom labels for bars'],
    items: [['Golden Lager Case (12 x 330ml)', 16], ['Craft IPA Six-Pack', 9.5], ['Traditional Beer (2L)', 4], ['Brewery Tour + Tasting', 12], ['Event Keg (30L)', 80]],
  },
  // --- Chitungwiza ---
  {
    name: 'Unit L Tailor House', city: 'Chitungwiza', area: 'Unit L',
    category: ['Clothing & Fashion'],
    bio: 'Made-to-measure suits, uniforms and traditional wear, altered and delivered in days.',
    price_range: '$6 - $250', rating: 4.5, review_count: 29,
    address: 'Unit L Shopping Centre, Chitungwiza', lat: -18.0005, lng: 31.208,
    hero: 'Bring fabric or choose from ours. Fittings at your convenience, collection guaranteed on time.',
    services: ['Made-to-measure tailoring', 'Wedding and bridal wear', 'Uniform contracts', 'Alterations', 'Traditional regalia'],
    items: [['Made-to-Measure Suit', 180], ['Wedding Dress Tailoring', 250], ['Traditional Outfit', 90], ['Trouser Alteration', 6], ['School Uniform (Set)', 25]],
  },
  {
    name: 'Makoni Sound Lab', city: 'Chitungwiza', area: 'Makoni',
    category: ['Music Studio'],
    bio: 'Recording, mixing and beat production in Chitungwiza. Affordable rates for upcoming artists.',
    price_range: '$15 - $120', rating: 4.3, review_count: 18,
    address: 'Makoni Shopping Centre, Chitungwiza', lat: -18.001, lng: 31.196,
    hero: 'Your first single does not need a Joburg budget. Record it right here, release it the same week.',
    services: ['Track recording', 'Mixing and mastering', 'Beat production', 'Jingles and voice-overs', 'Studio hire by the hour'],
    items: [['Single Track Recording', 60], ['Mixing & Mastering', 80], ['Studio Hire (Per Hour)', 15], ['Beat Production', 100], ['Jingle Recording', 120]],
  },
  // --- Mutare ---
  {
    name: 'Sakubva Agri Supplies', city: 'Mutare', area: 'Sakubva',
    category: ['Farming & Agriculture'],
    bio: 'Seed, fertiliser, feed and irrigation for smallholder and commercial farmers around Mutare.',
    price_range: '$4 - $120', rating: 4.4, review_count: 26,
    address: 'Sakubva Market, Mutare', lat: -18.958, lng: 32.674,
    hero: 'Everything for the season under one roof, ordered before you plant and delivered to the plot.',
    services: ['Seed and fertiliser stock', 'Poultry supplies', 'Drip irrigation kits', 'Seasonal planning advice', 'Bulk delivery to farms'],
    items: [['Maize Seed Blend (50kg)', 38], ['Compound D Fertiliser (50kg)', 32], ['Day-Old Chicks (Per 100)', 85], ['Drip Irrigation Kit', 120], ['Chicken Feed (50kg)', 28]],
  },
  {
    name: 'Dangamvura Hardware & Build', city: 'Mutare', area: 'Dangamvura',
    category: ['Building Materials'],
    bio: 'Cement, roofing, timber, paint and hardware for builders and DIY in Dangamvura.',
    price_range: '$6 - $75', rating: 4.2, review_count: 21,
    address: 'Dangamvura Shopping Centre, Mutare', lat: -18.968, lng: 32.634,
    hero: 'Stock your site in one trip, or let us deliver the pallet to the gate.',
    services: ['Cement and mortar stock', 'Roofing and timber', 'Paint matching', 'Hardware and fasteners', 'Site delivery'],
    items: [['Cement Bag (50kg)', 11], ['Roofing Sheets (Per m)', 9.5], ['River Sand (Per Tonne)', 28], ['Door Frame + Teak Door', 75], ['Paint (20L)', 47]],
  },
  // --- Gweru ---
  {
    name: 'Midlands Spark Electrical', city: 'Gweru', area: 'Senga',
    category: ['Electrician'],
    bio: 'Wiring, fault-finding and inverter installs for homes and shops across Gweru.',
    price_range: '$25 - $150', rating: 4.6, review_count: 24,
    address: 'Senga Shopping Centre, Gweru', lat: -19.4318, lng: 29.8074,
    hero: 'Power problems in this economy? We keep you switched on, from the board to the bulb.',
    services: ['House and shop wiring', 'Inverter and battery installs', 'Fault finding', 'Distribution board upgrades', 'Geyser element repairs'],
    items: [['House Wiring Check', 30], ['Geyser Element Replacement', 45], ['Standby Inverter Install', 150], ['Distribution Board Upgrade', 110], ['Fault Finding (Per Hour)', 25]],
  },
  {
    name: 'Ascot Study Centre', city: 'Gweru', area: 'Ascot',
    category: ['Education & Tutoring'],
    bio: 'Exam-focused tutoring for Grade 7, O-Level and A-Level in small groups near Ascot.',
    price_range: '$8 - $40', rating: 4.8, review_count: 37,
    address: '8 Ascot Avenue, Gweru', lat: -19.4423, lng: 29.8089,
    hero: 'Small groups, marked work every week, and past-paper drills that actually build marks.',
    services: ['Grade 7 exam preparation', 'O-Level maths and sciences', 'A-Level sciences and business', 'Holiday intensives', 'Study material packs'],
    items: [['Grade 7 Exam Prep (Monthly)', 25], ['O-Level Maths Tutoring (Monthly)', 30], ['A-Level Sciences (Monthly)', 40], ['One-on-One Session (Hour)', 8], ['Study Materials Pack', 10]],
  },
  {
    name: 'Mkoba Tiny Tots Daycare', city: 'Gweru', area: 'Mkoba 4',
    category: ['Daycare'],
    bio: 'Safe, structured daycare for ages 1-5 with hot meals and daily reports for parents.',
    price_range: '$5 - $60', rating: 4.5, review_count: 23,
    address: 'Mkoba 4 Shopping Centre, Gweru', lat: -19.4685, lng: 29.8267,
    hero: 'Play, learn, nap, snack, repeat. You drop off and go to work knowing they are happy.',
    services: ['Full-day care (ages 1-5)', 'After-school care', 'Holiday programmes', 'Hot lunches included', 'Daily parent reports'],
    items: [['Full Day Session', 5], ['Monthly Enrolment', 60], ['After-School Care (Monthly)', 40], ['Holiday Programme (Week)', 20], ['Baby Sleep Kit', 15]],
  },
  // --- Kwekwe ---
  {
    name: 'Globe & Phoenix Mining Services', city: 'Kwekwe', area: 'Kwekwe CBD',
    category: ['Mining'],
    bio: 'Claim pegging, surveys and assay testing for small-scale miners in the Midlands.',
    price_range: '$20 - $300', rating: 4.0, review_count: 15,
    address: 'Kwekwe CBD, Midlands', lat: -18.9831, lng: 29.8109,
    hero: 'From claim to cashflow. We handle the paperwork while you handle the ground.',
    services: ['Claim pegging and registration', 'Geological surveys', 'Assay sample testing', 'Safety compliance packs', 'Mining consultations'],
    items: [['Geological Survey (Per Hectare)', 250], ['Assay Testing (Per Sample)', 40], ['Claim Registration Assist', 300], ['Safety Equipment Bundle', 85], ['Mining Consultation (Hour)', 20]],
  },
  {
    name: 'Mbizo Courier & Haulage', city: 'Kwekwe', area: 'Mbizo',
    category: ['Transport & Delivery'],
    bio: 'Parcel delivery, furniture moves and truck hire out of Kwekwe, covering the country.',
    price_range: '$4.50 - $200', rating: 4.2, review_count: 19,
    address: 'Mbizo 4 Shopping Centre, Kwekwe', lat: -18.972, lng: 29.8,
    hero: 'Send it today, know where it is tonight. Tracking on every parcel, big or small.',
    services: ['Same-day CBD deliveries', 'Intercity parcels', 'Furniture and office moves', 'Full truck hire', 'Cross-border courier'],
    items: [['Same-Day CBD Delivery', 5], ['Kwekwe-Harare Parcel', 8], ['Furniture Move (Local)', 80], ['Full Truck Hire (Day)', 200], ['Cross-Border Courier (Per Kg)', 4.5]],
  },
  // --- Masvingo ---
  {
    name: 'Great Zimbabwe Tours', city: 'Masvingo', area: 'Masvingo CBD',
    category: ['Travel & Tourism'],
    bio: 'Guided tours of Great Zimbabwe, Lake Mutirikwi and Hwange departures from Masvingo.',
    price_range: '$30 - $380', rating: 4.9, review_count: 52,
    address: 'Masvingo CBD, opposite Civic Centre, Masvingo', lat: -20.0637, lng: 30.8277,
    hero: 'Walk the stone city with someone who knows its stories. Transport, entry and lunch sorted.',
    services: ['Great Zimbabwe guided tours', 'Lake Mutirikwi trips', 'Hwange safari packages', 'Eastern Highlands getaways', 'Airport and hotel pick-ups'],
    items: [['Great Zimbabwe Day Tour', 80], ['Lake Mutirikwi Trip', 60], ['Hwange Safari (Day)', 220], ['Eastern Highlands Retreat (2 Days)', 380], ['Hotel Pick-Up', 30]],
  },
  {
    name: 'Mucheke Sparkle Cleaners', city: 'Masvingo', area: 'Mucheke',
    category: ['Cleaning Services'],
    bio: 'Home, office and move-out cleaning with vetted staff across Masvingo.',
    price_range: '$18 - $60', rating: 4.3, review_count: 16,
    address: 'Mucheke C Shopping Centre, Masvingo', lat: -20.083, lng: 30.818,
    hero: 'Book a clean before lunch, come home to a different house.',
    services: ['Full house cleans', 'Office cleaning contracts', 'Carpet and sofa shampooing', 'Move-out deep cleans', 'Weekly domestic packages'],
    items: [['Full House Clean', 40], ['Office Clean (Per 100m2)', 25], ['Sofa Deep Clean', 18], ['Carpet Shampoo', 20], ['Move-Out Clean', 60]],
  },
  // --- Chinhoyi ---
  {
    name: 'Magamba Way Properties', city: 'Chinhoyi', area: 'Chinhoyi CBD',
    category: ['Real Estate'],
    bio: 'Stands, rentals and title processing in Chinhoyi and Mashonaland West.',
    price_range: '$10 - $150', rating: 4.2, review_count: 20,
    address: '468 Magamba Way, Chinhoyi CBD', lat: -17.3654, lng: 30.2006,
    hero: 'Buying or renting in Chinhoyi starts here. Verified stands, honest paperwork.',
    services: ['Residential rentals', 'Stand sales', 'Title deed processing', 'Property valuations', 'Land survey referrals'],
    items: [['Rental Viewing (3 Properties)', 10], ['Rental Agency (Per Month)', 35], ['Title Deed Processing', 150], ['Property Valuation', 50], ['Land Survey Referral', 80]],
  },
  {
    name: 'Chinhoyi Finance Hub', city: 'Chinhoyi', area: 'Chinhoyi CBD',
    category: ['Financial Services'],
    bio: "Bookkeeping, tax, payroll and small business loans for Chinhoyi's traders and farmers.",
    price_range: '$15 - $60', rating: 4.4, review_count: 18,
    address: 'Cnr Robert Mugabe Way & Fifth Street, Chinhoyi CBD', lat: -17.3676, lng: 30.1992,
    hero: 'Keep your books clean without hiring a full-time accountant. We handle ZIMRA so you do not have to.',
    services: ['Bookkeeping (monthly)', 'Tax return filing', 'Payroll processing', 'Micro business loans', 'Business advisory'],
    items: [['Micro Loan Setup', 15], ['Business Advisory (Month)', 50], ['Payroll Processing (Monthly)', 45], ['Tax Return Filing', 35], ['Bookkeeping (Monthly)', 60]],
  },
  // --- Victoria Falls ---
  {
    name: 'Victoria Falls Lens Works', city: 'Victoria Falls', area: 'Town Centre',
    category: ['Photography'],
    bio: 'Portrait, drone and event photography in Victoria Falls, prints delivered same day.',
    price_range: '$5 - $450', rating: 4.8, review_count: 44,
    address: 'Victoria Falls Town Centre, Victoria Falls', lat: -17.9315, lng: 25.838,
    hero: 'You came all the way here. Leave with photos worth the trip.',
    services: ['Portrait sessions in the Falls', 'Drone photography', 'Wedding packages', 'Corporate and event coverage', 'Same-day prints'],
    items: [['Portrait Session', 45], ['Wedding Day Package', 450], ['Corporate Headshots', 80], ['Event Coverage (Day)', 200], ['Passport Photos', 5]],
    socials: { instagram: true, tiktok: true },
  },
  // --- Bindura ---
  {
    name: 'Bindura Guard Force', city: 'Bindura', area: 'Bindura CBD',
    category: ['Security Services'],
    bio: 'Uniformed guards, CCTV and alarm response for homes, shops and farms around Bindura.',
    price_range: '$30 - $220', rating: 4.1, review_count: 22,
    address: 'Bindura CBD, Mashonaland Central', lat: -17.3019, lng: 31.3306,
    hero: 'Guards who stay awake and response teams that actually respond.',
    services: ['Static guarding (24/7)', 'CCTV installs', 'Electric fencing', 'Alarm and response patrols', 'Farm security packages'],
    items: [['Guard Service (Per Month)', 90], ['CCTV Install (4 Cameras)', 220], ['Electric Fence Install', 180], ['Alarm Response (Monthly)', 30], ['Panic Button Unit', 35]],
  },
  // --- Marondera ---
  {
    name: 'Marondera Wholesale Depot', city: 'Marondera', area: 'Marondera CBD',
    category: ['Wholesale'],
    bio: 'Bulk groceries and fast-moving goods at wholesale prices for tuckshops and resellers.',
    price_range: '$14 - $55', rating: 4.5, review_count: 31,
    address: 'Industrial Road, Marondera CBD, Marondera', lat: -18.1853, lng: 31.5519,
    hero: 'Buy like a supermarket. Pallet prices, mixed pallets welcome, delivery for orders over $200.',
    services: ['Bulk grocery sourcing', 'Tuckshop starter packs', 'Mixed pallet orders', 'Reseller accounts', 'Delivery over $200'],
    items: [['Cooking Oil (20L Drum)', 32], ['Sugar (50kg Bale)', 42], ['Mealie Meal (25kg)', 14], ['Soap Powder (25kg)', 28], ['Bulk Rice (50kg)', 55]],
  },
  // --- Norton ---
  {
    name: 'Norton Steel & Wire Works', city: 'Norton', area: 'Norton Industrial',
    category: ['Manufacturing'],
    bio: 'Steel fabrication: wire, mesh, gates and burglar bars made to measure in Norton.',
    price_range: '$15 - $120', rating: 4.3, review_count: 17,
    address: 'Norton Industrial Area, Norton', lat: -17.885, lng: 30.7,
    hero: 'Drawn wire, cut steel, welded gates. Direct-from-workshop prices.',
    services: ['Galvanised wire drawing', 'Custom mesh panels', 'Gate fabrication', 'Burglar bar sets', 'Steel plate cutting'],
    items: [['Galvanised Wire (50kg Roll)', 85], ['Custom Mesh Panel', 45], ['Gate Fabrication', 120], ['Burglar Bar Set', 70], ['Steel Plate Cutting (Per m)', 15]],
  },
  // --- Harare (extra) ---
  {
    name: 'Angwa City Goldsmiths', city: 'Harare', area: 'CBD',
    category: ['Jewelry'],
    bio: 'Gold and silver custom jewellery, repairs and engraving, workshop above Angwa City.',
    price_range: '$2 - $320', rating: 4.6, review_count: 24,
    address: 'Angwa City, Cnr Julius Nyerere Way & George Silundika Ave, Harare CBD', lat: -17.8315, lng: 31.0465,
    hero: 'Made to measure in real gold and silver. Watch your piece being finished in the workshop above.',
    services: ['Custom gold and silver design', 'Engagement and wedding rings', 'Repairs and resizing', 'Engraving', 'Watch battery fitting'],
    items: [['18k Gold Ring', 320], ['Silver Chain', 45], ['Engagement Ring Setting', 250], ['Watch Battery Fitting', 2], ['Signet Engraving', 25]],
  },
]

// ---- theme palettes (cycled across businesses) ----

const palettes = [
  { header: '#134E4A', hero: '#0F766E', shop: '#F0FDFA', contact: '#134E4A', accent: '#F59E0B' },
  { header: '#1E3A5F', hero: '#2563EB', shop: '#EFF6FF', contact: '#1E3A5F', accent: '#F97316' },
  { header: '#3B0764', hero: '#7E22CE', shop: '#FAF5FF', contact: '#3B0764', accent: '#F43F5E' },
  { header: '#14532D', hero: '#16A34A', shop: '#F0FDF4', contact: '#14532D', accent: '#FACC15' },
  { header: '#0F172A', hero: '#334155', shop: '#F1F5F9', contact: '#0F172A', accent: '#38BDF8' },
  { header: '#4C0519', hero: '#BE123C', shop: '#FFF1F2', contact: '#4C0519', accent: '#F59E0B' },
  { header: '#3E2723', hero: '#795548', shop: '#FAF6F2', contact: '#3E2723', accent: '#D97706' },
  { header: '#1C1917', hero: '#292524', shop: '#FAFAF9', contact: '#1C1917', accent: '#FBBF24' },
]

// ---- Phase A: nuke ----

console.log('=== NUKE ===')
{
  const { error, count } = await supabase.from('businesses').delete().neq('id', EMPTY_UUID)
  if (error) console.log(`FAIL businesses delete: ${error.message}`)
  else console.log(`OK   businesses deleted (${count ?? 0} rows, cascades wiped)`)
}
for (const [table, col] of [['ai_cache', 'cache_key'], ['chat_sessions', 'phone'], ['banners', 'id']]) {
  const { error } = await supabase.from(table).delete().neq(col, col === 'banners' ? EMPTY_UUID : '')
  if (error) console.log(`FAIL ${table}: ${error.message}`)
  else console.log(`OK   ${table} wiped`)
}

// ---- Phase B: seed ----

console.log('\n=== SEED ===')
const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 10)
const usedBusinessIds = new Set()
const usedUsernames = new Set()
const usedPhones = new Set()

const phoneFor = (i) => `2637722340${String(i + 1).padStart(2, '0')}`
const waHandle = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 25)
const uniqueBusinessId = () => {
  let id = generateBusinessId()
  while (usedBusinessIds.has(id)) id = generateBusinessId()
  usedBusinessIds.add(id)
  return id
}
const uniqueUsername = (name, i) => {
  let base = normalizeUsername(name) || `biz${i + 1}`
  let candidate = base
  let n = 2
  while (usedUsernames.has(candidate)) candidate = `${base}_${n++}`
  usedUsernames.add(candidate)
  return candidate
}
const uniquePhone = (i) => {
  let candidate = phoneFor(i)
  while (usedPhones.has(candidate)) candidate = `2637722340${Math.floor(Math.random() * 900 + 100)}`
  usedPhones.add(candidate)
  return candidate
}

let ok = 0, fail = 0

// Deterministic per-business taglines/FAQ/hours so every seeded site renders
// alive out of the box (real uploads would overwrite this via the portal).
const TAGLINE_POOL = [
  '{cat} done right — every job, every time.',
  'Quality {cat} services you can rely on.',
  'Your local {cat} specialists in {city}.',
  'Trusted {cat} experts for Zimbabwe homes and businesses.',
  'Smart {cat} solutions, honest quotes.',
  'Same-day {cat} help, five stars earned.',
  'Premium {cat} services. Community pricing.',
  'One stop for {cat} in {city}.',
  'We keep {city} moving with great {cat}.',
]
const DELIVERY_POOL = [
  'Yes — delivery within your city can be arranged. Chat with us on WhatsApp for a delivery quote.',
  'Deliveries are available by arrangement — send your order or request on WhatsApp to schedule.',
  'Orders can be collected in person or delivered countrywide through our partner couriers.',
]
const PAY_POOL = [
  'EcoCash, bank transfer and cash accepted. Invoice on request.',
  'EcoCash and bank transfer accepted; major cards supported on larger jobs.',
  'Cash, EcoCash and bank transfer — receipts provided on every order.',
]
const HOURS_PATTERNS = [
  { Sun: null, Mon: ['08:00', '17:30'], Tue: ['08:00', '17:30'], Wed: ['08:00', '17:30'], Thu: ['08:00', '17:30'], Fri: ['08:00', '17:30'], Sat: ['08:00', '17:30'] },
  { Sun: null, Mon: ['08:30', '18:00'], Tue: ['08:30', '18:00'], Wed: ['08:30', '18:00'], Thu: ['08:30', '18:00'], Fri: ['08:30', '18:00'], Sat: ['08:30', '13:00'] },
  { Sun: ['10:00', '15:00'], Mon: ['07:30', '19:00'], Tue: ['07:30', '19:00'], Wed: ['07:30', '19:00'], Thu: ['07:30', '19:00'], Fri: ['07:30', '19:00'], Sat: ['07:30', '19:00'] },
]
const DAY_NAME = { Sun: 'Sunday', Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday' }
const contentFor = (b, i) => {
  const cat = b.category[0] || ''
  const city = b.city || 'Zimbabwe'
  const tagline = TAGLINE_POOL[i % TAGLINE_POOL.length]
    .replaceAll('{cat}', cat.toLowerCase()).replaceAll('{city}', city)
  const hoursPattern = HOURS_PATTERNS[i % HOURS_PATTERNS.length]
  const hours = Object.entries(hoursPattern)
    .filter(([, span]) => span !== null)
    .map(([d, [open, close]]) => ({ day: DAY_NAME[d], open, close }))
  return {
    tagline,
    faq: [
      { q: 'How do I get a quote?', a: 'Message us on WhatsApp with what you need — we reply with pricing and availability during business hours.' },
      { q: 'Do you deliver?', a: DELIVERY_POOL[i % DELIVERY_POOL.length] },
      { q: 'Which areas do you serve?', a: `We are based in ${b.area}, ${city} and serve the surrounding suburbs. Message us to confirm your area.` },
      { q: 'How can I pay?', a: PAY_POOL[i % PAY_POOL.length] },
    ],
    hours,
  }
}

for (const [i, b] of businesses.entries()) {
  const slug = slugify(b.name)
  const phone = uniquePhone(i)
  const wapfx = waHandle(b.name)
  const socials = {}
  socials.facebook = `https://facebook.com/${wapfx}`
  socials.instagram = `https://instagram.com/${wapfx}`
  if (b.socials?.linkedin) socials.linkedin = `https://linkedin.com/company/${wapfx}`
  if (b.socials?.tiktok) socials.tiktok = `https://tiktok.com/@${wapfx}`
  else socials.twitter = `https://x.com/${wapfx}`

  const row = {
    name: b.name,
    bio: b.bio,
    category: b.category,
    location: `${b.area}, ${b.city}, Zimbabwe`,
    country_code: '+263',
    city: b.city,
    area: b.area,
    areas: [b.area],
    slug,
    phone,
    phone_type: 'whatsapp',
    whatsapp_username: wapfx,
    whatsapp_link: `https://wa.me/${phone}?text=Hi`,
    verified: true,
    rating: b.rating,
    review_count: b.review_count,
    price_range: b.price_range,
    address: b.address,
    lat: b.lat,
    lng: b.lng,
    address_verified: true,
    show_location: true,
    featured_eligible: true,
    generate_site: true,
    payment_status: 'active',
    site_hero: b.hero,
    site_services: b.services.map((s) => `- ${s}`).join('\n'),
    site_contact_email: `info@${slug.split('-').slice(0, 3).join('')}.co.zw`,
    site_theme: palettes[i % palettes.length],
    site_socials: socials,
    site_content: contentFor(b, i),
    edit_token: randomUUID(),
    business_id: uniqueBusinessId(),
    username: uniqueUsername(b.name, i),
    listing_activated_at: new Date().toISOString(),
  }

  const { data: inserted, error } = await supabase
    .from('businesses')
    .insert(row)
    .select('id')
    .single()

  if (error || !inserted) {
    console.log(`FAIL ${b.name}: ${error?.message}`)
    fail++
    continue
  }

  const items = b.items.map(([iname, iprice]) => ({
    business_id: inserted.id,
    name: iname,
    slug: slugify(iname),
    price: iprice,
    is_active: true,
  }))
  const { error: itemErr } = await supabase.from('business_items').insert(items)
  if (itemErr) console.log(`FAIL items ${b.name}: ${itemErr.message}`)

  const { error: accErr } = await supabase
    .from('business_accounts')
    .insert({ business_id: inserted.id, password_hash: passwordHash })
  if (accErr) console.log(`FAIL account ${b.name}: ${accErr.message}`)

  console.log(`OK   ${b.name} (${b.city}) · ${row.business_id} · ${b.items.length} items · /site/${slug}`)
  ok++
}

// ---- report ----

const [{ count: bizCount }, { count: itemCount }, { count: accCount }] = await Promise.all([
  supabase.from('businesses').select('*', { count: 'exact', head: true }),
  supabase.from('business_items').select('*', { count: 'exact', head: true }),
  supabase.from('business_accounts').select('*', { count: 'exact', head: true }),
])

console.log(`\n=== DONE ===`)
console.log(`seeded ${ok}/${businesses.length} (failures: ${fail})`)
console.log(`businesses: ${bizCount} · items: ${itemCount} · portal accounts: ${accCount}`)
console.log(`Auto-sites: /site/<slug> · Portal login: seeded phone + password "${DEMO_PASSWORD}"`)
