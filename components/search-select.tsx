'use client'

import { useState, useRef, useEffect } from 'react'

interface SearchSelectProps {
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  placeholder: string
  label?: string
  required?: boolean
}

export default function SearchSelect({
  options,
  value,
  onChange,
  placeholder,
  label,
}: SearchSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
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

  return (
    <div ref={wrapperRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          {label}
        </label>
      )}
      <input
        type="text"
        value={open ? query : (selected?.label || '')}
        onChange={e => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="input-field"
        autoComplete="off"
        role="combobox"
      />
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-dropdown max-h-52 overflow-y-auto">
          {filtered.length > 0 ? (
            filtered.map(o => (
              <button
                key={o.value}
                onClick={() => {
                  onChange(o.value)
                  setOpen(false)
                  setQuery('')
                }}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-surface transition-colors ${
                  o.value === value
                    ? 'bg-whatsapp-50 text-whatsapp-700 font-medium'
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
