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
              className="flex h-11 items-center justify-center rounded-lg border-2 border-dashed border-slate-400/50 bg-slate-950/35 text-sm text-slate-200"
            >
              Guess {i + 1}
            </div>
          )
        }
        const correct = slug === answer
        return (
          <div
            key={i}
            className={`flex h-11 items-center justify-between rounded-lg px-4 text-sm font-semibold ${
              // Solid dark backing, not a translucent tint: the wrong-guess row
              // was red-on-red once the page turned into the eyecatch.
              correct
                ? 'bg-slate-950/85 text-emerald-300 ring-1 ring-emerald-400'
                : 'bg-slate-950/85 text-red-300 ring-1 ring-red-400/70'
            }`}
          >
            <span>{pokemonBySlug(slug)?.displayName ?? slug}</span>
            <span aria-hidden className="text-base leading-none font-bold">
              {correct ? '✓' : '✕'}
            </span>
          </div>
        )
      })}
    </div>
  )
}
