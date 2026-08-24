import { useCallback, useMemo, useState } from 'react'
import { isCorrectGuess } from './pokemon'
import {
  overrideDateFromUrl,
  overrideSlugFromUrl,
  puzzleForDate,
  puzzleForSlug,
  todayISO,
} from './puzzle'
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
  /** ISO date being previewed via a /MM-DD-YYYY URL, for checking the schedule. */
  dateOverride: string | null
}

function deriveStatus(guesses: string[], answer: string): GameStatus {
  if (guesses.some((g) => isCorrectGuess(g, answer))) return 'won'
  if (guesses.length >= MAX_GUESSES) return 'lost'
  return 'playing'
}

export function useGame(dateISO = todayISO()): GameState {
  // A /MM-DD-YYYY URL plays that day's scheduled puzzle, for checking the
  // schedule. Resolved before the slug override because both read the same path
  // segment — a date-shaped path is a date, anything else is a pokemon name.
  const dateOverride = useMemo(() => overrideDateFromUrl(), [])
  const activeDate = dateOverride ?? dateISO

  // A /slug or ?pokemon=slug URL loads that Pokémon for manual testing.
  const requested = useMemo(
    () => (dateOverride ? null : overrideSlugFromUrl()),
    [dateOverride],
  )
  const override = useMemo(
    () => (requested ? puzzleForSlug(requested) : null),
    [requested],
  )
  const preview = override !== null
  const previewMiss = requested && !override ? requested : null

  const puzzle = useMemo(
    () => override ?? puzzleForDate(activeDate),
    [override, activeDate],
  )
  // Neither a slug preview nor a date probe touches storage: they'd otherwise
  // read and write real results for days the player hasn't actually played.
  const unpersisted = preview || dateOverride !== null

  // Guess state is keyed to the puzzle and swapped SYNCHRONOUSLY (React's
  // render-phase state adjustment) when the key changes. An effect-based
  // reset ran after paint, so switching days rendered one frame of the new
  // puzzle with the old puzzle's guesses — wrong status and clue stage for a
  // beat, which leaked answers, retriggered the stage cross-fade, and made
  // the result jingle refire when opening finished days from the Dex.
  const puzzleKey = `${unpersisted ? 'u' : 'p'}:${activeDate}:${puzzle.answer}`
  const loadGuesses = () =>
    unpersisted ? [] : (loadResult(activeDate)?.guesses ?? [])
  const [store, setStore] = useState(() => ({
    key: puzzleKey,
    guesses: loadGuesses(),
  }))
  let guesses = store.guesses
  if (store.key !== puzzleKey) {
    guesses = loadGuesses()
    setStore({ key: puzzleKey, guesses })
  }

  const status = deriveStatus(guesses, puzzle.answer)

  // While playing, the clue stage equals wrong guesses so far (0..2).
  // Once the game ends the full-color art is always shown.
  const clueStage: ClueStage =
    status === 'playing' ? (guesses.length as ClueStage) : 2

  const submitGuess = useCallback(
    (slug: string) => {
      setStore((prev) => {
        if (prev.key !== puzzleKey) return prev // stale submit for another day
        if (deriveStatus(prev.guesses, puzzle.answer) !== 'playing') return prev
        if (prev.guesses.includes(slug)) return prev // no wasting guesses on repeats
        const next = [...prev.guesses, slug]
        if (!unpersisted) {
          saveResult({
            date: activeDate,
            puzzleNumber: puzzle.number,
            guesses: next,
            status: deriveStatus(next, puzzle.answer),
          })
        }
        return { key: prev.key, guesses: next }
      })
    },
    [activeDate, puzzle, puzzleKey, unpersisted],
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
    dateOverride,
  }
}
