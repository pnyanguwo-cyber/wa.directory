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
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none text-whatsapp-600">
            <svg
              className="w-5 h-5"
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
            placeholder="Search shops, services, prices e.g. plumber"
            aria-label="Search for businesses, services, or locations"
            aria-autocomplete="list"
            aria-controls="search-suggestions"
            aria-expanded={showDropdown}
            className={`w-full pl-12 ${large ? 'pr-28 h-14 text-base sm:text-lg' : 'pr-12 h-12 text-base'} rounded-2xl border border-gray-200/90 bg-white/95 backdrop-blur-md focus:border-whatsapp-500 focus:ring-4 focus:ring-whatsapp-500/15 outline-none transition-all duration-200 shadow-[0_4px_20px_rgba(0,0,0,0.06),inset_0_2px_4px_rgba(0,0,0,0.02)]`}
          />

          {/* Action / Spinner inside search bar */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {loading ? (
              <div className="w-5 h-5 mr-3 border-2 border-whatsapp-500 border-t-transparent rounded-full animate-spin" role="status" aria-label="Loading suggestions" />
            ) : large ? (
              <button
                type="submit"
                className="btn-primary h-10 px-4 text-xs sm:text-sm font-medium flex items-center gap-1.5 rounded-xl"
              >
                <span>Search</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </button>
            ) : null}
          </div>
        </div>
      </form>

      {/* Autocomplete Suggestions Glass Dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <ul
          id="search-suggestions"
          role="listbox"
          className="absolute top-full mt-2 left-0 right-0 bg-white/95 backdrop-blur-xl border border-gray-200/80 rounded-2xl shadow-dropdown z-50 overflow-hidden m-0 p-1 list-none animate-slide-up"
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
              className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all duration-150 cursor-pointer flex items-center justify-between ${
                i === selectedIndex
                  ? 'bg-whatsapp-50 text-whatsapp-800 font-semibold shadow-sm'
                  : 'text-text-primary hover:bg-surface'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <svg className="w-4 h-4 text-whatsapp-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.3-4.3" />
                </svg>
                {name}
              </span>
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
