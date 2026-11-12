import { useEffect, useRef } from 'react'

// The palette's brights plus a couple of party colours.
const COLORS = ['#ffcf00', '#d33b3b', '#f9574d', '#ffffff', '#7dd3fc', '#34d399']
const SPAWN_MS = 3500 // how long new pieces keep appearing at the top

interface Piece {
  x: number
  y: number
  w: number
  h: number
  vy: number
  /** horizontal sway */
  phase: number
  sway: number
  spin: number
  angle: number
  color: string
}

/**
 * Confetti falling from the top of the screen, drawn on one full-screen
 * canvas (no dependency, no DOM node per piece). Pieces are rectangles that
 * flutter: their drawn height follows cos(angle), which reads as a flat
 * paper flipping over. Calls onDone once every piece has fallen off-screen.
 */
export function Confetti({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const onDoneRef = useRef(onDone)
  useEffect(() => {
    onDoneRef.current = onDone
  })

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const resize = () => {
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
    }
    resize()
    window.addEventListener('resize', resize)

    const pieces: Piece[] = []
    // Density scales with width so phones aren't buried and desktops aren't
    // sparse.
    const perSecond = Math.min(140, Math.max(50, window.innerWidth / 8))
    const spawn = () => {
      const size = 6 + Math.random() * 6
      pieces.push({
        x: Math.random() * window.innerWidth,
        y: -20 - Math.random() * 40,
        w: size,
        h: size * (0.4 + Math.random() * 0.4),
        vy: 90 + Math.random() * 110, // px/s
        phase: Math.random() * Math.PI * 2,
        sway: 20 + Math.random() * 40,
        spin: (Math.random() - 0.5) * 12,
        angle: Math.random() * Math.PI * 2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      })
    }
    // An opening burst, then a steady fall.
    for (let i = 0; i < perSecond * 0.8; i++) spawn()

    const start = performance.now()
    let last = start
    let carry = 0
    let frame = 0
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (now - start < SPAWN_MS) {
        carry += perSecond * dt
        for (; carry >= 1; carry--) spawn()
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
      const t = (now - start) / 1000
      for (let i = pieces.length - 1; i >= 0; i--) {
        const p = pieces[i]
        p.y += p.vy * dt
        p.angle += p.spin * dt
        if (p.y > window.innerHeight + 20) {
          pieces.splice(i, 1)
          continue
        }
        const x = p.x + Math.sin(t * 2 + p.phase) * p.sway
        ctx.save()
        ctx.translate(x, p.y)
        ctx.rotate(p.angle * 0.5)
        ctx.scale(1, Math.cos(p.angle))
        ctx.fillStyle = p.color
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      }

      if (pieces.length === 0 && now - start >= SPAWN_MS) {
        onDoneRef.current()
        return
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      // Above everything, including the popups (z-60), and never in the way
      // of a tap.
      className="pointer-events-none fixed inset-0 z-[70] h-full w-full"
    />
  )
}
