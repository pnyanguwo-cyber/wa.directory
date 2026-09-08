import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import EditBusinessForm from '@/components/edit-business-form'
import { getApprovedCategories, getApprovedAreas } from '@/lib/approved-data'

export const dynamic = 'force-dynamic'

export default async function EditPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  if (!token) {
    redirect('/')
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('edit_token', token)
    .single()

  if (!business) {
    redirect('/')
  }

  const [approvedCategories, approvedAreas] = await Promise.all([
    getApprovedCategories(),
    getApprovedAreas(),
  ])

  const { data: pendingRequests } = await supabase
    .from('feature_requests')
    .select('type, name, city')
    .eq('business_id', business.id)
    .eq('status', 'pending')

  const { data: existingAccount } = await supabase
    .from('business_accounts')
    .select('id')
    .eq('business_id', business.id)
    .maybeSingle()

  return (
    <main className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Payment Status Banner */}
        {business.payment_status === 'pending' && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Payment pending</p>
            </div>
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Your listing needs USD 1 to go live. Anyone can pay at <Link href="/pay" className="font-semibold underline">/pay</Link> using your Business ID: <span className="font-mono font-bold">{business.business_id}</span>
            </p>
          </div>
        )}
        {business.payment_status === 'expired' && (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-sm font-bold text-red-800 dark:text-red-300">Listing hidden</p>
            </div>
            <p className="text-xs text-red-800 dark:text-red-300">
              Your subscription expired. Your listing is not visible to customers. Pay USD 1 to restore it at <Link href="/pay" className="font-semibold underline">/pay</Link> using Business ID: <span className="font-mono font-bold">{business.business_id}</span>
            </p>
          </div>
        )}
        {!existingAccount && (
          <div className="bg-gradient-to-br from-whatsapp-50 to-white dark:from-whatsapp-950/40 dark:to-gray-900 backdrop-blur-xl rounded-3xl border border-whatsapp-200 dark:border-whatsapp-800/50 shadow-soft-lift p-6 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-base font-extrabold text-text-primary tracking-tight">Create your portal account</h2>
              <p className="text-xs text-text-secondary mt-1">
                Unlock statistics, conversations, rankings and more with a password.
              </p>
            </div>
            <Link
              href={`/account-setup?token=${token}`}
              className="btn-primary px-5 py-2.5 text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25z" />
              </svg>
              Create account
            </Link>
          </div>
        )}
        <div className="bg-gradient-to-br from-white/85 via-white/80 to-whatsapp-50/20 dark:from-gray-900/90 dark:via-gray-900/80 dark:to-whatsapp-950/20 backdrop-blur-xl rounded-3xl border border-white/70 dark:border-gray-800 shadow-soft-lift p-6 sm:p-8">
          <EditBusinessForm
            business={business}
            categoryOptions={approvedCategories.map(c => ({ value: c.name, label: `${c.icon} ${c.name}` }))}
            approvedAreas={approvedAreas}
            pendingFeatureNames={(pendingRequests || []).map(r => ({ type: r.type, name: r.name, city: r.city }))}
          />
        </div>
      </div>
    </main>
  )
}
