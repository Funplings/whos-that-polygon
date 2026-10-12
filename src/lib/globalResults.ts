import { useEffect, useState } from 'react'

// Global results: how everyone did on a given day. The one backend the game
// talks to — a Supabase project holding one anonymous row per device per day.
// The table itself is locked (RLS on, no policies); the only way in is two
// SQL functions, `submit_result` and `get_results`, which validate their
// input and only ever hand back aggregate counts.
//
// The publishable key is public by design (it ships in the bundle either
// way), so it lives here rather than in an env var — deploys need no setup.
const SUPABASE_URL = 'https://ourtbcuodsjseemfnldf.supabase.co'
const SUPABASE_KEY = 'sb_publishable_6mDtmPVlYjdvuTm-9CTckA_aCCJQnml'

const CLIENT_ID_KEY = 'wtp:client-id'
const SUBMITTED_PREFIX = 'wtp:submitted:'

/** Players who solved in 1, 2, and 3 guesses, and those who missed. */
export interface ResultCounts {
  one: number
  two: number
  three: number
  failed: number
}

/** A finished game, as reported to the global tally. */
export interface FinishedGame {
  guesses: number
  won: boolean
}

function rpc(fn: string, body: object, signal?: AbortSignal) {
  return fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  }).then((res) => {
    if (!res.ok) throw new Error(`${fn} failed: ${res.status}`)
    return res
  })
}

/**
 * A random per-device id, so each device counts once per day. Not tied to
 * anything about the player. Null when storage or crypto.randomUUID (secure
 * contexts only) is unavailable — such a device just doesn't submit.
 */
function clientId(): string | null {
  try {
    let id = localStorage.getItem(CLIENT_ID_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(CLIENT_ID_KEY, id)
    }
    return id
  } catch {
    return null
  }
}

function alreadySubmitted(dateISO: string): boolean {
  try {
    return localStorage.getItem(SUBMITTED_PREFIX + dateISO) === '1'
  } catch {
    return false
  }
}

function markSubmitted(dateISO: string): void {
  try {
    localStorage.setItem(SUBMITTED_PREFIX + dateISO, '1')
  } catch {
    // ignore — a resubmit is harmless, the server keeps the first result
  }
}

async function submitResult(dateISO: string, game: FinishedGame, signal: AbortSignal) {
  const id = clientId()
  if (!id || alreadySubmitted(dateISO)) return
  await rpc(
    'submit_result',
    { p_date: dateISO, p_client: id, p_guesses: game.guesses, p_won: game.won },
    signal,
  )
  markSubmitted(dateISO)
}

async function fetchResults(dateISO: string, signal: AbortSignal): Promise<ResultCounts> {
  const res = await rpc('get_results', { p_date: dateISO }, signal)
  const [row] = (await res.json()) as ResultCounts[]
  // bigint counts arrive as numbers; coerce defensively all the same.
  return {
    one: Number(row?.one ?? 0),
    two: Number(row?.two ?? 0),
    three: Number(row?.three ?? 0),
    failed: Number(row?.failed ?? 0),
  }
}

export type GlobalResults =
  | { state: 'loading' }
  | { state: 'error' }
  | { state: 'ready'; counts: ResultCounts }

/**
 * Once a game is finished, records it (when `submit` is set) and then loads
 * the day's tally — submit first, so the player's own result is in the counts
 * they see. `game` null means not finished yet: nothing is sent or fetched.
 */
export function useGlobalResults(
  dateISO: string,
  game: FinishedGame | null,
  submit: boolean,
): GlobalResults {
  // Keyed by date, so switching days never shows the previous day's tally.
  const [loaded, setLoaded] = useState<{
    date: string
    result: GlobalResults
  } | null>(null)

  const finished = game !== null
  const guesses = game?.guesses ?? 0
  const won = game?.won ?? false

  useEffect(() => {
    if (!finished) return
    const controller = new AbortController()
    ;(async () => {
      if (submit) {
        // A failed submit shouldn't hide everyone else's results.
        await submitResult(dateISO, { guesses, won }, controller.signal).catch(
          () => {},
        )
      }
      try {
        const counts = await fetchResults(dateISO, controller.signal)
        setLoaded({ date: dateISO, result: { state: 'ready', counts } })
      } catch {
        if (!controller.signal.aborted) {
          setLoaded({ date: dateISO, result: { state: 'error' } })
        }
      }
    })()
    return () => controller.abort()
  }, [dateISO, finished, guesses, won, submit])

  return loaded?.date === dateISO ? loaded.result : { state: 'loading' }
}
