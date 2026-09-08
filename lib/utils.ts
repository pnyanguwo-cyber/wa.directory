// General-purpose utility helpers.

/** Strip em-dashes from bio/description text, replacing them with a colon. */
export function cleanBio(text: string | null | undefined): string {
  if (!text) return ''
  return text.replace(/\s*—\s*/g, ': ')
}
