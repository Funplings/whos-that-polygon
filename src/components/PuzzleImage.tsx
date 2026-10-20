import starburst from '../resources/images/assets/Starburst.svg'
import { POLYGONS } from '../game/polygons'
import type { ClueStage } from '../game/types'

// Every stage uses the same filter functions in the same order, varying only
// the values — CSS cannot interpolate between mismatched filter lists, so
// brightness(0) → grayscale(1) used to snap instead of cross-fading.
// invert(0.125) lifts the crushed black to the palette ink (#202020):
// 0.125 × 255 ≈ 32 per channel.
const STAGE_FILTERS: Record<ClueStage, string> = {
  0: 'brightness(0) grayscale(1) invert(0.125)', // silhouette, in ink
  1: 'brightness(1) grayscale(1) invert(0)', // grayscale
  2: 'brightness(1) grayscale(0) invert(0)', // full color
}

interface Props {
  slug: string
  clueStage: ClueStage
}

export function PuzzleImage({ slug, clueStage }: Props) {
  const src = POLYGONS[slug]
  return (
    // fit-square-parent/fit-square size the starburst as the largest square
    // that fits the space left over by the top bar and bottom controls: in
    // short viewports it shrinks, in tall ones it centres — the responsive
    // behaviour the design doc asks for.
    <div className="fit-square-parent flex h-full w-full items-center justify-center">
      <div className="fit-square relative flex items-center justify-center">
        {/* The hand-drawn starburst asset — white outline and offset shadow
            are baked into the SVG itself. */}
        <img
          src={starburst}
          alt=""
          aria-hidden
          draggable={false}
          className="h-[92%] w-[92%]"
        />
        {/* Square bounding box, centred on the grey star FACE with margin all
            round so the drawing never feels squashed against the spikes. The
            translate compensates for the baked shadow padding the SVG's
            bottom-right: the face's centre sits at (753,753) in the 1562
            viewBox, 1.79% up-left of the SVG centre — times the 92% render
            scale = 1.64% of this overlay. */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ transform: 'translate(-1.64%, -1.64%)' }}
        >
          <div className="aspect-square w-[46%]">
            {src ? (
              // Exports are trimmed to the drawing and vary in aspect ratio,
              // so object-contain does the framing inside the bounding box.
              //
              // The filter goes on the image, not a wrapper, so the starburst
              // behind it stays unfiltered.
              <img
                // Keyed by slug: switching puzzles remounts the img, so the
                // new one appears instantly at its own stage instead of
                // cross-fading from the previous puzzle's filter. The fade
                // only plays for stage changes within one puzzle.
                key={slug}
                src={src}
                alt=""
                style={{ filter: STAGE_FILTERS[clueStage] }}
                // pointer-events-none: the clue filters are cosmetic — the
                // fetched PNG is full colour — so the image must not offer
                // its own context menu ("open image in a new tab" was a
                // one-click answer reveal, long-press-save likewise on
                // mobile). Right-clicks now hit the wrapper instead.
                className="pointer-events-none h-full w-full object-contain transition-[filter] duration-700 select-none"
                draggable={false}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-ink">
                No art
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

