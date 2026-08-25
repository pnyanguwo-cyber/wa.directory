'use client'

import { useState, useRef, useEffect, useId } from 'react'

interface MultiSearchSelectProps {
  options: { value: string; label: string }[]
  values: string[]
  onChange: (values: string[]) => void
  placeholder: string
  label?: string
  primary?: boolean
  onPrimaryChange?: (primary: string | null) => void
  pending?: string[]
  hint?: string
  onEnterNext?: () => void
  inputRef?: React.Ref<HTMLInputElement>
  onRequestName?: (name: string) => void
}

export default function MultiSearchSelect({
  options,
  values,
  onChange,
  placeholder,
  label,
  primary,
  onPrimaryChange,
  pending = [],
  hint,
  onEnterNext,
  inputRef,
  onRequestName,
}: MultiSearchSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const reactId = useId()
  const inputId = `mss-input-${reactId}`
  const listboxId = `mss-listbox-${reactId}`

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

  const q = query.trim().toLowerCase()
  const filtered = q
    ? options.filter(o => o.label.toLowerCase().includes(q))
    : options

  const activeIndex = Math.min(Math.max(highlight, 0), Math.max(filtered.length - 1, 0))
  const noMatch = q.length > 0 && filtered.length === 0
  const primaryName = primary && values.length > 0 ? values[0] : null

  function addValue(value: string) {
    if (values.includes(value)) return
    const next = [...values, value]
    onChange(next)
    if (next.length === 1 && onPrimaryChange) onPrimaryChange(next[0])
  }

  function removeValue(value: string) {
    const next = values.filter(v => v !== value)
    onChange(next)
    if (next.length === 0 && onPrimaryChange) onPrimaryChange(null)
  }

  function pickOption(o: { value: string; label: string }) {
    addValue(o.value)
    setQuery('')
    setOpen(false)
    setHighlight(0)
  }

  function handleRequest() {
    if (!onRequestName) return
    onRequestName(query.trim())
    setQuery('')
    setOpen(false)
    setHighlight(0)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) {
        setOpen(true)
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
      } else if (open && noMatch && onRequestName) {
        e.preventDefault()
        handleRequest()
      } else if (!open) {
        e.preventDefault()
        onEnterNext?.()
      }
    } else if (e.key === 'Backspace' && !query && values.length > 0) {
      removeValue(values[values.length - 1])
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-text-primary mb-1.5">{label}</label>
      )}
      <div
        className="flex flex-wrap items-center gap-1.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 px-2.5 py-2 cursor-text transition-all focus-within:border-whatsapp-500 focus-within:ring-2 focus-within:ring-whatsapp-500/20"
        onClick={() => wrapperRef.current?.querySelector('input')?.focus()}
      >
        {values.map(v => {
          const isPrimary = primaryName === v
          const isPending = pending.includes(v) && !options.some(o => o.value === v)
          return (
            <span
              key={v}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border ${
                isPrimary
                  ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-800/50'
                  : isPending
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                    : 'bg-whatsapp-50 dark:bg-whatsapp-950/50 text-whatsapp-800 dark:text-whatsapp-300 border-whatsapp-200 dark:border-whatsapp-800/50'
              }`}
            >
              {isPrimary && (
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500" aria-hidden="true" />
              )}
              {v}
              {isPrimary && <span className="text-[10px] font-semibold uppercase tracking-wide">Primary</span>}
              {isPending && <span className="text-[10px] font-semibold uppercase tracking-wide">Pending</span>}
              <button
                type="button"
                onClick={e => { e.stopPropagation(); removeValue(v) }}
                className="ml-0.5 w-4 h-4 flex items-center justify-center rounded-full hover:bg-black/10 transition-colors"
                aria-label={`Remove ${v}`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )
        })}
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={query}
          onChange={e => {
            setQuery(e.target.value)
            setOpen(true)
            setHighlight(0)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={values.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[8rem] bg-transparent outline-none text-sm py-1"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-haspopup="listbox"
        />
      </div>
      {hint && <p className="text-xs text-whatsapp-600 mt-1">{hint}</p>}
      {open && (
        <div id={listboxId} role="listbox" className="absolute z-50 top-full mt-1 left-0 right-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-dropdown max-h-52 overflow-y-auto">
          {filtered.length > 0 ? (
            filtered.map((o, i) => (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={values.includes(o.value)}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => pickOption(o)}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  i === activeIndex ? 'bg-surface dark:bg-gray-800' : 'hover:bg-surface dark:hover:bg-gray-800'
                } ${values.includes(o.value) ? 'text-whatsapp-700 font-medium' : 'text-text-primary'}`}
              >
                {o.label}
                {values.includes(o.value) && (
                  <span className="ml-2 text-xs text-whatsapp-600 font-medium">selected</span>
                )}
              </button>
            ))
          ) : noMatch && onRequestName ? (
            <button
              type="button"
              onClick={handleRequest}
              className="w-full text-left px-4 py-2.5 text-sm text-whatsapp-700 font-medium hover:bg-surface dark:hover:bg-gray-800 transition-colors"
            >
              Request &quot;{query.trim()}&quot; as a new {label ? 'item' : 'option'}
            </button>
          ) : (
            <div className="p-4 text-center text-text-secondary text-sm">No matches found</div>
          )}
        </div>
      )}
    </div>
  )
}
