# WA Directory — WhatsApp bot command reference

Last updated: 2026-10-27 · Bot number +263716150206 · Web app wadirectory.co.zw
Everything below works in plain WhatsApp text. Bold = a literal word.

## Customer commands (anyone)

| Command | What it does |
|---|---|
| `bread chinhoyi` | Search: product/service + town ("bread in Chinhoyi" works too) |
| `plumber` | Search without a town — bot asks your town, or you share location to rank closest first |
| `Mbuya's Kitchen harare` | Search a specific business by name |
| `bread chinhoyi USD 1` | Add a price offer to your search — suppliers can accept it or counteroffer |
| photo / voice note | Send one of what you need; the bot reads it and picks matches |
| `1` … `5` | Pick from the result rows for the contact card (WhatsApp tap or call number) |
| `order 2 bread, 1 cake` | Typed order — matches the shop you're viewing first, then every active supplier's shelf; one ✅ sends it to all of them |
| `order` | Shows how a typed order works (lesson + example) |
| `myorders` | Your order tracker: per-shop status (sent / confirmed / expired) with a link back into each supplier chat |
| `orders` (shops) | Supplier board: every open order aimed at your shop, tap ✅ to confirm — the buyer is pinged instantly with a chat link |
| `/go/o/<token>` | One-tap checkout link per shop inside an order receipt (carries the order text into the supplier's WhatsApp) |
| `register` | Start business registration (guided, ends at payment) |
| `pay` | Pay/activate a listing |
| `menu` | Interactive menu (post a need, register, pay, help) |
| `cancel` | Leave whatever flow you are in |
| `help` | The help card, plus the live WhatsApp channel link |
| `stop` | Opt out completely — `help` brings you back |

## Buyer needs (quote negotiation)

| Command | What it does |
|---|---|
| menu → Post a need | Guided need flow; you get an RQ id like RQ-7181 |
| supplier replies `RQ-7181 USD 45 delivered` | Quotes against the RQ id — appears to the buyer as cards |
| buyer taps ✅ accept | Winner gets the contact card, need closes, late quotes stop relaying |

## Owner / admin commands

The owner number comes from the `ADMIN_WHATSAPP` production env; extra admins live in `bot_settings.admin_allowlist` (dashboard: Admin → Settings, or `admin add 263…`).

### People & access

| Command | What it does |
|---|---|
| `admins` | Lists owner + allowlist, plus master hints |
| `admin add 26377…` / `admin del 26377…` | Owner-only: manage the allowlist |
| `contacts` / `contacts biz` / `contacts people` | Full directory rows with numbers (businesses, personal contacts); chunked messages |
| `contacts chats` | Everyone who has messaged the bot, most engaged first (name · number · msgs · opted-out marker) |
| `csv businesses` | WhatsApp document: name, username, city, phone, phone_type, verified, payment_status, created_at |
| `csv people` | WhatsApp document: name, city, phone, phone_type, socials, created_at |
| `csv chats` | WhatsApp document: name, phone, first/last seen, message_count, last_step, opted_out |
| `optin 263…` / `optout 263…` | Flip a participant's engagement opt-out flag |

### Needs & quoting

| Command | What it does |
|---|---|
| `needs` | Open needs board (RQ · item · town · quote count) |
| `needs today` / `needs yesterday` / `needs 22-10-2026` | Full day view — all needs incl. closed, status and quote count |
| `quotes RQ-7181` | The stored quotes on one need |
| `close RQ-7181` | Stop quote relays on a need |
| `reopen RQ-7181` | Reopen a closed need |
| `post` | Copies the newest need to the supplier channel again |

### Listings & payments

| Command | What it does |
|---|---|
| `listings` | Newest 10 businesses with verify + payment state and date |
| `pending` | Numbered list of unverified businesses |
| `verify 2` / `unverify 2` | Number from `pending`. `verify` grants **30 days by default**: creates an active listing subscription (cron reminders + expiry take over automatically), then sends the owner the you_are_live template + links (profile · auto-website · portal) + channel pitch. `verify 2 90` sets a custom day-grant |
| `verify Diamond tradings 30` / `unverify Diamond tradings` | Fuzzy business-name match — typo-friendly. One strong match acts immediately; several close matches return a numbered suggestion list to pick from. Day count sits in the same line; default 30 days |
| `switch` | Show the priority supplier switch |
| `switch on` / `switch off` / `switch price $3/month` | Flip or reprice the push-template switch |

### Broadcasting & channel

| Command | What it does |
|---|---|
| `cast your message` | Preview → confirm → send to everyone active in the 24h window (opted-out and admins excluded) |
| `cast owners <message>` / `cast buyers <message>` | Segment the broadcast: business owners (phone on a listing) or buyers (non-owners) |
| `cast owners harare <message>` | City or category filter on a segmented cast — e.g. `cast owners jewellery ...` |
| `cast owners today 15:30 <message>` / `cast buyers tomorrow 9am <message>` | Schedule a cast for a set time (Harare time); the hourly cron releases it and messages you the final counts |
| `casts` | Recent casts with status, segment and sent/failed counts |
| `cast cancel <id>` | Cancel a scheduled or in-flight cast |
| `channel` / `channel status` | Show the live channel link (settings or env) |
| `channel set https://…` / `channel clear` | Override or clear the stored link (falls back to `CHANNEL_LINK` env) |

### Reports

| Command | What it does |
|---|---|
| `digest` | Full activity report since your last check-in, then advances the cursor |
| `digest 10:30` / `digest 10:30 13:00` | Explicit time windows (cursor untouched) |
| `digest today` / `digest yesterday` / `digest 21-10-2026` | One calendar day, cursor untouched |
| `stats` | Weekly rollup (needs, searches, contacts, revenue) |

## What runs automatically

- Welcome (first contact: full starter kit + channel link + menu; returning contacts get a named welcome-back)
- Closing ceremony check at 07:00 Harare — needs silent for 22h get their closure, winner recap + quotes to the buyer
- Casts every hour: scheduled casts release at their set time, in-flight casts continue (100 recipients per run)
- Daily store report at 04:00 Harare (stats rollup)
- Idle nudges only during an active search/order step (replaceable "End search" button)
- Registration/payment confirmations + channel pitches to business owners

## Notes

- Admin commands only answer admin numbers; everyone else flows through the storefront.
- The 24h WhatsApp window: free-form replies only work inside it (any incoming message refreshes it); templates cover outside-the-window sends (`you_are_live`, digest copies).
- Casts: audience capped at 1000, first ≤400 recipients send immediately in the same request, the rest continues automatically (100 per hourly cron run) — segments can only narrow the 24h window, never widen it.
- CSV exports never include expired listings; expired rows live on the Subscriptions tab.
- **Approvals expire** — approving (bot or dashboard) grants 30 days by default; a typed day count (`verify <name> 90`) overrides. When the grant lapses, the existing cron hides the listing and pings the owner to renew.
- **Registration fields** (living form, N/10): name, category, city, phone, area, description, prices (cheapest item → most expensive), website, catalog (`wa.me/c/…`), address. Photos/voice notes sent mid-registration are read into the form; a photo doubles as the queued logo.
- **After go-live**, an owner can send a product photo and reply `name price` (e.g. `bread $2`) — the bot stocks it on the auto-website's shop shelf (`business_items`), no portal needed.
