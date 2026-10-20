import { useState } from 'react'
import hideIcon from '../resources/images/assets/Hide.svg'
import { genLabel } from '../game/pokemon'

interface Props {
  gen: number
  /** Starts revealed — the player already opened it earlier today. */
  initiallyShown: boolean
  /** Called on every reveal; useGame decides whether it counts as a hint. */
  onReveal: () => void
}

/**
 * "Introduced in: [Gen II]", hidden behind an eye-slash until tapped — the
 * player opts into the hint. For forms it's the form's own debut (Mega
 * Charizard X is Gen VI), which pokemon.json bakes in. The value box fills
 * the rest of the strip, so revealing it doesn't shift anything.
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
      className="flex h-11 w-full items-center gap-3 border-2 border-ink bg-paper p-1 pl-3 text-sm whitespace-nowrap text-ink"
    >
      <span>Introduced in:</span>
      <span className="flex h-full min-w-0 flex-1 items-center justify-center bg-ink text-paper">
        {shown ? (
          genLabel(gen)
        ) : (
          // The designer's eye-slash, recoloured from maroon to the paper
          // tone (#dddddd: 221/255 ≈ invert(0.867)) to read on the ink box.
          <img
            src={hideIcon}
            alt=""
            className="h-4 [filter:brightness(0)_invert(0.867)]"
          />
        )}
      </span>
    </button>
  )
}
