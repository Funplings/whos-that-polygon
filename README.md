# Who's That Polygon?

A daily guessing game: a Pokémon rendered as a low-poly vector shape, three
guesses to name it. Everyone gets the same puzzle on the same day.

Each wrong guess reveals a little more of the artwork:

| Guess | Clue |
| ----- | ---- |
| 1 | Silhouette (pure black) |
| 2 | Grayscale |
| 3 | Full color |

The game is a static front-end — React + TypeScript + Vite, styled with
Tailwind v4. There is no backend and no runtime API dependency; the Pokémon
list is committed as static data and progress lives in `localStorage`.

## Getting started

```bash
npm install
```

```bash
npm run dev
```

Other scripts: `npm run build` (typecheck + production build), `npm run preview`
(serve the build), `npm run lint` (Oxlint).

## How it fits together

```
src/
  game/          Game logic, no React except useGame
    polygons.ts  Auto-discovers the puzzle art via import.meta.glob
    artwork.ts   Same, for the downloaded reveal images
    puzzle.ts    Date -> puzzle resolution, URL preview overrides
    pokemon.ts   Search, name normalization, guess matching
    useGame.ts   Guess state, clue stage, persistence
    types.ts     Shared types + MAX_GUESSES
  components/    Presentational; NormalizedPolygon does the SVG reframing
  data/
    pokemon.json The guessable list (generated, committed)
    puzzles.json Start date + hand-picked opening order
  resources/images/polygons/*.svg   One file per puzzle
  resources/images/artwork/*.png    Reveal image per puzzle (downloaded)
  lib/storage.ts localStorage wrapper (safe in private mode)
```

### Adding a puzzle

Drop `charizard.svg` into `src/resources/images/polygons/`. That's the whole
step. `polygons.ts` globs the directory at build time, so the filename minus
`.svg` becomes the answer slug. There's no manifest to update.

**The filename must exactly match a `name` in `pokemon.json`.** Nothing enforces
this, and a mismatch fails silently but badly: the scheduler picks answers from
the art on disk, while guesses can only ever produce slugs from the Pokémon
list. Art with no matching entry becomes an unwinnable puzzle on whatever day it
comes up. To check:

```bash
node -e "const n=new Set(require('./src/data/pokemon.json').map(p=>p.name));const f=require('fs').readdirSync('src/resources/images/polygons').filter(s=>s.endsWith('.svg')).map(s=>s.slice(0,-4));console.log(f.filter(s=>!n.has(s)).join('\n')||'no orphans')"
```

Exports don't need cleaning up first: `NormalizedPolygon` inlines each SVG,
measures the real drawing with `getBBox()`, and rewrites the viewBox, so Figma's
inconsistent viewBoxes and internal whitespace come out centered and uniformly
scaled.

Then fetch its reveal image (see below) — the new puzzle works without this, but
falls back to loading that one image from GitHub at runtime.

## Reveal images

When a game ends, `ResultReveal` shows the official artwork. Those images live
in `src/resources/images/artwork/` and are committed, so the game serves its own
assets instead of hotlinking `raw.githubusercontent.com` on every reveal:

```bash
node scripts/fetch-artwork.mjs
```

Only *answers* need artwork and an answer must have a polygon, so this fetches
one image per SVG (~376, 28 MB) rather than one per list entry (~1,278, 45 MB).
Existing files are skipped, so re-running after adding a puzzle downloads just
the new one. Downloads are resampled to 320px — 2× the 160px the reveal renders
at — using `sips`, which ships with macOS; elsewhere the full-size file is kept.

`officialArtUrl` prefers the local copy and falls back to the CDN, so a puzzle
added before running the script still works. The images are Nintendo / Game
Freak / The Pokémon Company assets mirrored by the community PokeAPI sprites
repo, which is worth knowing before publishing this anywhere public.

### Puzzle scheduling

`puzzles.json` holds a `startDate` and an `order` of hand-picked slugs. Day *n*
after the start date uses `order[n]`; once that list runs out, the day index
seeds a small PRNG that picks deterministically from every available polygon.
Same day, same puzzle, no server involved. Puzzles roll over at **local**
midnight.

### Previewing a specific Pokémon

Handy for checking new art without waiting for its day:

```
http://localhost:5173/?pokemon=mr-mime
http://localhost:5173/gengar
```

Preview games skip the rules modal and are never persisted, so every reload
starts fresh. A slug with no polygon falls back to today's puzzle with a hint.

## The Pokémon list

`src/data/pokemon.json` is ~1,280 entries:

| Field | Meaning |
| ----- | ------- |
| `name` | PokeAPI slug — the answer key, and the polygon's filename |
| `displayName` | What the search bar shows |
| `id` | National Dex number. **Forms share their species' id** |
| `artId` | Variety id — unique per form. Names the reveal image |
| `art` | Optional full URL, for forms with no official artwork |

The `id` / `artId` split matters. Mega Charizard X and Charizard are both id 6,
so keying the reveal image off `id` would show plain Charizard for every Mega,
regional, and Gigantamax form in the list — roughly a third of it. `artId` (6 vs
10034) is what the artwork files are actually named after.

It's generated by a one-time script that hits PokeAPI twice and curates the
result — dropping forms that make poor puzzles (Pumpkaboo sizes, Furfrou trims,
cosmetic Pikachus, Totem forms) and displaying default varieties under their
plain species name, so `deoxys-normal` shows up as just "Deoxys":

```bash
node scripts/build-pokemon-list.mjs
```

`pokemon.json` is generated, not hand-maintained — a re-run overwrites it
wholesale, so edits made directly to the JSON silently disappear. Curation
intent belongs in the script instead:

| Map | Effect |
| --- | ------ |
| `BLOCKLIST` | Drops a form entirely |
| `RENAMES` | Files an entry under a different slug (to match its art) |
| `DEFAULT_SUFFIXES` | Shows a default variety under its plain species name |
| `FORM_LABELS` / `SPECIAL_NAMES` | Fix up display text |
| `ART_IDS` / `ART_URLS` / `HOME_FALLBACK` | Override the reveal image |

Change the rule, re-run, and diff the result.

### Checking the reveal images

PokeAPI adds forms before it adds their artwork, so a newly generated entry can
point at a file that doesn't exist — the reveal then renders a broken image with
no error anywhere. After regenerating, sweep every URL:

```bash
node -e "const d=require('./src/data/pokemon.json'),B='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork';(async()=>{const bad=[];await Promise.all(d.map(async p=>{const u=p.art||\`\${B}/\${p.artId}.png\`;const r=await fetch(u,{method:'HEAD'});if(!r.ok)bad.push(\`\${p.name} -> \${r.status}\`)}));console.log(bad.join('\n')||'all '+d.length+' reveal images OK')})()"
```

Anything that 404s needs an entry in `HOME_FALLBACK` (its 512px HOME render) or
an explicit `ART_URLS` URL.
