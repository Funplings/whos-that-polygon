import { useEffect, useRef, useState } from 'react'

/** A piece's opaque bounds, as fractions of the square art box. */
interface Box {
  x0: number
  y0: number
  x1: number
  y1: number
}

interface Props {
  pieces: string[]
  /** Pulled apart into a ring instead of assembled. */
  split: boolean
  /** The clue-stage filter, applied per piece like the single image's. */
  filter: string
  /** Called once every piece has loaded (and been measured). */
  onReady?: () => void
}

// How far from the box's centre a split piece may reach, in box widths. The
// box is 46% of the starburst square, so the grey face has room past its
// edges on every side.
const REACH = 0.7
const GAP = 0.08

/**
 * The puzzle art as its separate shapes, stacked so they read as the normal
 * image, which burst outwards into a ring when `split`. Each piece keeps its
 * full-frame PNG (shared coordinates), so a piece moves by a transform from
 * its spot in the assembled drawing, and the CSS transition plays both ways.
 */
export function PieceStack({ pieces, split, filter, onReady }: Props) {
  const boxes = usePieceBoxes(pieces)
  const targets = boxes && radialLayout(boxes)

  // The ref keeps the effect keyed on loading alone, not on the caller
  // passing a fresh callback every render.
  const onReadyRef = useRef(onReady)
  useEffect(() => {
    onReadyRef.current = onReady
  })
  const ready = boxes !== null
  useEffect(() => {
    if (ready) onReadyRef.current?.()
  }, [ready])

  return (
    <div className="relative h-full w-full">
      {pieces.map((src, i) => {
        const box = boxes?.[i]
        const target = targets?.[i]
        const moved = split && box && target
        return (
          <img
            key={src}
            src={src}
            alt=""
            draggable={false}
            // pointer-events-none for the same reason as the single image:
            // no context menu offering the full-colour PNG.
            className="pointer-events-none absolute inset-0 h-full w-full object-contain select-none"
            style={{
              filter,
              transformOrigin: box
                ? `${((box.x0 + box.x1) / 2) * 100}% ${((box.y0 + box.y1) / 2) * 100}%`
                : undefined,
              transform: moved
                ? `translate(${target.dx * 100}%, ${target.dy * 100}%) scale(${target.scale})`
                : 'none',
              // A small stagger so the pieces peel off one after another;
              // reversed on the way back so the last one out is first home.
              transition: `filter 700ms, transform 650ms cubic-bezier(0.34, 1.3, 0.64, 1) ${
                (split ? i : pieces.length - 1 - i) * 70
              }ms`,
            }}
          />
        )
      })}
    </div>
  )
}

/**
 * Where each piece goes when split: evenly spaced around a circle centred on
 * the box, first slot straight up, every piece at the same scale so their
 * relative sizes stay true. Pieces keep their cyclic order around the
 * drawing's centre, rotated onto the slots so each moves as close to
 * straight outwards as it can. Offsets are fractions of the (square) box,
 * ready for translate().
 */
function radialLayout(boxes: Box[]) {
  const n = boxes.length
  const centres = boxes.map((b) => ({
    x: (b.x0 + b.x1) / 2,
    y: (b.y0 + b.y1) / 2,
  }))
  if (n < 2) {
    return centres.map((c) => ({ dx: 0.5 - c.x, dy: 0.5 - c.y, scale: 1 }))
  }

  // Sized by the biggest piece's half-extent m: neighbouring slots sit
  // 2R·sin(π/n) apart and must clear 2·m·s + GAP, and the outer edge
  // R + m·s must stay within REACH.
  const m = Math.max(...boxes.map((b) => Math.max(b.x1 - b.x0, b.y1 - b.y0))) / 2
  const sin = Math.sin(Math.PI / n)
  const scale = Math.min(1, (REACH * sin - GAP / 2) / (m * (1 + sin)))
  const radius = Math.min(REACH - m * scale, (m * scale + GAP / 2) / sin)

  const ox = centres.reduce((a, c) => a + c.x, 0) / n
  const oy = centres.reduce((a, c) => a + c.y, 0) / n
  const angle = (i: number) =>
    Math.atan2(centres[i].y - oy, centres[i].x - ox)
  const slot = (k: number) => -Math.PI / 2 + (2 * Math.PI * k) / n
  const off = (a: number, b: number) =>
    Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)))

  const order = boxes.map((_, i) => i).sort((a, b) => angle(a) - angle(b))
  let best = 0
  let bestCost = Infinity
  for (let r = 0; r < n; r++) {
    const cost = order.reduce(
      (sum, i, j) => sum + off(angle(i), slot((j + r) % n)),
      0,
    )
    if (cost < bestCost) [best, bestCost] = [r, cost]
  }

  const targets = new Array<{ dx: number; dy: number; scale: number }>(n)
  order.forEach((i, j) => {
    const a = slot((j + best) % n)
    targets[i] = {
      dx: 0.5 + radius * Math.cos(a) - centres[i].x,
      dy: 0.5 + radius * Math.sin(a) - centres[i].y,
      scale,
    }
  })
  return targets
}

/**
 * Each piece's opaque bounds, measured from its pixels once loaded, in
 * box fractions — accounting for object-contain letterboxing the frame
 * inside the square. Null until every piece has been measured.
 */
function usePieceBoxes(pieces: string[]): Box[] | null {
  const key = pieces.join('|')
  const [measured, setMeasured] = useState<{
    key: string
    boxes: Box[]
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all(key.split('|').map(measure)).then((boxes) => {
      if (!cancelled) setMeasured({ key, boxes })
    })
    return () => {
      cancelled = true
    }
  }, [key])

  return measured?.key === key ? measured.boxes : null
}

async function measure(src: string): Promise<Box> {
  const img = new Image()
  img.src = src
  await img.decode()
  const { naturalWidth: w, naturalHeight: h } = img

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  const alpha = ctx.getImageData(0, 0, w, h).data

  let x0 = w
  let y0 = h
  let x1 = 0
  let y1 = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (alpha[(y * w + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }
  }

  // object-contain fits the frame inside the square box and centres it.
  const fit = Math.min(1 / w, 1 / h)
  const offX = (1 - w * fit) / 2
  const offY = (1 - h * fit) / 2
  return {
    x0: offX + x0 * fit,
    y0: offY + y0 * fit,
    x1: offX + (x1 + 1) * fit,
    y1: offY + (y1 + 1) * fit,
  }
}
