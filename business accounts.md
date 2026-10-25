# Business Accounts — WA Directory (demo seed)

All 30 seeded businesses. The data lives in Supabase; nothing is stored locally.

## Quick start

1. This project's dev server must run on a free port (3000 is taken by another project):
   ```
   node node_modules/next/dist/bin/next dev -p 3100
   ```
2. Log in at: `http://localhost:3100/login`
   - **Login ID:** the business's phone number (table below)
   - **Password:** `Demo1234` (same for every seeded account)

## Where things live in the portal (`/portal`)

| Portal tab | What it does |
|---|---|
| Shop (`/portal/shop`) | Manage store goods: add items, prices, photos |
| Card & QR (`/portal/card`) | Official business card studio + QR codes (chat + profile) |
| Site (`/portal/site`) | Auto-website editor: tagline + "Generate with AI", FAQ, opening hours, gallery photos, colour schemes, socials |

## Where customers see the store

- **Company profile:** `http://localhost:3100/business/<slug>` — Shop section with listed goods
- **Auto-website:** `http://localhost:3100/site/<slug>` — "Shop" section with the same goods
- **Directory search:** `http://localhost:3100/search?q=<item>` — goods surface results

## Accounts

Password for all rows: `Demo1234`. Log in with the phone number shown.

| # | Business | Category | City · Area | Login phone | Username | Business ID | Slug |
|---|---|---|---|---|---|---|---|
| 1 | Chiedza Plumbing & Drainage | Plumber | Harare · CBD | 263772234001 | chiedza_plumbing_drainage | WA-UZWD3K | chiedza-plumbing-drainage |
| 2 | Mbuya Nehanda Bakehouse | Baker | Harare · Avondale | 263772234002 | mbuya_nehanda_bakehouse | WA-AETBSD | mbuya-nehanda-bakehouse |
| 3 | Msasa Motors & Service Centre | Automotive | Harare · Msasa | 263772234003 | msasa_motors_service_centre | WA-ZQFH9H | msasa-motors-service-centre |
| 4 | Kwamambo Family Kitchen | Food & Restaurant | Harare · Mount Pleasant | 263772234004 | kwamambo_family_kitchen | WA-RME3X3 | kwamambo-family-kitchen |
| 5 | Sable Byte Digital | IT & Web | Harare · Eastlea | 263772234005 | sable_byte_digital | WA-HDLGRP | sable-byte-digital |
| 6 | Ruvheneko Legal Chambers | Legal Services | Harare · CBD | 263772234006 | ruvheneko_legal_chambers | WA-2PL2L3 | ruvheneko-legal-chambers |
| 7 | Iron Rhino Gym | Fitness & Gym | Harare · Borrowdale | 263772234007 | iron_rhino_gym | WA-RYCMCQ | iron-rhino-gym |
| 8 | Harare Vet & Pet Care | Pet Services | Harare · Greendale | 263772234008 | harare_vet_pet_care | WA-LFAPML | harare-vet-pet-care |
| 9 | Ndebele Rose Hair Studio | Hair & Beauty | Bulawayo · City Centre | 263772234009 | ndebele_rose_hair_studio | WA-CUQR6L | ndebele-rose-hair-studio |
| 10 | Matobo Electronics & Gadgets | Electronics | Bulawayo · Nkulumane | 263772234010 | matobo_electronics_gadgets | WA-7STB6F | matobo-electronics-gadgets |
| 11 | Bulawayo Heritage Hotel | Hotel & Lodging | Bulawayo · City Centre | 263772234011 | bulawayo_heritage_hotel | WA-4TA3PL | bulawayo-heritage-hotel |
| 12 | Matobo Brew Co. | Brewery | Bulawayo · Belmont | 263772234012 | matobo_brew_co | WA-9YT82G | matobo-brew-co |
| 13 | Unit L Tailor House | Clothing & Fashion | Chitungwiza · Unit L | 263772234013 | unit_l_tailor_house | WA-6355BJ | unit-l-tailor-house |
| 14 | Makoni Sound Lab | Music Studio | Chitungwiza · Makoni | 263772234014 | makoni_sound_lab | WA-5BD3E7 | makoni-sound-lab |
| 15 | Sakubva Agri Supplies | Farming & Agriculture | Mutare · Sakubva | 263772234015 | sakubva_agri_supplies | WA-XVMDJX | sakubva-agri-supplies |
| 16 | Dangamvura Hardware & Build | Building Materials | Mutare · Dangamvura | 263772234016 | dangamvura_hardware_build | WA-P5UFH9 | dangamvura-hardware-build |
| 17 | Midlands Spark Electrical | Electrician | Gweru · Senga | 263772234017 | midlands_spark_electrical | WA-GC3GTQ | midlands-spark-electrical |
| 18 | Ascot Study Centre | Education & Tutoring | Gweru · Ascot | 263772234018 | ascot_study_centre | WA-F5PPWM | ascot-study-centre |
| 19 | Mkoba Tiny Tots Daycare | Daycare | Gweru · Mkoba 4 | 263772234019 | mkoba_tiny_tots_daycare | WA-8ER7UM | mkoba-tiny-tots-daycare |
| 20 | Globe & Phoenix Mining Services | Mining | Kwekwe · Kwekwe CBD | 263772234020 | globe_phoenix_mining_services | WA-4VS5R5 | globe-phoenix-mining-services |
| 21 | Mbizo Courier & Haulage | Transport & Delivery | Kwekwe · Mbizo | 263772234021 | mbizo_courier_haulage | WA-HXS6ZV | mbizo-courier-haulage |
| 22 | Great Zimbabwe Tours | Travel & Tourism | Masvingo · Masvingo CBD | 263772234022 | great_zimbabwe_tours | WA-SF28ZE | great-zimbabwe-tours |
| 23 | Mucheke Sparkle Cleaners | Cleaning Services | Masvingo · Mucheke | 263772234023 | mucheke_sparkle_cleaners | WA-K9DVW4 | mucheke-sparkle-cleaners |
| 24 | Magamba Way Properties | Real Estate | Chinhoyi · Chinhoyi CBD | 263772234024 | magamba_way_properties | WA-96JT5G | magamba-way-properties |
| 25 | Chinhoyi Finance Hub | Financial Services | Chinhoyi · Chinhoyi CBD | 263772234025 | chinhoyi_finance_hub | WA-ALQ92Q | chinhoyi-finance-hub |
| 26 | Victoria Falls Lens Works | Photography | Victoria Falls · Town Centre | 263772234026 | victoria_falls_lens_works | WA-H8VXKM | victoria-falls-lens-works |
| 27 | Bindura Guard Force | Security Services | Bindura · Bindura CBD | 263772234027 | bindura_guard_force | WA-GCRW2C | bindura-guard-force |
| 28 | Marondera Wholesale Depot | Wholesale | Marondera · Marondera CBD | 263772234028 | marondera_wholesale_depot | WA-PPPDUY | marondera-wholesale-depot |
| 29 | Norton Steel & Wire Works | Manufacturing | Norton · Norton Industrial | 263772234029 | norton_steel_wire_works | WA-VR98LS | norton-steel-wire-works |
| 30 | Angwa City Goldsmiths | Jewelry | Harare · CBD | 263772234030 | angwa_city_goldsmiths | WA-S3QTQN | angwa-city-goldsmiths |

## Examples

- **Profile URL** (business #2): `http://localhost:3100/business/mbuya-nehanda-bakehouse`
- **Auto-site URL** (business #2): `http://localhost:3100/site/mbuya-nehanda-bakehouse`
- **Portal login** (business #2): phone `263772234002` + password `Demo1234`

## Notes

- The demo password is 8+ chars with letters and numbers, as required by the portal (`/api/account/create` rules).
- Re-running the seed regenerates everything (it nukes first): `node scripts/seed.mjs` — all phones/UI usernames/Business IDs/slug pattern stay the same, but Business IDs and edit tokens are re-rolled.
- Deleting a business in Supabase cascades: its items, portal account, stats, ratings and subscriptions are wiped with it.
