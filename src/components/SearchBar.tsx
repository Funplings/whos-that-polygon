import { useEffect, useRef, useState } from 'react'
import { searchPokemon } from '../game/pokemon'
import type { Pokemon } from '../game/types'
import pokeball from '../resources/images/assets/Dex.svg'

interface Props {
  disabled: boolean
  onSubmit: (slug: string) => void
  /** Lets the guess rows focus the field — tapping them starts typing. */
  inputRef?: React.Ref<HTMLInputElement>
  /** Slugs the player has solved on earlier days, marked with a pokeball. */
  caught?: ReadonlySet<string>
}

/**
 * The bottom answer bar. It pulls double duty as the game's title — the page
 * has no separate wordmark — so the placeholder is the game name, with a
 * blinking caret to signal that it takes typing. Locked to the bottom of the
 * screen by the App layout; results open upward.
 */
export function SearchBar({ disabled, onSubmit, inputRef, caught }: Props) {
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
    <div ref={containerRef} className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={query}
        disabled={disabled}
        placeholder=""
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        aria-label="Guess the Pokémon"
        title="Who’s that Polygon?"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className="gb-frame w-full bg-gold px-1 py-1 text-ink outline-none disabled:cursor-not-allowed disabled:opacity-60"
      />
      {/* Custom placeholder (the game title doubles as the prompt). Padding
          mirrors the input's frame border + padding. No decorative caret —
          the input's real one appears on focus, and two was confusing. */}
      {query === '' && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center pl-5 text-ink/60"
        >
          <span className="truncate">
            {disabled ? 'Come back tomorrow!' : 'Who’s that Polygon?'}
          </span>
        </div>
      )}
      {results.length > 0 && (
        // bottom-full: the list grows upward from the bar, which stays put
        // above the keyboard on mobile.
        <ul
          role="listbox"
          className="absolute bottom-full z-10 mb-1 max-h-64 w-full overflow-auto border-2 border-ink bg-paper py-1 shadow-[4px_4px_0_0_var(--color-ink)]"
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
              className={`flex cursor-pointer items-center px-3 py-2 text-sm text-ink active:bg-ink/15 ${
                i === highlighted ? 'bg-ink/5' : ''
              }`}
            >
              {/* The menu cursor from the battle screen marks the highlight;
                  the fixed-width slot keeps names aligned as it moves. */}
              <span aria-hidden className="inline-block w-5 shrink-0">
                {i === highlighted ? '▶' : ''}
              </span>
              <span className="min-w-0 flex-1">{p.displayName}</span>
              {/* The "caught" pokeball from the games' battle screen:
                  already solved on an earlier day. */}
              {caught?.has(p.name) && (
                <img
                  src={pokeball}
                  alt="Caught"
                  title="Caught"
                  className="ml-2 h-3.5 w-3.5 shrink-0"
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
