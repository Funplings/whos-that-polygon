// Vercel Routing Middleware: gives the homepage per-puzzle link previews.
//
// Link previewers (iMessage, Discord, X, Slack…) read the raw HTML and never
// run the app, so the static index.html can only ever name one image. This
// serves the same page with its og: tags pointed at one day's puzzle:
//
//   /?n=93   → puzzle #93's silhouette (the share text links here)
//   /        → today's puzzle
//
// The number goes in the URL, not just the image, because previewers cache
// by page URL: one bare link shared every day would keep its first preview.
// Numbers that aren't out yet fall back to today's, and the app itself
// ignores `n` — it always plays today's puzzle.
//
// Anything going wrong falls through to the untouched static page, so this
// can only ever cost the preview, never the homepage.

import schedule from './src/data/puzzles.json'
import { puzzleNumberOn, releasedNumber, todayISO } from './api/_og/day.js'

export const config = { matcher: '/', runtime: 'nodejs' }

export default async function middleware(
  request: Request,
): Promise<Response | undefined> {
  try {
    const url = new URL(request.url)
    const n =
      releasedNumber(url.searchParams.get('n'), schedule.startDate) ??
      puzzleNumberOn(schedule.startDate, todayISO())

    const page = await fetch(new URL('/index.html', url.origin))
    if (!page.ok) return undefined

    const pageUrl = `${url.origin}/?n=${n}`
    const title = `Who's That Polygon? #${n}`
    const set = (html: string, property: string, value: string) =>
      html.replace(
        new RegExp(`(<meta\\s+property="${property}"\\s+content=")[^"]*"`),
        `$1${value}"`,
      )

    let html = await page.text()
    html = set(html, 'og:url', pageUrl)
    html = set(html, 'og:title', title)
    html = set(html, 'og:image', `${url.origin}/api/og?n=${n}`)
    html = set(
      html,
      'og:image:alt',
      `Puzzle #${n}: a mystery Pokémon silhouette in a starburst`,
    )

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    })
  } catch {
    return undefined
  }
}
