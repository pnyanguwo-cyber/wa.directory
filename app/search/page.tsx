import { getSupabase } from '@/lib/supabase-server'
import BusinessCard from '@/components/business-card'

export const dynamic = 'force-dynamic'

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string }
}) {
  const q = searchParams.q || ''

  const { data: businesses } = await getSupabase()
    .from('businesses')
    .select('*')
    .or(`name.ilike.%${q}%,bio.ilike.%${q}%`)
    .order('rating', { ascending: false })

  const count = businesses?.length || 0

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">
        Results for &ldquo;{q}&rdquo;
      </h1>
      <p className="text-gray-500 mb-6">
        {count} business{count !== 1 ? 'es' : ''} found
      </p>
      {count === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🔍</div>
          <p className="text-gray-500">No businesses found. Try a different search term.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {businesses!.map(b => (
            <BusinessCard key={b.id} business={b} />
          ))}
        </div>
      )}
    </div>
  )
}
