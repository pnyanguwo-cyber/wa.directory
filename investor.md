# Investor Pitch — Prompt & Draft

This file contains:
1. A **prompt** you can paste into any capable LLM (Claude, GPT, Gemini) to regenerate/refine the pitch.
2. A **ready-to-read 5-page investor pitch** generated from that prompt.

---

# Part 1 — The Prompt

You are a startup pitch consultant. Write a 5-page investor pitch document for **WA Directory** using the facts below. Do not invent metrics beyond what is given; use bracketed placeholders like [your name] where you need personal data.

## Facts about the product (must be used accurately)
- **What it is:** An AI-powered business directory for Zimbabwe. Users discover local businesses on the web and through a WhatsApp chatbot, and connect instantly via WhatsApp. Live at https://wadirectory.co.zw
- **Problem:** Zimbabwe's economy is dominated by small and informal businesses that are invisible online. Google Maps/classifieds don't fit a WhatsApp-first market; print directories are dead. Customers can't find trusted local services; businesses can't get discovered.
- **Solution:** Free self-service listings (approval-moderated), AI search (Gemini) that understands natural language ("cheap plumbers near Avondale"), 20 categories across all major cities, business profiles with QR codes, ratings & reviews, verified badges, category pages, SEO-optimized (442+ indexed pages, LocalBusiness JSON-LD).
- **WhatsApp-first:** A WhatsApp chatbot lets users search businesses and chat directly — rating flow after chats, conversation handoff. QR codes on shop counters/materials link straight to a wa.me chat with pre-typed message.
- **Business portal:** Free (7-day stats, lifetime totals, CSV export, tips) and paid subscription (full analytics, WhatsApp chat logs/conversations, ranking tools, no-screenshot overlay).
- **Monetisation:** (1) paid subscriptions in USD, (2) monthly bidding for the top-3 ranking spots per category+city (positions 1/2/3, higher bid wins #1), (3) future featured placements/advertising.
- **Market:** Zimbabwe ~16M population; WhatsApp is the de facto communication/internet app for consumers AND businesses; SMMEs dominate the economy; diaspora needs to find and contact businesses back home.
- **Traction:** platform live since 2024, production deployment on Vercel + Supabase (PostgreSQL), AI search + WhatsApp bot operational, admin moderation dashboard, PWA installable, daily cron for stats rollup and renewal notifications.
- **Tech edge:** cheap to run (Next.js on Vercel, Supabase, Gemini), fast iterations — everything built by a small team.
- **Team:** founder-led [add team info], [add your background].
- **Financial ask:** raising [$X] for [marketing + business onboarding + product expansion]. Example unit economics to illustrate: 20 categories x 3 rank spots x [10] cities x [$20/month] = [$12,000/month] at full occupancy — use as a worked example only.

## Required structure (exactly 5 pages, one topic per page)
1. **Page 1 — Problem:** the invisible SMME economy; WhatsApp-first reality; why existing tools fail.
2. **Page 2 — Solution:** WA Directory product walkthrough (web + WhatsApp bot + QR + portal); AI search; what makes it defensible.
3. **Page 3 — Market & Traction:** TAM/SAM/SOM reasoning for Zimbabwe + diaspora; adoption signals; current live state.
4. **Page 4 — Business model & Financials:** revenue streams, pricing logic, unit economics, 12-month projections (clearly labeled estimates), cost structure.
5. **Page 5 — Team, Roadmap & The Ask:** team, next 12 months (onboarding, payments gateway, scale), the ask and use of funds.

## Format rules
- Markdown, 5 pages separated by `---` page breaks; each page must fit one screen (~200-300 words).
- Deck-style: bold headline per page, 3-6 punchy bullets/subsections, no fluff.
- Investor tone: confident, concrete, honest about assumptions; label every estimate as "estimate".
- End page 5 with a one-line hook and the ask.

---

# Part 2 — The 5-Page Pitch

## Page 1 — Problem: The Invisible SMME Economy

**Millions of businesses in Zimbabwe cannot be found — and cannot be found, they don't exist.**

Zimbabwe's economy is built on small and informal businesses (SMMEs): street vendors, salons, plumbers, solar installers, caterers, auto mechanics, cross-border traders. Estimates place SMMEs at the overwhelming majority of the country's economic activity — yet almost none have a meaningful online presence. No website, no Google listing, no way for a customer to find them.

**Why the tools that exist fail:**
- **Google Maps/classifieds are built for card-carrying formal businesses.** They assume an address, a web presence, and a business that fills in data. Zimbabwe's SMMEs don't fit that mould.
- **Print directories are dead.** Phone books and newspaper ads are stale before they publish, and reach a shrinking audience.
- **Social media is noisy.** A Facebook page or WhatsApp status reaches existing customers, not new ones, and there is no trust signal, no search, no structure.

**The WhatsApp-first reality:**
WhatsApp is Zimbabwe's de facto internet. Consumers already message businesses daily for quotes, prices and bookings — but they find them by word of mouth, or not at all. Meanwhile, the customer experience is broken on the other side too: they cannot compare, cannot verify, and cannot trust a random number they were given.

**The result is an information gap with real cost:** consumers waste time and money on unvetted providers; businesses lose revenue they never knew existed. A directory is not the problem to solve — *discoverability of the informal economy* is.

---

## Page 2 — Solution: WA Directory

**WA Directory turns WhatsApp's most-used app into a searchable marketplace of every local business in Zimbabwe.**

WA Directory (wadirectory.co.zw) is an AI-powered business directory where users find businesses through the web **and** through a WhatsApp chatbot — and connect with them instantly on WhatsApp, the channel they already use.

**Product walkthrough:**
- **Free self-service listings.** Any business lists itself in minutes — name, WhatsApp number, category, location, bio, logo — with admin approval moderation and a verified-badge trust layer.
- **AI search that understands real language.** Powered by Gemini, our search interprets queries like "cheap plumbers near Avondale" into structured results, instead of forcing keyword matching. Search-as-you-type on the web, and the same intelligence inside WhatsApp.
- **WhatsApp chatbot.** Users message the bot, describe what they need, get matched businesses, and tap a link that opens a direct chat with pre-typed message. Every conversation is tracked; a post-chat rating flow builds a reviews system with zero friction.
- **QR codes that sell discovery.** Every business gets a QR code for shop counters, vehicles and flyers — scanning it opens their WhatsApp chat instantly and feeds the business's analytics.
- **A business portal with real numbers.** Owners see views, clicks and QR scans; paid subscribers unlock full analytics, their WhatsApp conversation history, and tools to win top search placement.

**Why this is defensible:**
- **Two-sided network effects:** more listings → better search → more users → more reason to list.
- **Data moat:** every search, chat and rating feeds ranking quality.
- **WhatsApp-native distribution:** we don't ask Zimbabweans to change behaviour — we meet them where they already are.
- **Cost-efficient stack:** Next.js + Supabase + Gemini keeps running costs near zero at our current scale.

---

## Page 3 — Market & Traction

**A country-scale opportunity, already live and proving itself.**

**The market:**
- **Population:** ~16 million Zimbabweans, with a substantial diaspora (UK, South Africa, US) actively searching for services back home — gifting, family support, bookings.
- **WhatsApp penetration:** WhatsApp is the dominant messaging platform in the country, effectively the consumer gateway to the internet for millions, both consumer-side and business-side.
- **Business base:** SMMEs are the backbone of the economy — hundreds of thousands of trading entities across 20+ business categories and all major cities.
- **TAM → SAM → SOM (estimates):** total addressable spend on local business discovery and promotion is in the tens of millions USD annually; our serviceable market is the portion reachable via WhatsApp and web today; our initial obtainable share starts with the top-3 ranking spots and paid portal subscriptions in Zimbabwe's largest cities.

**Traction — live, not a slideware idea:**
- Platform live since 2024, in production on Vercel + Supabase.
- Full product operational: AI search, WhatsApp bot with rating flow, QR system, business portal, admin moderation dashboard, PWA installable, daily stats and renewal cron.
- 442+ SEO-indexed category/location/business pages with LocalBusiness structured data — organic acquisition engine running 24/7.
- Everything built and shipped by a small founder-led team, fast — evidence of execution velocity.

**Adoption signals:** listings, approvals, profile views and WhatsApp chat opens are tracked end-to-end in the analytics pipeline, giving us (and soon, investors) live product metrics rather than guesses.

---

## Page 4 — Business Model & Financials

**Three revenue streams, each a familiar, proven pattern for directories.**

**1. Paid business subscriptions (USD):**
Free listings create the network; paid subscriptions unlock the business portal — full analytics, WhatsApp conversation history, and ranking tools. Monthly/annual USD pricing that hedges inflation risk.

**2. Top-3 ranking bids (the growth engine):**
Businesses bid monthly for the top three search spots per category + city. Rules are simple and self-reinforcing: the highest bid wins #1, lower bids fill #2 and #3. This converts the most valuable real estate on the platform — prime placement in front of buying-intent users — into recurring auction revenue.

**3. Future monetisation:**
Featured placements, banner advertising for larger brands, and premium tools for agencies/multi-location businesses.

**Worked unit economics (example only):**
20 categories × 3 rank spots × 10 cities × $20/month ≈ **$12,000/month** at full occupancy — before a single subscription or ad dollar.

**12-month projections (estimates):**
- Phase 1 (months 1–3): seed the auction inventory — onboard listings in top cities/categories, first recurring bids.
- Phase 2 (months 4–8): grow paid subscriptions and ranking revenue with onboarding + WhatsApp-led marketing.
- Phase 3 (months 9–12): add online payments gateway (reducing manual admin confirmation), scale cities/categories, target [Z] ranking spots filled by month 12.

**Cost structure (estimates):** hosting (Vercel + Supabase) in the low hundreds USD/month at current scale; WhatsApp/API costs per message; AI API usage. Gross margins are very high — this is a software business with near-zero marginal cost per listing.

---

## Page 5 — Team, Roadmap & The Ask

**The right team, the right timing, one focused ask.**

**Team:**
- Founder-led: [your name] — [your background, e.g., full-stack engineer who built the entire platform: product, design, AI search, WhatsApp integration, DevOps].
- Lean by design: the whole product shipped with minimal capital — evidence of capital efficiency investors can trust.

**Next 12 months:**
- **Onboarding engine:** systematic business onboarding across Zimbabwe's major cities — field-friendly QR kits, assisted listing, WhatsApp-driven signups.
- **Payments gateway integration:** move subscription and bid payments online, removing manual admin confirmation and unlocking self-serve renewals.
- **Scale the marketplace:** grow listings, categories and cities; activate the ranking auction in high-intent categories; open diaspora marketing channels (UK, SA) where demand for Zimbabwean services is proven.
- **Data products:** richer analytics and competitor insights for paid subscribers; AI-assisted bios and marketing help for businesses.

**Use of funds ([$X] raise):**
- ~[60%] marketing & business onboarding (WhatsApp campaigns, onboarding agents, QR kits).
- ~[25%] product expansion (payments, analytics, bot improvements).
- ~[15%] operating buffer (hosting, API costs, compliance).

**The ask:** We are raising [$X] to turn a live, revenue-ready product into Zimbabwe's default place to find — and be found on — WhatsApp.

**One-line hook:** Google Maps missed the informal economy; classifieds missed WhatsApp. WA Directory is the discovery layer for the economy that actually runs Zimbabwe.
