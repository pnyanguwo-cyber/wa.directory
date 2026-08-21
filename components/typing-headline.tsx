'use client'

import { useState, useEffect } from 'react'

const WORDS = [
  'plumber',
  'salon',
  'grocery store',
  'auto repair',
  'restaurant',
  'electrician',
  'pharmacy',
  'bakery'
]

export default function TypingHeadline() {
  const [wordIndex, setWordIndex] = useState(0)
  const [currentText, setCurrentText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const targetWord = WORDS[wordIndex]
    const speed = isDeleting ? 40 : 80

    const timer = setTimeout(() => {
      if (!isDeleting) {
        setCurrentText(targetWord.slice(0, currentText.length + 1))
        if (currentText.length + 1 === targetWord.length) {
          // Pause before deleting
          setTimeout(() => setIsDeleting(true), 2000)
        }
      } else {
        setCurrentText(targetWord.slice(0, currentText.length - 1))
        if (currentText.length - 1 === 0) {
          setIsDeleting(false)
          setWordIndex((prev) => (prev + 1) % WORDS.length)
        }
      }
    }, speed)

    return () => clearTimeout(timer)
  }, [currentText, isDeleting, wordIndex])

  return (
    <h1 className="text-4xl sm:text-6xl font-extrabold text-text-primary mb-4 tracking-tight leading-tight text-center">
      <span className="whitespace-nowrap">Find any{' '}
        <span className="relative inline-block text-whatsapp-600 border-b-2 border-whatsapp-500/40 pb-0.5">
          {currentText}
          <span
            className="inline-block w-0.5 h-9 sm:h-14 ml-0.5 bg-whatsapp-500 animate-pulse align-middle"
            aria-hidden="true"
          />
        </span>
      </span>
      <br />
      on WhatsApp
    </h1>
  )
}
