import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'WA Directory - Find any business on WhatsApp',
    short_name: 'WA Directory',
    description: 'AI-powered business directory for Zimbabwe. Find verified local businesses and connect instantly on WhatsApp.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#25D366',
    orientation: 'portrait',
    categories: ['business', 'shopping', 'local'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
