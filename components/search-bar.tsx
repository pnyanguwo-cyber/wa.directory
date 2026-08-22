'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function SearchBar({ large = false }: { large?: boolean }) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState<number>(-1)
  const router = useRouter()
  const timerRef = useRef<NodeJS.Timeout>()
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([])
      setShowDropdown(false)
      setLoading(false)
      setSelectedIndex(-1)
      return
    }
    setLoading(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`)
        const data = await res.json()
        const items = data.suggestions || []
        setSuggestions(items)
        setShowDropdown(items.length > 0)
        setSelectedIndex(-1)
      } catch {
        setSuggestions([])
        setSelectedIndex(-1)
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timerRef.current)
  }, [query])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1))
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault()
      const chosen = suggestions[selectedIndex]
      if (chosen) {
        setQuery(chosen)
        setShowDropdown(false)
        router.push(`/search?q=${encodeURIComponent(chosen)}`)
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) {
      setShowDropdown(false)
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      <form onSubmit={handleSubmit}>
        <div className="relative flex items-center">
          {/* Search Glass & AI Spark Icon */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none text-whatsapp-600 dark:text-whatsapp-400">
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>

          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
            placeholder="Search shops, services, prices e.g. solar installer, plumber..."
            aria-label="Search for businesses, services, or locations"
            aria-autocomplete="list"
            aria-controls="search-suggestions"
            aria-expanded={showDropdown}
            className={`w-full pl-11 sm:pl-13 ${large ? 'pr-24 sm:pr-32 h-14 sm:h-16 text-base sm:text-lg' : 'pr-20 h-12 text-sm sm:text-base'} rounded-2xl border border-gray-200/90 dark:border-gray-700/80 bg-white/95 dark:bg-gray-900/95 text-text-primary dark:text-gray-100 placeholder:text-text-secondary/70 dark:placeholder:text-gray-400 backdrop-blur-md focus:border-whatsapp-500 dark:focus:border-whatsapp-400 focus:ring-4 focus:ring-whatsapp-500/15 outline-none transition-all duration-200 shadow-[0_4px_24px_rgba(0,0,0,0.06),inset_0_1px_2px_rgba(0,0,0,0.02)]`}
          />

          {/* Action / Clear / Spinner inside search bar */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 sm:gap-2">
            {query.trim() && !loading && (
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  setSuggestions([])
                  setShowDropdown(false)
                }}
                className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Clear search"
                aria-label="Clear search"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}

            {loading ? (
              <div className="w-5 h-5 mr-3 border-2 border-whatsapp-500 border-t-transparent rounded-full animate-spin" role="status" aria-label="Loading suggestions" />
            ) : large ? (
              <button
                type="submit"
                className="btn-primary h-10 sm:h-12 px-3.5 sm:px-5 text-sm sm:text-base font-semibold flex items-center gap-1.5 rounded-xl shadow-md active:scale-95"
              >
                <span className="hidden sm:inline">Search</span>
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </button>
            ) : (
              <button
                type="submit"
                className="btn-primary h-9 px-3 text-xs font-semibold flex items-center gap-1 rounded-xl shadow-sm"
              >
                <span>Find</span>
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Autocomplete Suggestions Glass Dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <ul
          id="search-suggestions"
          role="listbox"
          className="absolute top-full mt-2 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/90 dark:border-gray-700 rounded-2xl shadow-dropdown z-50 overflow-hidden m-0 p-1.5 list-none animate-slide-up"
        >
          {suggestions.map((name, i) => (
            <li
              key={i}
              role="option"
              aria-selected={i === selectedIndex}
              onClick={() => {
                setShowDropdown(false)
                router.push(`/search?q=${encodeURIComponent(name)}`)
              }}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm transition-all duration-150 cursor-pointer flex items-center justify-between ${
                i === selectedIndex
                  ? 'bg-whatsapp-50 dark:bg-whatsapp-900/40 text-whatsapp-800 dark:text-whatsapp-200 font-semibold shadow-sm'
                  : 'text-text-primary dark:text-gray-200 hover:bg-surface dark:hover:bg-gray-800'
              }`}
            >
              <span className="flex items-center gap-2.5 truncate">
                <svg className="w-4 h-4 text-whatsapp-600 dark:text-whatsapp-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.3-4.3" />
                </svg>
                <span className="truncate">{name}</span>
              </span>
              <span className="text-xs text-whatsapp-700 dark:text-whatsapp-400 font-medium shrink-0 ml-2">
                Search &rarr;
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

