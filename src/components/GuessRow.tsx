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
              className="flex h-11 items-center justify-center rounded-lg border-2 border-dashed border-slate-700 text-sm text-slate-600"
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
              correct
                ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500'
                : 'bg-red-500/15 text-red-300 ring-1 ring-red-500/60'
            }`}
          >
            <span>{pokemonBySlug(slug)?.displayName ?? slug}</span>
            <span aria-hidden>{correct ? '🟩' : '🟥'}</span>
          </div>
        )
      })}
    </div>
  )
}
