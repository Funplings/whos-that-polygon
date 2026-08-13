import schedule from '../data/puzzles.json'
import { POLYGONS, POLYGON_SLUGS } from './polygons'
import type { Puzzle } from './types'

/** Local date as YYYY-MM-DD (puzzles roll over at local midnight). */
export function todayISO(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
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

/** Hand-picked slugs that actually have an SVG, in the given order. */
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

/**
 * A preview slug requested via the URL, for manual testing:
 *   /pikachu        (path)
 *   ?pokemon=mr-mime  (query, works even without SPA routing)
 * Names with spaces are hyphenated. Returns null when no override is present.
 */
export function overrideSlugFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const fromQuery = params.get('pokemon') ?? params.get('p')
  const fromPath = decodeURIComponent(window.location.pathname).replace(/^\/+|\/+$/g, '')
  const raw = (fromQuery ?? fromPath).trim().toLowerCase().replace(/\s+/g, '-')
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
