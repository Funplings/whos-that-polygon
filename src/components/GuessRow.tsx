import { pokemonBySlug } from '../game/pokemon'
import { MAX_GUESSES, SKIP } from '../game/types'

interface Props {
  guesses: string[]
  answer: string
  /**
   * Focuses the answer bar. Tapping an empty slot starts typing — players
   * kept missing that the bar at the bottom was where guesses go.
   */
  onEmptySlotClick?: () => void
  /** Shows a Skip button on the current guess's row; omitted once it's over. */
  onSkip?: () => void
}

export function GuessRow({ guesses, answer, onEmptySlotClick, onSkip }: Props) {
  return (
    <div className="flex w-full flex-col gap-2">
      {Array.from({ length: MAX_GUESSES }, (_, i) => {
        const slug = guesses[i]
        if (!slug) {
          const emptyClasses =
            'flex h-10 w-full items-center justify-center border-2 border-dashed border-poke-red bg-white/40 text-sm text-poke-red'
          // Only a button while there's an input to focus — after the game
          // ends the slots are inert record, not an affordance.
          const slot = onEmptySlotClick ? (
            <button
              type="button"
              onClick={onEmptySlotClick}
              aria-label={`Guess ${i + 1} — start typing`}
              className={`${emptyClasses} transition-colors hover:bg-white/55 active:bg-white/70`}
            >
              Guess {i + 1}
            </button>
          ) : (
            <div className={emptyClasses}>Guess {i + 1}</div>
          )
          // Skip sits inside the current row's right end: a sibling of the
          // slot button rather than inside it, since buttons can't nest.
          if (onSkip && i === guesses.length) {
            return (
              <div key={i} className="relative">
                {slot}
                <button
                  type="button"
                  onClick={onSkip}
                  aria-haspopup="dialog"
                  className="absolute top-1/2 right-1.5 -translate-y-1/2 border-2 border-ink bg-paper px-2 py-0.5 text-xs text-ink shadow-[2px_2px_0_0_var(--color-ink)] transition-[translate,box-shadow] duration-75 hover:bg-white active:translate-x-0.5 active:shadow-none"
                >
                  Skip
                </button>
              </div>
            )
          }
          return <div key={i}>{slot}</div>
        }
        if (slug === SKIP) {
          return (
            <div
              key={i}
              className="flex h-10 items-center justify-between border-2 border-poke-red bg-paper/70 px-4 text-sm text-ink/50"
            >
              <span>Skipped</span>
              <span aria-hidden className="text-base leading-none">
                –
              </span>
            </div>
          )
        }
        const correct = slug === answer
        return (
          <div
            key={i}
            className={`flex h-10 items-center justify-between border-2 border-poke-red bg-paper px-4 text-sm ${
              correct ? 'text-emerald-700' : 'text-poke-red'
            }`}
          >
            <span>{pokemonBySlug(slug)?.displayName ?? slug}</span>
            <span aria-hidden className="text-base leading-none">
              {correct ? '✓' : '×'}
            </span>
          </div>
        )
      })}
    </div>
  )
}
