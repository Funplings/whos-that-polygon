// Auto-discovers every polygon puzzle in src/resources/images/polygons.
// The filename (minus .png) is the answer slug, matching a `name` in
// pokemon.json — design doc: "labeled with the answer (in the filename)".
//
// Vite bundles + hashes each PNG at build time and hands us its URL, so
// there's nothing to copy into public/ and no manual manifest to maintain:
// drop in `charizard.png` and it becomes a playable puzzle.

const slugFromPath = (path: string) => path.split('/').pop()!.replace(/\.png$/, '')

const urlModules = import.meta.glob('../resources/images/polygons/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
})

/** slug -> bundled image URL */
export const POLYGONS: Record<string, string> = {}
for (const [path, url] of Object.entries(urlModules)) {
  POLYGONS[slugFromPath(path)] = url as string
}

/** All available answer slugs, sorted for stable ordering. */
export const POLYGON_SLUGS: string[] = Object.keys(POLYGONS).sort()
