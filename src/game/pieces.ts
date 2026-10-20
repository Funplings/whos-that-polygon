// Optional breakdowns of a puzzle's art into the separate shapes it's made
// of, in src/resources/images/pieces/<slug>/. Every piece is cropped to the
// SAME frame as polygons/<slug>.png, so stacked they rebuild it exactly; the
// filename's number prefix is the stacking order, bottom first
// (1-body.png, 2-crest.png, …). Don't run trim-polygons.py on them — cropping
// each piece to its own bounds would break the shared frame.

const urlModules = import.meta.glob('../resources/images/pieces/*/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
})

/** slug -> piece image URLs, bottom layer first */
export const PIECES: Record<string, string[]> = {}
for (const path of Object.keys(urlModules).sort()) {
  const slug = path.split('/').at(-2)!
  ;(PIECES[slug] ??= []).push(urlModules[path] as string)
}
