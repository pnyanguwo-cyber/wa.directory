# Agent Memory — wa.directory

## Credentials & Access
- Root production domains: `wadirectory.co.zw`, `www.wadirectory.co.zw`, `wadirectory.vercel.app` (`https://wa.directory` does NOT resolve).
- Vercel: team `team_SHuMRIj4nCp5iaa9EwNDHxPc`, project `wa.directory` (`prj_41iK4P040DRTLKaWNcFPudFVGCbY`), GitHub `pnyanguwo-cyber/wa.directory` branch `master`.
- Admin password rotated 2026-11-08 to `lDjlCoA2Kag6c70oJZ1W36iU` (old `Wadirectory@2026` no longer valid). Stored in Vercel env var `ADMIN_PASSWORD` (Production id `O4xSV9H6HP7Fi9kX`, Preview id `pU5IDQCmhRWBlven`) and `.env.local`.

## Environment Variables (Vercel)
- Per-environment: each env var belongs to Production and/or Preview separately. Production-only vars: `BUSINESS_AUTH_SECRET` (`3BXCOXJp6OtCnfcx`), `CRON_SECRET` (`BpOMJmTbOWUvAGpb`), `SITE_URL` (`sSl9S5MY6Bz7EAPw`), `SUPABASE_SERVICE_ROLE_KEY` (`lZYTthuHnXrScqFZ`), `ADMIN_WHATSAPP` (`Qo65AmcIxQH6S1Fs`), `ADMIN_PASSWORD` (`O4xSV9H6HP7Fi9kX`).
- Editing an env var does NOT affect already-running deployments; a redeploy is required.
- Sensitive env var PATCH must omit the `key` field, else 400.
- Redeploying an existing deployment via API (`deploymentId` + `name`) with `target:null` selects the PREVIEW env set — if a var is Production-only (e.g. `BUSINESS_AUTH_SECRET`), the login route 500s with "Server misconfigured". Always use `target: "production"` for production redeploys; production-target deployments auto-alias the project's production domains.

## Auth Mechanics (`lib/admin-auth.ts`)
- Login compares sha256(password) vs sha256 of `process.env.ADMIN_PASSWORD` (constant-time).
- Success issues `admin_token` cookie: HMAC-SHA256 over `admin:${expiry}` keyed by `BUSINESS_AUTH_SECRET`, 24h TTL, Secure/HttpOnly/SameSite=lax.
- Rotating `BUSINESS_AUTH_SECRET` invalidates existing sessions immediately; rotating `ADMIN_PASSWORD` leaves old cookies valid up to 24h.

## Next-Time Password Rotation Procedure
1. Generate password; update Vercel `ADMIN_PASSWORD` for **Production** (and Preview) via `vercel_edit_project_env` (omit `key`, include `type`, `value`, `target`, `comment`).
2. Update `.env.local` locally.
3. Redeploy: `vercel_create_deployment` with `name: "wa.directory"`, `deploymentId` = current prod deployment, `target: "production"` (meta reason text recommended). ItREADY-builds from the committed SHA `dd7210c…` — never ship the uncommitted working tree (large feature work must not be staged/committed without asking).
4. Verify: POST JSON body via temp file (`--data @file`), not inline — PowerShell 5.1 strips embedded quotes from curl args. New pw → `200 {"success":true}` + `Set-Cookie: admin_token`; old pw → `{"success":false}`. Test on both `wadirectory.vercel.app` and `wadirectory.co.zw`.

## Session History
- 2026-11-08: Rotated admin password. Diagnosed production login 500s (root cause: Production-only env vars missing from target:null redeploy). Fixed via explicit production-target redeploy `dpl_A1VC2sGvYZAGKjTkhaXTCMSnqbCe`; all tests green. Earlier: Supabase remote migration convergence complete (all migrations paired, no drift).
