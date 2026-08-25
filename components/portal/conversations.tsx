'use client'

import { useState } from 'react'

interface ChatMessage {
  from: 'customer' | 'bot' | string
  text: string
  at?: string
}

export default function PortalConversations({ customers }: {
  customers: {
    id: string
    phone: string
    foundVia: string
    messages: ChatMessage[]
    lastText: string
    lastAt: string
    startedAt: string
  }[]
}) {
  const [open, setOpen] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-text-primary">Conversations</h2>
        <p className="text-xs text-text-secondary mt-0.5">
          Customers who chatted with your business through the WA Directory bot. Private WhatsApp chats stay private.
        </p>
      </div>

      {customers.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-2xl p-8 text-center">
          <p className="text-sm font-semibold text-text-primary">No conversations yet</p>
          <p className="text-xs text-text-secondary mt-1">
            When customers find you through the bot, their chats appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {customers.map(c => {
            const isOpen = open === c.id
            return (
              <div key={c.id} className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-2xl shadow-card overflow-hidden">
                <button
                  onClick={() => setOpen(isOpen ? null : c.id)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-surface/50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-2xl bg-whatsapp-50 dark:bg-whatsapp-950/60 text-whatsapp-700 dark:text-whatsapp-400 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0zM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-text-primary truncate">{c.phone}</p>
                      <span className="text-[11px] text-text-secondary shrink-0">
                        {c.lastAt ? new Date(c.lastAt).toLocaleString() : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-xs text-text-secondary truncate">{c.lastText || 'No messages'}</p>
                      {c.foundVia && (
                        <span className="text-[10px] font-semibold text-whatsapp-700 dark:text-whatsapp-400 bg-whatsapp-50 dark:bg-whatsapp-950/60 border border-whatsapp-200 dark:border-whatsapp-800/50 rounded-full px-2 py-0.5 shrink-0">
                          via {c.foundVia}
                        </span>
                      )}
                    </div>
                  </div>
                  <svg
                    className={`w-4 h-4 text-text-secondary shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-100 dark:border-gray-800 bg-surface/40 dark:bg-gray-800/40 px-4 py-3">
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                      {c.messages.map((m, i) => {
                        const isBot = m.from === 'bot'
                        return (
                          <div key={i} className={`flex ${isBot ? 'justify-start' : 'justify-end'}`}>
                            <div
                              className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                                isBot
                                  ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-text-primary'
                                  : 'bg-whatsapp-500 text-white'
                              }`}
                            >
                              {m.text}
                              {m.at && (
                                <span className={`block text-[10px] mt-1 ${isBot ? 'text-text-secondary' : 'text-white/70'}`}>
                                  {new Date(m.at).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}