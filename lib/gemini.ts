const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.GEMINI_API_KEY}`

export async function generateSEOBlurb(category: string, location: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    return `Find the best ${category} services in ${location}, Zimbabwe. Browse verified businesses, check ratings, read reviews, and start a WhatsApp conversation instantly. WA Directory connects you with trusted local businesses for all your ${category.toLowerCase()} needs.`
  }

  try {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Write a 200-word SEO paragraph about the best ${category} businesses in ${location}, Zimbabwe. Structure it as a helpful guide for customers looking for ${category.toLowerCase()} services on WhatsApp. Include: benefits of using local providers, what to look for in a quality service, and how WA Directory helps customers connect with verified businesses. Write naturally, no fluff, no title. Just the paragraph.`,
          }],
        }],
      }),
    })

    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    return text || `Find the best ${category} services in ${location}, Zimbabwe. WA Directory connects you with trusted local businesses via WhatsApp.`
  } catch {
    return `Find the best ${category} services in ${location}, Zimbabwe. WA Directory connects you with trusted local businesses via WhatsApp.`
  }
}

export async function expandSearchQuery(query: string): Promise<string[]> {
  if (!process.env.GEMINI_API_KEY || !query.trim()) return []

  try {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Given a search query "${query}" for a Zimbabwe business directory called WA Directory. Suggest 3-5 related search terms, synonyms, or category names a customer might be looking for. Return ONLY a valid JSON array of strings. No markdown, no explanation. Example: ["pharmacy","medicine","chemist","health"]`,
          }],
        }],
      }),
    })

    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    if (!text) return []

    const match = text.match(/\[[\s\S]*?\]/)
    if (match) return JSON.parse(match[0])
    return []
  } catch {
    return []
  }
}
