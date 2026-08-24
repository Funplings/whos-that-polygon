// Generates the red concentration-line field (集中線 / shūchūsen) behind the
// page, as an SVG committed under src/resources/images/misc. The cyan puzzle
// starburst is no longer generated — it was superseded by the hand-drawn
// asset at src/resources/images/assets/Starburst.svg.
//
// Run with: node scripts/build-eyecatch.mjs
//
// Why not CSS gradients: repeating-conic-gradient repeats a fixed period, so
// every spike in a cycle is identical — length variation has to be faked with
// brightness falloff, widths only vary in a pattern that visibly repeats, and
// sub-degree wedges alias into moiré. Here each spike is its own polygon, so
// length, width, angle and colour are independently random per spike.
//
// Output is seeded, so re-running reproduces the same burst. Change SEED (or a
// burst's own seed) to draw a different one.

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '../src/resources/images/misc',
)

/** Deterministic PRNG — same seed, same burst. */
function mulberry32(seed) {
  return function rng() {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const round = (n) => Math.round(n * 10) / 10
const lerpNum = (a, b, t) => a + (b - a) * t

/**
 * One field of concentration lines. Returns `{ defs, group }` for composeSvg,
 * so a single SVG can stack several fields (the cyan burst layers two).
 *
 * Each spike is a triangle: a short base at `innerR` widening from the focal
 * point, tapering to a single tip at a random outer radius. The tip angle is
 * jittered off the spike's own axis so edges aren't symmetrical — that slight
 * lean is what stops the field reading as a mechanical pinwheel.
 */
function spikeField({
  seed,
  size,
  cx,
  cy,
  fromDeg,
  toDeg,
  count,
  innerR,
  innerRMax,
  lenMin,
  lenMax,
  baseMin,
  baseMax,
  tipJitterDeg,
  colors,
  opacityMin,
  opacityMax,
  fadeInner,
  fadeOuter,
  fadeR,
  lines = false,
}) {
  const rng = mulberry32(seed)
  const rad = (d) => (d * Math.PI) / 180
  const lerp = (a, b, t) => a + (b - a) * t

  const spikes = []
  for (let i = 0; i < count; i += 1) {
    // Uneven angular placement: walk the arc but jitter each step, so spacing
    // never settles into a rhythm the eye can pick up.
    const t = (i + (rng() - 0.5) * 0.9) / count
    const angle = rad(lerp(fromDeg, toDeg, t))

    // Start radius varies per spike. If they all begin at the same radius the
    // bases either fuse into a solid wedge (small radius) or leave a hard
    // circular hole (large radius) — staggering them spreads the crowding
    // across a band so neither shows, and adds one more axis of irregularity.
    const startR = lerp(innerR, innerRMax ?? innerR, rng() ** 0.7)
    const len = lerp(lenMin, lenMax, rng() ** 1.7) // skew toward shorter
    const base = lerp(baseMin, baseMax, rng() ** 1.4)
    const fill = colors[Math.floor(rng() * colors.length)]
    // Two decimals, not round()'s one — that's tuned for coordinates in a
    // 1000-unit viewBox and would snap opacity to the nearest 0.1.
    const opacity = Number(lerp(opacityMin, opacityMax, rng()).toFixed(2))
    let d

    // Both shapes put their base on a perpendicular offset from the ray rather
    // than on an arc at `startR`. An arc base can't sit at the centre — its
    // width is an angle, so it needs a nonzero radius, and whatever radius you
    // pick is left as a bare hole in the middle. Offsetting perpendicular lets
    // startR be 0, so every base overlaps the centre and fills it solid.
    const dx = Math.cos(angle)
    const dy = Math.sin(angle)
    const px = -dy * (base / 2)
    const py = dx * (base / 2)
    const sx = cx + dx * startR
    const sy = cy + dy * startR

    if (lines) {
      // Constant width along the whole length: same offset at both ends.
      const ex = cx + dx * (startR + len)
      const ey = cy + dy * (startR + len)
      d =
        `M${round(sx + px)} ${round(sy + py)}` +
        `L${round(ex + px)} ${round(ey + py)}` +
        `L${round(ex - px)} ${round(ey - py)}` +
        `L${round(sx - px)} ${round(sy - py)}Z`
    } else {
      // Tapering spike: far end collapses to a single jittered point.
      const tip = angle + rad((rng() - 0.5) * 2 * tipJitterDeg)
      const ex = cx + Math.cos(tip) * (startR + len)
      const ey = cy + Math.sin(tip) * (startR + len)
      d =
        `M${round(sx + px)} ${round(sy + py)}` +
        `L${round(ex)} ${round(ey)}` +
        `L${round(sx - px)} ${round(sy - py)}Z`
    }

    spikes.push(`<path d="${d}" fill="${fill}" opacity="${opacity}"/>`)
  }

  // No fade requested: the field ends at its spike tips, hard-edged. The
  // inner cyan layer wants exactly that — its pale spikes sit on the outer
  // layer's solid body, so there is nothing to dissolve into.
  if (fadeInner == null) {
    return { defs: '', group: `<g>\n${spikes.join('\n')}\n</g>` }
  }

  return maskedField(spikes, { seed, size, cx, cy, fadeInner, fadeOuter, fadeR })
}

/**
 * Wrap a field's paths in the shared radial fade mask, so the field dissolves
 * outward instead of ending at a hard edge. Baked into the SVG rather than
 * applied in CSS so the asset is complete.
 *
 * A plain two-stop fade ramps linearly and leaves a faint arc where it hits
 * black — a Mach band the eye picks up as a hard edge. Stepping through a
 * smoothstep curve instead flattens the ends of the ramp so the field
 * dissolves without a visible terminus.
 */
function maskedField(spikes, { seed, size, cx, cy, fadeInner, fadeOuter, fadeR }) {
  const maskId = `fade-${seed}`
  const fadeStops = []
  const STEPS = 7
  for (let i = 0; i <= STEPS; i += 1) {
    const t = i / STEPS
    const offset = Number(lerpNum(fadeInner, fadeOuter, t).toFixed(4))
    const v = Math.round(255 * (1 - t * t * (3 - 2 * t)))
    const hex = v.toString(16).padStart(2, '0')
    fadeStops.push(`<stop offset="${offset}" stop-color="#${hex}${hex}${hex}"/>`)
  }

  const defs = `<radialGradient id="${maskId}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${fadeR ?? size}">
    <stop offset="0" stop-color="#fff"/>
    ${fadeStops.join('\n    ')}
  </radialGradient>
  <mask id="m-${seed}"><rect width="${size}" height="${size}" fill="url(#${maskId})"/></mask>`

  return {
    defs,
    group: `<g mask="url(#m-${seed})">\n${spikes.join('\n')}\n</g>`,
  }
}

/**
 * Strictly parallel stripes — the comparison variant to the near-parallel
 * converging field. Every stripe runs at exactly `angleDeg`; only offset,
 * width, and opacity vary. Stripes overshoot the canvas on both ends, so
 * every one enters and leaves through the edges and the apparent length
 * comes entirely from the fade mask.
 */
function parallelField({
  seed,
  size,
  angleDeg,
  count,
  widthMin,
  widthMax,
  colors,
  opacityMin,
  opacityMax,
  fadeCx,
  fadeCy,
  fadeInner,
  fadeOuter,
  fadeR,
}) {
  const rng = mulberry32(seed)
  const rad = (angleDeg * Math.PI) / 180
  const dx = Math.cos(rad)
  const dy = Math.sin(rad)
  // Unit perpendicular: the axis stripes are distributed along.
  const px = -dy
  const py = dx
  const cx = size / 2
  const cy = size / 2
  // Offsets span the canvas diagonal, so the corners are covered too.
  const half = size * 0.75
  const overshoot = size * 1.5

  const spikes = []
  for (let i = 0; i < count; i += 1) {
    // Same jittered-walk placement as the converging field: even-ish spacing
    // that never settles into a rhythm.
    const t = ((i + (rng() - 0.5) * 0.9) / (count - 1)) * 2 - 1
    const off = t * half
    const w = lerpNum(widthMin, widthMax, rng() ** 1.4)
    const fill = colors[Math.floor(rng() * colors.length)]
    const opacity = Number(lerpNum(opacityMin, opacityMax, rng()).toFixed(2))

    const bx = cx + px * off
    const by = cy + py * off
    const hx = px * (w / 2)
    const hy = py * (w / 2)
    const x1 = bx - dx * overshoot
    const y1 = by - dy * overshoot
    const x2 = bx + dx * overshoot
    const y2 = by + dy * overshoot
    const d =
      `M${round(x1 + hx)} ${round(y1 + hy)}` +
      `L${round(x2 + hx)} ${round(y2 + hy)}` +
      `L${round(x2 - hx)} ${round(y2 - hy)}` +
      `L${round(x1 - hx)} ${round(y1 - hy)}Z`
    spikes.push(`<path d="${d}" fill="${fill}" opacity="${opacity}"/>`)
  }

  return maskedField(spikes, {
    seed,
    size,
    cx: fadeCx,
    cy: fadeCy,
    fadeInner,
    fadeOuter,
    fadeR,
  })
}

/** Wrap one or more spike fields in an SVG document, painted in order. */
function composeSvg(size, fields) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
<defs>
  ${fields.map((f) => f.defs).filter(Boolean).join('\n  ')}
</defs>
${fields.map((f) => f.group).join('\n')}
</svg>
`
}

const SIZE = 1000

// Red field: constant-width lines, not tapering spikes, with their vanishing
// point pushed outside the viewBox — past the bottom-left corner, at
// (-520, 1520) for a 1000 box. Only the far end of the cone is on screen, so
// the lines read as near-parallel bands converging somewhere off-frame rather
// than fanning out from a visible point.
//
// Every line must span the *whole* visible depth or its blunt end shows up mid
// screen as a hard cut. From this origin the visible box spans 735..2150 units,
// so starts are held under 735 and ends pushed past 2150 — the lines only ever
// enter and leave through the edges. Their apparent length comes from the fade,
// not from geometry.
//
// The angular range is narrow for the same reason it's off-canvas: from that
// far out, the entire visible box only subtends about 52deg.
const red = spikeField({
  seed: 761104,
  size: SIZE,
  cx: -520,
  cy: 1520,
  fadeR: 2600,
  lines: true,
  fromDeg: 286,
  toDeg: 344,
  count: 55,
  innerR: 470,
  innerRMax: 700,
  lenMin: 1720,
  lenMax: 2600,
  baseMin: 3,
  baseMax: 13,
  // A narrow band around coral-red — enough to keep a hint of the pink and
  // orange without the lines reading as separate colours.
  colors: ['#ef6a50', '#e75440', '#e04a33', '#d93f2a'],
  // Kept low and nearly flat: at the old 0.45–0.95 spread the bright lines
  // fought the paper UI boxes for attention and the field read as noise. This
  // keeps the lines clearly present but as a background texture, not a layer
  // competing with the UI.
  opacityMin: 0.18,
  opacityMax: 0.3,
  // Because the origin sits past the bottom-left, distance from it runs up and
  // to the right — so this radial fade is what makes the lines dissolve in that
  // direction.
  //
  // The range is set against what's actually on screen, not the viewBox. At
  // background-size: 165vmax only a corner of the SVG is ever visible: the
  // viewport spans roughly 0.28..0.55 of the fade radius at both mobile and
  // desktop shapes. Running the fade out to 0.95 (the viewBox edge) spent it
  // almost entirely off-screen and left the top of the page still at ~68%.
  fadeInner: 0.28,
  fadeOuter: 0.56,
})

// The strictly-parallel comparison variant (?rays=parallel swaps it in).
// Angle, density, widths, palette, and fade all match the converging field —
// -45° is the average on-screen direction of its lines (from the off-canvas
// origin toward the box centre), so only the convergence differs.
const redParallel = parallelField({
  seed: 761104,
  size: SIZE,
  angleDeg: -45,
  count: 55,
  widthMin: 3,
  widthMax: 13,
  colors: ['#ef6a50', '#e75440', '#e04a33', '#d93f2a'],
  opacityMin: 0.18,
  opacityMax: 0.3,
  // Same fade geometry as the converging field, so brightness falls off
  // toward the top-right identically in both versions.
  fadeCx: -520,
  fadeCy: 1520,
  fadeR: 2600,
  fadeInner: 0.28,
  fadeOuter: 0.56,
})

mkdirSync(OUT_DIR, { recursive: true })
for (const [name, svg] of [
  ['burst-red.svg', composeSvg(SIZE, [red])],
  ['burst-red-parallel.svg', composeSvg(SIZE, [redParallel])],
]) {
  const path = join(OUT_DIR, name)
  writeFileSync(path, svg)
  console.log(`${name}: ${(svg.length / 1024).toFixed(1)} KB`)
}
