# Gemini spend and quota — what is enforced where

Two different ceilings protect the Gemini key. They are not interchangeable,
and only one of them is ours.

| Layer | Enforced by | Limit | Resets | Where to change it |
|---|---|---|---|---|
| Application cap | `lib/ai-budget.ts` (site) and `lib/ai-budget.ts` (shared, used by the bot) | `AI_DAILY_BUDGET_USD`, default **$1.00/day** | Midnight Harare (UTC+2) | Vercel env var, both projects |
| Provider quota | Google Cloud / AI Studio | Requests per day per model | Midnight **Pacific** time | Google Cloud console (below) |
| Billing budget | Google Cloud Billing | Alert only — never blocks | Monthly | Billing → Budgets & alerts |

The application cap is the one that actually stops work: once today's
`ai_usage_log` total reaches the limit, no request leaves the server and every
feature falls back to its non-AI path. It is visible on Admin → AI Usage
(daily cap panel) and in WhatsApp (customers get the reset time once per six
hours).

## Set the real provider quota (the hard stop behind the cap)

The cap lives in your code, so a leaked key would bypass it. The provider quota
cannot be bypassed. Do this once per model the app uses.

### Exact clicks — Cloud console

1. Open <https://console.cloud.google.com/> and pick the project that owns the
   `GEMINI_API_KEY` (the key in Vercel → Settings → Environment Variables).
2. Go to **APIs & Services → Enabled APIs & services**.
3. Find **Generative Language API** in the list → click it.
4. Click **Quotas & System Limits** (left side of the API page).
5. Filter the metric column to **Generate requests per day per project per
   model** (named `generate_content_requests_per_day_per_model` in the metric
   picker).
6. Tick the rows for the models the app uses, then **Edit Quota**:
   - `gemini-3.5-flash-lite` — used for all bulk copy. A full 692-page rebuild
     is ~700 requests; 2,000/day leaves room for two rebuilds plus chat.
   - `gemini-3.1-flash-lite` — first fallback in the copy chain; 2,000/day.
   - `gemini-3.8-flash` — photos and voice only; 500/day is generous.
7. Enter the value in **New value**, add a justification ("application-level
   cap with burst allowance"), submit. Approval is usually instant for
   decreases; increases need a request.
8. Optional but recommended: **APIs & Services → Quotas & System Limits →
   Requests per minute per model** and set each to 60, so one traffic spike
   cannot burn the day in a minute.

### Same thing from the CLI (optional)

```bash
# list the quota metrics for the API
gcloud services quota list \
  --service=generativelanguage.googleapis.com \
  --consumer=projects/PROJECT_ID

# after noting the metric + unit from the list above
gcloud alpha services quota update \
  --service=generativelanguage.googleapis.com \
  --consumer=projects/PROJECT_ID \
  --metric=generativelanguage.googleapis.com/generate_content_requests_per_day_per_model \
  --unit=1/d/{project}/{model} \
  --value=2000
```

`gcloud services quota` needs the `serviceusage.services.quota.update` role
(Owner or Quota Administrator). If the unit string is rejected, use the console
path — the unit is per model and is easiest read off the console table.

### Billing budget (alerts, not a stop)

1. <https://console.cloud.google.com/billing> → select the billing account
   linked to the project.
2. **Budgets & alerts → Create budget**.
3. Scope: the project above. Amount: **$10** per month.
4. Alerts at **50% / 90% / 100%**, email to the admin address. Leave
   "Connect a Pub/Sub topic" off unless you want automated shutdown.
5. Save. Google sends the emails; it does not stop the key.

## Where the values live in the repo

- `AI_DAILY_BUDGET_USD` — read by both deployments from the environment.
  Documented in `.env.local.example`. Set it in Vercel for **both** projects so
  the site and the bot share one ceiling (they both sum the same table).
- `GEMINI_COPY_MODEL` — the bulk-copy model (default `gemini-3.5-flash-lite`).
- Pricing for the admin dashboard lives in `lib/gemini.ts` (site) and
  `lib/gemini-bot.ts` (shared); keep them in step when a price changes.

The quota numbers above are not stored anywhere in code because Google owns
them — this file is the record of what was set and why.
