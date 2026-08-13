import { useCallback, useMemo, useState } from 'react'
import { isCorrectGuess } from './pokemon'
import { overrideSlugFromUrl, puzzleForDate, puzzleForSlug, todayISO } from './puzzle'
import { loadResult, saveResult } from '../lib/storage'
import { MAX_GUESSES, type ClueStage, type GameStatus, type Puzzle } from './types'

export interface GameState {
  puzzle: Puzzle
  guesses: string[]
  status: GameStatus
  clueStage: ClueStage
  guessesLeft: number
  submitGuess: (slug: string) => void
  /** True when playing a /slug preview (unpersisted). */
  preview: boolean
  /** A preview slug from the URL that has no polygon, for a "not found" hint. */
  previewMiss: string | null
}

function deriveStatus(guesses: string[], answer: string): GameStatus {
  if (guesses.some((g) => isCorrectGuess(g, answer))) return 'won'
  if (guesses.length >= MAX_GUESSES) return 'lost'
  return 'playing'
}

export function useGame(dateISO = todayISO()): GameState {
  // A /slug or ?pokemon=slug URL loads that Pokémon for manual testing.
  const requested = useMemo(() => overrideSlugFromUrl(), [])
  const override = useMemo(
    () => (requested ? puzzleForSlug(requested) : null),
    [requested],
  )
  const preview = override !== null
  const previewMiss = requested && !override ? requested : null

  const puzzle = useMemo(
    () => override ?? puzzleForDate(dateISO),
    [override, dateISO],
  )
  const [guesses, setGuesses] = useState<string[]>(
    // Preview games never read persisted state — every reload starts fresh.
    () => (preview ? [] : (loadResult(dateISO)?.guesses ?? [])),
  )

  const status = deriveStatus(guesses, puzzle.answer)

  // While playing, the clue stage equals wrong guesses so far (0..2).
  // Once the game ends the full-color art is always shown.
  const clueStage: ClueStage =
    status === 'playing' ? (guesses.length as ClueStage) : 2

  const submitGuess = useCallback(
    (slug: string) => {
      setGuesses((prev) => {
        if (deriveStatus(prev, puzzle.answer) !== 'playing') return prev
        if (prev.includes(slug)) return prev // no wasting guesses on repeats
        const next = [...prev, slug]
        if (!preview) {
          saveResult({
            date: dateISO,
            puzzleNumber: puzzle.number,
            guesses: next,
            status: deriveStatus(next, puzzle.answer),
          })
        }
        return next
      })
    },
    [dateISO, puzzle, preview],
  )

  return {
    puzzle,
    guesses,
    status,
    clueStage,
    guessesLeft: MAX_GUESSES - guesses.length,
    submitGuess,
    preview,
    previewMiss,
  }
}
