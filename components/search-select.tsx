'use client'

import { useState, useRef, useEffect } from 'react'

interface SearchSelectProps {
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  placeholder: string
  label?: string
  required?: boolean
  onEnterNext?: () => void
  inputRef?: React.Ref<HTMLInputElement>
}

export default function SearchSelect({
  options,
  value,
  onChange,
  placeholder,
  label,
  onEnterNext,
  inputRef,
}: SearchSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selected = options.find(o => o.value === value)
  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(query.toLowerCase())
  )
  const activeIndex = Math.min(Math.max(highlight, 0), Math.max(filtered.length - 1, 0))

  function pickOption(o: { value: string; label: string }) {
    onChange(o.value)
    setOpen(false)
    setQuery('')
    setHighlight(0)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) {
        setOpen(true)
        setQuery('')
        return
      }
      setHighlight(h => Math.min(h + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight(h => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      if (open && filtered.length > 0) {
        e.preventDefault()
        pickOption(filtered[activeIndex])
      } else if (!open) {
        e.preventDefault()
        onEnterNext?.()
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          {label}
        </label>
      )}
      <input
        ref={inputRef}
        type="text"
        value={open ? query : (selected?.label || '')}
        onChange={e => {
          setQuery(e.target.value)
          setOpen(true)
          setHighlight(0)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="input-field"
        autoComplete="off"
        role="combobox"
      />
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-dropdown max-h-52 overflow-y-auto">
          {filtered.length > 0 ? (
            filtered.map((o, i) => (
              <button
                key={o.value}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => pickOption(o)}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  i === activeIndex ? 'bg-surface dark:bg-gray-800' : 'hover:bg-surface dark:hover:bg-gray-800'
                } ${
                  o.value === value
                    ? 'text-whatsapp-700 font-medium'
                    : 'text-text-primary'
                }`}
              >
                {o.label}
              </button>
            ))
          ) : (
            <div className="p-4 text-center text-text-secondary text-sm">
              No matches found
            </div>
          )}
        </div>
      )}
    </div>
  )
}