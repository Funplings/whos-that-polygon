import { officialArtUrl, pokemonBySlug } from '../game/pokemon'
import type { GameStatus } from '../game/types'

interface Props {
  status: GameStatus
  answer: string
  guessCount: number
}

const WIN_MESSAGES = ['Incredible!', 'Great job!', 'Phew, got it!']

export function ResultReveal({ status, answer, guessCount }: Props) {
  if (status === 'playing') return null
  const pokemon = pokemonBySlug(answer)
  const won = status === 'won'
  const art = officialArtUrl(answer)

  return (
    <div className="mx-auto w-full max-w-sm rounded-2xl bg-slate-800 p-5 text-center shadow-lg ring-1 ring-slate-700">
      <p
        className={`text-lg font-bold ${won ? 'text-emerald-300' : 'text-red-300'}`}
      >
        {won ? WIN_MESSAGES[Math.min(guessCount - 1, 2)] : 'Better luck tomorrow!'}
      </p>
      {art && (
        <img
          src={art}
          alt={pokemon?.displayName ?? 'The answer'}
          className="mx-auto my-3 h-40 w-40 object-contain"
        />
      )}
      <p className="text-sm text-slate-400">The answer was</p>
      <p className="text-xl font-bold text-slate-100">
        {pokemon?.displayName ?? answer}
      </p>
      {won && (
        <p className="mt-2 text-sm text-slate-400">
          Answered in {guessCount} {guessCount === 1 ? 'guess' : 'guesses'}!
        </p>
      )}
    </div>
  )
}
