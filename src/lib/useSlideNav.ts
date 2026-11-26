import { useEffect, useRef, useState, type TouchEvent } from 'react'

/** One leg of the slide: the old puzzle out, or the new one in. */
const DURATION = 220
const EASE = 'cubic-bezier(0.2, 0.7, 0.3, 1)'
/** Past this much finger travel (px, or 20% of the width if smaller), a
 *  released drag commits to the next puzzle... */
const COMMIT_DISTANCE = 80
/** ...or at any distance over 30px if flicked faster than this (px/ms). */
const FLICK_SPEED = 0.5

type Direction = 'prev' | 'next'

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Page-turn navigation for the puzzle: the starburst follows a horizontal
 * drag, and on release (or an arrow press, via `go`) slides off the screen
 * while the neighbouring puzzle slides in from the other side. A drag towards
 * a day that doesn't exist rubber-bands and springs back.
 *
 * `onNavigate` fires once the old puzzle is fully off screen, so the switch
 * itself — the bottom controls changing too — happens out of sight.
 */
export function useSlideNav<T>(
  targets: { prev: T | null; next: T | null },
  onNavigate: (target: T) => void,
) {
  const ref = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState(0)
  const [animating, setAnimating] = useState(false)

  // Timers outlive the render that set them, so they read the latest props.
  const latest = useRef({ targets, onNavigate })
  useEffect(() => {
    latest.current = { targets, onNavigate }
  })

  const busy = useRef(false)
  const drag = useRef<{
    x: number
    y: number
    t: number
    axis: 'x' | 'y' | null
  } | null>(null)
  const timers = useRef<number[]>([])
  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach(clearTimeout)
  }, [])
  function later(ms: number, fn: () => void) {
    timers.current.push(window.setTimeout(fn, ms))
  }

  const width = () => ref.current?.clientWidth ?? window.innerWidth

  function settle() {
    setAnimating(true)
    setOffset(0)
    later(DURATION, () => {
      setAnimating(false)
      busy.current = false
    })
  }

  function go(direction: Direction) {
    const target = latest.current.targets[direction]
    if (target === null || busy.current) return
    if (prefersReducedMotion()) {
      setOffset(0)
      latest.current.onNavigate(target)
      return
    }
    busy.current = true
    const exit = (direction === 'next' ? -1 : 1) * width()
    setAnimating(true)
    setOffset(exit)
    later(DURATION, () => {
      // Swap puzzles while off screen, park the new one on the far side with
      // no transition, then let it glide in. The double rAF makes sure the
      // parked position is painted before the transition is switched back on.
      latest.current.onNavigate(target)
      setAnimating(false)
      setOffset(-exit)
      requestAnimationFrame(() => requestAnimationFrame(settle))
    })
  }

  const handlers = {
    onTouchStart(e: TouchEvent) {
      const t = e.touches[0]
      drag.current =
        !busy.current && e.touches.length === 1 && t
          ? { x: t.clientX, y: t.clientY, t: e.timeStamp, axis: null }
          : null
    },
    onTouchMove(e: TouchEvent) {
      const d = drag.current
      const t = e.touches[0]
      if (!d || !t) return
      const dx = t.clientX - d.x
      const dy = t.clientY - d.y
      // Decide once, after a little travel, whether this is a sideways drag;
      // a mostly-vertical one is left alone for the rest of the gesture.
      if (d.axis === null) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return
        d.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      }
      if (d.axis !== 'x') return
      const target = latest.current.targets[dx < 0 ? 'next' : 'prev']
      setAnimating(false)
      setOffset(target === null ? dx * 0.25 : dx)
    },
    onTouchEnd(e: TouchEvent) {
      const d = drag.current
      drag.current = null
      const t = e.changedTouches[0]
      if (!d || d.axis !== 'x' || !t) return
      const dx = t.clientX - d.x
      const speed = Math.abs(dx) / Math.max(1, e.timeStamp - d.t)
      const direction: Direction = dx < 0 ? 'next' : 'prev'
      const far = Math.abs(dx) > Math.min(COMMIT_DISTANCE, width() * 0.2)
      const flicked = Math.abs(dx) > 30 && speed > FLICK_SPEED
      if ((far || flicked) && latest.current.targets[direction] !== null) {
        go(direction)
      } else {
        busy.current = true
        settle()
      }
    },
    onTouchCancel() {
      if (!drag.current) return
      drag.current = null
      busy.current = true
      settle()
    },
  }

  const style = {
    transform: `translate3d(${offset}px, 0, 0)`,
    transition: animating ? `transform ${DURATION}ms ${EASE}` : 'none',
  }

  return { ref, style, handlers, go }
}
