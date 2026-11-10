import { getSupabase } from '@/lib/supabase-server'
import { getPortalActor, resolveActingBusinessId, type PortalActor } from '@/lib/org-auth'

/**
 * Single authoritative premium entitlement check.
 *
 * This is THE function to use everywhere — API routes, server components,
 * client components (via server actions), middleware — for "is this business
 * on an active premium subscription?".
 *
 * Key properties:
 * - Handles org-scoped actors: HQ checking a branch's premium status resolves
 *   to that branch's business_id, not the HQ's.
 * - Checks `subscriptions` table directly (service role bypasses RLS).
 * - Returns false fast for non-existent/expired/cancelled.
 * - No side effects, no mutations — pure read.
 *
 * @param requestedBranchId Optional branch ID (for HQ acting on a branch).
 *                          Comes from ?branch= query or body.branch_id.
 * @returns true only if the acting business has an active, non-expired premium subscription.
 */
export async function isPremiumActive(
  requestedBranchId?: string | null
): Promise<boolean> {
  const actor = await getPortalActor()
  if (!actor) return false

  // Resolve which business we're actually checking — respects org scope.
  const actingBusinessId = await resolveActingBusinessId(actor, requestedBranchId)

  const { data: sub } = await getSupabase()
    .from('subscriptions')
    .select('status, expires_at')
    .eq('business_id', actingBusinessId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!sub) return false
  if (sub.status !== 'active') return false
  if (sub.expires_at && new Date(sub.expires_at) <= new Date()) return false

  return true
}

/**
 * Get the full premium subscription row for the acting business.
 * Use when you need amount, expires_at, admin_note, etc.
 */
export async function getPremiumSubscription(
  requestedBranchId?: string | null
): Promise<{
  status: string
  expiresAt: string | null
  amount: number
  adminNote: string
} | null> {
  const actor = await getPortalActor()
  if (!actor) return null

  const actingBusinessId = await resolveActingBusinessId(actor, requestedBranchId)

  const { data } = await getSupabase()
    .from('subscriptions')
    .select('status, expires_at, amount, admin_note')
    .eq('business_id', actingBusinessId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return null

  return {
    status: data.status,
    expiresAt: data.expires_at,
    amount: Number(data.amount || 0),
    adminNote: data.admin_note || '',
  }
}

/**
 * Check if a specific business (by UUID) has active premium.
 * Use for cross-business checks (e.g., admin panel, org-wide views).
 * Does NOT go through org-auth — takes a raw business_id.
 */
export async function isPremiumActiveForBusiness(businessId: string): Promise<boolean> {
  const { data: sub } = await getSupabase()
    .from('subscriptions')
    .select('status, expires_at')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!sub) return false
  if (sub.status !== 'active') return false
  if (sub.expires_at && new Date(sub.expires_at) <= new Date()) return false

  return true
}