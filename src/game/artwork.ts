// Auto-discovers the downloaded reveal images in src/resources/images/artwork,
// the same way polygons.ts discovers the puzzles. The filename (minus .png) is
// the pokemon slug, so `charizard.png` is the reveal for `charizard`.
//
// These are fetched by scripts/fetch-artwork.mjs so the game serves its own
// assets rather than hotlinking GitHub on every reveal. Anything not present
// here still falls back to the CDN — see officialArtUrl in pokemon.ts.

const slugFromPath = (path: string) => path.split('/').pop()!.replace(/\.png$/, '')

const modules = import.meta.glob('../resources/images/artwork/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
})

/** slug -> bundled, content-hashed image URL */
export const ARTWORK: Record<string, string> = {}
for (const [path, url] of Object.entries(modules)) {
  ARTWORK[slugFromPath(path)] = url as string
}
