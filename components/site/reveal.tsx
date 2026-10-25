'use client'

import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'

// Scroll-reveal wrapper for the flagship auto-site template.
// Respects the global prefers-reduced-motion kill-switch — motion-capable
// visitors get a soft rise+fade; everyone else gets static content.
// Eased with Apple/Linear style cubic-bezier [0.16, 1, 0.3, 1].
export default function Reveal({
  children,
  delay = 0,
  direction = 'up',
  distance = 20,
  duration = 0.55,
  className,
}: {
  children: ReactNode
  delay?: number
  direction?: 'up' | 'down' | 'left' | 'right' | 'none'
  distance?: number
  duration?: number
  className?: string
}) {
  const reduced = useReducedMotion()
  if (reduced) return <div className={className}>{children}</div>

  const initialOffset = {
    up: { y: distance, x: 0 },
    down: { y: -distance, x: 0 },
    left: { x: distance, y: 0 },
    right: { x: -distance, y: 0 },
    none: { x: 0, y: 0 },
  }[direction]

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, ...initialOffset }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: '-48px' }}
      transition={{
        duration,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  )
}
