import { getBotSetting, setBotSetting } from '@/lib/bot-settings'
import {
  PLAN_CONFIG,
  PERSONAL_PLAN_CONFIG,
  PRO_ASSISTANCE_PRICE,
  SUPPORT_TIERS,
  type PlanType,
  type SupportTier,
} from '@/types'

export interface PricingConfig {
  business: Record<PlanType, number>
  personal: Record<PlanType, number>
  proAssistance: number
  support: Record<SupportTier, number>
}

export const DEFAULT_PRICING: PricingConfig = {
  business: {
    '1m': PLAN_CONFIG['1m'].price,
    '6m': PLAN_CONFIG['6m'].price,
    '12m': PLAN_CONFIG['12m'].price,
  },
  personal: {
    '1m': PERSONAL_PLAN_CONFIG['1m'].price,
    '6m': PERSONAL_PLAN_CONFIG['6m'].price,
    '12m': PERSONAL_PLAN_CONFIG['12m'].price,
  },
  proAssistance: PRO_ASSISTANCE_PRICE,
  support: {
    bronze: SUPPORT_TIERS.bronze.price,
    silver: SUPPORT_TIERS.silver.price,
    gold: SUPPORT_TIERS.gold.price,
  },
}

const PRICING_KEY = 'pricing'

function sanitizeNumber(value: unknown, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : fallback
}

export async function getPricing(): Promise<PricingConfig> {
  const raw = await getBotSetting(PRICING_KEY)
  if (!raw) return DEFAULT_PRICING
  try {
    const parsed = JSON.parse(raw) as Partial<PricingConfig>
    return {
      business: {
        '1m': sanitizeNumber(parsed.business?.['1m'], DEFAULT_PRICING.business['1m']),
        '6m': sanitizeNumber(parsed.business?.['6m'], DEFAULT_PRICING.business['6m']),
        '12m': sanitizeNumber(parsed.business?.['12m'], DEFAULT_PRICING.business['12m']),
      },
      personal: {
        '1m': sanitizeNumber(parsed.personal?.['1m'], DEFAULT_PRICING.personal['1m']),
        '6m': sanitizeNumber(parsed.personal?.['6m'], DEFAULT_PRICING.personal['6m']),
        '12m': sanitizeNumber(parsed.personal?.['12m'], DEFAULT_PRICING.personal['12m']),
      },
      proAssistance: sanitizeNumber(parsed.proAssistance, DEFAULT_PRICING.proAssistance),
      support: {
        bronze: sanitizeNumber(parsed.support?.bronze, DEFAULT_PRICING.support.bronze),
        silver: sanitizeNumber(parsed.support?.silver, DEFAULT_PRICING.support.silver),
        gold: sanitizeNumber(parsed.support?.gold, DEFAULT_PRICING.support.gold),
      },
    }
  } catch {
    return DEFAULT_PRICING
  }
}

export async function setPricing(next: PricingConfig): Promise<boolean> {
  return setBotSetting(PRICING_KEY, JSON.stringify(next))
}
