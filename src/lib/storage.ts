import type { DayResult } from '../game/types'

const RESULT_PREFIX = 'wtp:result:'
const RULES_SEEN_KEY = 'wtp:rules-seen'

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
