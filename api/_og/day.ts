// Puzzle-number arithmetic shared by the link-preview pieces (middleware.ts
// and api/og.ts). It mirrors src/game/puzzle.ts, which can't be imported
// here: that module globs images through Vite, and these run on Vercel's
// servers without Vite. Keep the two in step — in particular, the Eastern
// rollover and "puzzle N is day N-1 after startDate".
//
// The leading underscore keeps Vercel from deploying this file as a function.

const RESET_ZONE = 'America/New_York'

/** Current date in the reset zone, as YYYY-MM-DD. */
export function todayISO(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: RESET_ZONE }).format(now)
}

/** The puzzle number (1-based, as in the share text) live on a date. */
export function puzzleNumberOn(startDate: string, dateISO: string): number {
  const toUTC = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number)
    return Date.UTC(y, m - 1, d)
  }
  const days = Math.round((toUTC(dateISO) - toUTC(startDate)) / 86_400_000)
  return Math.max(0, days) + 1
}

/**
 * A requested puzzle number, or null if it isn't one that's been released.
 * Future numbers are refused so a preview URL can't leak upcoming puzzles.
 */
export function releasedNumber(
  raw: string | null,
  startDate: string,
  now = new Date(),
): number | null {
  if (!raw || !/^\d{1,6}$/.test(raw)) return null
  const n = Number(raw)
  return n >= 1 && n <= puzzleNumberOn(startDate, todayISO(now)) ? n : null
}
