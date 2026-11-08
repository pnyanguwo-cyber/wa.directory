import type { ReactNode } from 'react'

const TOKEN = /```([\s\S]*?)```|\*([^*\n]+)\*|_([^_\n]+)_|~([^~\n]+)~/g

export default function WhatsAppText({ text, className = '' }: { text: string; className?: string }) {
  if (!text) return null
  const nodes: ReactNode[] = []
  let cursor = 0
  let match: RegExpExecArray | null
  TOKEN.lastIndex = 0
  while ((match = TOKEN.exec(text)) !== null) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index))
    const key = match.index
    if (match[1] !== undefined) {
      nodes.push(
        <code key={`m${key}`} className="rounded bg-black/[0.06] px-1 py-px font-mono text-[0.95em]">
          {match[1]}
        </code>,
      )
    } else if (match[2] !== undefined) {
      nodes.push(
        <strong key={`b${key}`} className="font-semibold">
          {match[2]}
        </strong>,
      )
    } else if (match[3] !== undefined) {
      nodes.push(<em key={`i${key}`}>{match[3]}</em>)
    } else if (match[4] !== undefined) {
      nodes.push(
        <del key={`s${key}`} className="opacity-80">
          {match[4]}
        </del>,
      )
    }
    cursor = TOKEN.lastIndex
  }
  if (cursor < text.length) nodes.push(text.slice(cursor))
  return <span className={`block whitespace-pre-wrap break-words ${className}`}>{nodes}</span>
}
