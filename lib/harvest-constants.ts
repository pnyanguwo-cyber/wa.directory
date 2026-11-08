export const HARVEST_CATEGORIES = [
  'general',
  'pricing',
  'location',
  'availability',
  'booking',
  'delivery',
  'contact',
  'service request',
  'complaint',
  'greeting',
] as const

export type HarvestCategory = (typeof HARVEST_CATEGORIES)[number]
