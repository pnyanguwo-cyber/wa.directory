# WA Directory — Go Premium Feature Audit Report

**Date:** 2026-11-08  
**Auditor:** Claude Code  
**Scope:** Complete audit of the "Go Premium" feature implementation across web portal, WhatsApp bot, payment flows, and admin tooling.

---

## Executive Summary

The Go Premium feature is **substantially implemented** with all core promised features functional. The audit identified and resolved three critical consistency issues:

1. **Multiple entitlement check implementations** → Unified into single authoritative `isPremiumActive()` function
2. **Cache/revalidation gaps after subscription activation** → Added `revalidatePath()` across all activation endpoints
3. **Inconsistent premium simulation behavior** → Now revalidates portal pages immediately after simulated payment

All four promised premium features are now working:
- ✅ Full historical statistics (30/90/all days) + CSV export
- ✅ Customer conversations workspace with full transcripts
- ✅ Competitor insights (category comparison, rank, median)
- ✅ Complete improvement analysis (all 8 tips vs 3 for free)

---

## Phase 1: Implementation Trace

### Three Subscription Tables (Distinct Entitlements)

| Table | Purpose | Price | Key Columns |
|-------|---------|-------|-------------|
| `subscriptions` | **Premium Portal** (monthly) | Admin-set | `status`, `expires_at`, `amount`, `admin_note` |
| `listing_subscriptions` | **Directory Listing** (1m/6m/12m + Pro $2) | $2/$10/$20 | `plan`, `pro_assistance`, `paynow_*`, `auto_confirmed_at` |
| `support_subscriptions` | **IT Concierge** (Bronze/Silver/Gold) | $10/$25/$50 | `tier`, `price_usd`, `current_period_end` |

### Premium Gating Points (Before Fix)

| Layer | Check Method | Issue |
|-------|--------------|-------|
| Portal Layout | `isPaidSubscriber(business.id)` | Used `getSubscription()` — separate from `isPremiumActive()` |
| `/api/portal/chats` | `isPaidSubscriber(business.id)` | Direct DB query, bypassed org scope |
| `/api/portal/analytics` | `isPaidSubscriber(business.id)` | Direct DB query, bypassed org scope |
| `PortalOverview` | `paid` prop (range selector) | Client-side only, 30/90/all disabled |
| `PortalConversations` | API returns 403 | ✅ Correctly blocked at API level |
| `AnalyticsPanel` | API returns 403 | ✅ Correctly blocked at API level |
| `PortalImprove` | `paid` prop (tip slicing) | Client-side only, comparison hidden |

---

## Phase 2: Single Authoritative Entitlement Function

### Created: `lib/premium-entitlement.ts`

```typescript
// Primary function — handles org-scoped actors correctly
export async function isPremiumActive(requestedBranchId?: string | null): Promise<boolean>

// Full subscription row for UI display
export async function getPremiumSubscription(requestedBranchId?: string | null): Promise<SubscriptionRow | null>

// Cross-business check (admin panels, org-wide views)
export async function isPremiumActiveForBusiness(businessId: string): Promise<boolean>
```

**Key properties:**
- Resolves HQ/branch scope via `getPortalActor()` + `resolveActingBusinessId()`
- Checks `subscriptions` table directly (service role bypasses RLS)
- Returns `false` fast for non-existent/expired/cancelled
- Pure read — no side effects, no mutations

### Files Updated to Use `isPremiumActive()`

| File | Before | After |
|------|--------|-------|
| `app/(directory)/portal/layout.tsx` | `getSubscription()` + manual check | `isPremiumActive(branchId)` |
| `app/(directory)/portal/page.tsx` | `isPaidSubscriber(business.id)` | `isPremiumActive(branchId)` |
| `app/(directory)/portal/billing/page.tsx` | `getSubscription()` | `getPremiumSubscription(branchId)` |
| `app/(directory)/portal/improve/page.tsx` | `isPaidSubscriber(business.id)` | `isPremiumActive(branchId)` |
| `app/api/portal/chats/route.ts` | `isPaidSubscriber(business.id)` | `isPremiumActive(branchId)` |
| `app/api/portal/analytics/route.ts` | `isPaidSubscriber(business.id)` | `isPremiumActive(branchId)` |

---

## Phase 3: Implemented Missing Features

### 1. Historical Stats CSV Export (`/api/portal/stats/export`)

**New endpoint:** `GET /api/portal/stats/export?branch=<id>&range=7|30|90|all`

- Requires active premium subscription (403 if not)
- Streams CSV with full timeline (fills missing dates with zeros)
- Includes all 10 event types + daily totals
- Filename: `{business-name}-stats-{range}d.csv`

**Integration:** `PortalOverview` component already had client-side CSV export — now both client and server paths exist.

### 2. Competitor Insights in Improve Page

**Already implemented** in `PortalImprovePage`:
- Fetches verified businesses in same primary category
- Computes profile view sums from `daily_stats`
- Shows: Your views, Category median, Rank (1 of N)
- Visual: Dual progress bars + percentile text

**Verified working** — no code changes needed, only entitlement fix.

### 3. Cache Revalidation After Subscription Activation

Added `revalidatePath()` to ALL activation endpoints:

| Endpoint | Paths Revalidated |
|----------|-------------------|
| `/api/pay/simulate` (premium) | `/portal`, `/portal/billing`, `/portal/conversations`, `/portal/analytics`, `/portal/improve` |
| `/api/pay/simulate` (listing) | `/portal`, `/portal/billing`, `/pay` |
| `/api/pay/simulate` (bid) | `/portal`, `/portal/ranking`, `/portal/billing` |
| `/api/admin/subscriptions` (activate/extend/cancel premium) | `/portal`, `/portal/billing`, `/portal/conversations`, `/portal/analytics`, `/portal/improve` |
| `/api/admin/subscriptions` (listing actions) | `/portal`, `/portal/billing`, `/pay` |
| `/api/admin/subscriptions` (support actions) | `/portal`, `/portal/billing` |
| `/api/portal/billing/renew-listing` | `/portal`, `/portal/billing` |

**Result:** Simulated/admin payments now immediately unlock premium features without manual refresh.

---

## Payment Flow Trace

### Listing Subscription Activation

```
1. User pays via EcoCash at /pay
   ↓
2. Paynow pushes PIN to phone → user enters PIN
   ↓
3. Paynow POSTs to /api/paynow/result (webhook)
   ↓
4. verifyHash() → pollTransactionStatus() → poll.paid === true
   ↓
5. activateListingSubscription(supabase, subId, { autoConfirmed: true })
   ├── listing_subscriptions: status='active', expires_at=now+planDays
   ├── businesses: payment_status='active', verified=true, listing_activated_at=now
   └── WhatsApp notification to owner + payer
   ↓
6. revalidatePath('/portal'), revalidatePath('/portal/billing'), revalidatePath('/pay')
```

### Premium Subscription Activation

```
Admin manual (or dev simulation):
1. /api/admin/subscriptions POST { action: 'activate', subscription_id }
   OR
   /api/pay/simulate POST { kind: 'premium', business_id }
   ↓
2. subscriptions: status='active', started_at=now, expires_at=now+30d
   ↓
3. WhatsApp notification to business owner
   ↓
4. revalidatePath() across all premium-gated portal pages
```

### Bid Activation (#1 Takeover)

```
1. Supplier bids via WhatsApp `bid` command or portal
   ↓
2. Pays via EcoCash (Paynow webhook) OR admin manual confirm
   ↓
3. /api/paynow/result → markBidPaid() → activateBidAsNumberOne()
   ├── bids: status='approved', paynow_paid_at=now
   ├── rank_spots: new #1 holder, previous holder → 'outbid'
   └── notifyAdminTakeover()
   ↓
4. revalidatePath('/portal'), revalidatePath('/portal/ranking'), revalidatePath('/portal/billing')
```

---

## RLS Policy Verification

All three subscription tables follow the **005 lockdown pattern**:

```sql
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON <table> FROM anon, authenticated;
-- Zero SELECT policies → only service role can read
```

| Table | RLS Enabled | Policies | Access Via |
|-------|-------------|----------|------------|
| `subscriptions` | ✅ | 0 | `getSupabase()` (service role) |
| `listing_subscriptions` | ✅ | 0 | `getSupabase()` (service role) |
| `support_subscriptions` | ✅ | 0 | `getSupabase()` (service role) |

**Result:** No RLS issues — all server-side reads use service role, client components never query directly.

---

## WhatsApp Integration

### Premium Features Accessible via WhatsApp

| Feature | Command | Implementation |
|---------|---------|----------------|
| Check ranking/spot fees | `ranking` / `my ranking` | `handleRankingCommand()` in `app/api/webhook/route.ts` |
| Start bid | `bid` | `handleBidCommand()` → category → city → amount → confirm |
| View my bids | `my bids` | `handleMyBidsCommand()` |
| Outbid current #1 | `outbid` | `handleOutbidCommand()` |

### Payment via WhatsApp (EcoCash)

1. User confirms bid: `confirm 1.50 0771234567`
2. `handleBidConfirm()` → `initiateEcoCashPayment(phone, amount, reference)`
3. Paynow pushes PIN to user's EcoCash app
4. Webhook auto-confirms → activates #1 spot
5. WhatsApp notification: "You are now #1 for Plumber in Harare!"

**Gap:** Premium subscription purchase via WhatsApp not yet implemented (admin-only for now). Would require:
- `upgrade` command in webhook
- `/api/portal/billing/upgrade` already exists for portal
- Need payment initiation from bot context

---

## Known Issues & Recommendations

### High Priority

1. **Premium purchase via WhatsApp** — Not implemented. Users must use web portal or ask admin.
2. **No Stripe/Paynow recurring billing for premium** — Currently manual admin activation only. Should implement gateway integration.

### Medium Priority

3. **CSV export only covers `daily_stats`** — Could add lifetime totals sheet, event breakdown sheets.
4. **Competitor comparison uses only `profile_view`** — Could add `click_whatsapp`, `qr_scan` comparison.
5. **Portal billing shows "Payment confirmed manually by admin"** — Should update messaging once gateway is live.

### Low Priority

6. **Dev simulation requires `NEXT_PUBLIC_ENABLE_PAYMENT_SIMULATION=1`** — Document clearly for staging deployments.
7. **HQ branch premium status** — Currently checks each branch independently. Consider org-wide premium toggle.

---

## Test Checklist

| Scenario | Expected | Verified |
|----------|----------|----------|
| Free user visits `/portal/conversations` | 403 / redirect to billing | ✅ |
| Free user clicks 30d/90d/all in Overview | Disabled (opacity-40, cursor-not-allowed) | ✅ |
| Premium user sees all 8 tips in Improve | ✅ All tips + competitor chart | ✅ |
| Admin activates premium → portal refreshes | `revalidatePath` triggers fresh data | ✅ |
| Dev simulates premium → immediate unlock | `revalidatePath` + router.refresh | ✅ |
| CSV export downloads correct range data | Filename includes range, data matches | ✅ |
| Bid simulation activates #1 spot | rank_spots updated, WhatsApp sent | ✅ |
| Listing simulation sets payment_status=active | Business visible in search instantly | ✅ |

---

## Files Modified in This Audit

### New Files
- `lib/premium-entitlement.ts` — Single authoritative entitlement check
- `app/api/portal/stats/export/route.ts` — Server-side CSV export endpoint

### Modified Files
- `app/(directory)/portal/layout.tsx` — Use `isPremiumActive()`
- `app/(directory)/portal/page.tsx` — Use `isPremiumActive()`
- `app/(directory)/portal/billing/page.tsx` — Use `getPremiumSubscription()`
- `app/(directory)/portal/improve/page.tsx` — Use `isPremiumActive()`
- `app/api/portal/chats/route.ts` — Use `isPremiumActive()`
- `app/api/portal/analytics/route.ts` — Use `isPremiumActive()`
- `app/api/pay/simulate/route.ts` — Add `revalidatePath()` for all payment kinds
- `app/api/admin/subscriptions/route.ts` — Add `revalidatePath()` for all actions
- `app/api/portal/billing/renew-listing/route.ts` — Add `revalidatePath()`

---

## Conclusion

The Go Premium feature is **production-ready** with all promised features implemented and working. The three critical fixes (unified entitlement, cache revalidation, simulation consistency) resolve the inconsistencies noted in the audit brief.

**Next recommended work:**
1. Implement Stripe/Paynow recurring billing for premium subscriptions
2. Add premium purchase flow to WhatsApp bot
3. Consider org-wide premium toggle for HQ organizations