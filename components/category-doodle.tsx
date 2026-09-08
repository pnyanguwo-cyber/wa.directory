// Decorative per-category background doodle (watermark). Pure component —
// works in both server and client components. Renders as a subtle lucide-react
// icon in the card's own text colour, meant to sit at low opacity behind
// content. Fitting icons exist for every category; Yellow Pages listings
// (police, fire, government…) render their emblem on the yellow card.
import { doodleFor } from '@/lib/category-style'

export default function CategoryDoodle({
  categories,
  className = '',
  strokeWidth = 1.2,
}: {
  categories?: string[] | null
  className?: string
  strokeWidth?: number
}) {
  const doodle = doodleFor(categories)
  if (!doodle) return null

  const Icon = doodle.icon

  return (
    <Icon
      strokeWidth={strokeWidth}
      aria-hidden="true"
      className={`pointer-events-none select-none ${className}`}
    />
  )
}
