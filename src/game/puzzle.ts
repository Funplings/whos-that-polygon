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

function addDays(dateISO: string, days: number): string {
  const [year, month, day] = dateISO.split('-').map(Number)
  const date = new Date(year, month - 1, day + days)
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

/** Hand-picked slugs that actually have a polygon, in the given order. */
const handpicked = (schedule.order as string[]).filter((slug) => slug in POLYGONS)

/**
 * The rest of the schedule: every polygon that isn't in the hand-picked
 * opening, in one deterministic random order (seeded Fisher–Yates, so every
 * client computes the same schedule). Unlike the old per-day PRNG pick, a
 * shuffle guarantees no repeats and no skipped Pokémon until the whole pool
 * has run — after which the order cycles.
 */
const shuffledRest = (() => {
  const rest = POLYGON_SLUGS.filter((slug) => !handpicked.includes(slug))
  // mulberry32, fixed seed — changing the seed reshuffles every unreleased day.
  let seed = 0x9e3779b9
  const rng = () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  for (let i = rest.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[rest[i], rest[j]] = [rest[j], rest[i]]
  }
  return rest
})()

/**
 * Resolve the answer slug for a given day: hand-picked order for the first
 * `handpicked.length` days, then the shuffled remainder of the pool.
 */
function slugForDay(dayIndex: number): string {
  if (dayIndex < handpicked.length) return handpicked[dayIndex]
  return shuffledRest[(dayIndex - handpicked.length) % shuffledRest.length]
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

export function puzzlesThrough(dateISO: string): Puzzle[] {
  const count = daysBetween(schedule.startDate, dateISO) + 1
  return Array.from({ length: Math.max(0, count) }, (_, index) =>
    puzzleForDate(addDays(schedule.startDate, index)),
  )
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
