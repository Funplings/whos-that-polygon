import { useEffect, useRef } from 'react'
import { pokemonBySlug } from '../game/pokemon'
import type { GlobalResults, ResultCounts } from '../lib/globalResults'

/** A result bucket: solved in 1–3 guesses, or 'X' for a miss. */
export type Bucket = 1 | 2 | 3 | 'X'

interface Props {
  results: GlobalResults
  /** The player's own bucket, highlighted in the chart. */
  mine: Bucket
  puzzleNumber: number
  onClose: () => void
}

const ROWS: { bucket: Bucket; key: keyof ResultCounts; label: string }[] = [
  { bucket: 1, key: 'one', label: '1 guess' },
  { bucket: 2, key: 'two', label: '2 guesses' },
  { bucket: 3, key: 'three', label: '3 guesses' },
  { bucket: 'X', key: 'failed', label: 'Missed' },
]

/**
 * Everyone's results for the day, opened from the Stats button beside
 * Share: how many players solved in 1, 2, or 3 guesses, or missed, as a
 * four-row bar chart with the player's own row highlighted — then the day's
 * most common wrong guesses.
 */
export function StatsModal({ results, mine, puzzleNumber, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)

  // Latest onClose via a ref, so the mount effect below runs once — re-running
  // it on every parent render would keep yanking focus back to the button.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  // Focus lands on the close button so Escape/Enter work straight away.
  useEffect(() => {
    closeRef.current?.focus()
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const counts = results.state === 'ready' ? results.counts : null
  // Only names in the guess list are shown: the submit endpoint is public, so
  // anything else arriving here wasn't a real guess.
  const topGuesses =
    results.state === 'ready'
      ? results.topGuesses
          .flatMap(({ slug, count }) => {
            const name = pokemonBySlug(slug)?.displayName
            return name ? [{ slug, name, count }] : []
          })
          .slice(0, 3)
      : []
  const total = counts
    ? counts.one + counts.two + counts.three + counts.failed
    : 0

  return (
    // Above the tab drawer (z-50); tapping the backdrop closes it.
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="stats-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm border-2 border-ink bg-paper p-5 text-ink shadow-[4px_4px_0_0_var(--color-ink)]"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close stats"
          className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center text-lg leading-none hover:text-poke-red"
        >
          <span aria-hidden className="glyph-center">
            ×
          </span>
        </button>

        <h2 id="stats-title" className="text-base">
          Stats
        </h2>
        <p className="mt-1 text-xs text-ink/60">
          Puzzle #{puzzleNumber}
          {counts &&
            ` · ${total.toLocaleString()} ${total === 1 ? 'player' : 'players'}`}
        </p>

        {counts ? (
          <>
            <ul className="mt-4 flex flex-col gap-3">
              {ROWS.map(({ bucket, key, label }) => {
                const count = counts[key]
                const pct = total ? Math.round((count / total) * 100) : 0
                const isMine = bucket === mine
                const fill = isMine
                  ? bucket === 'X'
                    ? 'bg-poke-red'
                    : 'bg-emerald-600'
                  : 'bg-ink/35'
                return (
                  <li
                    key={bucket}
                    className="flex items-center gap-3 text-xs leading-none"
                    aria-label={`${label}: ${count} (${pct}%)${isMine ? ', your result' : ''}`}
                  >
                    <span aria-hidden className="w-3 shrink-0 text-center">
                      {bucket}
                    </span>
                    <span aria-hidden className="relative h-4 flex-1 bg-ink/10">
                      <span
                        className={`absolute inset-y-0 left-0 ${fill} transition-[width] duration-500`}
                        // A sliver even at 0% keeps empty rows from reading as
                        // missing data.
                        style={{ width: `max(2px, ${pct}%)` }}
                      />
                    </span>
                    <span aria-hidden className="w-10 shrink-0 text-right">
                      {pct}%
                    </span>
                  </li>
                )
              })}
            </ul>
            {topGuesses.length > 0 && (
              <>
                <h3 className="mt-5 text-xs">Top wrong guesses</h3>
                <ol className="mt-2 flex flex-col gap-2 text-xs leading-none">
                  {topGuesses.map(({ slug, name, count }, i) => (
                    <li key={slug} className="flex items-baseline gap-3">
                      <span className="w-3 shrink-0 text-center">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate">{name}</span>
                      <span className="shrink-0 text-ink/60">
                        {count.toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </>
        ) : (
          <p className="py-10 text-center text-xs text-ink/60">
            {results.state === 'error'
              ? 'Couldn’t load results.'
              : 'Tallying results…'}
          </p>
        )}
      </div>
    </div>
  )
}
