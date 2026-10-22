// Category styling: Yellow Pages detection + per-category background doodles.
// A "Yellow Pages" listing is one tagged with a special (public-service)
// category — it renders with the amber/yellow treatment everywhere.
import { categories } from '@/data/categories'
import {
  Cake,
  Wrench,
  Zap,
  UtensilsCrossed,
  Scissors,
  Hammer,
  Shirt,
  Car,
  SprayCan,
  Sprout,
  Stethoscope,
  GraduationCap,
  Monitor,
  Truck,
  Home,
  Banknote,
  Scale,
  Camera,
  Smartphone,
  PawPrint,
  Pickaxe,
  Droplets,
  Factory,
  Package,
  Shield,
  Heart,
  Dumbbell,
  Printer,
  Gem,
  Music,
  Building2,
  BedDouble,
  Plane,
  Beer,
  Briefcase,
  Languages,
  HandHeart,
  Baby,
  Trees,
  Siren,
  Landmark,
  Sparkles,
  type LucideProps,
} from 'lucide-react'

const SPECIAL = new Set(categories.filter(c => c.special).map(c => c.name))

export function isYellowPages(categories?: string[] | null): boolean {
  if (!categories || categories.length === 0) return false
  return categories.some(c => SPECIAL.has(c))
}

// Every recognised category has a fitting lucide-react icon used as a
// background watermark on cards and profiles. Keyed by exact category name;
// unknown categories fall back to a neutral sparkle.
export const LUCIDE_DOODLES: Record<string, React.ComponentType<LucideProps>> = {
  Baker: Cake,
  Plumber: Wrench,
  Electrician: Zap,
  'Food & Restaurant': UtensilsCrossed,
  'Hair & Beauty': Scissors,
  'Building Materials': Hammer,
  'Clothing & Fashion': Shirt,
  Automotive: Car,
  'Cleaning Services': SprayCan,
  'Farming & Agriculture': Sprout,
  'Health & Medical': Stethoscope,
  'Education & Tutoring': GraduationCap,
  'IT & Web': Monitor,
  'Transport & Delivery': Truck,
  'Real Estate': Home,
  'Financial Services': Banknote,
  'Legal Services': Scale,
  Photography: Camera,
  Electronics: Smartphone,
  'Pet Services': PawPrint,
  Mining: Pickaxe,
  Utilities: Droplets,
  Manufacturing: Factory,
  Wholesale: Package,
  'Security Services': Shield,
  'Funeral Services': Heart,
  'Fitness & Gym': Dumbbell,
  Printing: Printer,
  Jewelry: Gem,
  Entertainment: Music,
  'Hotel & Lodging': BedDouble,
  'Travel & Tourism': Plane,
  Brewery: Beer,
  'Professional Services': Briefcase,
  'Music Studio': Music,
  Translation: Languages,
  Nonprofit: HandHeart,
  Daycare: Baby,
  'Coworking Space': Building2,
  Landscaping: Trees,
  'Emergency Services': Siren,
  'Government Services': Landmark,
  Other: Sparkles,
}

// Returns the lucide icon component for a given category list, or null if
// no categories are provided. Falls back to Sparkles for unknown categories.
export function doodleFor(categories?: string[] | null): { name: string; icon: React.ComponentType<LucideProps> } | null {
  if (!categories || categories.length === 0) return null
  for (const cat of categories) {
    const icon = LUCIDE_DOODLES[cat]
    if (icon) return { name: cat, icon }
  }
  return { name: 'Other', icon: LUCIDE_DOODLES.Other }
}

// Per-category default accent colours for auto-generated business websites
// (/site/[slug]). Owners can override via the portal (site_theme.accent); an
// empty/unset value falls back to the category colour so every industry looks
// distinct. All values are mid-to-dark saturated hues — getContrastColor()
// in the site template picks white/dark CTA text automatically.
export const CATEGORY_ACCENTS: Record<string, string> = {
  Baker: '#D97706',
  Plumber: '#2563EB',
  Electrician: '#CA8A04',
  'Food & Restaurant': '#EA580C',
  'Hair & Beauty': '#DB2777',
  'Building Materials': '#A16207',
  'Clothing & Fashion': '#C026D3',
  Automotive: '#DC2626',
  'Cleaning Services': '#0284C7',
  'Farming & Agriculture': '#15803D',
  'Health & Medical': '#0D9488',
  'Education & Tutoring': '#4F46E5',
  'IT & Web': '#7C3AED',
  'Transport & Delivery': '#0E7490',
  'Real Estate': '#059669',
  'Financial Services': '#1E40AF',
  'Legal Services': '#334155',
  Photography: '#9333EA',
  Electronics: '#0891B2',
  'Pet Services': '#F97316',
  Mining: '#92400E',
  Utilities: '#0F766E',
  Manufacturing: '#52525B',
  Wholesale: '#B45309',
  'Security Services': '#1E293B',
  'Funeral Services': '#4B5563',
  'Fitness & Gym': '#E11D48',
  Printing: '#6D28D9',
  Jewelry: '#F59E0B',
  Entertainment: '#A855F7',
  'Hotel & Lodging': '#115E59',
  'Travel & Tourism': '#0EA5E9',
  Brewery: '#9A3412',
  'Professional Services': '#475569',
  'Music Studio': '#6B21A8',
  Translation: '#4338CA',
  Nonprofit: '#047857',
  Daycare: '#EC4899',
  'Coworking Space': '#3B82F6',
  Landscaping: '#16A34A',
  'Emergency Services': '#B91C1C',
  'Government Services': '#1E3A8A',
  Other: '#25D366',
}

// Returns the default accent colour for a business's categories (first match),
// falling back to the WhatsApp-green Other colour.
export function accentFor(categories?: string[] | null): string {
  if (categories) {
    for (const cat of categories) {
      const accent = CATEGORY_ACCENTS[cat]
      if (accent) return accent
    }
  }
  return CATEGORY_ACCENTS.Other
}
