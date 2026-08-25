# WA Directory — Investor Pitch

*The discovery, trust, and analytics layer for WhatsApp commerce — starting in Zimbabwe.*

> **Note on numbers:** Market figures below are drawn from commonly-cited sources (DataReportal *Digital 2024: Zimbabwe*, POTRAZ sector reports, FinScope MSME Survey, ZimStat) and are ranges to be confirmed against primary sources before an external raise. Fields marked **`[INSERT]`** are live traction metrics only the founder can fill — do not ship this deck with them blank.

---

## 1. One-liner

**WA Directory is how Zimbabwe finds and trusts the businesses it already buys from on WhatsApp.** We're the search, verification, and analytics layer on top of the country's dominant commerce channel — free to list, monetized through premium visibility.

## 2. The problem

In Zimbabwe, **WhatsApp is the storefront.** Catalogs, quotes, orders, and even payment coordination happen in chat. But the discovery layer is broken:

- **Buyers** find vendors through word-of-mouth, Facebook groups, and screenshots of phone numbers. There's no search, no reviews, no way to tell a real business from a scam.
- **Sellers** have no discovery surface and no data. They can't measure demand, see how customers found them, or reach new buyers beyond their existing contacts.
- **Existing directories don't fit.** Google Maps and legacy directories assume formal addresses, card payments, and websites — none of which describe how most Zimbabwean SMEs actually operate.

The result: a multi-million-business economy running on a channel with **no map.**

## 3. The solution

A three-sided value loop:

1. **Discover** — Search the web or ask our WhatsApp bot in plain English *or Shona* ("solar installer in Avondale"). AI turns intent into the right verified businesses.
2. **Connect** — One tap opens a WhatsApp chat with a pre-filled message. No app install, no signup, no friction. Printed QR codes turn any physical touchpoint (flyer, shopfront, business card) into an instant chat.
3. **Trust & Grow** — Verified badges and bot-collected star ratings build trust for buyers; owners get a free listing plus a portal with real analytics, and can pay for premium visibility.

**Why this wins:** we don't ask anyone to change behavior. Buyers still transact on WhatsApp; we just make the vendor findable and trustworthy. That's the lowest-friction wedge into a market everyone else finds hard to reach.

## 4. Why now

- **WhatsApp commerce is already the default** in Zimbabwe and across much of Sub-Saharan Africa — this behavior is entrenched, not emerging.
- **Meta's WhatsApp Cloud API** (which we build on) has made programmatic, verified business messaging affordable and accessible only in the last few years.
- **Cheap, good-enough AI** (Gemini Flash-class models) now makes natural-language and Shona-language search viable at near-zero marginal cost — the core of our discovery experience.
- **Smartphone + data penetration** has crossed the threshold where a WhatsApp-first, low-bandwidth PWA can reach a mass audience without an app-store install.

The enabling pieces (API, AI, penetration) only converged recently. This is a now-or-someone-else window.

## 5. Market

| | Estimate (to verify) | Basis |
|---|---|---|
| **TAM** — MSMEs in Zimbabwe | ~2.8–3.5 million | FinScope MSME Survey |
| **Reachable** — internet users | ~5+ million (~30–35% penetration) | DataReportal / POTRAZ |
| **Channel** — WhatsApp | Dominant messaging + commerce app | DataReportal |

**Bottom-up SOM (illustrative):** capture **50,000 active listings** (a small fraction of MSMEs). At an average of **$3–5/month** blended across subscriptions + ranked placement, monetizing even **10–15%** of them → **≈ $180k–$450k ARR** from a single city-dense vertical slice, before expansion.

**Expansion path:** Zimbabwe is the beachhead. The exact same playbook — WhatsApp-first, low-bandwidth, local-language, informal-sector — extends to Zambia, Malawi, Mozambique, Kenya, Nigeria, and the broader Sub-Saharan market where WhatsApp commerce dominates. The product is not Zimbabwe-specific; only the taxonomy and location data are.

## 6. Business model

Free to list (drives supply + SEO surface). Revenue from **visibility, not transactions** — no payment rails to build, no cut to police:

1. **Premium subscriptions** (recurring) — unlock analytics depth, customer conversation logs, competitor insights, and bidding eligibility.
2. **Ranked placement auction** (recurring) — top-3 search positions per category + city, sold monthly via bidding. Naturally scarce inventory → pricing power in dense categories.
3. **Future:** lead/enquiry fees, verified-business premium services, demand-data products, and eventually payment/checkout facilitation.

**Why the model is attractive:**
- **High margin, low COGS** — infra is Vercel + Supabase + Gemini; marginal cost per listing is near zero.
- **Two recurring revenue lines** from day one (subscription + placement).
- **Auction dynamics** mean revenue per category rises with directory density — it compounds as we grow.
- **Fair free tier** (rarely-seen boost) keeps the directory useful and supply growing even without payment.

## 7. Product & traction

**Built and live today** (not a concept — a working product):
- Full web directory with AI search, verified profiles, ratings, QR codes, dynamic SEO pages, and OG images.
- WhatsApp chatbot: natural-language search, tap-to-chat attribution, automatic review collection, human handoff.
- Owner portal with real visitor analytics, CSV export, and improvement tips.
- Monetization engine: subscriptions + monthly bidding, with an admin panel to run it all.
- Automated lifecycle: nightly analytics rollups, renewal reminders, expiry handling.

**Traction to fill in before pitching:**
- Listings live: **`[INSERT]`** (verified: **`[INSERT]`**)
- Monthly active buyers / searches: **`[INSERT]`**
- WhatsApp chats initiated / month: **`[INSERT]`**
- Paying businesses / MRR: **`[INSERT]`**
- Month-over-month growth: **`[INSERT]`**

## 8. Go-to-market

1. **Seed supply density, city by city** (Harare → Bulawayo → Mutare). A directory is only useful when it's dense in a category+location, so we go deep before wide.
2. **QR-code virality** — every listed business gets printable QR cards; each physical placement is a customer-acquisition surface that also recruits the next vendor.
3. **SEO compounding** — category+location pages ("plumber in Harare") capture organic search intent that currently has no good local answer.
4. **WhatsApp-native growth** — the bot itself is a distribution channel; shares and referrals happen inside chats where our audience already is.
5. **Owner pull** — free analytics gives owners a reason to log in weekly; premium upsell converts the engaged.

## 9. Competition & moat

- **Google / Facebook / classifieds:** built for formal, address-and-website businesses and card payments — structurally mismatched to informal WhatsApp commerce and local-language, low-bandwidth users.
- **Other directories:** thin listings, no WhatsApp-native connection, no trust layer, no analytics.

**Our moat compounds:**
- **Two-sided data** — the proprietary demand signal (what people search for, where supply is missing) is something no competitor has and becomes a product in itself.
- **Verified supply density** per category+city — the classic directory network effect; hard to replicate once we're the default in a category.
- **WhatsApp attribution** — we can prove we sent a business its customers, which underpins pricing power for placement.
- **Local depth** — Shona-language search, Zimbabwe taxonomy, and informal-sector fit are real localization work, not a weekend port.

## 10. The ask & use of funds

**Raising: `[INSERT amount]` to reach `[INSERT milestone: e.g. 25k active listings + $X MRR across 3 cities]`.**

Indicative allocation:
- **~40% Growth** — city-by-city supply seeding, QR distribution, field/community reps.
- **~30% Product & engineering** — payments integration, security hardening, bot depth, localization.
- **~15% Trust & operations** — verification at scale, moderation, support.
- **~15% Runway / G&A.**

## 11. Risks & mitigations

| Risk | Mitigation |
|---|---|
| **Platform dependence on Meta / WhatsApp** | Web + PWA + SEO give an independent surface; multi-channel (SMS/Telegram) is feasible on the same data model. |
| **Monetizing low-ARPU informal businesses** | Recurring micro-pricing + scarce auction inventory; free tier keeps the funnel full; ARPU rises with density. |
| **Manual payments today** | Near-term EcoCash / local-gateway integration is scoped and low-risk. |
| **Security debt at scale** (see engineering audit) | A hardening sprint (real admin auth, RLS lockdown, rate limiting) precedes any growth push. |
| **Trust/fraud as we grow** | Verification workflow already exists; ratings + reporting scale it; verified badge is a paid trust signal. |

## 12. Vision

Start as the directory. Become the **operating layer for WhatsApp commerce in Africa** — discovery, trust, analytics, and eventually payments and lead-flow — for the millions of businesses the rest of the internet economy has left off the map.

WhatsApp gave Africa its storefront. **We're building the map, the reviews, and the analytics on top of it.**

---

### Appendix — sources & assumptions
- Market sizing: FinScope MSME Survey (Zimbabwe); DataReportal *Digital 2024: Zimbabwe*; POTRAZ quarterly sector reports; ZimStat. Verify current figures with primary sources before external use.
- Revenue illustrations are bottom-up scenarios, **not** forecasts, and assume manual-payment conversion rates the founder should replace with observed data.
- Product claims reflect the current codebase (Next.js 14 + Supabase + WhatsApp Cloud API + Gemini), verified against the repository.
