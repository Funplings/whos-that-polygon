// Renders src/resources/images/pieces/<slug>/ — each puzzle's art as its
// separate shapes, for the split toggle — from the designer's Figma file.
//
// Run with: node scripts/build-pieces.mjs [--add] [slug …]
//
// Name slugs to build just those; with none, every Pokémon in the export is
// built (about a minute and a half). --add also creates the puzzle itself for
// art that has no polygons/<slug>.png yet, rendered from the export the same
// way — existing polygon PNGs are never touched. A new puzzle still needs its
// reveal image (node scripts/fetch-artwork.mjs) and a day in puzzles.json.
//
// Input is every SVG in scripts/figma/: an export of the Figma file's "Mons"
// group (or of single "Gen N" frames inside it), where each Pokémon is a
// group named by its slug, holding its shapes bottom layer first. To refresh
// after new art: select "Mons", Export → SVG at 1x with "Include 'id'
// attribute" ticked, and save it over scripts/figma/mons.svg — one export
// instead of a thousand.
//
// The export must be 1x. Figma's SVG exporter emulates inside strokes by
// insetting the shape, and in a scaled export it insets by the UNSCALED stroke
// weight while shrinking everything else — the Figma MCP's downloads, which
// cap large frames at 4096px, come out with every stroked shape mangled.
//
// Every piece is rendered into the SAME frame: the alpha bounding box of all
// the shapes together, which is how trim-polygons.py crops polygons/<slug>.png,
// scaled so its longest side matches that PNG's. Stacked, the pieces rebuild
// the image. Named by stacking order, bottom first (1-star.png,
// 2-polygon.png, …), which is how game/pieces.ts sorts them.
//
// Deterministic: re-running on the same exports rewrites identical files.
// Without --add, art without a polygon PNG is skipped and listed; a slug's
// pieces that no longer exist in Figma are removed.

import { Resvg } from '@resvg/resvg-js'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const EXPORTS = join(ROOT, 'scripts/figma')
const POLYGONS = join(ROOT, 'src/resources/images/polygons')
const PIECES = join(ROOT, 'src/resources/images/pieces')

const ALPHA_THRESHOLD = 8 // out of 255, matching trim-polygons.py
// Elements that define rather than draw: never a piece of their own.
const DEFINITION_TAGS = new Set([
  'defs', 'mask', 'clipPath', 'linearGradient', 'radialGradient', 'filter', 'pattern',
])
// Aspect-ratio differences from polygons/<slug>.png worth flagging. A pixel
// or two is antialiasing; more means the Figma art changed since the PNG.
const ASPECT_TOLERANCE = 0.02
// Longest side of a polygon PNG made with --add, matching the designer's
// exports (README: "around 1000px on the longest side").
const NEW_POLYGON_SIZE = 1000

const args = process.argv.slice(2)
const add = args.includes('--add')
const only = new Set(args.filter((a) => !a.startsWith('--')))
const polygonSize = readPolygonSizes()

const skipped = []
const added = []
const notThree = []
const aspectMismatch = []
const seen = new Set()
let built = 0

for (const file of readdirSync(EXPORTS).filter((f) => f.endsWith('.svg')).sort()) {
  const source = readFileSync(join(EXPORTS, file), 'utf8')
  const svg = parse(source)
  // A 1x export draws inside strokes as masks over paths kept in one shared
  // <defs> — the masks sometimes beside the shape rather than inside it —
  // and each document gets only the definitions its markup references.
  const defs = new Map()
  const collect = (node, inDefs) => {
    for (const child of node.children) {
      if (child.id && (inDefs || DEFINITION_TAGS.has(child.tag))) defs.set(child.id, child)
      collect(child, inDefs || child.tag === 'defs')
    }
  }
  collect(svg, false)
  const definitionsFor = (markup) => {
    const included = new Set()
    const visit = (text) => {
      for (const [, id] of text.matchAll(/(?:url\(|href=")#([^"')]+)/g)) {
        const node = defs.get(id)
        if (!node || included.has(node) || markup.includes(`id="${id}"`)) continue
        included.add(node)
        visit(source.slice(node.start, node.end))
      }
    }
    visit(markup)
    return included.size
      ? `<defs>${[...included].map((n) => source.slice(n.start, n.end)).join('')}</defs>`
      : ''
  }
  // Each <use> becomes a copy of what it references, inside a <g> carrying
  // the <use>'s attributes. Figma colours the shape through the <use>'s fill,
  // which resvg doesn't pass on to the referenced path (it renders black).
  const inlineUses = (markup) =>
    markup.replace(/<use\s+(?:xlink:)?href="#([^"]+)"([^>]*?)\/>/g, (whole, id, attrs) => {
      const node = defs.get(id)
      if (!node) return whole
      const copy = source.slice(node.start, node.end).replace(/\sid="[^"]*"/, '')
      return `<g${attrs}>${copy}</g>`
    })

  for (const { group, ancestors } of pokemonGroups(svg)) {
    const slug = group.id
    if (only.size && !only.has(slug)) continue
    if (seen.has(slug)) console.log(`!! ${slug} appears twice; the later export wins`)
    seen.add(slug)
    const isNew = !polygonSize[slug]
    if (isNew && !add) {
      skipped.push(slug)
      continue
    }

    // Step through single wrapper groups (a few Pokémon nest their shapes one
    // level down), keeping each wrapper's tag so its attributes still apply.
    const chain = [...ancestors, group]
    const drawn = (node) => node.children.filter((n) => !DEFINITION_TAGS.has(n.tag))
    let shapes = drawn(group)
    while (shapes.length === 1 && shapes[0].tag === 'g') {
      chain.push(shapes[0])
      shapes = drawn(shapes[0])
    }
    if (shapes.length !== 3) notThree.push(`${slug} (${shapes.length})`)

    const wrap = (inner) => {
      const body = inlineUses(
        chain.map((n) => n.open).join('') + inner + '</g>'.repeat(chain.length),
      )
      return definitionsFor(body) + body
    }
    const all = wrap(shapes.map((n) => source.slice(n.start, n.end)).join(''))

    // Render everything once, generously padded, to find the shared frame
    // in pixels; then render each shape cropped to exactly that frame.
    const box = new Resvg(document(all, svg.viewBox)).getBBox()
    const longest = isNew ? NEW_POLYGON_SIZE : Math.max(...polygonSize[slug])
    const pad = Math.max(box.width, box.height) * 0.1
    const measureAt = (k) => {
      const probe = {
        x: box.x - pad,
        y: box.y - pad,
        width: Math.ceil((box.width + 2 * pad) * k) / k,
        height: Math.ceil((box.height + 2 * pad) * k) / k,
      }
      return { probe, crop: alphaBounds(render(all, probe, k)) }
    }
    // The vector bbox runs a little larger than the drawn pixels (curve
    // control points, mitred corners), so scale from it once, then correct
    // by the measured crop so the longest side lands on target.
    let k = longest / Math.max(box.width, box.height) // svg units -> px
    let { probe, crop } = measureAt(k)
    const drawnSide = Math.max(crop.x1 - crop.x0, crop.y1 - crop.y0)
    if (drawnSide !== longest) {
      k *= longest / drawnSide
      ;({ probe, crop } = measureAt(k))
    }
    const frame = {
      x: probe.x + crop.x0 / k,
      y: probe.y + crop.y0 / k,
      width: (crop.x1 - crop.x0) / k,
      height: (crop.y1 - crop.y0) / k,
    }

    const [w, h] = [crop.x1 - crop.x0, crop.y1 - crop.y0]
    if (isNew) {
      // The puzzle image is every shape together, in the pieces' own frame.
      writeFileSync(join(POLYGONS, `${slug}.png`), render(all, frame, k).asPng())
      added.push(`${slug} (${w}x${h})`)
    } else {
      const [pw, ph] = polygonSize[slug]
      if (Math.abs(w / h / (pw / ph) - 1) > ASPECT_TOLERANCE) {
        aspectMismatch.push(`${slug}: pieces ${w}x${h}, polygon ${pw}x${ph}`)
      }
    }

    // Updated in place rather than deleted and recreated: unchanged files are
    // left alone, and only pieces that no longer exist are removed. (Wiping
    // the folder each run had a synced Desktop keeping "1-star 2.png"
    // conflict copies, which game/pieces.ts then loads as extra pieces.)
    const out = join(PIECES, slug)
    mkdirSync(out, { recursive: true })
    const names = shapes.map((shape, i) => {
      const kind = (shape.id ?? 'shape').split(/[\s_]/)[0].toLowerCase().replace(/[^a-z0-9]+/g, '-')
      const name = `${i + 1}-${kind || 'shape'}.png`
      const png = render(wrap(source.slice(shape.start, shape.end)), frame, k).asPng()
      const path = join(out, name)
      if (!existsSync(path) || !readFileSync(path).equals(png)) writeFileSync(path, png)
      return name
    })
    for (const stale of readdirSync(out).filter((f) => f.endsWith('.png') && !names.includes(f))) {
      rmSync(join(out, stale))
    }
    built++
  }
}

console.log(`built ${built} piece sets`)
const missing = [...only].filter((slug) => !seen.has(slug))
if (missing.length) console.log(`!! not in the export: ${missing.join(', ')}`)
if (added.length) {
  console.log(
    `new puzzles, polygon PNG made: ${added.join(', ')}\n` +
      '  still needed: a name in pokemon.json, node scripts/fetch-artwork.mjs, a day in puzzles.json',
  )
}
if (skipped.length) {
  console.log(`no polygon PNG, skipped (--add makes one): ${skipped.join(', ')}`)
}
if (notThree.length) console.log(`not three shapes: ${notThree.join(', ')}`)
if (aspectMismatch.length) {
  console.log(`shape differs from the polygon (art changed?):\n  ${aspectMismatch.join('\n  ')}`)
}

/** Each Pokémon's group — the groups directly inside a "Gen …" frame — with
 *  the groups enclosing it, whose tags (clip paths and all) are kept. */
function pokemonGroups(svg) {
  const found = []
  const walk = (node, ancestors) => {
    for (const child of node.children.filter((n) => n.tag === 'g')) {
      if (node.id?.startsWith('Gen ')) found.push({ group: child, ancestors })
      else walk(child, [...ancestors, child])
    }
  }
  walk(svg, [])
  return found
}

/**
 * A standalone SVG showing `inner` through `view` (svg units). fill="none"
 * as on Figma's own root: its stroke paths carry no fill of their own and
 * would otherwise default to black over the shape.
 */
function document(inner, view, k = 1) {
  const { x, y, width, height } = view
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `fill="none" viewBox="${x} ${y} ${width} ${height}" ` +
    `width="${Math.round(width * k)}" height="${Math.round(height * k)}">${inner}</svg>`
  )
}

function render(inner, view, k) {
  return new Resvg(document(inner, view, k), {
    fitTo: { mode: 'original' },
    font: { loadSystemFonts: false },
  }).render()
}

/** Pixel bounds of everything more opaque than ALPHA_THRESHOLD. */
function alphaBounds({ width, height, pixels }) {
  let [x0, y0, x1, y1] = [width, height, 0, 0]
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[(y * width + x) * 4 + 3] > ALPHA_THRESHOLD) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }
  }
  return { x0, y0, x1: x1 + 1, y1: y1 + 1 }
}

/** slug -> [width, height], read from each polygon PNG's IHDR chunk. */
function readPolygonSizes() {
  const sizes = {}
  for (const f of readdirSync(POLYGONS).filter((f) => f.endsWith('.png'))) {
    const head = readFileSync(join(POLYGONS, f)).subarray(16, 24)
    sizes[f.slice(0, -4)] = [head.readUInt32BE(0), head.readUInt32BE(4)]
  }
  return sizes
}

/**
 * Just enough XML for Figma's SVG exports: an element tree recording where
 * each element sits in the source, so shapes are copied out verbatim. Figma
 * never emits text nodes, comments or '>' inside attribute values here.
 */
function parse(source) {
  const top = { tag: '#root', children: [] }
  const stack = [top]
  const tags = /<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g
  let m
  while ((m = tags.exec(source))) {
    const [whole, closing, tag, attrs, selfClosing] = m
    if (closing) {
      stack.pop().end = m.index + whole.length
      continue
    }
    const node = {
      tag,
      open: whole,
      id: /\sid="([^"]*)"/.exec(attrs)?.[1],
      start: m.index,
      end: m.index + whole.length,
      children: [],
    }
    stack.at(-1).children.push(node)
    if (!selfClosing) stack.push(node)
  }
  const svg = top.children[0]
  const [x, y, width, height] = /viewBox="([^"]*)"/.exec(svg.open)[1].split(/\s+/).map(Number)
  return { ...svg, viewBox: { x, y, width, height } }
}
