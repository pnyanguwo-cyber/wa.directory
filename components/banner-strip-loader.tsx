import { getSupabase } from '@/lib/supabase-server'
import BannerStrip from '@/components/banner-strip'

export default async function BannerStripLoader() {
  const { data: banners } = await getSupabase()
    .from('banners')
    .select('id, text, link, link_label')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <BannerStrip
      banners={(banners || []).map(b => ({
        id: b.id,
        text: b.text,
        link: b.link || '',
        link_label: b.link_label || 'Learn more',
      }))}
    />
  )
}