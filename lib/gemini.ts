import { getCached, setCached } from './ai-cache'

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`

// Single Gemini entry point: posts one prompt, returns the trimmed first
// candidate text — or null when the call fails or the response is empty.
// Callers own their fallback copy and caching.
const GEMINI_TIMEOUT = 8_000

async function fetchGemini(body: unknown): Promise<string | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), GEMINI_TIMEOUT)
  try {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
    const data = await res.json()
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export async function callGemini(prompt: string): Promise<string | null> {
  return fetchGemini({ contents: [{ parts: [{ text: prompt }] }] })
}

// Multimodal twin of callGemini for voice notes and photos: text and
// inline_data parts (base64 bytes) in one generateContent call, same model
// and key. Returns the trimmed first candidate text or null.
export interface GeminiPart {
  text?: string
  inline_data?: { mime_type: string; data: string }
}

export async function callGeminiParts(parts: GeminiPart[]): Promise<string | null> {
  return fetchGemini({ contents: [{ parts }] })
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
    `Write a 200-word SEO paragraph about the best ${category} businesses in ${location}, Zimbabwe. Structure it as a helpful guide for customers looking for ${category.toLowerCase()} services on WhatsApp. Include: benefits of using local providers, what to look for in a quality service, and how WA Directory helps customers connect with verified businesses. Write naturally, no fluff, no title. Just the paragraph. Do not use em-dashes (—), use commas or colons instead.`
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
    `Given a search query "${query}" for a Zimbabwe business directory called WA Directory. Suggest 3-5 related search terms, synonyms, or category names a customer might be looking for. Return ONLY a valid JSON array of strings. No markdown, no explanation. Example: ["pharmacy","medicine","chemist","health"]`
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
