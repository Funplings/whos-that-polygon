// Generates the two concentration-line bursts (集中線 / shūchūsen) that make up
// the eyecatch backdrop, as SVG files committed under src/resources/images/misc.
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
 * One burst of concentration lines.
 *
 * Each spike is a triangle: a short base at `innerR` widening from the focal
 * point, tapering to a single tip at a random outer radius. The tip angle is
 * jittered off the spike's own axis so edges aren't symmetrical — that slight
 * lean is what stops the field reading as a mechanical pinwheel.
 */
function burst({
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

  // Radial mask so the field dissolves outward instead of ending at a hard
  // edge. Baked in here rather than applied in CSS so the asset is complete.
  const maskId = `fade-${seed}`

  // A plain two-stop fade ramps linearly and leaves a faint arc where it hits
  // black — a Mach band the eye picks up as a hard edge. Stepping through a
  // smoothstep curve instead flattens the ends of the ramp so the field
  // dissolves without a visible terminus.
  const fadeStops = []
  const STEPS = 7
  for (let i = 0; i <= STEPS; i += 1) {
    const t = i / STEPS
    const offset = Number(lerpNum(fadeInner, fadeOuter, t).toFixed(4))
    const v = Math.round(255 * (1 - t * t * (3 - 2 * t)))
    const hex = v.toString(16).padStart(2, '0')
    fadeStops.push(`<stop offset="${offset}" stop-color="#${hex}${hex}${hex}"/>`)
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
<defs>
  <radialGradient id="${maskId}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${fadeR ?? size}">
    <stop offset="0" stop-color="#fff"/>
    ${fadeStops.join('\n    ')}
  </radialGradient>
  <mask id="m-${seed}"><rect width="${size}" height="${size}" fill="url(#${maskId})"/></mask>
</defs>
<g mask="url(#m-${seed})">
${spikes.join('\n')}
</g>
</svg>
`
}

const SIZE = 1000

// Cyan burst: converges on the puzzle, so it radiates through a full circle.
const cyan = burst({
  seed: 20260816,
  size: SIZE,
  cx: SIZE / 2,
  cy: SIZE / 2,
  fromDeg: 0,
  toDeg: 360,
  count: 520,
  // Bases sit right on the centre, so they overlap into a solid core and there
  // is no hole to fill.
  innerR: 0,
  // A high lenMin relative to lenMax is what gives the burst body. When the
  // range is wide most spikes stay near the minimum and a few shoot far past
  // it, which reads as a small core with thin needles off it. Keeping the
  // lengths bunched means the bulk of the 520 spikes all reach a similar
  // radius and overlap into one solid mass out to there.
  lenMin: 118,
  lenMax: 182,
  // Wider too — thin spikes at this count read as fuzz rather than volume.
  baseMin: 6,
  baseMax: 22,
  tipJitterDeg: 1.4,
  // One colour, one opacity — every spike identical. Depth still comes from
  // overlap: alpha compositing accumulates where spikes cross, so two at 0.38
  // read as 0.62 and a dozen read as solid. What's gone is per-spike variation,
  // not the density. It has to stay below 1 though — at full opacity the
  // crossings paint the same flat colour and the field becomes one silhouette.
  colors: ['#4fd0f8'],
  opacityMin: 0.38,
  opacityMax: 0.38,
  // fadeInner is the radius held at full opacity — raising it extends the solid
  // body outward before any falloff begins, which is the other half of making
  // the inner volume read bigger.
  //
  // No separate core gradient: the spikes converging at innerR already
  // over-subscribe that circumference many times over, so the centre reads
  // solid on its own. A core disc drawn over the top sat outside the mask and
  // showed up as a washed-out grey ring against the red.
  fadeInner: 0.14,
  fadeOuter: 0.23,
})

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
const red = burst({
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
  opacityMin: 0.45,
  opacityMax: 0.95,
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

mkdirSync(OUT_DIR, { recursive: true })
for (const [name, svg] of [
  ['burst-cyan.svg', cyan],
  ['burst-red.svg', red],
]) {
  const path = join(OUT_DIR, name)
  writeFileSync(path, svg)
  console.log(`${name}: ${(svg.length / 1024).toFixed(1)} KB`)
}
