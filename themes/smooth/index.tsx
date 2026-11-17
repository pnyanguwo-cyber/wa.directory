'use client'

import type { ReactNode } from 'react'
import MonolithTheme from '@/themes/monolith/index'
import type { ThemeProps } from '@/lib/site-view'
import './theme.css'

/**
 * Smooth — the Monolith layout with Atlas manners: pill controls, rounded
 * glass panels, softer hairlines and a slower rotating seal. Reuses the
 * Monolith renderer so content, cart rules and motion stay in one place.
 */
export default function SmoothTheme(props: ThemeProps): ReactNode {
  return (
    <div className="mono-smooth">
      <MonolithTheme {...props} variant="smooth" />
    </div>
  )
}
