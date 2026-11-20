# Plan: Fix WhatsApp Bot Deployment Confusion

## Context

The user reports that changes to the WhatsApp chatbot are being pushed to the wrong deployment, and there are 2 deployments confusing each other.

## Investigation Findings

### YES - There are TWO separate Vercel deployments:

| Deployment | Vercel Project ID | Repository | Webhook Route |
|------------|-------------------|------------|---------------|
| **wa.directory (Web App)** | `prj_41iK4P040DRTLKaWNcFPudFVGCbY` | `wa.directory` | `app/api/webhook/route.ts` |
| **wa-directory-bot (WhatsApp Bot)** | `prj_UTgk2dMAjupPlBUPN84kWeigokt4` | `wa-directory-bot` | `src/webhook.ts` |

### Both repositories:
- Deploy to the same Vercel org: `team_SHuMRIj4nCp5iaa9EwNDHxPc`
- Use the same Supabase database: `zefhvpifhzklkbkptjgv.supabase.co`
- Share code via `@wa-directory/shared` package

### Root Causes of Confusion:

1. **Two GitHub repos with different deployment IDs**
   - Main repo: `pnyanguwo-cyber/wa.directory` → `VERCEL_PROJECT_ID_WA_DIRECTORY`
   - Bot repo: `pnyanguwo-cyber/wa-directory-bot` → `VERCEL_PROJECT_ID_WA_DIRECTORY_BOT`

2. **Both have webhook endpoints**
   - Old webhook in `wa.directory/app/api/webhook/route.ts`
   - New webhook in `wa-directory-bot/src/webhook.ts`

3. **Meta Webhook Configuration** - The WhatsApp Cloud API must point to ONE webhook URL. If it's pointing to the OLD webhook (`wadirectory.vercel.app/api/webhook`), messages go to the old handler.

4. **The `update-wa-token.mjs` script at `wa.directory/scripts/update-wa-token.mjs` is hardcoded to the web app's project ID** (`prj_41iK4P040DRTLKaWNcFPudFVGCbY`), making it impossible to update the bot's token with this script.

5. **Migration scripts reference multiple Supabase projects** (`sync-whatsapp-usernames.mjs`, `backfill-usernames.mjs`)

## Recommended Fixes

### Option A: Redirect Meta Webhook to new bot (if bot is correct)
1. Update Meta WhatsApp Business Manager webhook URL to: `https://wadirectory.co.zw/api/webhook` (if the bot is deployed there)
2. Remove or archive the old `wa.directory/app/api/webhook/route.ts`

### Option B: Consolidate to single deployment
Delete the `wa-directory-bot` repository and keep all code in `wa.directory`, OR
Keep `wa-directory-bot` but configure the web app's webhook to proxy to it.

### Immediate Actions Needed:

1. **Verify which webhook is active in Meta Business Manager**
   - Check the webhook URL configured in Meta > WhatsApp > Cloud API > Webhooks

2. **Check Vercel project configurations**
   - Both projects should have their env vars pointing to the same WhatsApp credentials

3. **Update `update-wa-token.mjs`** to handle both projects OR create a bot-specific version

4. **Remove or clearly mark legacy migration scripts** as historical

## Investigation Complete

The user needs to clarify:
1. Which deployment is the "correct" one (web app only, or separate bot)?
2. Are changes being made to the wrong repository?
3. What is the expected architecture?