import { redirect } from 'next/navigation'
import { getPortalBusiness, getDailyStats, isPaidSubscriber } from '@/lib/portal'
import { getSupabase } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

interface Tip {
  level: 'good' | 'warn' | 'bad'
  title: string
  detail: string
}

async function buildTips(businessId: string, business: Record<string, any>, paid: boolean): Promise<{ tips: Tip[]; comparison: { mine: number; median: number; rank: number; count: number } | null }> {
  const tips: Tip[] = []

  const bio = (business.bio || '').trim()
  if (!bio) {
    tips.push({ level: 'bad', title: 'Add a description', detail: 'Businesses with a description get more WhatsApp chats. Edit your listing and write 2–3 sentences about what you offer.' })
  } else if (bio.length < 40 || /^Professional .* services\.$/i.test(bio)) {
    tips.push({ level: 'warn', title: 'Improve your description', detail: 'Your description looks like a placeholder. Replace it with a detailed, friendly description of your services.' })
  } else {
    tips.push({ level: 'good', title: 'Nice description', detail: 'Your listing has a solid description. Keep it fresh as your services change.' })
  }

  if (!business.website) {
    tips.push({ level: 'warn', title: 'Add your website', detail: 'A website link builds trust and gives customers more info before they chat with you.' })
  }

  if (!business.logo_url) {
    tips.push({ level: 'warn', title: 'Upload a logo', detail: 'Listings with a logo stand out in search results and look more professional.' })
  } else {
    tips.push({ level: 'good', title: 'Logo uploaded', detail: 'Your listing has a logo. Nice work.' })
  }

  if (!business.whatsapp_username) {
    tips.push({ level: 'warn', title: 'Add your WhatsApp username', detail: 'Customers often look for businesses by @username. Add it to your listing.' })
  }

  if (!business.price_range) {
    tips.push({ level: 'warn', title: 'Add a price range', detail: 'Showing a price range (e.g. $10–$50) helps customers decide before messaging you.' })
  }

  if (!business.catalog_link) {
    tips.push({ level: 'warn', title: 'Add your catalog', detail: 'A WhatsApp catalog link lets customers browse your products without asking.' })
  }

  if (!business.area) {
    tips.push({ level: 'warn', title: 'Add your area', detail: 'Listings with a specific area (e.g. Mabelreign, Harare) appear in more targeted searches.' })
  }

  if (business.review_count < 3) {
    tips.push({ level: 'warn', title: 'Collect reviews', detail: 'Businesses with reviews rank higher and get more clicks. Ask happy customers to rate you after a chat.' })
  } else {
    tips.push({ level: 'good', title: `You have ${business.review_count} review${business.review_count > 1 ? 's' : ''}`, detail: 'Reviews build trust. Keep encouraging customers to leave ratings.' })
  }

  let comparison: { mine: number; median: number; rank: number; count: number } | null = null

  if (paid && business.category?.length) {
    const supabase = getSupabase()
    const mainCat = business.category[0]
    const { data: sameCat } = await supabase
      .from('businesses')
      .select('id')
      .eq('verified', true)
      .contains('category', [mainCat])
      .limit(200)

    const ids = (sameCat || []).map(b => b.id)
    if (ids.length > 1) {
      const { data: views } = await supabase
        .from('daily_stats')
        .select('business_id, count')
        .in('business_id', ids)
        .eq('type', 'profile_view')

      const sums = new Map<string, number>()
      for (const v of views || []) {
        sums.set(v.business_id, (sums.get(v.business_id) || 0) + Number(v.count))
      }
      const mine = sums.get(businessId) || 0
      const sorted = [...sums.values()].sort((a, b) => b - a)
      const pos = sorted.indexOf(mine)
      const rank = pos >= 0 ? pos + 1 : sorted.length + 1
      const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0
      comparison = { mine, median, rank, count: ids.length }
    }
  }

  return { tips, comparison }
}

export default async function PortalImprovePage() {
  const business = await getPortalBusiness()
  if (!business) redirect('/login')

  const paid = await isPaidSubscriber(business.id)
  const { tips, comparison } = await buildTips(business.id, business as unknown as Record<string, any>, paid)

  const visible = paid ? tips : tips.slice(0, 3)

  const levelStyles: Record<Tip['level'], string> = {
    good: 'border-whatsapp-200 bg-whatsapp-50/60 dark:border-whatsapp-800/50 dark:bg-whatsapp-950/30',
    warn: 'border-amber-200 bg-amber-50/60 dark:border-amber-800/50 dark:bg-amber-950/30',
    bad: 'border-red-200 bg-red-50/60 dark:border-red-800/50 dark:bg-red-950/30',
  }
  const levelDot: Record<Tip['level'], string> = {
    good: 'bg-whatsapp-500',
    warn: 'bg-amber-500',
    bad: 'bg-red-500',
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-text-primary">Improve your listing</h2>
        <p className="text-xs text-text-secondary mt-0.5">
          {paid
            ? 'Full analysis with category comparison.'
            : `Free plan: ${visible.length} of ${tips.length} tips. Go premium for the full analysis.`}
        </p>
      </div>

      {comparison && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-2xl p-4 shadow-card">
          <p className="text-sm font-bold text-text-primary mb-1">Profile views vs your category</p>
          <p className="text-xs text-text-secondary mb-3">
            Compared against {comparison.count} verified businesses in “{business.category[0]}”.
          </p>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <div className="flex items-end justify-between mb-1">
                <span className="text-[11px] font-semibold text-text-secondary">Your business</span>
                <span className="text-sm font-extrabold text-whatsapp-700">{comparison.mine}</span>
              </div>
              <div className="h-3 bg-surface rounded-full overflow-hidden">
                <div className="h-full bg-whatsapp-500 rounded-full" style={{ width: `${Math.min(100, (comparison.mine / Math.max(1, comparison.median * 2)) * 100)}%` }} />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-end justify-between mb-1">
                <span className="text-[11px] font-semibold text-text-secondary">Category median</span>
                <span className="text-sm font-extrabold text-text-primary">{comparison.median}</span>
              </div>
              <div className="h-3 bg-surface rounded-full overflow-hidden">
                <div className="h-full bg-gray-400 rounded-full" style={{ width: `${Math.min(100, (comparison.median / Math.max(1, comparison.median * 2)) * 100)}%` }} />
              </div>
            </div>
          </div>
          <p className="text-xs text-text-secondary mt-3">
            You are <b className="text-text-primary">#{comparison.rank} of {comparison.count}</b> in profile views in this category.
            {comparison.mine < comparison.median ? ' Share your QR code and profile link to catch up.' : ' Great work — you are above the category median.'}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {visible.map((tip, i) => (
          <div key={i} className={`border rounded-2xl p-4 ${levelStyles[tip.level]}`}>
            <p className="text-sm font-bold text-text-primary flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${levelDot[tip.level]}`} />
              {tip.title}
            </p>
            <p className="text-xs text-text-secondary mt-1 leading-relaxed">{tip.detail}</p>
          </div>
        ))}
      </div>

      {!paid && (
        <div className="bg-gradient-to-br from-whatsapp-50 to-white dark:from-whatsapp-950/40 dark:to-gray-900 border border-whatsapp-200 dark:border-whatsapp-800/50 rounded-2xl p-5 text-center">
          <p className="text-sm font-bold text-text-primary">Unlock the full analysis</p>
          <p className="text-xs text-text-secondary mt-1 mb-3">
            Get all {tips.length} tips plus a live comparison against other {business.category[0]} businesses in your area.
          </p>
          <a href="/portal/billing" className="btn-primary inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold rounded-2xl">
            Go premium
          </a>
        </div>
      )}
    </div>
  )
}