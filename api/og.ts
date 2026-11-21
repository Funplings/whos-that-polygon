// GET /api/og?n=<puzzle number> — the link-preview image for one day's
// puzzle: the card from public/og-image.png with that day's silhouette in
// the starburst. middleware.ts points the homepage's og:image here.
//
// The silhouette is the puzzle as everyone first sees it (clue stage 0), so
// the preview never shows more than opening the game would. Numbers beyond
// today's 404, so the URL can't be walked forward to see future puzzles.
//
// The files read below reach the deployed function through `includeFiles`
// in vercel.json — add any new one there too.

import { ImageResponse } from '@vercel/og'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { releasedNumber } from './_og/day.js'

const ROOT = process.cwd()
const POLYGON_DIR = join(ROOT, 'src/resources/images/polygons')

const schedule = JSON.parse(
  readFileSync(join(ROOT, 'src/data/puzzles.json'), 'utf8'),
) as { startDate: string; order: string[] }

// Same defensive filter as src/game/puzzle.ts: a scheduled slug with no art
// is dropped, and the schedule cycles when it runs out.
const onDisk = new Set(
  readdirSync(POLYGON_DIR).map((file) => file.replace(/\.png$/, '')),
)
const order = schedule.order.filter((slug) => onDisk.has(slug))

const dataUrl = (path: string) =>
  `data:image/png;base64,${readFileSync(path).toString('base64')}`

const base = dataUrl(join(ROOT, 'api/_og/base.png'))

// Where the art sits on the 1200×630 card: the starburst's grey face, as laid
// out by scripts/build-og-image.mjs (burst 560px at x=50, y=35; art 46% of
// it, nudged up-left 1.64% for the baked-in shadow).
const ART_BOX = { left: 192, top: 177, size: 258 }

// The game's silhouette is `brightness(0) invert(0.125)` → #202020 ink.
// resvg applies filters in linear light, where 0.125 comes out mid-grey;
// 0.0144 is #202020's linear value.
const SILHOUETTE = 'brightness(0) invert(0.0144)'

export function GET(request: Request): Response {
  const n = releasedNumber(
    new URL(request.url).searchParams.get('n'),
    schedule.startDate,
  )
  if (n === null) return new Response('Not found', { status: 404 })

  const slug = order[(n - 1) % order.length]
  const art = dataUrl(join(POLYGON_DIR, `${slug}.png`))

  // Plain element objects rather than JSX, so this needs no JSX build setup.
  const card = {
    type: 'div',
    props: {
      style: {
        width: 1200,
        height: 630,
        display: 'flex',
        backgroundImage: `url(${base})`,
      },
      children: {
        type: 'img',
        props: {
          src: art,
          style: {
            position: 'absolute',
            left: ART_BOX.left,
            top: ART_BOX.top,
            width: ART_BOX.size,
            height: ART_BOX.size,
            objectFit: 'contain',
            filter: SILHOUETTE,
          },
        },
      },
    },
  }

  // ImageResponse caches for a year (immutable), which suits a released day:
  // its image never changes short of editing the past schedule.
  return new ImageResponse(card as never, { width: 1200, height: 630 })
}
