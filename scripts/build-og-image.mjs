// Renders public/og-image.png — the link-preview image (Open Graph /
// Twitter card) that X, iMessage, Discord, Slack etc. show when someone
// posts a link to the game. 1200×630 is the size every platform expects for
// a large preview.
//
// Run with: node scripts/build-og-image.mjs
//
// Composed in HTML from the game's own assets (backdrop, starburst, font) and screenshotted with headless Chrome, so it stays on-brand when the
// assets change. The puzzle shown is Togepi's silhouette — puzzle #1, already
// public in the help drawer — so the card never spoils a current answer.
//
// Needs Google Chrome installed (macOS path below, or set CHROME=/path/to/it).

import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public/og-image.png')
const CHROME =
  process.env.CHROME ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const asset = (path) => pathToFileURL(join(ROOT, 'src/resources', path)).href

const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  @font-face {
    font-family: 'Pokemon Classic';
    src: url('${asset('fonts/pokemon-classic.woff2')}') format('woff2');
  }
  * { margin: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; overflow: hidden; }
  body {
    font-family: 'Pokemon Classic', sans-serif;
    color: #202020;
    /* Same backdrop as the game's .eyecatch (165vmax of a 1200px width). */
    background: #d33b3b url('${asset('images/misc/burst-red.svg')}') left bottom / 1980px 1980px no-repeat;
    display: flex;
    align-items: center;
    gap: 40px;
    padding: 0 70px 0 50px;
  }
  .burst { position: relative; width: 560px; height: 560px; flex-shrink: 0; }
  .burst > img { width: 92%; height: 92%; margin: 4%; }
  /* Centred on the star's grey face, which sits up-left of the SVG centre
     because of the baked shadow — same compensation as PuzzleImage. */
  .art {
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    transform: translate(-1.64%, -1.64%);
  }
  .art img {
    width: 46%; height: 46%; object-fit: contain;
    filter: brightness(0) invert(0.125);
  }
  .copy { display: flex; flex-direction: column; gap: 40px; }
  .title {
    color: #fff;
    font-size: 46px;
    white-space: nowrap;
    line-height: 1.15;
    text-shadow: 5px 5px 0 #202020;
  }
  .tagline {
    background: #dddddd;
    border: 3px solid #202020;
    box-shadow: 6px 6px 0 0 #202020;
    padding: 22px 26px;
    font-size: 24px;
    line-height: 1.5;
  }
</style>
</head>
<body>
  <div class="burst">
    <img src="${asset('images/assets/Starburst.svg')}">
    <div class="art"><img src="${asset('images/polygons/togepi.png')}"></div>
  </div>
  <div class="copy">
    <h1 class="title">Who’s That<br>Polygon?</h1>
    <p class="tagline">Guess the Pokémon made of three shapes. New puzzle every day!</p>
  </div>
</body>
</html>`

const dir = mkdtempSync(join(tmpdir(), 'og-image-'))
const page = join(dir, 'og.html')
writeFileSync(page, html)
try {
  execFileSync(CHROME, [
    '--headless',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--allow-file-access-from-files',
    // Give the font and images time to load before the capture.
    '--virtual-time-budget=3000',
    '--window-size=1200,630',
    `--screenshot=${OUT}`,
    pathToFileURL(page).href,
  ], { stdio: 'pipe' })
} finally {
  rmSync(dir, { recursive: true, force: true })
}
console.log(`Wrote ${OUT}`)
