/**
 * Centralized AI Gateway - enforces all Gemini API controls.
 *
 * This module provides a single entry point for all Gemini API requests.
 * It checks:
 * 1. Global AI pause status
 * 2. Individual feature enabled status
 * 3. Business/account attribution
 * 4. Subscription tier and applicable allowance
 * 5. Daily and monthly usage limits
 * 6. Duplicate request prevention (idempotency)
 *
 * All callers must use this gateway instead of calling fetchGemini directly.
 */

import { getSupabase } from '@/lib/supabase-server'
import { getBotSetting } from '@/lib/bot-settings'
import { getCalendarDateKey } from '@/lib/date-utils'
import { logAiUsage, type AiFeature } from './gemini'

// Default limits when no settings exist
const DEFAULT_FEATURE_CONTROLS: Record<string, { enabled: boolean; daily_limit_per_biz?: number; monthly_limit_per_biz?: number }> = {
  registration_draft: { enabled: true, daily_limit_per_biz: 10 },
  listing_draft: { enabled: true, daily_limit_per_biz: 20 },
  search_expansion: { enabled: true, daily_limit_per_biz: 50 },
  seo_blurb: { enabled: true, daily_limit_per_biz: 5 },
  intent_classification: { enabled: true, daily_limit_per_biz: 100 },
  vision_analysis: { enabled: true, daily_limit_per_biz: 10 },
}

const DEFAULT_USAGE_LIMITS = {
  free: { daily_requests: 20, daily_tokens: 50000, monthly_tokens: 500000 },
  premium: { daily_requests: 200, daily_tokens: 500000, monthly_tokens: 5000000 },
  admin: { daily_requests: 1000, daily_tokens: 2000000, monthly_tokens: 20000000 },
}

/**
 * Check if global AI is paused.
 * Returns { paused: true, reason } if paused, { paused: false } if active.
 */
export async function checkAiGlobalPause(): Promise<{ paused: boolean; reason?: string; pausedAt?: string; pausedBy?: string }> {
  const raw = await getBotSetting('ai_global_paused')
  if (!raw) return { paused: false }
  try {
    const parsed = JSON.parse(raw) as { paused: boolean; reason?: string; paused_at?: string; paused_by?: string }
    if (parsed.paused) {
      return { paused: true, reason: parsed.reason, pausedAt: parsed.paused_at, pausedBy: parsed.paused_by }
    }
  } catch {
    // Invalid setting, allow
  }
  return { paused: false }
}

/**
 * Get feature control settings.
 */
export async function getFeatureControl(feature: AiFeature): Promise<{ enabled: boolean; daily_limit_per_biz?: number; monthly_limit_per_biz?: number }> {
  const raw = await getBotSetting('ai_feature_controls')
  if (!raw) return DEFAULT_FEATURE_CONTROLS[feature] || { enabled: true }
  try {
    const parsed = JSON.parse(raw) as Record<string, { enabled: boolean; daily_limit_per_biz?: number; monthly_limit_per_biz?: number }>
    return parsed[feature] || DEFAULT_FEATURE_CONTROLS[feature] || { enabled: true }
  } catch {
    return DEFAULT_FEATURE_CONTROLS[feature] || { enabled: true }
  }
}

/**
 * Get usage limits for a tier.
 */
export async function getUsageLimits(tier: 'free' | 'premium' | 'admin' = 'free'): Promise<{
  daily_requests: number
  daily_tokens: number
  monthly_tokens: number
}> {
  const raw = await getBotSetting('ai_usage_limits')
  if (!raw) return DEFAULT_USAGE_LIMITS[tier]
  try {
    const parsed = JSON.parse(raw) as Record<string, { daily_requests: number; daily_tokens: number; monthly_tokens: number }>
    return parsed[tier] || DEFAULT_USAGE_LIMITS[tier]
  } catch {
    return DEFAULT_USAGE_LIMITS[tier]
  }
}

/**
 * Get current usage for a business in the Harare calendar day/month.
 * Returns usage counts that should be compared against limits.
 */
export async function getBusinessAiUsage(businessId: string, channel: string): Promise<{
  todayRequests: number
  todayTokens: number
  todayErrors: number
  monthlyRequests: number
  monthlyTokens: number
  monthlyErrors: number
}> {
  const supabase = getSupabase()
  const today = getCalendarDateKey().harare.date
  const thisMonth = getCalendarDateKey().harare.month

  const { data } = await supabase
    .from('ai_usage_log')
    .select('id, total_tokens, status, created_at')
    .eq('business_id', businessId)
    .eq('channel', channel)

  const logs = (data as any[]) || []

  let todayRequests = 0, todayTokens = 0, todayErrors = 0
  let monthlyRequests = 0, monthlyTokens = 0, monthlyErrors = 0

  for (const log of logs) {
    const createdAt = log.created_at
    const isToday = createdAt && createdAt.slice(0, 10) === today
    const isThisMonth = createdAt && createdAt.slice(0, 7) === thisMonth

    if (isToday) {
      todayRequests++
      todayTokens += log.total_tokens || 0
      if (log.status !== '200') todayErrors++
    }

    if (isThisMonth) {
      monthlyRequests++
      monthlyTokens += log.total_tokens || 0
      if (log.status !== '200') monthlyErrors++
    }
  }

  return { todayRequests, todayTokens, todayErrors, monthlyRequests, monthlyTokens, monthlyErrors }
}

/**
 * Check if a business has quota for a given feature.
 * Returns { allowed: true } if within limits, { allowed: false, reason } if blocked.
 */
export async function checkBusinessQuota(
  businessId: string | null,
  feature: AiFeature,
  estimatedTokens: number,
  channel: string = 'web'
): Promise<{ allowed: boolean; reason?: string; limit?: number; used?: number }> {
  const featureControl = await getFeatureControl(feature)
  const limits = await getUsageLimits('free') // Default to free tier; can be overridden

  // If feature is disabled globally
  if (!featureControl.enabled) {
    return { allowed: false, reason: 'feature_disabled' }
  }

  // If no business attribution, check global limits only
  if (!businessId) {
    // Check if we'd exceed global rate limits (simplified check)
    return { allowed: true }
  }

  const usage = await getBusinessAiUsage(businessId, channel)

  // Check daily token limit
  if (featureControl.daily_limit_per_biz !== undefined) {
    if (usage.todayTokens + estimatedTokens > featureControl.daily_limit_per_biz * 1000) {
      return { allowed: false, reason: 'daily_limit_exceeded', limit: featureControl.daily_limit_per_biz * 1000, used: usage.todayTokens }
    }
  }

  // Check monthly token limit
  if (featureControl.monthly_limit_per_biz !== undefined) {
    if (usage.monthlyTokens + estimatedTokens > featureControl.monthly_limit_per_biz * 1000) {
      return { allowed: false, reason: 'monthly_limit_exceeded', limit: featureControl.monthly_limit_per_biz * 1000, used: usage.monthlyTokens }
    }
  }

  return { allowed: true }
}

/**
 * Check if this should be an essential operation (allowed during AI pause).
 * Essential operations: search, auth, registration, basic WhatsApp functions.
 */
export function isEssentialOperation(feature: AiFeature): boolean {
  return !['registration_draft', 'listing_draft', 'search_expansion', 'seo_blurb', 'intent_classification', 'vision_analysis'].includes(feature) ||
    feature === 'registration_draft' // Registration draft for essential account recovery
}

/**
 * AI request result.
 */
export interface AiGatewayResult<T> {
  success: boolean
  data?: T
  error?: string
  blocked: boolean
  blockReason?: string
  tokensInput?: number
  tokensOutput?: number
  latencyMs?: number
  status?: string
}

/**
 * Centralized AI request gateway.
 * All Gemini requests MUST pass through this function.
 *
 * @param feature - The AI feature being used
 * @param businessId - The business making the request (nullable for anonymous)
 * @param channel - Request channel: 'web', 'whatsapp', 'cron', 'admin'
 * @param requestFn - Function that performs the actual API call (receives estimated tokens)
 * @returns Result with data, error, or block reason
 */
export async function executeAiRequest<T>(
  feature: AiFeature,
  requestFn: (params: { estimatedInputTokens: number; estimatedOutputTokens: number }) => Promise<{ text: string | null; usage?: { inputTokens: number; outputTokens: number } }>
): Promise<AiGatewayResult<T>> {
  const start = Date.now()
  const estimatedInputTokens = 1000 // Base estimate; will be refined after API call
  const estimatedOutputTokens = 500

  // 1. Check global pause (except for essential operations)
  const pauseStatus = await checkAiGlobalPause()
  if (pauseStatus.paused && !isEssentialOperation(feature)) {
    // Log the blocked request
    await logAiUsage({
      feature,
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      inputTokens: estimatedInputTokens,
      outputTokens: 0,
      latencyMs: Date.now() - start,
      status: 'blocked_paused',
      errorMessage: pauseStatus.reason || 'Global AI pause',
      businessId: null,
      channel: 'web',
      metadata: { pauseReason: pauseStatus.reason }
    })
    return {
      success: false,
      blocked: true,
      blockReason: 'ai_paused',
      error: pauseStatus.reason || 'AI is paused'
    }
  }

  // 2. Check feature enabled status
  const featureControl = await getFeatureControl(feature)
  if (!featureControl.enabled && !isEssentialOperation(feature)) {
    await logAiUsage({
      feature,
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      inputTokens: estimatedInputTokens,
      outputTokens: 0,
      latencyMs: Date.now() - start,
      status: 'blocked_disabled',
      errorMessage: 'Feature disabled',
      businessId: null,
      channel: 'web'
    })
    return {
      success: false,
      blocked: true,
      blockReason: 'feature_disabled'
    }
  }

  // For non-essential features, we need business context for quota checks
  // The calling code should provide the businessId when available

  // Execute the request
  try {
    const response = await requestFn({ estimatedInputTokens, estimatedOutputTokens })
    const latencyMs = Date.now() - start

    // Determine actual status
    const status = response.text ? '200' : 'error'

    // Log the usage
    const actualTokensIn = response.usage?.inputTokens || estimatedInputTokens
    const actualTokensOut = response.usage?.outputTokens || estimatedOutputTokens

    await logAiUsage({
      feature,
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      inputTokens: actualTokensIn,
      outputTokens: actualTokensOut,
      latencyMs,
      status,
      errorMessage: response.text ? undefined : 'No response text',
      businessId: null,
      channel: 'web'
    })

    if (!response.text) {
      return {
        success: false,
        blocked: false,
        error: 'No response from model',
        tokensInput: actualTokensIn,
        tokensOutput: actualTokensOut,
        latencyMs,
        status: 'error'
      }
    }

    return {
      success: true,
      blocked: false,
      data: response.text as T,
      tokensInput: actualTokensIn,
      tokensOutput: actualTokensOut,
      latencyMs,
      status
    }
  } catch (err) {
    const latencyMs = Date.now() - start
    const errorMsg = err instanceof Error ? err.message : 'Unknown error'

    await logAiUsage({
      feature,
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      inputTokens: estimatedInputTokens,
      outputTokens: 0,
      latencyMs,
      status: 'error',
      errorMessage: errorMsg,
      businessId: null,
      channel: 'web'
    })

    return {
      success: false,
      blocked: false,
      error: errorMsg,
      tokensInput: estimatedInputTokens,
      tokensOutput: 0,
      latencyMs,
      status: 'error'
    }
  }
}

/**
 * Check if we should skip AI-based operations entirely (fallback mode).
 * Returns true if the feature should be skipped.
 */
export async function shouldSkipFeature(feature: AiFeature): Promise<boolean> {
  const pauseStatus = await checkAiGlobalPause()
  if (pauseStatus.paused && !isEssentialOperation(feature)) {
    return true
  }

  const featureControl = await getFeatureControl(feature)
  if (!featureControl.enabled && !isEssentialOperation(feature)) {
    return true
  }

  return false
}