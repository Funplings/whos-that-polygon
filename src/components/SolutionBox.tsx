import { officialArtUrl, pokemonBySlug } from '../game/pokemon'
import type { GameStatus } from '../game/types'

interface Props {
  status: GameStatus
  answer: string
  guessCount: number
  /** Swap between this box and the guess list — both views carry the button. */
  onSwap: () => void
}

const WIN_MESSAGES = ['Incredible!', 'Great job!', 'Phew, got it!']

/**
 * Compact end-of-game card that takes the guess rows' slot: reveal art on the
 * left, verdict on the right, and a corner button to flip back to the guesses.
 */
export function SolutionBox({ status, answer, guessCount, onSwap }: Props) {
  const pokemon = pokemonBySlug(answer)
  const won = status === 'won'
  const art = officialArtUrl(answer)

  return (
    // h-[8.5rem] matches the guess list exactly (three h-10 rows + two
    // gap-2s), so swapping the views doesn't change the bottom stack's height
    // and make the starburst above resize.
    <div className="relative flex h-[8.5rem] w-full items-center gap-3 border-2 border-ink bg-paper p-3">
      {art && (
        <img
          src={art}
          alt={pokemon?.displayName ?? 'The answer'}
          className="h-24 w-24 shrink-0 object-contain"
        />
      )}
      <div className="min-w-0 flex-1 text-center text-sm">
        <p className={won ? 'text-emerald-700' : 'text-poke-red'}>
          {won ? WIN_MESSAGES[Math.min(guessCount - 1, 2)] : 'Better luck tomorrow!'}
        </p>
        <p className="mt-1 text-xs text-ink/60">The answer was</p>
        <p className="text-base text-ink">{pokemon?.displayName ?? answer}</p>
        {won && (
          <p className="mt-1 text-xs text-ink/60">
            Answered in {guessCount} {guessCount === 1 ? 'guess' : 'guesses'}!
          </p>
        )}
      </div>
      <SwapButton onClick={onSwap} label="Show my guesses" />
    </div>
  )
}

/**
 * Corner swap toggle, shared by the solution box and the guess-list view.
 *
 * `position` exists because the two hosts give the button different
 * containing blocks: the solution box has a 2px border, so absolutes resolve
 * against its padding box, 2px inside where the borderless guesses wrapper
 * puts them. The guesses view passes a 2px-smaller offset so the button lands
 * on the same screen spot in both views.
 */
export function SwapButton({
  onClick,
  label,
  position = '-top-2.5 -right-2.5',
}: {
  onClick: () => void
  label: string
  position?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`absolute ${position} flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink bg-white text-ink shadow-[2px_2px_0_0_var(--color-ink)] transition-[translate,box-shadow] duration-75 hover:bg-paper active:translate-x-0.5 active:translate-y-0.5 active:shadow-none`}
    >
      {/* Two-arrow cycle icon; inline so it never falls back to a system font */}
      <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" aria-hidden>
        <path
          d="M7 7h9m0 0-3-3m3 3-3 3M17 17H8m0 0 3 3m-3-3 3-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="square"
        />
      </svg>
    </button>
  )
}
