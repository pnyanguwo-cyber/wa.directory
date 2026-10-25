'use client'

import { useState, useEffect } from 'react'
import { useReducedMotion } from 'framer-motion'

interface TypingTaglineProps {
  baseText: string
  alternateWords?: string[]
  accent: string
  className?: string
}

/**
 * Silicon-Valley style typing effect with zero layout shift and reduced-motion support.
 * Displays the main tagline or smoothly types through specialized services/categories.
 */
export default function TypingTagline({
  baseText,
  alternateWords = [],
  accent,
  className = '',
}: TypingTaglineProps) {
  const reducedMotion = useReducedMotion()

  // If no alternating words or reduced motion is preferred, render static text immediately
  const shouldAnimate = !reducedMotion && alternateWords.length > 0

  const [wordIndex, setWordIndex] = useState(0)
  const [displayText, setDisplayText] = useState(baseText)
  const [isDeleting, setIsDeleting] = useState(false)
  const [hasStartedAlternating, setHasStartedAlternating] = useState(false)

  useEffect(() => {
    if (!shouldAnimate) return

    // Initial pause on the base tagline before alternating
    if (!hasStartedAlternating) {
      const initialTimer = setTimeout(() => {
        setHasStartedAlternating(true)
        setIsDeleting(true)
      }, 3500)
      return () => clearTimeout(initialTimer)
    }

    const currentTarget = alternateWords[wordIndex]
    const typingSpeed = isDeleting ? 28 : 65

    const timer = setTimeout(() => {
      if (!isDeleting) {
        setDisplayText(currentTarget.slice(0, displayText.length + 1))
        if (displayText.length + 1 === currentTarget.length) {
          // Pause when word is completely typed
          setTimeout(() => setIsDeleting(true), 2800)
        }
      } else {
        setDisplayText(displayText.slice(0, displayText.length - 1))
        if (displayText.length <= 0) {
          setIsDeleting(false)
          setWordIndex((prev) => (prev + 1) % alternateWords.length)
        }
      }
    }, typingSpeed)

    return () => clearTimeout(timer)
  }, [displayText, isDeleting, wordIndex, hasStartedAlternating, shouldAnimate, alternateWords, baseText])

  if (!shouldAnimate) {
    return <span className={className}>{baseText}</span>
  }

  return (
    <span className={`inline-block ${className}`}>
      <span>{displayText || '\u00A0'}</span>
      <span
        className="inline-block w-[3px] h-[0.9em] ml-1.5 rounded-full align-middle animate-pulse"
        style={{ backgroundColor: accent }}
        aria-hidden="true"
      />
    </span>
  )
}
