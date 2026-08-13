import { useLayoutEffect, useRef } from 'react'

/**
 * Renders a Figma-exported SVG with its viewBox tightened to the actual
 * vector content. Figma bakes inconsistent viewBoxes and internal whitespace
 * into exports, which CSS can't correct (object-fit only sees the viewBox,
 * not where the drawing sits inside it). We inline the source, measure the
 * real content box with getBBox(), and reframe it — so every puzzle ends up
 * centered and uniformly scaled inside a square.
 */
export function NormalizedPolygon({ source }: { source: string }) {
  const ref = useRef<SVGSVGElement>(null)

  useLayoutEffect(() => {
    const svg = ref.current
    if (!svg) return

    const parsed = new DOMParser().parseFromString(source, 'image/svg+xml')
    const srcSvg = parsed.querySelector('svg')
    if (!srcSvg) return

    // Copy the drawing into our own <svg> (drop the source's width/height/viewBox).
    svg.innerHTML = srcSvg.innerHTML

    try {
      const box = svg.getBBox() // union of children, honoring their transforms
      if (box.width > 0 && box.height > 0) {
        // Pad a little so strokes (excluded from getBBox) aren't clipped.
        const pad = Math.max(box.width, box.height) * 0.05
        svg.setAttribute(
          'viewBox',
          `${box.x - pad} ${box.y - pad} ${box.width + pad * 2} ${box.height + pad * 2}`,
        )
        return
      }
    } catch {
      // getBBox can throw if nothing is rendered yet; fall through to source viewBox.
    }
    const fallback = srcSvg.getAttribute('viewBox')
    if (fallback) svg.setAttribute('viewBox', fallback)
  }, [source])

  return (
    <svg
      ref={ref}
      preserveAspectRatio="xMidYMid meet"
      className="h-full w-full"
      aria-hidden
    />
  )
}
