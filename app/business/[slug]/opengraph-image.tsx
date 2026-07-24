import { ImageResponse } from '@vercel/og'
import { getSupabase } from '@/lib/supabase-server'

export const runtime = 'edge'
export const contentType = 'image/png'
export const size = { width: 1200, height: 630 }

export default async function OGImage({ params }: { params: { slug: string } }) {
  const { data: business } = await getSupabase()
    .from('businesses')
    .select('name, city')
    .eq('slug', params.slug)
    .single() as { data: { name: string; city: string } | null }

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
          backgroundColor: '#25D366',
          padding: '48px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
          }}
        >
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
          <p
            style={{
              fontSize: '28px',
              color: 'rgba(255,255,255,0.85)',
              margin: '16px 0 0 0',
            }}
          >
            {business?.city ? `${business.city}, Zimbabwe` : 'Zimbabwe'}
          </p>
        </div>
        <p
          style={{
            fontSize: '20px',
            color: 'rgba(255,255,255,0.6)',
            margin: '48px 0 0 0',
            borderTop: '1px solid rgba(255,255,255,0.2)',
            paddingTop: '24px',
          }}
        >
          Find any business on WhatsApp
        </p>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  )
}
