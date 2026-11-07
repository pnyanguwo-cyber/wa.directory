'use client'

// Small React wrapper that renders the Lucide SVG icon for a business
// category. Used on all map UI surfaces (sidebar rows, category pills,
// preview card, mobile sheet) as the emoji replacement.

import { doodleFor, LUCIDE_DOODLES } from '@/lib/category-style'
import type { LucideProps } from 'lucide-react'

interface CategoryIconProps {
  categories?: string[] | null
  className?: string
  strokeWidth?: number
}

export default function CategoryIcon({ categories, className, strokeWidth = 2 }: CategoryIconProps) {
  const hit = categories?.length ? doodleFor(categories) : null
  const Icon = (hit?.icon || LUCIDE_DOODLES.Other) as React.ComponentType<LucideProps>
  return <Icon className={className} strokeWidth={strokeWidth} aria-hidden="true" />
}
