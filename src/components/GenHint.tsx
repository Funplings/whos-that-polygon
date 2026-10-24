import { useState } from 'react'
import hideIcon from '../resources/images/assets/Hide.svg'
import { genLabel, genNumeral } from '../game/pokemon'

// Font size by numeral length (III, VII → 10px; VIII → 8px), each leaving
// ~3px of ink either side in Pokemon Classic.
const NUMERAL_SIZE: Record<number, string> = {
  3: 'text-[0.625rem]',
  4: 'text-[0.5rem]',
}

interface Props {
  gen: number
  /** Starts revealed — the player already opened it earlier today. */
  initiallyShown: boolean
  /** Called on every reveal; useGame decides whether it counts as a hint. */
  onReveal: () => void
}

/**
 * A compact "Gen [II]" chip, hidden behind an eye-slash until tapped — the
 * player opts into the hint. Styled to match the view select it sits beside.
 * For forms it's the form's own debut (Mega Charizard X is Gen VI),
 * which pokemon.json bakes in. The value box is fixed-width (VIII is the
 * longest numeral), so revealing it doesn't shift anything.
 */
export function GenHint({ gen, initiallyShown, onReveal }: Props) {
  const [shown, setShown] = useState(initiallyShown)
  return (
    <button
      type="button"
      onClick={() => {
        if (!shown) onReveal()
        setShown((s) => !s)
      }}
      aria-pressed={shown}
      aria-label={
        shown
          ? `Introduced in ${genLabel(gen)} — hide`
          : 'Show which generation it was introduced in'
      }
      title="Generation it was introduced in"
      className="flex h-11 shrink-0 items-center gap-1 border-2 border-ink bg-paper p-1 pl-2 text-xs whitespace-nowrap text-ink"
    >
      <span>Gen</span>
      <span className="flex h-full w-9 items-center justify-center bg-ink text-paper">
        {shown ? (
          // Longer numerals step the font down to fit the 36px box: at the
          // chip's 12px, VIII measures 45px and VII leaves no margin.
          <span className={NUMERAL_SIZE[genNumeral(gen).length] ?? ''}>
            {genNumeral(gen)}
          </span>
        ) : (
          // The designer's eye-slash, recoloured from maroon to the paper
          // tone (#dddddd: 221/255 ≈ invert(0.867)) to read on the ink box.
          <img
            src={hideIcon}
            alt=""
            className="h-3.5 [filter:brightness(0)_invert(0.867)]"
          />
        )}
      </span>
    </button>
  )
}
