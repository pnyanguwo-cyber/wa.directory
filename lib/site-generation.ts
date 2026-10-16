import { getCached, setCached } from './ai-cache'

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`

export interface SiteContent {
  hero: string
  services: string
}

export async function generateSiteContent(input: {
  businessName: string
  category: string
  bio: string
  city: string
}): Promise<SiteContent> {
  const cacheKey = `site_content:${input.businessName.toLowerCase().trim()}:${input.city.toLowerCase().trim()}`
  const cached = await getCached<SiteContent>(cacheKey)
  if (cached) return cached

  const fallback: SiteContent = {
    hero: input.bio && input.bio.trim()
      ? input.bio.trim().slice(0, 220)
      : `Welcome to ${input.businessName}. We deliver quality ${input.category} services in ${input.city || 'Zimbabwe'} with care and reliability.`,
    services: `We specialise in ${input.category || 'professional'} services, providing dependable, affordable and friendly support for every client. Reach out on WhatsApp for a quote.`,
  }

  if (!process.env.GEMINI_API_KEY) return fallback

  try {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Write website copy for a local business called "${input.businessName}"${input.city ? ` in ${input.city}` : ''}. Category: ${input.category || 'services'}. Bio: ${input.bio || ''}. Return ONLY a JSON object with two string keys: "hero" (a short friendly headline + intro, max 2 sentences) and "services" (a short services overview, max 3 sentences). No markdown, no keys other than hero/services, no explanation.`,
              },
            ],
          },
        ],
      }),
    })

    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
    const match = text.match(/\{[\s\S]*?\}/)
    if (match) {
      const parsed = JSON.parse(match[0]) as Partial<SiteContent>
      if (parsed.hero && typeof parsed.hero === 'string' && parsed.hero.trim()) {
        const content: SiteContent = { hero: parsed.hero.trim().slice(0, 500), services: parsed.services?.trim() || fallback.services }
        await setCached(cacheKey, content)
        return content
      }
    }
  } catch {
    // Fall through to the default copy.
  }

  return fallback
}
