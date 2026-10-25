import { Inter, Playfair_Display, Space_Grotesk, DM_Serif_Display, DM_Sans } from 'next/font/google'
import type { SiteFontKey } from '@/types'

export const fontModernHead = Inter({ subsets: ['latin'], display: 'swap' })
export const fontModernBody = Inter({ subsets: ['latin'], display: 'swap' })
export const fontEditorialHead = Playfair_Display({ subsets: ['latin'], display: 'swap', weight: ['500', '700'] })
export const fontEditorialBody = Inter({ subsets: ['latin'], display: 'swap' })
export const fontGroteskHead = Space_Grotesk({ subsets: ['latin'], display: 'swap' })
export const fontGroteskBody = Inter({ subsets: ['latin'], display: 'swap' })
export const fontWarmHead = DM_Serif_Display({ subsets: ['latin'], display: 'swap', weight: ['400'] })
export const fontWarmBody = DM_Sans({ subsets: ['latin'], display: 'swap' })

export type FontPair = { head: string; body: string; headVars: string }

export function getFontPair(key?: string | null): FontPair {
  switch (key) {
    case 'editorial':
      return { head: fontEditorialHead.style.fontFamily, body: fontEditorialBody.style.fontFamily, headVars: 'var(--font-playfair)' }
    case 'grotesk':
      return { head: fontGroteskHead.style.fontFamily, body: fontGroteskBody.style.fontFamily, headVars: '' }
    case 'warm':
      return { head: fontWarmHead.style.fontFamily, body: fontWarmBody.style.fontFamily, headVars: '' }
    default:
      return { head: fontModernHead.style.fontFamily, body: fontModernBody.style.fontFamily, headVars: '' }
  }
}
