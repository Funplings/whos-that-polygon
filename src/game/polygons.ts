// Auto-discovers every polygon puzzle in src/resources/images/polygons.
// The filename (minus .svg) is the answer slug, matching a `name` in
// pokemon.json — design doc: "labeled with the answer (in the filename)".
//
// Vite bundles + hashes each SVG at build time and hands us its URL, so
// there's nothing to copy into public/ and no manual manifest to maintain:
// drop in `charizard.svg` and it becomes a playable puzzle.

const slugFromPath = (path: string) => path.split('/').pop()!.replace(/\.svg$/, '')

const urlModules = import.meta.glob('../resources/images/polygons/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
})

// Raw source is used to inline + normalize each SVG at render time (Figma
// exports carry inconsistent viewBoxes / internal whitespace).
const rawModules = import.meta.glob('../resources/images/polygons/*.svg', {
  eager: true,
  query: '?raw',
  import: 'default',
})

/** slug -> bundled image URL */
export const POLYGONS: Record<string, string> = {}
for (const [path, url] of Object.entries(urlModules)) {
  POLYGONS[slugFromPath(path)] = url as string
}

/** slug -> raw SVG markup */
export const POLYGON_SOURCES: Record<string, string> = {}
for (const [path, src] of Object.entries(rawModules)) {
  POLYGON_SOURCES[slugFromPath(path)] = src as string
}

/** All available answer slugs, sorted for stable ordering. */
export const POLYGON_SLUGS: string[] = Object.keys(POLYGONS).sort()
