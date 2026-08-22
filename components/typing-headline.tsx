'use client'

import { useState, useEffect } from 'react'

const WORDS = [
  'plumber in Harare',
  'solar installer',
  'catering service',
  'auto mechanic',
  'hair salon & spa',
  'phone repair',
  'grocery store',
  'hardware store',
  'electrician',
  'pharmacy',
]

export default function TypingHeadline() {
  const [wordIndex, setWordIndex] = useState(0)
  const [currentText, setCurrentText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const targetWord = WORDS[wordIndex]
    const speed = isDeleting ? 30 : 70

    const timer = setTimeout(() => {
      if (!isDeleting) {
        setCurrentText(targetWord.slice(0, currentText.length + 1))
        if (currentText.length + 1 === targetWord.length) {
          setTimeout(() => setIsDeleting(true), 2400)
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
    <div className="max-w-5xl mx-auto mb-4 sm:mb-6">
      <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-text-primary dark:text-white tracking-tight leading-[1.1] sm:leading-[1.06] text-center">
        <span>Find any </span>
        <span className="relative inline-block bg-gradient-to-r from-whatsapp-600 via-whatsapp-500 to-emerald-500 dark:from-whatsapp-400 dark:via-emerald-400 dark:to-teal-300 bg-clip-text text-transparent pb-1">
          {currentText || '\u00A0'}
          <span
            className="inline-block w-1.5 sm:w-2 md:w-2.5 h-[0.82em] ml-1 sm:ml-2 bg-whatsapp-500 dark:bg-whatsapp-400 rounded-sm animate-pulse align-baseline"
            aria-hidden="true"
          />
        </span>
        <span className="block mt-2">on WhatsApp</span>
      </h1>
    </div>
  )
}


