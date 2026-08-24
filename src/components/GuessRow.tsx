import { pokemonBySlug } from '../game/pokemon'
import { MAX_GUESSES } from '../game/types'

interface Props {
  guesses: string[]
  answer: string
}

export function GuessRow({ guesses, answer }: Props) {
  return (
    <div className="flex w-full flex-col gap-2">
      {Array.from({ length: MAX_GUESSES }, (_, i) => {
        const slug = guesses[i]
        if (!slug) {
          return (
            <div
              key={i}
              className="flex h-10 items-center justify-center border-2 border-dashed border-poke-red bg-white/40 text-sm text-poke-red"
            >
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
