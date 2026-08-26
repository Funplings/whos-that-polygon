import { pokemonBySlug } from '../game/pokemon'
import { MAX_GUESSES } from '../game/types'

interface Props {
  guesses: string[]
  answer: string
  /**
   * Focuses the answer bar. Tapping an empty slot starts typing — players
   * kept missing that the bar at the bottom was where guesses go.
   */
  onEmptySlotClick?: () => void
}

export function GuessRow({ guesses, answer, onEmptySlotClick }: Props) {
  return (
    <div className="flex w-full flex-col gap-2">
      {Array.from({ length: MAX_GUESSES }, (_, i) => {
        const slug = guesses[i]
        if (!slug) {
          const emptyClasses =
            'flex h-10 items-center justify-center border-2 border-dashed border-poke-red bg-white/40 text-sm text-poke-red'
          // Only a button while there's an input to focus — after the game
          // ends the slots are inert record, not an affordance.
          return onEmptySlotClick ? (
            <button
              key={i}
              type="button"
              onClick={onEmptySlotClick}
              aria-label={`Guess ${i + 1} — start typing`}
              className={`${emptyClasses} transition-colors hover:bg-white/55 active:bg-white/70`}
            >
              Guess {i + 1}
            </button>
          ) : (
            <div key={i} className={emptyClasses}>
              Guess {i + 1}
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
