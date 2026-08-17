import burstCyan from '../resources/images/misc/burst-cyan.svg'
import { POLYGONS } from '../game/polygons'
import type { ClueStage } from '../game/types'

const STAGE_FILTERS: Record<ClueStage, string> = {
  0: 'brightness(0)', // silhouette
  1: 'grayscale(1)', // grayscale
  2: 'none', // full color
}

interface Props {
  slug: string
  clueStage: ClueStage
}

export function PuzzleImage({ slug, clueStage }: Props) {
  const src = POLYGONS[slug]
  return (
    // Deliberately not `isolate`. That would trap the burst's negative z-index
    // in this box, so it would only sit below *this* component's content — and
    // relative to siblings the whole component paints as one unit in document
    // order, putting the burst over anything earlier in the page (the banners,
    // the puzzle counter) while still under anything later. Without a stacking
    // context here the -z-10 resolves against .eyecatch instead, landing above
    // the page backdrop but below every piece of app content.
    <div className="relative mx-auto w-full max-w-sm">
      {/* The cyan burst belongs to the puzzle, not the page. Anchored here it
          tracks the artwork through scrolling, zooming and layout changes —
          as a fixed-position page layer it stayed pinned to the viewport and
          slid out from behind the polygon as soon as you scrolled. */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[480%] w-[480%] -translate-x-1/2 -translate-y-1/2 bg-[length:100%_100%] bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${burstCyan})` }}
      />
      {/* No panel behind the puzzle — the backdrop shows through, so the
          silhouette sits straight on the concentration lines. */}
      <div className="p-6">
        <div className="aspect-square w-full">
          {src ? (
            // Exports are cropped to the drawing and vary in aspect ratio, so
            // object-contain does the framing: each puzzle is scaled to fit the
            // square by its longest side and centered, at a uniform size.
            // scale-95 keeps the drawing off the container edge.
            //
            // The filter goes on the image, not a wrapper, so the eyecatch
            // backdrop behind it stays unfiltered.
            <img
              src={src}
              alt=""
              style={{ filter: STAGE_FILTERS[clueStage] }}
              className="h-full w-full scale-95 object-contain transition-[filter] duration-700"
              draggable={false}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm font-semibold text-white">
              No art
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
