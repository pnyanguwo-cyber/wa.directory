/**
 * Trial eligibility and management helpers for 90-day free trials.
 * Integrates with the existing subscription infrastructure.
 */

import { getSupabase } from '@/lib/supabase-server'
import { PLAN_CONFIG, PERSONAL_PLAN_CONFIG, type PlanType } from '@/types'

const TRIAL_DAYS = 90

/**
 * Check if a business is eligible for a free trial.
 * Business is eligible if:
 * 1. It has no active paid subscription
 * 2. It's not in a special category (Yellow Pages, etc.)
 * 3. It hasn't already used a trial in the past 12 months
 */
export async function isTrialEligible(businessId: string): Promise<{
  eligible: boolean
  reason?: string
}> {
  const supabase = getSupabase()

  // Get business with category info
  const { data: business, error: bizError } = await supabase
    .from('businesses')
    .select('id, category, payment_status')
    .eq('id', businessId)
    .single()

  if (bizError || !business) {
    return { eligible: false, reason: 'Business not found' }
  }

  // Check for active paid subscription
  const { data: activeSub } = await supabase
    .from('listing_subscriptions')
    .select('id, status')
    .eq('business_id', businessId)
    .eq('status', 'active')
    .neq('trial_eligible', false) // Exclude trial subscriptions
    .maybeSingle()

  if (activeSub) {
    return { eligible: false, reason: 'Already has active subscription' }
  }

  // Check for special categories (Yellow Pages, etc.)
  const { data: specialCats } = await supabase
    .from('categories')
    .select('name')
    .eq('special', true)
    .in('name', business.category || [])

  if (specialCats && specialCats.length > 0) {
    return { eligible: false, reason: 'Cannot trial in special category' }
  }

  // Check for recent trial (within 12 months)
  const twelveMonthsAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
  const { data: recentTrial } = await supabase
    .from('listing_subscriptions')
    .select('id')
    .eq('business_id', businessId)
    .eq('trial_eligible', true)
    .gte('trial_activated_at', twelveMonthsAgo)
    .maybeSingle()

  if (recentTrial) {
    return { eligible: false, reason: 'Used trial within last 12 months' }
  }

  return { eligible: true }
}

/**
 * Get the trial end date (90 days from activation).
 */
export function getTrialEndDate(activatedAt?: string): Date {
  const base = activatedAt ? new Date(activatedAt) : new Date()
  return new Date(base.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
}

/**
 * Check if a trial is still active.
 */
export function isTrialActive(trialActivatedAt?: string, trialExpiresAt?: string): boolean {
  if (!trialExpiresAt) return false
  const now = new Date()
  return now < new Date(trialExpiresAt)
}

/**
 * Check if trial is within 7 days of expiry.
 */
export function isTrialExpiringSoon(trialExpiresAt?: string): boolean {
  if (!trialExpiresAt) return false
  const now = new Date()
  const expiry = new Date(trialExpiresAt)
  const sevenDays = 7 * 24 * 60 * 60 * 1000
  return expiry.getTime() - now.getTime() <= sevenDays && now < expiry
}

/**
 * Check if trial is within 3 days of expiry.
 */
export function isTrialExpiringSoon3Days(trialExpiresAt?: string): boolean {
  if (!trialExpiresAt) return false
  const now = new Date()
  const expiry = new Date(trialExpiresAt)
  const threeDays = 3 * 24 * 60 * 60 * 1000
  return expiry.getTime() - now.getTime() <= threeDays && now < expiry
}

/**
 * Get the number of days remaining in trial.
 */
export function getDaysRemaining(trialExpiresAt?: string): number {
  if (!trialExpiresAt) return 0
  const now = new Date()
  const expiry = new Date(trialExpiresAt)
  const diff = expiry.getTime() - now.getTime()
  return Math.ceil(diff / (24 * 60 * 60 * 1000))
}

/**
 * Format trial status message for display.
 */
export function formatTrialStatus(trialActivatedAt?: string, trialExpiresAt?: string): string {
  if (!trialActivatedAt) return 'No trial active'
  if (!trialExpiresAt) return 'Trial not started'

  const daysRem = getDaysRemaining(trialExpiresAt)

  if (daysRem <= 0) {
    return 'Trial expired'
  }

  if (daysRem < 3) {
    return `Trial expires in ${daysRem} day${daysRem !== 1 ? 's' : ''} — renew soon`
  }

  if (daysRem < 7) {
    return `Trial expires in ${daysRem} days`
  }

  return `Trial active for ${daysRem} days remaining`
}

/**
 * Calculate trial price display (always $0 for free trial).
 */
export function getTrialPriceDisplay(): string {
  return 'FREE'
}

/**
 * Get the trial plan label.
 */
export function getTrialPlanLabel(): string {
  return '90-Day Free Trial'
}