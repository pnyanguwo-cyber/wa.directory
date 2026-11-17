import { redirect } from 'next/navigation'
import { getActingPortalBusiness, getDailyStats } from '@/lib/portal'
import { isPremiumActive } from '@/lib/premium-entitlement'
import { getSupabase } from '@/lib/supabase-server'
import { dedupeCategories } from '@/lib/utils'
import TipsList from '@/components/portal/tips-list'

export const dynamic = 'force-dynamic'

interface Tip {
  level: 'good' | 'warn' | 'bad'
  title: string
  detail: string
}

const STAT_PATHS: Record<string, string> = {
  eye:
    'M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  trophy:
    'M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0',
  check:
    'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  star:
    'M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z',
}

function StatIcon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={STAT_PATHS[name] || STAT_PATHS.check} />
    </svg>
  )
}

async function buildTips(businessId: string, business: Record<string, any>, paid: boolean): Promise<{ tips: Tip[]; comparison: { mine: number; median: number; rank: number; count: number } | null }> {
  const tips: Tip[] = []
  const cleanCats = dedupeCategories(business.category || [])

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
    const cleanCats = dedupeCategories(business.category)
    const mainCat = cleanCats[0]
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

export default async function PortalImprovePage({ searchParams }: { searchParams: { branch?: string } }) {
  const session = await getActingPortalBusiness(searchParams?.branch)
  if (!session) redirect('/login')
  const business = session.business
  const branchId = searchParams?.branch || null

  const cleanCats = dedupeCategories(business.category || [])

  const paid = await isPremiumActive(branchId)
  const { tips, comparison } = await buildTips(business.id, business as unknown as Record<string, any>, paid)

  const goodCount = tips.filter(t => t.level === 'good').length
  const score = tips.length ? Math.round((goodCount / tips.length) * 100) : 0
  const reviewCount = Number(business.review_count || 0)
  const rating = Number(business.rating || 0)

  const stats = [
    {
      label: 'Profile views',
      value: comparison ? comparison.mine.toLocaleString() : '—',
      hint: comparison ? `${comparison.median.toLocaleString()} category median` : 'Premium compares you with your category',
      icon: 'eye',
    },
    {
      label: 'Category rank',
      value: comparison ? `#${comparison.rank}` : '—',
      hint: comparison ? `of ${comparison.count} verified businesses` : 'Premium reveals your position',
      icon: 'trophy',
    },
    {
      label: 'Listing score',
      value: `${score}%`,
      hint: `${goodCount} of ${tips.length} checks complete`,
      icon: 'check',
    },
    {
      label: 'Reviews',
      value: reviewCount.toLocaleString(),
      hint: rating > 0 ? `${rating.toFixed(1)} / 5 average` : 'Ask happy customers to rate you',
      icon: 'star',
    },
  ]

  const visible = paid ? tips : tips.slice(0, 3)

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

      <div className="grid grid-cols-2 gap-3">
        {stats.map(stat => (
          <div key={stat.label} className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-card">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-text-secondary">{stat.label}</p>
              <span className="w-7 h-7 shrink-0 rounded-xl bg-whatsapp-50 text-whatsapp-700 flex items-center justify-center">
                <StatIcon name={stat.icon} />
              </span>
            </div>
            <p className="mt-2 text-2xl font-extrabold text-text-primary leading-none">{stat.value}</p>
            <p className="text-[11px] text-text-secondary mt-1.5 leading-snug">{stat.hint}</p>
          </div>
        ))}
      </div>

      {comparison && (
        <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-card">
          <p className="text-sm font-bold text-text-primary mb-1">Profile views vs your category</p>
          <p className="text-xs text-text-secondary mb-3">
            Compared against {comparison.count} verified businesses in “{cleanCats[0]}”.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-end justify-between mb-1">
                <span className="text-[11px] font-semibold text-text-secondary">Your business</span>
                <span className="text-sm font-extrabold text-whatsapp-700">{comparison.mine}</span>
              </div>
              <div className="h-3 bg-surface rounded-full overflow-hidden">
                <div className="h-full bg-whatsapp-500 rounded-full" style={{ width: `${Math.min(100, (comparison.mine / Math.max(1, comparison.median * 2)) * 100)}%` }} />
              </div>
            </div>
            <div>
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
            {comparison.mine < comparison.median ? ' Share your QR code and profile link to catch up.' : ' Great work: you are above the category median.'}
          </p>
        </div>
      )}

      <div>
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-sm font-bold text-text-primary">Your checklist</h3>
          <span className="text-[11px] text-text-secondary">{goodCount} of {tips.length} done</span>
        </div>
        <TipsList tips={visible} />
      </div>

      {!paid && (
        <div className="bg-gradient-to-br from-whatsapp-50 to-white border border-whatsapp-200 rounded-2xl p-5 text-center">
          <p className="text-sm font-bold text-text-primary">Unlock the full analysis</p>
          <p className="text-xs text-text-secondary mt-1 mb-3">
            Get all {tips.length} tips plus a live comparison against other {cleanCats[0]} businesses in your area.
          </p>
          <a href="/portal/billing" className="btn-primary inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold rounded-2xl">
            Go premium
          </a>
        </div>
      )}
    </div>
  )
}
