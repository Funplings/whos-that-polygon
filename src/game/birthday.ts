// A one-off birthday level at /alex-birthday: the answer is Luckstep, a
// made-up Pokémon that exists ONLY on that route. Everything about it lives
// here and in src/resources/images/birthday/, deliberately outside the
// polygons/, artwork/ and pieces/ globs and outside pokemon.json, so the
// regular game, the Dex and the /<slug> previews never see it.
//
// Unlike the /<slug> and /MM-DD-YYYY overrides this route works on the
// deployed site (it's a present, not a testing tool). Nothing on it is
// persisted or reported: no localStorage result, no hint flag, no global
// stats submission.
//
// The art came from the Figma file's "Luckstep" group (in "Gen 5 - 47"),
// kept as scripts/figma/birthday/luckstep.svg; the polygon and pieces were
// rendered from it with build-pieces.mjs's renderer.

import polygon from '../resources/images/birthday/luckstep-polygon.png'
import art from '../resources/images/birthday/luckstep-art.png'
import type { Pokemon, Puzzle } from './types'

const BIRTHDAY_PATH = 'alex-birthday'

export const IS_BIRTHDAY =
  typeof window !== 'undefined' &&
  window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase() ===
    BIRTHDAY_PATH

export const LUCKSTEP: Pokemon = {
  id: 0,
  name: 'luckstep',
  displayName: 'Luckstep',
  artId: 0,
  art,
  // Shown by the gen hint as-is: genNumeral only has Roman numerals to X, so
  // 26 falls through to "26" — Alex's age.
  gen: 26,
}

const pieceModules = import.meta.glob('../resources/images/birthday/pieces/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
})

/** Bottom layer first, same convention as game/pieces.ts. */
export const LUCKSTEP_PIECES: string[] = Object.keys(pieceModules)
  .sort()
  .map((path) => pieceModules[path] as string)

export function birthdayPuzzle(dateISO: string): Puzzle {
  return {
    number: 0,
    date: dateISO,
    image: polygon,
    answer: LUCKSTEP.name,
  }
}
