import type { DayResult } from '../game/types'

const RESULT_PREFIX = 'wtp:result:'
const RULES_SEEN_KEY = 'wtp:rules-seen'
// Kept apart from the result: the hint can be opened before the first guess,
// when there is no result to write yet.
const HINT_PREFIX = 'wtp:hint:'

export function loadResult(dateISO: string): DayResult | null {
  try {
    const raw = localStorage.getItem(RESULT_PREFIX + dateISO)
    return raw ? (JSON.parse(raw) as DayResult) : null
  } catch {
    return null
  }
}

export function saveResult(result: DayResult): void {
  try {
    localStorage.setItem(RESULT_PREFIX + result.date, JSON.stringify(result))
  } catch {
    // storage unavailable (private mode etc.) — game still playable, just not persisted
  }
}

export function hasSeenRules(): boolean {
  try {
    return localStorage.getItem(RULES_SEEN_KEY) === '1'
  } catch {
    return true
  }
}

export function markRulesSeen(): void {
  try {
    localStorage.setItem(RULES_SEEN_KEY, '1')
  } catch {
    // ignore
  }
}

/** Whether the generation hint was opened while that day was still in play. */
export function loadHintUsed(dateISO: string): boolean {
  try {
    return localStorage.getItem(HINT_PREFIX + dateISO) === '1'
  } catch {
    return false
  }
}

export function saveHintUsed(dateISO: string): void {
  try {
    localStorage.setItem(HINT_PREFIX + dateISO, '1')
  } catch {
    // ignore
  }
}
