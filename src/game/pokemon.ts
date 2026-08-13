import data from '../data/pokemon.json'
import { ARTWORK } from './artwork'
import type { Pokemon } from './types'

export const POKEMON: Pokemon[] = data as Pokemon[]

const bySlug = new Map(POKEMON.map((p) => [p.name, p]))

export function pokemonBySlug(slug: string): Pokemon | undefined {
  return bySlug.get(slug)
}

const ARTWORK_BASE =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork'

/**
 * Reveal image for a pokemon slug, or '' if the slug isn't in the list.
 *
 * Prefers the downloaded copy in src/resources/images/artwork; a slug with no
 * local file (a polygon added before running scripts/fetch-artwork.mjs) falls
 * back to the CDN rather than rendering broken.
 *
 * The remote URL is keyed by `artId` (the variety id), not `id` (the species
 * id) — forms share a species id, so `id` would show base-species art for
 * every Mega, regional, and Gigantamax form in the list.
 */
export function officialArtUrl(slug: string): string {
  const p = bySlug.get(slug)
  if (!p) return ''
  return ARTWORK[slug] ?? p.art ?? `${ARTWORK_BASE}/${p.artId}.png`
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
