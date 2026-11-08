import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPortalActor } from '@/lib/org-auth'
import { getSubscription } from '@/lib/portal'
import { formatPhone } from '@/lib/chat'

export const dynamic = 'force-dynamic'

export default async function PortalSettingsPage() {
  const actor = await getPortalActor()
  if (!actor) redirect('/login')

  const business = actor.business
  const sub = await getSubscription(business.id)
  const paid = sub?.status === 'active' && (!sub.expiresAt || new Date(sub.expiresAt) > new Date())
  const role =
    actor.role === 'org-hq' ? 'Organization HQ' : actor.role === 'org-branch' ? `${actor.orgName} branch` : 'Business owner'

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-extrabold tracking-tight text-text-primary">Settings</h2>
        <p className="text-[11px] text-text-secondary">Your account, listing and conversation preferences.</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-100 bg-white p-3.5 shadow-card">
          <p className="text-[12px] font-bold text-text-primary">Listing identity</p>
          <p className="mt-0.5 text-[10.5px] text-text-secondary">Public details customers see in the directory.</p>
          <dl className="mt-3 space-y-2">
            <Row label="Business name" value={business.name} />
            <Row label="WhatsApp number" value={formatPhone(business.phone) || '—'} />
            <Row label="Location" value={[business.area, business.city].filter(Boolean).join(', ') || '—'} />
            <Row label="Categories" value={(business.category || []).join(', ') || '—'} />
            <Row label="Listing status" value={business.verified ? 'Verified and live' : 'Pending approval'} />
            <Row label="Plan" value={paid ? 'Premium active' : 'Free plan'} />
          </dl>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Link href={`/edit?token=${business.edit_token}`} className="btn-primary flex h-8 items-center px-3 text-[10.5px] font-semibold">
              Edit listing
            </Link>
            <Link href="/portal/billing" className="btn-secondary flex h-8 items-center px-3 text-[10.5px] font-semibold">
              Billing
            </Link>
            <Link href="/portal/site" className="btn-secondary flex h-8 items-center px-3 text-[10.5px] font-semibold">
              Mini-site
            </Link>
          </div>
        </section>

        <section className="rounded-xl border border-gray-100 bg-white p-3.5 shadow-card">
          <p className="text-[12px] font-bold text-text-primary">Account access</p>
          <p className="mt-0.5 text-[10.5px] text-text-secondary">How this session is scoped.</p>
          <dl className="mt-3 space-y-2">
            <Row label="Signed in as" value={role} />
            {actor.role !== 'business' && <Row label="Organization" value={actor.orgName} />}
            <Row label="Portal permissions" value={actor.role === 'org-hq' ? 'All branches' : 'This listing only'} />
            <Row label="Conversation history" value={paid ? 'Included' : 'Premium feature'} />
          </dl>
          <p className="mt-3 rounded-lg bg-surface/70 p-2.5 text-[10px] leading-relaxed text-text-secondary">
            To change the sign-in number or password, use the account recovery flow on the login page. Organization
            owners control branch access from the Branches tab.
          </p>
        </section>
      </div>

      <section className="rounded-xl border border-gray-100 bg-white p-3.5 shadow-card">
        <p className="text-[12px] font-bold text-text-primary">Conversations &amp; privacy</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <PrivacyCard
            title="Bot transcripts only"
            body="This portal reads conversations the WhatsApp bot had with customers. Your private WhatsApp chats are never read or stored."
          />
          <PrivacyCard
            title="Owner-managed actions"
            body="Resolving, archiving and blocking only change how the conversation appears in your inbox. Original transcripts stay intact."
          />
          <PrivacyCard
            title="Replies stay in WhatsApp"
            body="Reply from the WhatsApp Business app on your phone. The directory has no outbound send path for business accounts."
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Link href="/portal/conversations" className="btn-primary flex h-8 items-center px-3 text-[10.5px] font-semibold">
            Open Chats
          </Link>
          <Link href="/portal/help" className="btn-secondary flex h-8 items-center px-3 text-[10.5px] font-semibold">
            Help &amp; Support
          </Link>
        </div>
      </section>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-gray-50 pb-1.5 last:border-0">
      <dt className="shrink-0 text-[10.5px] font-medium text-gray-400">{label}</dt>
      <dd className="min-w-0 break-words text-right text-[11px] font-semibold text-text-primary">{value}</dd>
    </div>
  )
}

function PrivacyCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-surface/50 p-2.5">
      <p className="text-[10.5px] font-bold text-text-primary">{title}</p>
      <p className="mt-0.5 text-[10px] leading-relaxed text-text-secondary">{body}</p>
    </div>
  )
}
