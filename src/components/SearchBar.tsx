import { useEffect, useRef, useState } from 'react'
import { searchPokemon } from '../game/pokemon'
import type { Pokemon } from '../game/types'

interface Props {
  disabled: boolean
  onSubmit: (slug: string) => void
}

export function SearchBar({ disabled, onSubmit }: Props) {
  const [query, setQuery] = useState('')
  const [highlighted, setHighlighted] = useState(0)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Per design doc: dropdown shows names only, no pictures
  const results = open && !disabled ? searchPokemon(query) : []

  useEffect(() => {
    setHighlighted(0)
  }, [query])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function choose(p: Pokemon) {
    onSubmit(p.name)
    setQuery('')
    setOpen(false)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((h) => Math.min(h + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choose(results[highlighted])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative mx-auto w-full max-w-sm">
      <input
        type="text"
        value={query}
        disabled={disabled}
        placeholder={disabled ? 'Come back tomorrow!' : 'Who’s that Polygon?'}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        aria-label="Guess the Pokémon"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-slate-100 placeholder-slate-500 shadow-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/40 disabled:cursor-not-allowed disabled:opacity-50"
      />
      {results.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-600 bg-slate-800 py-1 shadow-xl"
        >
          {results.map((p, i) => (
            <li
              key={p.name}
              role="option"
              aria-selected={i === highlighted}
              onMouseEnter={() => setHighlighted(i)}
              onMouseDown={(e) => {
                e.preventDefault() // don't blur the input first
                choose(p)
              }}
              className={`cursor-pointer px-4 py-2 text-sm ${
                i === highlighted ? 'bg-amber-400/20 text-amber-200' : 'text-slate-200'
              }`}
            >
              {p.displayName}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
