import type { ReactNode } from 'react'

const TOKEN =
  /```([\s\S]*?)```|(https?:\/\/[^\s<]+|www\.[^\s<]+|mailto:[^\s<]+|[\w.+-]+@[\w-]+\.[\w.-]+)|\*([^*\n]+)\*|_([^_\n]+)_|~([^~\n]+)~/g

// WhatsApp clients linkify bare domains and emails; transcripts carry plenty of
// both, so make them tappable instead of dead text.
const LINK = /(https?:\/\/[^\s<]+|www\.[^\s<]+|mailto:[^\s<]+|[\w.+-]+@[\w-]+\.[\w.-]+)/g

function hrefFor(raw: string): string {
  if (/^https?:\/\//i.test(raw) || /^mailto:/i.test(raw)) return raw
  if (/^www\./i.test(raw)) return `https://${raw}`
  return `mailto:${raw}`
}

function trimLink(raw: string): { url: string; trailing: string } {
  const match = /[.,;:!?)\]]+$/.exec(raw)
  if (!match) return { url: raw, trailing: '' }
  return { url: raw.slice(0, match.index), trailing: match[0] }
}

function withLinks(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let cursor = 0
  let match: RegExpExecArray | null
  LINK.lastIndex = 0
  while ((match = LINK.exec(text)) !== null) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index))
    const { url, trailing } = trimLink(match[0])
    if (!url) {
      nodes.push(match[0])
    } else {
      nodes.push(
        <a
          key={`${keyPrefix}l${match.index}`}
          href={hrefFor(url)}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all font-medium text-whatsapp-700 underline decoration-whatsapp-300 underline-offset-2 hover:text-whatsapp-800"
        >
          {url}
        </a>,
      )
      if (trailing) nodes.push(trailing)
    }
    cursor = LINK.lastIndex
  }
  if (cursor < text.length) nodes.push(text.slice(cursor))
  return nodes
}

export default function WhatsAppText({ text, className = '' }: { text: string; className?: string }) {
  if (!text) return null
  const nodes: ReactNode[] = []
  let cursor = 0
  let match: RegExpExecArray | null
  TOKEN.lastIndex = 0
  while ((match = TOKEN.exec(text)) !== null) {
    if (match.index > cursor) nodes.push(...withLinks(text.slice(cursor, match.index), `t${match.index}`))
    const key = match.index
    if (match[1] !== undefined) {
      nodes.push(
        <code key={`m${key}`} className="rounded bg-black/[0.06] px-1 py-px font-mono text-[0.95em]">
          {match[1]}
        </code>,
      )
    } else if (match[2] !== undefined) {
      nodes.push(...withLinks(match[2], `u${key}`))
    } else if (match[3] !== undefined) {
      nodes.push(
        <strong key={`b${key}`} className="font-semibold">
          {withLinks(match[3], `b${key}`)}
        </strong>,
      )
    } else if (match[4] !== undefined) {
      nodes.push(<em key={`i${key}`}>{match[4]}</em>)
    } else if (match[5] !== undefined) {
      nodes.push(
        <del key={`s${key}`} className="opacity-80">
          {match[5]}
        </del>,
      )
    }
    cursor = TOKEN.lastIndex
  }
  if (cursor < text.length) nodes.push(...withLinks(text.slice(cursor), `e${cursor}`))
  return <span className={`block whitespace-pre-wrap break-words ${className}`}>{nodes}</span>
}
