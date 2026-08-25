import { getSupabase } from '@/lib/supabase-server'

export async function GET() {
  const siteUrl = process.env.SITE_URL || 'https://wadirectory.co.zw'

  const { data: businesses } = await getSupabase()
    .from('businesses')
    .select('slug, id, updated_at, created_at')
    .order('created_at', { ascending: false })

  const businessUrls = (businesses || [])
    .map(
      b => `
  <url>
    <loc>${siteUrl}/business/${b.slug || b.id}</loc>
    <lastmod>${b.updated_at || b.created_at || new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`
    )
    .join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${siteUrl}/list</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>${businessUrls}
</urlset>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
