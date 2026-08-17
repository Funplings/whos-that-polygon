import schedule from '../data/puzzles.json'
import { POLYGONS, POLYGON_SLUGS } from './polygons'
import type { Puzzle } from './types'

/**
 * Puzzles roll over at midnight Eastern, not in the player's own timezone, so
 * everyone is on the same puzzle at the same moment.
 */
const RESET_ZONE = 'America/New_York'

/** Current date in the reset zone, as YYYY-MM-DD. */
export function todayISO(now = new Date()): string {
  // en-CA formats as YYYY-MM-DD, which is the shape the schedule uses.
  return new Intl.DateTimeFormat('en-CA', { timeZone: RESET_ZONE }).format(now)
}

/** Wall-clock time in the reset zone for a given instant. */
function zoneParts(at: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: RESET_ZONE,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at)
  const out: Record<string, number> = {}
  for (const p of parts) if (p.type !== 'literal') out[p.type] = Number(p.value)
  // Midnight formats as hour 24 rather than 0 in some engines.
  out.hour %= 24
  return out
}

/** How far the reset zone sits from UTC at a given instant, in ms. */
function zoneOffsetMs(at: Date): number {
  const p = zoneParts(at)
  const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return asUTC - Math.floor(at.getTime() / 1000) * 1000
}

/**
 * The instant the next puzzle unlocks: midnight in the reset zone.
 *
 * The offset is resolved twice because it can differ either side of a DST
 * boundary — the first pass gives a candidate instant, the second recomputes
 * the offset *at* that instant, which is what makes the spring-forward and
 * fall-back nights land correctly instead of an hour out.
 */
export function nextResetAt(now = new Date()): Date {
  const p = zoneParts(now)
  const midnightWallClock = Date.UTC(p.year, p.month - 1, p.day + 1, 0, 0, 0)
  const firstPass = midnightWallClock - zoneOffsetMs(now)
  return new Date(midnightWallClock - zoneOffsetMs(new Date(firstPass)))
}

/** Milliseconds until the next puzzle, floored at zero. */
export function msUntilNextPuzzle(now = new Date()): number {
  return Math.max(0, nextResetAt(now).getTime() - now.getTime())
}

function daysBetween(fromISO: string, toISO: string): number {
  // Parse as local midnight to avoid TZ drift from Date.parse's UTC default
  const [fy, fm, fd] = fromISO.split('-').map(Number)
  const [ty, tm, td] = toISO.split('-').map(Number)
  const from = new Date(fy, fm - 1, fd)
  const to = new Date(ty, tm - 1, td)
  return Math.round((to.getTime() - from.getTime()) / 86_400_000)
}

/** Deterministic PRNG so the post-schedule "random" pick is stable per day. */
function seededIndex(seed: number, length: number): number {
  let x = seed || 1
  x ^= x << 13
  x ^= x >> 17
  x ^= x << 5
  return Math.abs(x) % length
}

/** Hand-picked slugs that actually have a polygon, in the given order. */
const handpicked = (schedule.order as string[]).filter((slug) => slug in POLYGONS)

/**
 * Resolve the answer slug for a given day: hand-picked order for the first
 * `handpicked.length` days, then a deterministic per-day pick from the full
 * pool (design doc: "hand-select the order for the first bunch but after that
 * it'll be random").
 */
function slugForDay(dayIndex: number): string {
  if (dayIndex < handpicked.length) return handpicked[dayIndex]
  return POLYGON_SLUGS[seededIndex(dayIndex * 2654435761, POLYGON_SLUGS.length)]
}

export function puzzleForDate(dateISO: string): Puzzle {
  const dayIndex = Math.max(0, daysBetween(schedule.startDate, dateISO))
  const answer = slugForDay(dayIndex)
  return {
    number: dayIndex + 1,
    date: dateISO,
    image: POLYGONS[answer],
    answer,
  }
}

/** The bare path segment, or the first matching query param. */
function urlToken(...params: string[]): string {
  if (typeof window === 'undefined') return ''
  const search = new URLSearchParams(window.location.search)
  for (const name of params) {
    const value = search.get(name)
    if (value) return value.trim()
  }
  return decodeURIComponent(window.location.pathname)
    .replace(/^\/+|\/+$/g, '')
    .trim()
}

/**
 * A date requested via the URL, for checking the schedule:
 *   /08-06-2026        (path)
 *   ?date=08-06-2026   (query, works even without SPA routing)
 *
 * Written MM-DD-YYYY, returned as the ISO YYYY-MM-DD the schedule uses.
 * Returns null when the URL isn't a date, which is what lets the same path
 * position also carry a pokemon slug.
 */
export function overrideDateFromUrl(): string | null {
  const raw = urlToken('date', 'd')
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(raw)
  if (!match) return null

  const [, month, day, year] = match
  const iso = `${year}-${month}-${day}`
  // Round-trip through Date to reject impossible dates like 02-30-2026, which
  // would otherwise silently roll forward into March.
  const parsed = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return null
  const normalised = [
    parsed.getFullYear(),
    String(parsed.getMonth() + 1).padStart(2, '0'),
    String(parsed.getDate()).padStart(2, '0'),
  ].join('-')
  return normalised === iso ? iso : null
}

/**
 * A preview slug requested via the URL, for manual testing:
 *   /pikachu        (path)
 *   ?pokemon=mr-mime  (query, works even without SPA routing)
 * Names with spaces are hyphenated. Returns null when no override is present.
 */
export function overrideSlugFromUrl(): string | null {
  const raw = urlToken('pokemon', 'p').toLowerCase().replace(/\s+/g, '-')
  return raw || null
}

/** Build a one-off preview puzzle for a slug, or null if it has no polygon. */
export function puzzleForSlug(slug: string): Puzzle | null {
  if (!(slug in POLYGONS)) return null
  return {
    number: 0,
    date: todayISO(),
    image: POLYGONS[slug],
    answer: slug,
    preview: true,
  }
}
