// Downloads the end-of-game reveal images into src/resources/images/artwork,
// so the game serves its own assets instead of hotlinking raw.githubusercontent
// on every reveal.
//
// Run with: node scripts/fetch-artwork.mjs
//
// Only *answers* need artwork, and an answer has to have a polygon — so this
// fetches one image per polygon in the polygons directory (~376), not one per
// pokemon.json entry (~1,278). Files already present are skipped, so re-running
// after adding a polygon downloads just the new one.
//
// Downloads are resampled to 320px (2x the 160px the reveal renders at) with
// sips, which ships with macOS. Elsewhere the full-resolution file is kept.

import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const POLYGONS = join(ROOT, 'src/resources/images/polygons')
const OUT = join(ROOT, 'src/resources/images/artwork')
const ARTWORK_BASE =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork'

const MAX_PX = 320
const CONCURRENCY = 8

const pokemon = JSON.parse(
  await import('node:fs/promises').then((fs) =>
    fs.readFile(join(ROOT, 'src/data/pokemon.json'), 'utf8'),
  ),
)
const bySlug = new Map(pokemon.map((p) => [p.name, p]))

const slugs = readdirSync(POLYGONS)
  .filter((f) => f.endsWith('.png'))
  .map((f) => f.slice(0, -4))
  .sort()

mkdirSync(OUT, { recursive: true })

const queue = []
const missing = []
for (const slug of slugs) {
  const p = bySlug.get(slug)
  if (!p) {
    // A polygon with no list entry is an unwinnable puzzle; the README's
    // orphan check covers this, so just report and move on.
    missing.push(slug)
    continue
  }
  const dest = join(OUT, `${slug}.png`)
  if (existsSync(dest)) continue
  queue.push({ slug, dest, url: p.art ?? `${ARTWORK_BASE}/${p.artId}.png` })
}

console.log(
  `${slugs.length} polygons, ${slugs.length - queue.length - missing.length} already fetched, ${queue.length} to download`,
)
if (missing.length) console.warn(`no list entry (skipped): ${missing.join(', ')}`)

const failed = []
const downloaded = []
let done = 0

async function worker() {
  for (;;) {
    const job = queue.shift()
    if (!job) return
    try {
      const res = await fetch(job.url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())
      writeFileSync(job.dest, buf)
      // Width lives in the PNG's IHDR chunk, a big-endian uint32 at byte 16.
      downloaded.push({ path: job.dest, width: buf.readUInt32BE(16) })
    } catch (err) {
      failed.push(`${job.slug}: ${err.message}  ${job.url}`)
    }
    done += 1
    if (done % 50 === 0) console.log(`  ${done} downloaded`)
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker))

// Resample in one batch, skipping anything already within budget. `sips -Z`
// resamples in *both* directions, so handing it the 96px sprite fallbacks
// would bake in a blurry upscale and make the files ~20x larger.
const oversized = downloaded.filter((d) => d.width > MAX_PX).map((d) => d.path)
if (oversized.length) {
  try {
    execFileSync('sips', ['-Z', String(MAX_PX), ...oversized], { stdio: 'ignore' })
    console.log(`resampled ${oversized.length} images down to ${MAX_PX}px`)
  } catch {
    console.warn('sips unavailable — keeping full-resolution downloads')
  }
}

console.log(`${downloaded.length} downloaded to ${OUT}`)
if (failed.length) {
  console.error(`\n${failed.length} failed:`)
  for (const f of failed) console.error(`  ${f}`)
  process.exitCode = 1
}
