export interface Pokemon {
  /** National dex number of the species (forms share their species id) */
  id: number
  /** API slug, unique per entry, used as the answer key */
  name: string
  /** Human-readable name shown in the search bar */
  displayName: string
  /**
   * Variety id, used to fetch the reveal artwork. Unlike `id`, this is unique
   * per form, so Mega Charizard X reveals its own art rather than Charizard's.
   */
  artId: number
  /** Full image URL, for the few forms with no official artwork of their own */
  art?: string
  /**
   * Generation the entry debuted in. For alternate forms it's the form's own
   * debut, not the species' — Mega Charizard X is Gen 6, not Gen 1.
   */
  gen: number
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

/**
 * A skipped guess, stored in the guess list like a slug: the guess is used up
 * and the next clue stage opens, exactly as for a wrong answer. The leading
 * underscore keeps it from ever matching a pokemon.json slug, and the server's
 * slug check would drop it, though App never sends it as a wrong guess.
 */
export const SKIP = '_skip'

export interface DayResult {
  date: string
  puzzleNumber: number
  /** Guess slugs in order; SKIP for a skipped guess */
  guesses: string[]
  status: GameStatus
}
