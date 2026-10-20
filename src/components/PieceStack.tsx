import { useEffect, useState } from 'react'

/** A piece's opaque bounds, as fractions of the square art box. */
interface Box {
  x0: number
  y0: number
  x1: number
  y1: number
}

interface Props {
  pieces: string[]
  /** Pulled apart into a row instead of assembled. */
  split: boolean
  /** The clue-stage filter, applied per piece like the single image's. */
  filter: string
}

// The split row may run wider than the art box: the box is 46% of the
// starburst square, and the grey face has room either side of it.
const ROW_WIDTH = 1.2
const GAP = 0.08

/**
 * The puzzle art as its separate shapes, stacked so they read as the normal
 * image, which slide apart into a row when `split`. Each piece keeps its
 * full-frame PNG (shared coordinates), so a piece moves by a transform from
 * its spot in the assembled drawing, and the CSS transition plays both ways.
 */
export function PieceStack({ pieces, split, filter }: Props) {
  const boxes = usePieceBoxes(pieces)
  const targets = boxes && rowLayout(boxes)

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
 * Where each piece goes when split: one row, centred on the box, in stacking
 * order, every piece at the same scale so their relative sizes stay true.
 * Offsets are fractions of the (square) box, ready for translate().
 */
function rowLayout(boxes: Box[]) {
  const widths = boxes.map((b) => b.x1 - b.x0)
  const tallest = Math.max(...boxes.map((b) => b.y1 - b.y0))
  const totalWidth = widths.reduce((a, w) => a + w, 0)
  const scale = Math.min(
    1,
    (ROW_WIDTH - GAP * (boxes.length - 1)) / totalWidth,
    1 / tallest,
  )
  const rowWidth = scale * totalWidth + GAP * (boxes.length - 1)

  let x = 0.5 - rowWidth / 2
  return boxes.map((b, i) => {
    const w = widths[i] * scale
    const cx = x + w / 2
    x += w + GAP
    return {
      dx: cx - (b.x0 + b.x1) / 2,
      dy: 0.5 - (b.y0 + b.y1) / 2,
      scale,
    }
  })
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
