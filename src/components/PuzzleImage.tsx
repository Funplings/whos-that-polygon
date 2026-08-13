import { POLYGON_SOURCES } from '../game/polygons'
import type { ClueStage } from '../game/types'
import { NormalizedPolygon } from './NormalizedPolygon'

const STAGE_FILTERS: Record<ClueStage, string> = {
  0: 'brightness(0)', // silhouette
  1: 'grayscale(1)', // grayscale
  2: 'none', // full color
}

const STAGE_LABELS: Record<ClueStage, string> = {
  0: 'Silhouette',
  1: 'Grayscale',
  2: 'Full Color',
}

interface Props {
  slug: string
  clueStage: ClueStage
}

export function PuzzleImage({ slug, clueStage }: Props) {
  const source = POLYGON_SOURCES[slug]
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="rounded-2xl bg-slate-800 p-6 shadow-lg ring-1 ring-slate-700">
        <div
          className="aspect-square w-full transition-[filter] duration-700"
          style={{ filter: STAGE_FILTERS[clueStage] }}
        >
          {source ? (
            <NormalizedPolygon key={slug} source={source} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              No art
            </div>
          )}
        </div>
      </div>
      <span className="absolute -top-2 right-3 rounded-full bg-slate-700 px-3 py-0.5 text-xs font-semibold tracking-wide text-slate-300 uppercase">
        {STAGE_LABELS[clueStage]}
      </span>
    </div>
  )
}
