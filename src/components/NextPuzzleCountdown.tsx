import { useEffect, useState } from 'react'
import { msUntilNextPuzzle } from '../game/puzzle'

function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, '0')).join(':')
}

export function NextPuzzleCountdown() {
  const [remaining, setRemaining] = useState(() => msUntilNextPuzzle())

  useEffect(() => {
    const id = setInterval(() => {
      const ms = msUntilNextPuzzle()
      setRemaining(ms)
      // The puzzle is resolved once when the app mounts, so past midnight the
      // page would keep serving yesterday's polygon — and save guesses against
      // yesterday's date. Reloading swaps in the new one. Progress is persisted
      // per date, so nothing in flight is lost.
      if (ms === 0) window.location.reload()
    }, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <p className="on-burst text-center text-sm font-semibold text-white/90">
      Next polygon in{' '}
      {/* tabular-nums stops the line jittering as the digits tick over */}
      <span className="tabular-nums">{formatDuration(remaining)}</span>
    </p>
  )
}
