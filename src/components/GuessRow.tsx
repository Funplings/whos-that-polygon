import { pokemonBySlug } from '../game/pokemon'
import { MAX_GUESSES } from '../game/types'

interface Props {
  guesses: string[]
  answer: string
}

export function GuessRow({ guesses, answer }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-2">
      {Array.from({ length: MAX_GUESSES }, (_, i) => {
        const slug = guesses[i]
        if (!slug) {
          return (
            <div
              key={i}
              className="flex h-11 items-center justify-center border-2 border-dashed border-ink/40 bg-paper/80 text-sm text-ink/60"
            >
              Guess {i + 1}
            </div>
          )
        }
        const correct = slug === answer
        return (
          <div
            key={i}
            className={`flex h-11 items-center justify-between border-2 border-ink bg-paper px-4 text-sm ${
              // Solid paper backing, not a translucent tint: the wrong-guess
              // row was red-on-red once the page turned into the eyecatch.
              correct ? 'text-emerald-700' : 'text-red-700'
            }`}
          >
            <span>{pokemonBySlug(slug)?.displayName ?? slug}</span>
            <span aria-hidden className="text-base leading-none">
              {correct ? '✓' : '✕'}
            </span>
          </div>
        )
      })}
    </div>
  )
}
