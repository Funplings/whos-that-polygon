import data from '../data/pokemon.json'
import type { Pokemon } from './types'

export const POKEMON: Pokemon[] = data as Pokemon[]

const bySlug = new Map(POKEMON.map((p) => [p.name, p]))

export function pokemonBySlug(slug: string): Pokemon | undefined {
  return bySlug.get(slug)
}

/** Official artwork for the end-of-game reveal, keyed by pokemon slug. */
export function officialArtUrl(slug: string): string {
  // PokeAPI's pokemon endpoint id == position in the pokemon list; we only
  // stored species ids, so resolve art via the sprites CDN by slug lookup.
  const p = bySlug.get(slug)
  const id = p?.id ?? 0
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`
}

/** Lowercase, strip accents/punctuation, collapse separators. */
export function normalizeName(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents (Flabébé)
    .replace(/♀/g, 'f')
    .replace(/♂/g, 'm')
    .replace(/[.':]/g, '') // Mr. Mime, Farfetch'd, Type: Null
    .replace(/[\s_-]+/g, ' ')
    .trim()
}

/** Search-bar filter: prefix matches first, then substring matches. */
export function searchPokemon(query: string, limit = 8): Pokemon[] {
  const q = normalizeName(query)
  if (!q) return []
  const prefix: Pokemon[] = []
  const substr: Pokemon[] = []
  for (const p of POKEMON) {
    const norm = normalizeName(p.displayName)
    if (norm.startsWith(q)) prefix.push(p)
    else if (norm.includes(q)) substr.push(p)
    if (prefix.length >= limit) break
  }
  return [...prefix, ...substr].slice(0, limit)
}

/** Does the guess (slug) match the answer (slug)? */
export function isCorrectGuess(guessSlug: string, answerSlug: string): boolean {
  return guessSlug === answerSlug
}
