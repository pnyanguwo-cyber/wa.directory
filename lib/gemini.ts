import { getCached, setCached } from './ai-cache'
import { getSupabase } from './supabase-server'
import {
  checkAiGlobalPause,
  getFeatureControl,
  checkBusinessQuota,
  isEssentialOperation,
  type AiGatewayResult,
} from './ai-gateway'

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`

// Single Gemini entry point: posts one prompt, returns the trimmed first
// candidate text — or null when the call fails or the response is empty.
// Callers own their fallback copy and caching.
const GEMINI_TIMEOUT = 8_000
const GEMINI_VISION_TIMEOUT = 25_000

// Token pricing per 1M tokens (USD) - update when Google changes pricing
// https://ai.google.dev/pricing
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gemini-1.5-flash': { input: 0.075, output: 0.30 },
  'gemini-1.5-flash-8b': { input: 0.0375, output: 0.15 },
  'gemini-1.5-pro': { input: 1.25, output: 5.00 },
  'gemini-2.0-flash': { input: 0.10, output: 0.40 },
  'gemini-2.0-flash-lite': { input: 0.075, output: 0.30 },
  'gemini-3.8-flash': { input: 0.075, output: 0.30 }, // fallback alias
}

export type AiFeature =
  | 'registration_draft'
  | 'listing_draft'
  | 'search_expansion'
  | 'seo_blurb'
  | 'intent_classification'
  | 'vision_analysis'

interface UsageLogParams {
  feature: AiFeature
  model: string
  inputTokens: number
  outputTokens: number
  latencyMs: number
  status: string
  errorMessage?: string
  businessId?: string | null
  orgId?: string | null
  channel?: string
  metadata?: Record<string, unknown>
}

export async function logAiUsage(params: UsageLogParams): Promise<void> {
  try {
    const pricing = MODEL_PRICING[params.model] || MODEL_PRICING['gemini-1.5-flash']
    const inputCost = (params.inputTokens / 1_000_000) * pricing.input
    const outputCost = (params.outputTokens / 1_000_000) * pricing.output
    const estimatedCost = inputCost + outputCost

    const supabase = getSupabase()
    await supabase.from('ai_usage_log').insert({
      feature: params.feature,
      model: params.model,
      input_tokens: params.inputTokens,
      output_tokens: params.outputTokens,
      total_tokens: params.inputTokens + params.outputTokens,
      latency_ms: params.latencyMs,
      estimated_cost_usd: estimatedCost,
      status: params.status,
      error_message: params.errorMessage || null,
      business_id: params.businessId || null,
      org_id: params.orgId || null,
      channel: params.channel || 'web',
      metadata: params.metadata || {},
    })
  } catch {
    // Logging failures must never block the main request
  }
}

// Rough token estimation for prompt text (4 chars ≈ 1 token for English)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

// Estimate tokens from response (we only get text back, not usageMetadata)
function estimateResponseTokens(text: string | null): number {
  if (!text) return 0
  return Math.ceil(text.length / 4)
}

/**
 * Check if AI controls are satisfied for a given feature and business.
 * Returns { allowed: true } if the request can proceed, or { allowed: false, reason: ... } if blocked.
 * This is the centralized enforcement point - MUST be called before any Gemini API request.
 */
export async function checkAiControls(
  feature: AiFeature,
  businessId?: string | null,
  channel: string = 'web'
): Promise<{ allowed: boolean; reason?: string; limit?: number; used?: number }> {
  // 1. Check global pause
  const pauseStatus = await checkAiGlobalPause()
  if (pauseStatus.paused && !isEssentialOperation(feature)) {
    return { allowed: false, reason: 'ai_paused' }
  }

  // 2. Check feature enabled
  const featureControl = await getFeatureControl(feature)
  if (!featureControl.enabled && !isEssentialOperation(feature)) {
    return { allowed: false, reason: 'feature_disabled' }
  }

  // 3. Check business quota (if business context provided)
  if (businessId) {
    const quotaCheck = await checkBusinessQuota(businessId, feature, 500, channel)
    if (!quotaCheck.allowed) {
      return {
        allowed: false,
        reason: quotaCheck.reason,
        limit: quotaCheck.limit,
        used: quotaCheck.used
      }
    }
  }

  return { allowed: true }
}

/**
 * Internal fetch function that makes the actual API call.
 * This should NOT be called directly - use executeAiRequest with enforcement instead.
 */
async function fetchGemini(
  body: unknown,
  timeoutMs = GEMINI_TIMEOUT,
  logParams?: {
    feature: AiFeature
    businessId?: string | null
    orgId?: string | null
    channel?: string
    metadata?: Record<string, unknown>
    tokensInput?: number
    tokensOutput?: number
  }
): Promise<{ text: string | null; usage?: { inputTokens: number; outputTokens: number } }> {
  const start = Date.now()
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  let status = '200'
  let errorMessage = ''
  let responseText: string | null = null
  let inputTokens = logParams?.tokensInput || 0
  let outputTokens = 0

  try {
    // Estimate input tokens from request body if not provided
    if (!logParams?.tokensInput) {
      const bodyStr = JSON.stringify(body)
      inputTokens = estimateTokens(bodyStr)
    }

    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })

    const data = await res.json()

    if (!res.ok) {
      status = String(res.status)
      errorMessage = data?.error?.message || 'API error'
      return { text: null }
    }

    responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null

    // Try to get actual token counts from response if available
    if (data?.usageMetadata) {
      inputTokens = data.usageMetadata.promptTokenCount || inputTokens
      outputTokens = data.usageMetadata.candidatesTokenCount || estimateResponseTokens(responseText)
    } else {
      outputTokens = estimateResponseTokens(responseText)
    }

    return { text: responseText, usage: { inputTokens, outputTokens } }
  } catch (err) {
    status = 'error'
    errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return { text: null }
  } finally {
    clearTimeout(timer)
    const latencyMs = Date.now() - start

    // Log usage if params provided
    if (logParams) {
      await logAiUsage({
        feature: logParams.feature,
        model: GEMINI_MODEL,
        inputTokens,
        outputTokens,
        latencyMs,
        status,
        errorMessage,
        businessId: logParams.businessId,
        orgId: logParams.orgId,
        channel: logParams.channel,
        metadata: logParams.metadata,
      })
    }
  }
}

/**
 * Execute an AI request with full control enforcement.
 *
 * This is the CENTRAL ENTRY POINT for all Gemini API calls.
 * It checks:
 * 1. Global AI pause status
 * 2. Feature enabled status
 * 3. Business quota limits
 *
 * @param feature - The AI feature being used
 * @param requestFn - Function that performs the actual Gemini API call
 * @param businessId - Optional business context for quota checking
 * @param channel - Request channel: 'web', 'whatsapp', 'cron', 'admin'
 * @returns Result with data or block reason
 */
export async function executeAiRequest<T>(
  feature: AiFeature,
  requestFn: () => Promise<{ text: string | null; usage?: { inputTokens: number; outputTokens: number } }>,
  businessId?: string | null,
  channel: string = 'web'
): Promise<AiGatewayResult<T>> {
  const start = Date.now()

  // 1. Check all AI controls BEFORE making the API call
  const controls = await checkAiControls(feature, businessId, channel)
  if (!controls.allowed) {
    const latencyMs = Date.now() - start
    await logAiUsage({
      feature,
      model: GEMINI_MODEL,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs,
      status: `blocked_${controls.reason}`,
      errorMessage: `AI request blocked: ${controls.reason}`,
      businessId: businessId || null,
      channel,
      metadata: { blockedReason: controls.reason }
    })
    return {
      success: false,
      blocked: true,
      blockReason: controls.reason,
      error: controls.reason === 'ai_paused' ? 'AI is paused' : 'Feature disabled or limit exceeded'
    }
  }

  // 2. Execute the actual request
  let response: { text: string | null; usage?: { inputTokens: number; outputTokens: number } }
  let latencyMs = 0

  try {
    const beforeCall = Date.now()
    response = await requestFn()
    latencyMs = Date.now() - beforeCall

    const status = response.text ? '200' : 'error'
    const inputTokens = response.usage?.inputTokens || 0
    const outputTokens = response.usage?.outputTokens || 0

    await logAiUsage({
      feature,
      model: GEMINI_MODEL,
      inputTokens,
      outputTokens,
      latencyMs,
      status,
      errorMessage: response.text ? undefined : 'No response from model',
      businessId: businessId || null,
      channel,
      metadata: { actualTokens: true }
    })

    if (!response.text) {
      return {
        success: false,
        blocked: false,
        error: 'No response from model',
        tokensInput: inputTokens,
        tokensOutput: outputTokens,
        latencyMs,
        status: 'error'
      }
    }

    return {
      success: true,
      blocked: false,
      data: response.text as T,
      tokensInput: inputTokens,
      tokensOutput: outputTokens,
      latencyMs,
      status
    }
  } catch (err) {
    latencyMs = Date.now() - start
    const errorMsg = err instanceof Error ? err.message : 'Unknown error'

    await logAiUsage({
      feature,
      model: GEMINI_MODEL,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs,
      status: 'error',
      errorMessage: errorMsg,
      businessId: businessId || null,
      channel,
      metadata: { error: errorMsg }
    })

    return {
      success: false,
      blocked: false,
      error: errorMsg,
      tokensInput: 0,
      tokensOutput: 0,
      latencyMs,
      status: 'error'
    }
  }
}

/**
 * Wrapper for callGemini that enforces AI controls.
 * This should be used instead of the raw callGemini function.
 *
 * @param prompt - The prompt to send
 * @param logParams - Logging context including feature, businessId, channel
 * @returns The model response text, or null if blocked/failed
 */
export async function callGeminiControlled(
  prompt: string,
  logParams?: { feature: AiFeature; businessId?: string | null; orgId?: string | null; channel?: string; metadata?: Record<string, unknown> }
): Promise<string | null> {
  const result = await executeAiRequest<string>(
    logParams?.feature || 'seo_blurb',
    async () => {
      return (await fetchGemini(
        { contents: [{ parts: [{ text: prompt }] }] },
        GEMINI_TIMEOUT,
        logParams
      ))
    },
    logParams?.businessId || null,
    logParams?.channel || 'web'
  )
  return result.success ? result.data || null : result.blocked ? null : null
}

/**
 * Call Gemini - original function for backward compatibility.
 * DEPRECATED: Use callGeminiControlled or executeAiRequest instead.
 * This function does NOT enforce AI controls.
 */
export async function callGemini(prompt: string, logParams?: { feature: AiFeature; businessId?: string | null; orgId?: string | null; channel?: string; metadata?: Record<string, unknown> }): Promise<string | null> {
  const result = await fetchGemini(
    { contents: [{ parts: [{ text: prompt }] }] },
    GEMINI_TIMEOUT,
    logParams
  )
  return result.text
}

/** Multimodal twin of callGemini for voice notes and photos: text and
 * inline_data parts (base64 bytes) in one generateContent call, same model
 * and key. Returns the trimmed first candidate text or null. */
export interface GeminiPart {
  text?: string
  inline_data?: { mime_type: string; data: string }
}

/**
 * Call Gemini with multiple parts (text + images).
 * DEPRECATED: Use callGeminiPartsControlled or executeAiRequest instead.
 */
export async function callGeminiParts(
  parts: GeminiPart[],
  logParams?: { feature: AiFeature; businessId?: string | null; orgId?: string | null; channel?: string; metadata?: Record<string, unknown> }
): Promise<string | null> {
  const result = await fetchGemini(
    { contents: [{ parts }] },
    GEMINI_VISION_TIMEOUT,
    logParams
  )
  return result.text
}

/** Controlled version of callGeminiParts that enforces AI controls. */
export async function callGeminiPartsControlled(
  parts: GeminiPart[],
  logParams: { feature: AiFeature; businessId?: string | null; orgId?: string | null; channel?: string; metadata?: Record<string, unknown> }
): Promise<string | null> {
  const result = await executeAiRequest<string>(
    logParams.feature,
    async () => {
      return (await fetchGemini({ contents: [{ parts }] }, GEMINI_VISION_TIMEOUT, logParams))
    },
    logParams.businessId || null,
    logParams.channel || 'web'
  )
  return result.success ? result.data || null : null
}

/**
 * Structured multimodal call: sends text + inline images and asks the model for
 * JSON. The response is parsed here but remains untrusted input — callers must
 * still validate every field.
 *
 * Returns null on any transport, timeout, empty or unparseable response so the
 * caller can fall back to manual entry.
 */
export async function callGeminiJson(
  parts: GeminiPart[],
  options: {
    schema?: Record<string, unknown>
    temperature?: number
    maxOutputTokens?: number
    timeoutMs?: number
  } = {},
  logParams?: { feature: AiFeature; businessId?: string | null; orgId?: string | null; channel?: string; metadata?: Record<string, unknown> }
): Promise<unknown | null> {
  const body: Record<string, unknown> = {
    contents: [{ parts }],
    generationConfig: {
      temperature: options.temperature ?? 0.1,
      responseMimeType: 'application/json',
      ...(options.schema ? { responseSchema: options.schema } : {}),
      ...(options.maxOutputTokens ? { maxOutputTokens: options.maxOutputTokens } : {}),
    },
  }
  const result = await fetchGemini(
    body,
    options.timeoutMs ?? GEMINI_VISION_TIMEOUT,
    logParams
  )
  if (!result.text) return null
  // Models sometimes wrap JSON in a ```json fence despite the MIME type.
  const cleaned = result.text.replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const match = cleaned.match(/[\[{][\s\S]*[\}\]]/)
    if (!match) return null
    try {
      return JSON.parse(match[0])
    } catch {
      return null
    }
  }
}

/** Controlled version of callGeminiJson that enforces AI controls. */
export async function callGeminiJsonControlled(
  parts: GeminiPart[],
  options: {
    schema?: Record<string, unknown>
    temperature?: number
    maxOutputTokens?: number
    timeoutMs?: number
  } = {},
  logParams: { feature: AiFeature; businessId?: string | null; orgId?: string | null; channel?: string; metadata?: Record<string, unknown> }
): Promise<unknown | null> {
  const result = await executeAiRequest<unknown>(
    logParams.feature,
    async () => {
      const body: Record<string, unknown> = {
        contents: [{ parts }],
        generationConfig: {
          temperature: options.temperature ?? 0.1,
          responseMimeType: 'application/json',
          ...(options.schema ? { responseSchema: options.schema } : {}),
          ...(options.maxOutputTokens ? { maxOutputTokens: options.maxOutputTokens } : {}),
        },
      }
      return (await fetchGemini(body, options.timeoutMs ?? GEMINI_VISION_TIMEOUT, logParams))
    },
    logParams.businessId || null,
    logParams.channel || 'web'
  )
  if (!result.success) return null
  const text = result.data as string | null
  if (!text) return null
  const cleaned = text.replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const match = cleaned.match(/[\[{][\s\S]*[\}\]]/)
    if (!match) return null
    try {
      return JSON.parse(match[0])
    } catch {
      return null
    }
  }
}

export function hasGeminiKey(): boolean {
  return !!process.env.GEMINI_API_KEY
}

const SEO_BLURB_FALLBACK = (category: string, location: string) =>
  `Find the best ${category} services in ${location}, Zimbabwe. WA Directory connects you with trusted local businesses via WhatsApp.`

const SEO_BLURB_NO_KEY = (category: string, location: string) =>
  `Find the best ${category} services in ${location}, Zimbabwe. Browse verified businesses, check ratings, read reviews, and start a WhatsApp conversation instantly. WA Directory connects you with trusted local businesses for all your ${category.toLowerCase()} needs.`

export async function generateSEOBlurb(category: string, location: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    return SEO_BLURB_NO_KEY(category, location)
  }

  const cacheKey = `seo_blurb:${category.toLowerCase()}:${location.toLowerCase()}`
  const cached = await getCached<string>(cacheKey)
  if (cached) return cached

  const text = await callGemini(
    `Write a 200-word SEO paragraph about the best ${category} businesses in ${location}, Zimbabwe. Structure it as a helpful guide for customers looking for ${category.toLowerCase()} services on WhatsApp. Include: benefits of using local providers, what to look for in a quality service, and how WA Directory helps customers connect with verified businesses. Write naturally, no fluff, no title. Just the paragraph. Do not use em-dashes (—), use commas or colons instead.`,
    { feature: 'seo_blurb', channel: 'web' }
  )
  const result = text || SEO_BLURB_FALLBACK(category, location)
  await setCached(cacheKey, result)
  return result
}

/**
 * Generate SEO blurb with AI control enforcement.
 */
export async function generateSEOBlurbControlled(category: string, location: string, businessId?: string | null): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    return SEO_BLURB_NO_KEY(category, location)
  }

  const cacheKey = `seo_blurb:${category.toLowerCase()}:${location.toLowerCase()}`
  const cached = await getCached<string>(cacheKey)
  if (cached) return cached

  const text = await callGeminiControlled(
    `Write a 200-word SEO paragraph about the best ${category} businesses in ${location}, Zimbabwe. Structure it as a helpful guide for customers looking for ${category.toLowerCase()} services on WhatsApp. Include: benefits of using local providers, what to look for in a quality service, and how WA Directory helps customers connect with verified businesses. Write naturally, no fluff, no title. Just the paragraph. Do not use em-dashes (—), use commas or colons instead.`,
    { feature: 'seo_blurb', businessId, channel: 'web' }
  )
  const result = text || SEO_BLURB_FALLBACK(category, location)
  await setCached(cacheKey, result)
  return result
}

export async function expandSearchQuery(query: string): Promise<string[]> {
  if (!process.env.GEMINI_API_KEY || !query.trim()) return []

  const cacheKey = `search_expand:${query.trim().toLowerCase()}`
  const cached = await getCached<string[]>(cacheKey)
  if (cached) return cached

  const text = await callGemini(
    `Given a search query "${query}" for a Zimbabwe business directory called WA Directory. Suggest 3-5 related search terms, synonyms, or category names a customer might be looking for. Return ONLY a valid JSON array of strings. No markdown, no explanation. Example: ["pharmacy","medicine","chemist","health"]`,
    { feature: 'search_expansion', channel: 'web' }
  )
  if (!text) return []

  try {
    const match = text.match(/\[[\s\S]*?\]/)
    if (match) {
      const result = JSON.parse(match[0]) as string[]
      await setCached(cacheKey, result)
      return result
    }
  } catch {
    // fall through — expansion is optional
  }
  return []
}

/**
 * Expand search query with AI control enforcement.
 */
export async function expandSearchQueryControlled(query: string): Promise<string[]> {
  if (!process.env.GEMINI_API_KEY || !query.trim()) return []

  const cacheKey = `search_expand:${query.trim().toLowerCase()}`
  const cached = await getCached<string[]>(cacheKey)
  if (cached) return cached

  const text = await callGeminiControlled(
    `Given a search query "${query}" for a Zimbabwe business directory called WA Directory. Suggest 3-5 related search terms, synonyms, or category names a customer might be looking for. Return ONLY a valid JSON array of strings. No markdown, no explanation. Example: ["pharmacy","medicine","chemist","health"]`,
    { feature: 'search_expansion', channel: 'web' }
  )
  if (!text) return []

  try {
    const match = text.match(/\[[\s\S]*?\]/)
    if (match) {
      const result = JSON.parse(match[0]) as string[]
      await setCached(cacheKey, result)
      return result
    }
  } catch {
    // fall through
  }
  return []
}

// What the current step is asking, for the intent fallback prompt. A short
// plain line is enough — the model only needs context to tell a stated plan
// change apart from an ordinary answer.
const INTENT_ASKS: Record<string, string> = {
  name: 'a business or owner name to register',
  username: 'a username for the listing URL',
  phone: 'a contact phone number',
  category: 'picking a business category from a list',
  description: 'describing the business in a few words',
  city: 'which town or city the business is in',
  area: 'which area of that town the business is in',
  confirm: 'confirming the listing details',
  list_form: 'listing items for sale, one per line',
  reg_contact: 'a personal contact for a personal listing',
  item_photo: 'a shelf or item photo',
  item_pick: 'choosing which item from a list',
  need_form: 'describing a need to post to suppliers',
  pay_search: 'a business name or number to look up before paying',
  pay_pick: 'choosing which business to pay for',
  pay_plan: 'choosing a payment plan or package',
  pay_ecocash: 'an EcoCash phone number to bill',
  search_loc: 'which town to search in',
  search_term: 'what to search for',
  browse: 'choosing what to browse from a list',
  order: 'reading out an order, item by item',
}

export type IntentKind =
  | 'register'
  | 'pay'
  | 'need'
  | 'order'
  | 'search'
  | 'menu'
  | 'continue'

const INTENT_HINTS = new Set<IntentKind>([
  'register',
  'pay',
  'need',
  'order',
  'search',
  'menu',
  'continue',
])

const INTENT_PROMPT = (ask: string, text: string) =>
  `You are reading one reply inside a WhatsApp business-directory bot. The bot is mid-flow and just asked for ${ask}.\nClassify the reply as exactly one of:\n- continue: it answers what the bot asked for\n- register: they want to register or list a business instead\n- pay: they want to pay, renew, or learn what a listing costs\n- need: they want suppliers to quote them on a posted need\n- order: they are giving items to order and buy\n- search: they are looking for products, shops or services to find\n- menu: they want the main options\nReply: "${text}"\nAnswer ONLY with JSON {"intent":"<kind>"}.`

/**
 * Classify user intent with AI control enforcement.
 * Critical for WhatsApp bot - only allowed when AI not paused.
 */
export async function classifyIntent(
  text: string,
  step: string,
  businessId?: string | null
): Promise<IntentKind | null> {
  // Intent classification is ESSENTIAL for WhatsApp bot operation
  // It determines how the bot responds to users - but it's not a "core"
  // essential operation in the same way as auth/search. Allow during AI pause
  // with reduced functionality (return null to fall back to regex rules).

  // Check controls first
  const controls = await checkAiControls('intent_classification', businessId, 'whatsapp')
  if (!controls.allowed) {
    // Return null to trigger regex-based fallback
    return null
  }

  if (!process.env.GEMINI_API_KEY || !text.trim()) return null
  const norm = text.trim().replace(/\s+/g, ' ').toLowerCase()
  const cacheKey = `intent:${step}:${norm}`
  const cached = await getCached<IntentKind>(cacheKey)
  if (cached && INTENT_HINTS.has(cached)) return cached

  const ask = INTENT_ASKS[step] || 'an answer to its question'
  const result = await callGeminiControlled(
    INTENT_PROMPT(ask, norm),
    { feature: 'intent_classification', businessId, channel: 'whatsapp' }
  )
  let intent: IntentKind | null = null
  try {
    const parsed = JSON.parse(result || '') as { intent?: string }
    if (parsed?.intent && INTENT_HINTS.has(parsed.intent as IntentKind)) {
      intent = parsed.intent as IntentKind
    }
  } catch {
    // fall through — the fallback stays null
  }
  if (intent) await setCached(cacheKey, intent)
  return intent
}