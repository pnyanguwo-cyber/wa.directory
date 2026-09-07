// Decorative per-category background doodle (watermark). Pure component —
// works in both server and client components. Renders as a subtle line-art
// icon in the card's own text colour, meant to sit at low opacity behind
// content. Fitting doodles exist for every category; Yellow Pages listings
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

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`pointer-events-none select-none ${className}`}
    >
      {doodle.paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  )
}
