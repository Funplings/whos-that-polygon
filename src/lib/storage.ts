import type { DayResult } from '../game/types'
import { STAGING } from './staging'

const RESULT_PREFIX = 'wtp:result:'
const RULES_SEEN_KEY = 'wtp:rules-seen'
// Kept apart from the result: the hint can be opened before the first guess,
// when there is no result to write yet.
const HINT_PREFIX = 'wtp:hint:'

// Staging keeps results and hint flags in memory instead: they behave
// normally while the page is open (Dex, caught marks), and a refresh starts
// every puzzle fresh. Everything else (rules seen, notices) still persists.
const memory = new Map<string, string>()

function readGame(key: string): string | null {
  return STAGING ? (memory.get(key) ?? null) : localStorage.getItem(key)
}

function writeGame(key: string, value: string): void {
  if (STAGING) memory.set(key, value)
  else localStorage.setItem(key, value)
}

export function loadResult(dateISO: string): DayResult | null {
  try {
    const raw = readGame(RESULT_PREFIX + dateISO)
    return raw ? (JSON.parse(raw) as DayResult) : null
  } catch {
    return null
  }
}

export function saveResult(result: DayResult): void {
  try {
    writeGame(RESULT_PREFIX + result.date, JSON.stringify(result))
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
    return readGame(HINT_PREFIX + dateISO) === '1'
  } catch {
    return false
  }
}

export function saveHintUsed(dateISO: string): void {
  try {
    writeGame(HINT_PREFIX + dateISO, '1')
  } catch {
    // ignore
  }
}

// Puzzle #101 (2026-11-25) shipped with the wrong answer: Rillaboom instead
// of Gigantamax Rillaboom. Each device wipes its progress on that day once,
// so everyone replays it against the corrected answer, and then sees a
// one-time notice explaining why.
const CORRECTED_DATE = '2026-11-25'
const CORRECTION_KEY = 'wtp:corrected:' + CORRECTED_DATE
const NOTICE_KEY = 'wtp:notice:puzzle-101-fix'
// Owned by lib/globalResults; cleared here so the replay reports again.
const SUBMITTED_PREFIX = 'wtp:submitted:'

/**
 * Runs once per device, before the app first renders. Returning players (who
 * have seen the rules) get the notice; brand-new players have nothing to
 * apologise to, so theirs is marked seen.
 */
export function applyPuzzleCorrection(): void {
  try {
    if (localStorage.getItem(CORRECTION_KEY) === '1') return
    localStorage.removeItem(RESULT_PREFIX + CORRECTED_DATE)
    localStorage.removeItem(HINT_PREFIX + CORRECTED_DATE)
    localStorage.removeItem(SUBMITTED_PREFIX + CORRECTED_DATE)
    if (!hasSeenRules()) localStorage.setItem(NOTICE_KEY, '1')
    localStorage.setItem(CORRECTION_KEY, '1')
  } catch {
    // storage unavailable — nothing saved to reset
  }
}

export function hasSeenCorrectionNotice(): boolean {
  try {
    return localStorage.getItem(NOTICE_KEY) === '1'
  } catch {
    return true
  }
}

export function markCorrectionNoticeSeen(): void {
  try {
    localStorage.setItem(NOTICE_KEY, '1')
  } catch {
    // ignore
  }
}
