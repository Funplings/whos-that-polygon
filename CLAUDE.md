# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Vite dev server on :5173
npm run build    # tsc -b && vite build
npm run lint     # oxlint
npm run preview  # serve the production build
```

There is no test framework in this project.

Three generator scripts produce committed assets. They are run by hand, never
as part of the build:

```bash
node scripts/build-pokemon-list.mjs   # regenerates src/data/pokemon.json from PokeAPI
node scripts/fetch-artwork.mjs        # downloads missing reveal images
node scripts/build-eyecatch.mjs       # regenerates the two backdrop SVGs
```

## Generated files — do not hand-edit

`src/data/pokemon.json` and `src/resources/images/misc/burst-{cyan,red}.svg` are
script output. A re-run overwrites them wholesale, so edits made directly to
them disappear silently. Change the generator instead:

| Want to change | Edit in `build-pokemon-list.mjs` |
| --- | --- |
| Drop a form from the guess list | `BLOCKLIST` |
| Rename an entry's slug | `RENAMES` |
| Show a default variety under its plain name | `DEFAULT_SUFFIXES` |
| Fix display text | `FORM_LABELS` / `SPECIAL_NAMES` |
| Change a reveal image | `ART_IDS` / `ART_URLS` / `HOME_FALLBACK` |

Both generators are seeded/deterministic — re-running reproduces byte-identical
output. After changing a generator, re-run it and diff.

## The slug contract

One string ties four things together, and nothing enforces it:

```
src/resources/images/polygons/<slug>.png   the puzzle art
src/resources/images/artwork/<slug>.png    the reveal image
pokemon.json  → { name: "<slug>" }         what the search bar can produce
puzzles.json  → order: ["<slug>"]          the schedule
```

`polygons.ts` globs the directory, so the filename minus `.png` *becomes* the
answer. Consequences worth knowing:

- **Art with no `pokemon.json` entry is an unwinnable puzzle.** The scheduler
  picks answers from the art on disk; guesses can only produce slugs from the
  list. Nothing errors — the day just can't be won.
- **A scheduled slug with no art is silently dropped**, shifting every
  subsequent day in `puzzles.json`.

Check both before committing schedule or asset changes — the README has
copy-paste one-liners under "Adding a puzzle" and "Checking the reveal images".

## Architecture

`src/game/` holds all logic and is React-free except `useGame`:

- **`polygons.ts` / `artwork.ts`** — `import.meta.glob` over the two image
  directories. Dropping a file in is the whole registration step.
- **`puzzle.ts`** — date → puzzle. Hand-picked `order` for the first N days,
  then a seeded PRNG over the full art pool. Also owns the URL overrides.
- **`useGame.ts`** — guess state, clue stage, persistence.
- **`pokemon.ts`** — search, name normalisation, guess matching, reveal URLs.

**Rollover is Eastern time, not local** (`RESET_ZONE` in `puzzle.ts`), so
everyone is on the same puzzle simultaneously. The DST-safe part is
`nextResetAt`, which resolves the UTC offset twice — once at "now", once at the
candidate instant — because the offset differs either side of a boundary. Any
date shown in the UI should come from the puzzle's own ET date, not
`new Date()`, or it will disagree with the rollover for most of the world.

**`id` vs `artId` in `pokemon.json`.** `id` is the National Dex number, shared
by every form of a species. `artId` is the variety id and is what reveal images
are named after. Keying a reveal off `id` shows base-species art for every Mega,
regional, and Gigantamax form — about a third of the list.

### URL overrides

`/<slug>` or `?pokemon=` plays a specific Pokémon; `/MM-DD-YYYY` or `?date=`
plays a specific day's scheduled puzzle. Both read the same path segment — a
date-shaped path wins, anything else is a slug. Neither touches `localStorage`.

### The eyecatch backdrop

A recreation of the "Who's That Pokémon?" eyecatch, in two layers:

- **Red lines** — page background on `.eyecatch`. Their vanishing point is
  *outside* the SVG, so only near-parallel lines are on screen. Every line spans
  the full visible depth; one ending mid-screen shows as a hard cut.
- **Cyan burst** — lives in `PuzzleImage`, anchored to the artwork so it tracks
  scrolling and zoom.

Two traps here, both of which have bitten before:

- **Do not add `isolate` to the puzzle wrapper.** It traps the burst's negative
  z-index locally, so the burst renders *over* everything earlier in the page
  (banners, counter) while staying under everything later. It must resolve
  against `.eyecatch`, which owns the stacking context.
- **The root needs `overflow-clip`.** The burst is far larger than the viewport;
  overflow right or bottom extends the document's scrollable area. `clip` rather
  than `hidden` — `hidden` creates a scroll container and forces the other axis
  to `auto`.

Clue-stage filters go on the `<img>`, never a wrapper, or `brightness(0)` blacks
out the backdrop too. Polygon PNGs **must** have transparent backgrounds for
that silhouette stage to work.

## Deployment

Vercel, configured in `vercel.json`. The SPA rewrite there is load-bearing —
`/gengar` and `/08-17-2026` are read from the path but don't exist on disk, so
without it every such URL 404s in production while working fine in dev (Vite
falls back to index.html on its own). Test path routes against `npm run preview`
rather than `npm run dev` when touching anything routing-related.

## Fonts

Pokemon Solid (the title) is bundled at `src/resources/fonts/` and declared with
`@font-face` — it must not rely on a system install, or it renders correctly
only on machines that happen to have it. Jost (body) currently loads from Google
Fonts, which is the one remaining third-party runtime request.

Pokemon Solid ships a single 400 weight; anything using `--font-display` must
stay at `font-normal` or the browser fakes bold and smears it.

## Assets are vendored deliberately

Reveal images (~28 MB) were downloaded rather than hotlinked from
`raw.githubusercontent.com`. Only slugs with a polygon need one, which is why
`fetch-artwork.mjs` iterates the polygons directory rather than `pokemon.json`.
The images are Nintendo/Game Freak assets mirrored by the community PokeAPI
sprite repo — fine for something personal, worth a thought before anything
public.
