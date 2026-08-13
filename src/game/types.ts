export interface Pokemon {
  /** National dex number of the species (forms share their species id) */
  id: number
  /** API slug, unique per entry, used as the answer key */
  name: string
  /** Human-readable name shown in the search bar */
  displayName: string
}

export interface Puzzle {
  /** Puzzle number shown in the header/share text (1-based) */
  number: number
  /** ISO date this puzzle is for */
  date: string
  /** Path to the polygon art */
  image: string
  /** Answer slug, matches Pokemon.name */
  answer: string
  /** True when loaded via a /slug preview URL (not persisted, not scheduled) */
  preview?: boolean
}

export type GameStatus = 'playing' | 'won' | 'lost'

/** 0 = silhouette, 1 = grayscale, 2 = full color */
export type ClueStage = 0 | 1 | 2

export const MAX_GUESSES = 3

export interface DayResult {
  date: string
  puzzleNumber: number
  /** Guess slugs in order */
  guesses: string[]
  status: GameStatus
}
