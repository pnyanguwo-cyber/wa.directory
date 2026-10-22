import { ImageResponse } from '@vercel/og'
import { getSupabase } from '@/lib/supabase-server'
import { parseSiteContent } from '@/lib/site-content'

export const runtime = 'edge'
export const contentType = 'image/png'
export const size = { width: 1200, height: 630 }

const HEX_RE = /^#[0-9a-fA-F]{6}$/

export default async function OGImage({ params }: { params: { slug: string } }) {
  const { data: business } = await getSupabase()
    .from('businesses')
    .select('name, city, site_content, site_theme')
    .eq('slug', params.slug)
    .single() as { data: { name: string; city: string; site_content: unknown; site_theme: { accent?: string } | null } | null }

  const accent = business?.site_theme?.accent && HEX_RE.test(business.site_theme.accent) ? '#' + business.site_theme.accent.replace('#', '').toUpperCase() : '#25D366'
  const tagline = parseSiteContent(business?.site_content).tagline

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: accent,
          padding: '48px',
        }}
      >
        {tagline && (
          <p style={{ fontSize: '30px', color: 'rgba(255,255,255,0.9)', margin: '0 0 8px 0', fontWeight: 600 }}>{tagline}</p>
        )}
        <h1
          style={{
            fontSize: '64px',
            color: 'white',
            fontWeight: 700,
            textAlign: 'center',
            lineHeight: 1.2,
            margin: 0,
          }}
        >
          {business?.name || 'WA Directory'}
        </h1>
        <p style={{ fontSize: '26px', color: 'rgba(255,255,255,0.85)', margin: '14px 0 0 0' }}>
          {business?.city ? `${business.city}, Zimbabwe` : 'Zimbabwe'}
        </p>
        <p
          style={{
            fontSize: '19px',
            color: 'rgba(255,255,255,0.65)',
            margin: '44px 0 0 0',
            borderTop: '1px solid rgba(255,255,255,0.25)',
            paddingTop: '22px',
          }}
        >
          wa.directory · Connect instantly
        </p>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
