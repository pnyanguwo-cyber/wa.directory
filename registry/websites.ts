import type { ComponentType } from 'react'
import type { ThemeProps } from '@/lib/site-view'

export interface WebsiteThemeMeta {
  id: string
  name: string
  version: string
  family: string
  description: string
  orientations: string[]
  defaultOrientation: string
  supports: {
    cart: boolean
    voiceOnly: boolean
    dark: boolean
    reducedMotion: boolean
  }
  preview: {
    desktop: string
    mobile: string
    /** Optimised card thumbnail shown in the portal theme picker. */
    card?: string
  }
}

export interface WebsiteThemeEntry {
  load: () => Promise<{ default: ComponentType<ThemeProps> }>
  meta: WebsiteThemeMeta
}

export const WEBSITE_THEMES: Record<string, WebsiteThemeEntry> = {
  atlas: {
    load: () => import('@/themes/atlas/index'),
    meta: {
      id: 'atlas',
      name: 'Atlas',
      version: '1.1.0',
      family: 'atlas',
      description: 'High-tech hardware & gadget store layout with dynamic reactive telemetry and quick inspect.',
      orientations: ['split', 'stacked'],
      defaultOrientation: 'split',
      supports: { cart: false, voiceOnly: true, dark: true, reducedMotion: true },
      preview: {
        desktop: '/previews/atlas/desktop.png',
        mobile: '/previews/atlas/mobile.png',
        card: '/previews/atlas/card.webp',
      },
    },
  },
  monolith: {
    load: () => import('@/themes/monolith/index'),
    meta: {
      id: 'monolith',
      name: 'Monolith',
      version: '1.0.0',
      family: 'monolith',
      description: 'Immersive full-bleed hero with a dark editorial presence.',
      orientations: ['immersive', 'stacked'],
      defaultOrientation: 'immersive',
      supports: { cart: false, voiceOnly: true, dark: true, reducedMotion: true },
      preview: {
        desktop: '/previews/monolith/desktop.png',
        mobile: '/previews/monolith/mobile.png',
        card: '/previews/monolith/card.webp',
      },
    },
  },
  market: {
    load: () => import('@/themes/market/index'),
    meta: {
      id: 'market',
      name: 'Market',
      version: '1.1.0',
      family: 'market',
      description: 'Grand flagship storefront layout with cinematic cover hero, dynamic pointer-reactive ambient background, real-time search & category filters, Quick-Inspect modal, gallery lightbox, and full WhatsApp cart integration.',
      orientations: ['catalogue', 'stacked'],
      defaultOrientation: 'catalogue',
      supports: { cart: true, voiceOnly: true, dark: true, reducedMotion: true },
      preview: {
        desktop: '/previews/market/desktop.png',
        mobile: '/previews/market/mobile.png',
        card: '/previews/market/card.webp',
      },
    },
  },
}

export async function resolveTheme(id: string): Promise<WebsiteThemeEntry | null> {
  if (!id) return null
  return WEBSITE_THEMES[id] ?? null
}
