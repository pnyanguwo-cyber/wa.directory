'use client'

import { HelpCircle, MessageCircle, ShieldCheck, Sprout } from 'lucide-react'

const SECTIONS: { id: string; label: string; body: string }[] = [
  { id: 'stats', label: 'Statistics', body: 'Directory-wide events and the daily activity breakdown.' },
  { id: 'analytics', label: 'Analytics', body: 'Conversation volume, search behaviour, intents and response performance.' },
  { id: 'listings', label: 'Listings', body: 'Review, verify and edit business listings.' },
  { id: 'chats', label: 'Chats', body: 'Read bot transcripts, manage status, block contacts and start a harvest.' },
  { id: 'harvest', label: 'Harvest Data', body: 'Select exchanges, redact personal data, approve/reject and export training examples.' },
  { id: 'transcripts', label: 'Transcripts', body: 'Raw transcript search across bot conversations.' },
  { id: 'organizations', label: 'Organizations', body: 'HQ/branch groups, invites and organization defaults.' },
]

export default function AdminHelp({ onGo }: { onGo: (id: string) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-extrabold tracking-tight text-text-primary">Help &amp; Support</h2>
        <p className="text-[11px] text-text-secondary">How the admin workspace is organised and what each section does.</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map(section => (
          <button
            key={section.id}
            type="button"
            onClick={() => onGo(section.id)}
            className="rounded-xl border border-gray-100 bg-white p-3 text-left shadow-card transition-colors hover:border-whatsapp-200 hover:bg-whatsapp-50/30"
          >
            <p className="text-[11.5px] font-bold text-text-primary">{section.label}</p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-text-secondary">{section.body}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-2 lg:grid-cols-3">
        <Card
          icon={MessageCircle}
          title="Chat retention"
          body="Chat status (read/resolved/archived/blocked) lives in chat_flags. Transcripts and bot_messages are read-only and never rewritten by these actions."
        />
        <Card
          icon={Sprout}
          title="Harvest safety"
          body="Harvesting copies only the exchanges you select into training_examples. Redaction happens on the copy; the original conversation is untouched."
        />
        <Card
          icon={ShieldCheck}
          title="Permissions"
          body="Every admin API route checks adminGuard() and uses the service-role client server-side. No chat or harvest table is exposed to anon/authenticated roles."
        />
      </div>

      <div className="flex flex-col items-start justify-between gap-2 rounded-xl border border-whatsapp-200 bg-whatsapp-50/70 p-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-[12px] font-bold text-whatsapp-900">Need platform support?</p>
          <p className="text-[10.5px] text-whatsapp-800">Message the WA Directory team on WhatsApp.</p>
        </div>
        <a
          href={`https://wa.me/263773791864?text=${encodeURIComponent('Hi WA Directory, I need help with the admin dashboard.')}`}
          target="_blank"
          rel="noreferrer"
          className="flex h-8 items-center gap-1.5 rounded-lg bg-whatsapp-600 px-3 text-[10.5px] font-semibold text-white hover:bg-whatsapp-700"
        >
          <HelpCircle className="h-3.5 w-3.5" /> Chat with support
        </a>
      </div>

      <p className="text-[10px] text-text-secondary">
        Migration 035 must be applied before chat status or harvesting can write. Until then those actions return a clear
        “not migrated” message and read-only viewing still works.
      </p>
    </div>
  )
}

function Card({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof MessageCircle
  title: string
  body: string
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-card">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-whatsapp-600" />
        <p className="text-[11px] font-bold text-text-primary">{title}</p>
      </div>
      <p className="mt-1 text-[10px] leading-relaxed text-text-secondary">{body}</p>
    </div>
  )
}
