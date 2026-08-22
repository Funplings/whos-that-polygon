import { useState } from 'react'
import { officialArtUrl, pokemonBySlug } from '../game/pokemon'
import { MAX_GUESSES, type GameStatus } from '../game/types'

interface Props {
  status: GameStatus
  answer: string
  guessCount: number
  puzzleNumber: number
  /** Preview games aren't scheduled, so there's no result worth sharing. */
  preview?: boolean
}

const WIN_MESSAGES = ['Incredible!', 'Great job!', 'Phew, got it!']

/**
 * Wordle-style share text. Deliberately spoiler-free — it carries the puzzle
 * number and the shape of the attempt, never the answer.
 *
 * The pattern is derived rather than passed in: the game stops on a correct
 * guess, so a win is always (n-1) misses then a hit, and a loss is all misses.
 */
function buildShareText(
  puzzleNumber: number,
  status: GameStatus,
  guessCount: number,
): string {
  const won = status === 'won'
  const marks = won ? '❌'.repeat(guessCount - 1) + '✅' : '❌'.repeat(guessCount)
  const score = won ? `${guessCount}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`
  return `Who’s That Polygon? #${puzzleNumber} ${score}\n${marks}\n${window.location.origin}`
}

export function ResultReveal({
  status,
  answer,
  guessCount,
  puzzleNumber,
  preview,
}: Props) {
  const [copied, setCopied] = useState<'idle' | 'ok' | 'failed'>('idle')

  if (status === 'playing') return null
  const pokemon = pokemonBySlug(answer)
  const won = status === 'won'
  const art = officialArtUrl(answer)

  async function copyResults() {
    try {
      await navigator.clipboard.writeText(
        buildShareText(puzzleNumber, status, guessCount),
      )
      setCopied('ok')
    } catch {
      // Clipboard access needs a secure context and can be blocked outright.
      setCopied('failed')
    }
    setTimeout(() => setCopied('idle'), 2000)
  }

  return (
    <div className="gb-frame mx-auto w-full max-w-sm bg-paper p-2 text-center text-ink">
      <p
        className={`text-base ${won ? 'text-emerald-700' : 'text-red-700'}`}
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
      <p className="text-sm text-ink/60">The answer was</p>
      <p className="text-lg text-ink">
        {pokemon?.displayName ?? answer}
      </p>
      {won && (
        <p className="mt-2 text-sm text-ink/60">
          Answered in {guessCount} {guessCount === 1 ? 'guess' : 'guesses'}!
        </p>
      )}

      {!preview && (
        <>
          <button
            onClick={copyResults}
            className="gb-btn mt-4 w-full bg-amber-300 px-4 py-3 text-ink transition-colors hover:bg-amber-200"
          >
            {copied === 'ok' ? 'Copied!' : '▶ Share results'}
          </button>
          <p aria-live="polite" className="mt-2 min-h-4 text-xs text-ink/60">
            {copied === 'ok' && 'Result copied — paste it anywhere.'}
            {copied === 'failed' && 'Couldn’t access the clipboard.'}
          </p>
        </>
      )}
    </div>
  )
}
