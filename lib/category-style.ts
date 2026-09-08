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
