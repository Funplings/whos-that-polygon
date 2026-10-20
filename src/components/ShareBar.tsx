import { useState } from 'react'
import { LOSS_MESSAGE, WIN_MESSAGES } from '../lib/messages'
import { MAX_GUESSES, type GameStatus } from '../game/types'

interface Props {
  status: GameStatus
  guessCount: number
  puzzleNumber: number
  hintUsed: boolean
  /** Opens the Stats popup (everyone's results). */
  onStats: () => void
}

/**
 * Wordle-style share text. Deliberately spoiler-free — it carries the puzzle
 * number and the shape of the attempt, never the answer:
 *
 *   🟥⚪▶️ Who’s That Polygon? #6
 *   Critical Catch! (No Hints)
 *   1/3  ✅▫️▫️
 *   https://…
 *
 * The pattern is derived rather than passed in: the game stops on a correct
 * guess, so a win is always (n-1) misses then a hit, and a loss is all misses.
 * Unused guesses pad out as empty slots. "(No Hints)" is only ever added,
 * never a "used hints" mark — and only to wins.
 */
function buildShareText(
  puzzleNumber: number,
  status: GameStatus,
  guessCount: number,
  hintUsed: boolean,
): string {
  const won = status === 'won'
  const flavor = won
    ? WIN_MESSAGES[Math.min(guessCount - 1, 2)]
    : LOSS_MESSAGE
  const noHints = won && !hintUsed ? ' (No Hints)' : ''
  const marks = won
    ? '❌'.repeat(guessCount - 1) + '✅' + '▫️'.repeat(MAX_GUESSES - guessCount)
    : '❌'.repeat(guessCount)
  const score = won ? `${guessCount}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`
  return `🟥⚪▶️ Who’s That Polygon? #${puzzleNumber}\n${flavor}${noHints}\n${score}  ${marks}\n${window.location.origin}`
}

/**
 * Takes the answer bar's slot at the bottom once the game is over: Share
 * results, with Stats beside it on the same row.
 */
export function ShareBar({
  status,
  guessCount,
  puzzleNumber,
  hintUsed,
  onStats,
}: Props) {
  const [copied, setCopied] = useState<'idle' | 'ok' | 'failed'>('idle')

  async function copyResults() {
    try {
      await navigator.clipboard.writeText(
        buildShareText(puzzleNumber, status, guessCount, hintUsed),
      )
      setCopied('ok')
    } catch {
      // Clipboard access needs a secure context and can be blocked outright.
      setCopied('failed')
    }
    setTimeout(() => setCopied('idle'), 2000)
  }

  return (
    <div className="flex w-full gap-3">
      <button
        onClick={copyResults}
        className="gb-btn min-w-0 flex-1 bg-gold py-3 text-ink transition-colors hover:bg-amber-300"
      >
        {copied === 'ok' ? 'Copied!' : '▶ Share results'}
      </button>
      <button
        type="button"
        onClick={onStats}
        aria-haspopup="dialog"
        className="gb-btn shrink-0 bg-paper px-4 py-3 text-ink transition-colors hover:bg-white"
      >
        Stats
      </button>
      <p aria-live="polite" className="sr-only">
        {copied === 'ok' && 'Result copied — paste it anywhere.'}
        {copied === 'failed' && 'Couldn’t access the clipboard.'}
      </p>
    </div>
  )
}
