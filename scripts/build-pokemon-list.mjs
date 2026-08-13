// One-time data pipeline: fetches the full Pokémon list from PokeAPI,
// curates out forms that don't make sense for the game (per design doc),
// and writes src/data/pokemon.json as [{ id, name, displayName }].
//
// Run with: node scripts/build-pokemon-list.mjs
//
// Only two HTTP requests are made (species list + pokemon list); the
// result is committed as static data so the app has no runtime API dependency.

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../src/data/pokemon.json')

// --- Curation blocklist (design doc: "include all alternate forms but remove
// some, like the pumpkaboo sizes, furfrous, tatsugiris, etc.") -------------
const BLOCKLIST = [
  /-totem/, // totem sizes
  /pikachu-.*(cap|cosplay|belle|libre|phd|pop-star|rock-star|starter)/, // cosmetic pikachus
  /eevee-starter/,
  /pumpkaboo-(small|large|super)/, // sizes (average stays, displayed as base)
  /gourgeist-(small|large|super)/,
  /furfrou-(?!natural)/, // haircut trims
  /tatsugiri-(droopy|stretchy)/, // curly stays, displayed as base
  /squawkabilly-(?!green)/, // plumage colors
  /minior-(orange|yellow|green|blue|indigo|violet)/, // core colors (red stays)
  /maushold-family-of-three/, // family-of-four stays, displayed as base
  /dudunsparce-three-segment/,
  /koraidon-.*-mode|koraidon-.*-build/,
  /miraidon-.*-mode|miraidon-.*-drive/,
  /-tera$/, // ogerpon/terapagos tera duplicates
  /zygarde-(10-power-construct|50-power-construct)/, // dupes of 10/50
  /greninja-battle-bond/, // dupe of ash-greninja
  /rockruff-own-tempo/,
  /darmanitan-(standard|galar)-standard/, // handled by default-suffix map below
  /basculin-red-striped-starter/,
  /miraidon-glide-mode/,
  // Alt forms whose default counterpart already claims the base name via
  // DEFAULT_SUFFIXES, so the pair would render as the same polygon.
  /^toxtricity-low-key-gmax$/,
  /^morpeko-hangry$/,
  /^basculegion-female$/,
  /^indeedee-female$/,
  /^palafin-hero$/,
]

// --- Slugs renamed to match the filename their art is filed under ----------
// Applied before the species/form split, so both the emitted `name` and the
// display label follow the new slug.
const RENAMES = {
  'jellicent-male': 'jellicent', // art is the female design, listed as plain Jellicent
  'tatsugiri-curly-mega': 'tatsugiri-mega',
}

// --- Reveal-image overrides -----------------------------------------------
const SPRITES = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon'

// Entries that should reveal a different variety's artwork than their own.
const ART_IDS = {
  palafin: 10256, // Hero form — the recognizable one; palafin-hero isn't listed
}

// Forms with no official artwork at all (they aren't API varieties, only
// pokemon-forms or gender sprites), so the reveal falls back to a sprite.
const ART_URLS = {
  cherrim: `${SPRITES}/421-sunshine.png`, // Sunshine form; 96px, no artwork exists
  jellicent: `${SPRITES}/other/home/female/593.png`, // female design, 512px HOME render
}

// Varieties that exist but have no official-artwork file. Their 512px HOME
// render is the closest match in quality. Verify with the sweep in the README
// after regenerating — PokeAPI adds forms before it adds their artwork.
const HOME_FALLBACK = new Set(['mimikyu-busted', 'tatsugiri-mega'])

// --- Default varieties whose API name carries a suffix but which should be
// displayed as just the species name --------------------------------------
const DEFAULT_SUFFIXES = {
  'deoxys-normal': 'deoxys',
  'wormadam-plant': 'wormadam',
  'giratina-altered': 'giratina',
  'shaymin-land': 'shaymin',
  'basculin-red-striped': 'basculin',
  'darmanitan-standard': 'darmanitan',
  'tornadus-incarnate': 'tornadus',
  'thundurus-incarnate': 'thundurus',
  'landorus-incarnate': 'landorus',
  'enamorus-incarnate': 'enamorus',
  'keldeo-ordinary': 'keldeo',
  'meloetta-aria': 'meloetta',
  'meowstic-male': 'meowstic',
  'aegislash-shield': 'aegislash',
  'zygarde-50': 'zygarde',
  'oricorio-baile': 'oricorio',
  'lycanroc-midday': 'lycanroc',
  'wishiwashi-solo': 'wishiwashi',
  'minior-red-meteor': 'minior',
  'mimikyu-disguised': 'mimikyu',
  'toxtricity-amped': 'toxtricity',
  'eiscue-ice': 'eiscue',
  'indeedee-male': 'indeedee',
  'morpeko-full-belly': 'morpeko',
  'urshifu-single-strike': 'urshifu',
  'basculegion-male': 'basculegion',
  'maushold-family-of-four': 'maushold',
  'squawkabilly-green-plumage': 'squawkabilly',
  'palafin-zero': 'palafin',
  'tatsugiri-curly': 'tatsugiri',
  'dudunsparce-two-segment': 'dudunsparce',
  'oinkologne-male': 'oinkologne',
  'pumpkaboo-average': 'pumpkaboo',
  'gourgeist-average': 'gourgeist',
  'furfrou-natural': 'furfrou',
}

// --- Species whose display name isn't a simple title-case of the slug ------
const SPECIAL_NAMES = {
  'mr-mime': 'Mr. Mime',
  'mr-rime': 'Mr. Rime',
  'mime-jr': 'Mime Jr.',
  farfetchd: "Farfetch'd",
  sirfetchd: "Sirfetch'd",
  'ho-oh': 'Ho-Oh',
  'porygon-z': 'Porygon-Z',
  'nidoran-f': 'Nidoran♀',
  'nidoran-m': 'Nidoran♂',
  'type-null': 'Type: Null',
  'jangmo-o': 'Jangmo-o',
  'hakamo-o': 'Hakamo-o',
  'kommo-o': 'Kommo-o',
  'wo-chien': 'Wo-Chien',
  'chien-pao': 'Chien-Pao',
  'ting-lu': 'Ting-Lu',
  'chi-yu': 'Chi-Yu',
  flabebe: 'Flabébé',
  'roaring-moon': 'Roaring Moon',
  'brute-bonnet': 'Brute Bonnet',
  'walking-wake': 'Walking Wake',
  'gouging-fire': 'Gouging Fire',
  'raging-bolt': 'Raging Bolt',
  'flutter-mane': 'Flutter Mane',
  'slither-wing': 'Slither Wing',
  'sandy-shocks': 'Sandy Shocks',
  'scream-tail': 'Scream Tail',
  'great-tusk': 'Great Tusk',
  'iron-treads': 'Iron Treads',
  'iron-bundle': 'Iron Bundle',
  'iron-hands': 'Iron Hands',
  'iron-jugulis': 'Iron Jugulis',
  'iron-moth': 'Iron Moth',
  'iron-thorns': 'Iron Thorns',
  'iron-valiant': 'Iron Valiant',
  'iron-leaves': 'Iron Leaves',
  'iron-boulder': 'Iron Boulder',
  'iron-crown': 'Iron Crown',
  'tapu-koko': 'Tapu Koko',
  'tapu-lele': 'Tapu Lele',
  'tapu-bulu': 'Tapu Bulu',
  'tapu-fini': 'Tapu Fini',
}

// --- Form suffix labels ----------------------------------------------------
const FORM_LABELS = {
  mega: 'Mega',
  'mega-x': 'Mega X',
  'mega-y': 'Mega Y',
  gmax: 'Gigantamax',
  alola: 'Alolan',
  galar: 'Galarian',
  hisui: 'Hisuian',
  paldea: 'Paldean',
  origin: 'Origin',
  therian: 'Therian',
  primal: 'Primal',
  eternal: 'Eternal Flower', // Floette's only -eternal form
}

const titleCase = (s) =>
  s
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

const speciesDisplay = (slug) => SPECIAL_NAMES[slug] ?? titleCase(slug)

async function fetchList(endpoint) {
  const res = await fetch(`https://pokeapi.co/api/v2/${endpoint}?limit=100000`)
  if (!res.ok) throw new Error(`${endpoint} fetch failed: ${res.status}`)
  const json = await res.json()
  return json.results
}

const species = await fetchList('pokemon-species')
const pokemon = await fetchList('pokemon')

// Species slugs sorted longest-first so prefix matching picks e.g.
// "porygon-z" over "porygon" for "porygon-z".
const speciesSlugs = species.map((s) => s.name).sort((a, b) => b.length - a.length)
const speciesIds = new Map(
  species.map((s) => [s.name, Number(s.url.match(/\/(\d+)\/?$/)[1])]),
)

const entries = []
for (const p of pokemon) {
  let slug = p.name
  if (BLOCKLIST.some((re) => re.test(slug))) continue
  if (RENAMES[slug]) slug = RENAMES[slug]
  if (DEFAULT_SUFFIXES[slug]) slug = DEFAULT_SUFFIXES[slug] // display as base species

  // The *variety* id, distinct from the species id: forms each get their own
  // (Mega Charizard X is 10034), and it's what the official-artwork files are
  // named after. Using the species id here would reveal the base species art
  // for every form in the list.
  const artId = Number(p.url.match(/\/(\d+)\/?$/)[1])

  if (speciesIds.has(slug)) {
    // Base species (or default variety mapped to it)
    entries.push({
      id: speciesIds.get(slug),
      name: slug,
      displayName: speciesDisplay(slug),
      artId,
    })
    continue
  }

  // Alternate form: split into species prefix + form suffix
  const base = speciesSlugs.find((s) => slug === s || slug.startsWith(s + '-'))
  if (!base) {
    console.warn(`skipping unmatched: ${slug}`)
    continue
  }
  const suffix = slug.slice(base.length + 1)
  const label = FORM_LABELS[suffix] ?? titleCase(suffix)
  const display =
    suffix in FORM_LABELS && ['alola', 'galar', 'hisui', 'paldea', 'mega', 'primal'].includes(suffix)
      ? `${label} ${speciesDisplay(base)}` // "Alolan Vulpix", "Mega Charizard"
      : `${speciesDisplay(base)} (${label})` // "Charizard (Mega X)", "Giratina (Origin)"
  entries.push({
    id: speciesIds.get(base),
    // `slug`, not `p.name` — otherwise a RENAMES entry would change the label
    // but keep emitting the original API slug as the answer key.
    name: slug,
    displayName: display,
    artId,
  })
}

// De-dupe (default-suffix mapping can collide with a bare species entry)
const seen = new Set()
const deduped = entries.filter((e) => {
  if (seen.has(e.displayName)) return false
  seen.add(e.displayName)
  return true
})

deduped.sort((a, b) => a.id - b.id || a.name.localeCompare(b.name))

for (const e of deduped) {
  if (ART_IDS[e.name]) e.artId = ART_IDS[e.name]
  if (HOME_FALLBACK.has(e.name)) e.art = `${SPRITES}/other/home/${e.artId}.png`
  if (ART_URLS[e.name]) e.art = ART_URLS[e.name]
}

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify(deduped, null, 1))
console.log(`Wrote ${deduped.length} entries to ${OUT}`)
