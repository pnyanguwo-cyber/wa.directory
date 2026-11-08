import Link from 'next/link'

const SUPPORT_NUMBER = '263773791864'

const FAQS = [
  {
    q: 'Why can’t I see conversations?',
    a: 'Chats and analytics are part of the Premium plan. Upgrade under Billing and the Chats tab will show every bot conversation attributed to your listing.',
  },
  {
    q: 'Why is the chat workspace read-only?',
    a: 'The directory records conversations customers have with the WhatsApp bot. Replies are sent from the WhatsApp Business app on the number on your listing, so this workspace never pretends to send messages it cannot deliver.',
  },
  {
    q: 'What happens when I archive or resolve a chat?',
    a: 'The conversation moves out of Active Chats and keeps its full transcript. Nothing is deleted. You can reopen or unarchive it at any time from the chat’s More menu or the details panel.',
  },
  {
    q: 'What does blocking do?',
    a: 'Blocking flags the contact in your inbox and hides them from active chats. It does not delete the transcript, and you can unblock them from the same menu.',
  },
  {
    q: 'How do I update my listing?',
    a: 'Open Settings or use Edit listing. Changes to your name, number, categories or location are reviewed before they appear publicly.',
  },
  {
    q: 'Why does a customer’s location show “Not shared”?',
    a: 'We only show a location when the customer shared one in the bot conversation or through their bot session. We never guess or use private WhatsApp data.',
  },
]

export default function PortalHelpPage() {
  const supportHref = `https://wa.me/${SUPPORT_NUMBER}?text=${encodeURIComponent(
    'Hi WA Directory, I need help with my business portal.'
  )}`

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-extrabold tracking-tight text-text-primary">Help &amp; Support</h2>
        <p className="text-[11px] text-text-secondary">Answers for running your listing and chat workspace.</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <QuickLink href="/portal/conversations" title="Chats" body="Open transcripts, resolve, archive or block." />
        <QuickLink href="/portal/analytics" title="Analytics" body="Volume, intents and response performance." />
        <QuickLink href="/portal/improve" title="Improve listing" body="See what is missing and rank higher." />
      </div>

      <section className="rounded-xl border border-gray-100 bg-white p-3.5 shadow-card">
        <p className="text-[12px] font-bold text-text-primary">Common questions</p>
        <div className="mt-2 divide-y divide-gray-100">
          {FAQS.map(faq => (
            <details key={faq.q} className="group py-2">
              <summary className="cursor-pointer list-none text-[11.5px] font-semibold text-text-primary">
                <span className="mr-1.5 text-whatsapp-600 transition-transform group-open:rotate-90 inline-block">›</span>
                {faq.q}
              </summary>
              <p className="mt-1.5 pl-4 text-[10.5px] leading-relaxed text-text-secondary">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="flex flex-col items-start justify-between gap-3 rounded-xl border border-whatsapp-200 bg-whatsapp-50/70 p-3.5 sm:flex-row sm:items-center">
        <div>
          <p className="text-[12px] font-bold text-whatsapp-900">Still stuck?</p>
          <p className="mt-0.5 text-[10.5px] text-whatsapp-800">Message the support team on WhatsApp and we will help.</p>
        </div>
        <a
          href={supportHref}
          target="_blank"
          rel="noreferrer"
          className="flex h-9 items-center gap-1.5 rounded-lg bg-whatsapp-600 px-3 text-[11px] font-semibold text-white hover:bg-whatsapp-700"
        >
          Chat with support
        </a>
      </section>

      <section className="rounded-xl border border-gray-100 bg-white p-3.5 shadow-card">
        <p className="text-[12px] font-bold text-text-primary">What this portal can and cannot do</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg bg-surface/60 p-2.5">
            <p className="text-[10.5px] font-bold text-whatsapp-800">Supported</p>
            <ul className="mt-1 space-y-1 text-[10px] leading-relaxed text-text-secondary">
              <li>• Read bot-attributed conversations and full history</li>
              <li>• Resolve, archive, block and reopen chats</li>
              <li>• Call the customer or open their WhatsApp chat</li>
              <li>• Export and review your listing analytics</li>
            </ul>
          </div>
          <div className="rounded-lg bg-surface/60 p-2.5">
            <p className="text-[10.5px] font-bold text-text-secondary">Not supported</p>
            <ul className="mt-1 space-y-1 text-[10px] leading-relaxed text-text-secondary">
              <li>• Sending bot messages from this page</li>
              <li>• Reading private WhatsApp chats outside the bot</li>
              <li>• Training or changing the global bot</li>
              <li>• Viewing other businesses’ conversations</li>
            </ul>
          </div>
        </div>
      </section>

      <p className="text-[10px] text-text-secondary">
        Looking for the directory? <Link href="/" className="font-semibold text-whatsapp-700 hover:underline">Back to WA Directory</Link>
      </p>
    </div>
  )
}

function QuickLink({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link href={href} className="rounded-xl border border-gray-100 bg-white p-3 shadow-card transition-colors hover:border-whatsapp-200 hover:bg-whatsapp-50/30">
      <p className="text-[11.5px] font-bold text-text-primary">{title}</p>
      <p className="mt-0.5 text-[10px] leading-relaxed text-text-secondary">{body}</p>
    </Link>
  )
}
