// General-purpose utility helpers.

/** Strip em-dashes from bio/description text, replacing them with a colon. */
export function cleanBio(text: string | null | undefined): string {
  if (!text) return ''
  return text.replace(/\s*—\s*/g, ': ')
}

/** URL-friendly slug: lowercase, non-alphanumerics → hyphens, trimmed ends. */
export function slugify(text: string, maxLength = 60): string {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, maxLength)
}

/** Format a price as a fixed 2-decimal dollar string ('$, null-safe). */
export function formatPrice(price: number | string | null | undefined): string {
  const n = Number(price ?? 0)
  return `$${(Number.isFinite(n) ? n : 0).toFixed(2)}`
}

/** First letter of up to the first two words, upper-cased. */
export function getInitials(name: string, fallback = ''): string {
  return (
    (name || '')
      .split(' ')
      .filter(Boolean)
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || fallback
  )
}

/** Clean and case-insensitively deduplicate category arrays. */
export function dedupeCategories(cats: unknown): string[] {
  if (!Array.isArray(cats)) {
    if (typeof cats === 'string' && cats.trim()) {
      return [cats.trim()]
    }
    return []
  }
  const seen = new Set<string>()
  const result: string[] = []
  for (const c of cats) {
    if (typeof c === 'string' && c.trim()) {
      const trimmed = c.trim()
      const lower = trimmed.toLowerCase()
      if (!seen.has(lower)) {
        seen.add(lower)
        result.push(trimmed)
      }
    }
  }
  return result.slice(0, 4)
}

/**
 * Build the category picker options from the built-in list plus the approved
 * DB categories. DB options arrive as "<emoji> <name>" labels, so only the
 * emoji is lifted out of the label — using the whole label as the "icon"
 * rendered names twice ("Baker Baker"). Matches are case-insensitive so the
 * same category never appears in two casings.
 */
export function buildCategoryOptions(
  staticCategories: { name: string; icon?: string }[],
  approved: { value: string; label: string }[]
): { value: string; label: string }[] {
  const merged = new Map<string, { name: string; icon: string }>()
  for (const c of staticCategories) {
    if (!c.name) continue
    merged.set(c.name.toLowerCase(), { name: c.name, icon: c.icon || '' })
  }
  for (const c of approved) {
    const name = (c.value || '').trim()
    if (!name) continue
    const key = name.toLowerCase()
    const remainder = c.label.replace(name, '').trim()
    const icon = remainder && !/[a-z0-9]/i.test(remainder) ? remainder : ''
    const existing = merged.get(key)
    merged.set(key, { name: existing?.name || name, icon: icon || existing?.icon || '' })
  }
  return Array.from(merged.values())
    .map(({ name, icon }) => ({ value: name, label: icon ? `${icon} ${name}` : name }))
    .sort((a, b) => a.label.localeCompare(b.label))
}
