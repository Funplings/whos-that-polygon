import { useState } from 'react'
import { MAX_GUESSES, type GameStatus } from '../game/types'

interface Props {
  status: GameStatus
  guessCount: number
  puzzleNumber: number
}

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

/** Takes the answer bar's slot at the bottom once the game is over. */
export function ShareBar({ status, guessCount, puzzleNumber }: Props) {
  const [copied, setCopied] = useState<'idle' | 'ok' | 'failed'>('idle')

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
    <div className="w-full">
      <button
        onClick={copyResults}
        className="gb-btn w-full bg-gold py-3 text-ink transition-colors hover:bg-amber-300"
      >
        {copied === 'ok' ? 'Copied!' : '▶ Share results'}
      </button>
      <p aria-live="polite" className="sr-only">
        {copied === 'ok' && 'Result copied — paste it anywhere.'}
        {copied === 'failed' && 'Couldn’t access the clipboard.'}
      </p>
    </div>
  )
}
