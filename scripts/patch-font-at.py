"""Draws a pixel "@" into the bundled Pokemon Classic font.

The font ships "@" as a plain placeholder box, so @WhosThatPolygon rendered
as "□WhosThatPolygon". This replaces that glyph with one drawn on the font's
own pixel grid (512 units per pixel, 7px cap height, same 7px body and 2px
spacing as "O").

Run with: python3 scripts/patch-font-at.py
Needs fontTools and brotli (pip install fonttools brotli). It rewrites the
woff2 in place and is idempotent: re-running redraws the same glyph.
"""

from pathlib import Path

from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

FONT = Path(__file__).resolve().parent.parent / 'src/resources/fonts/pokemon-classic.woff2'
PX = 512

# Top row is the cap height, bottom row sits on the baseline.
AT = [
    '..###..',
    '.#...#.',
    '#.###.#',
    '#.#.#.#',
    '#.####.',
    '.#.....',
    '..####.',
]
ADVANCE = 9  # 7px body + 2px spacing, like "O"


def outline(rows):
    """Traces the filled pixels into closed contours, clockwise (y up)."""
    height = len(rows)
    filled = {
        (x, height - 1 - r)
        for r, row in enumerate(rows)
        for x, c in enumerate(row)
        if c == '#'
    }
    # Each pixel's clockwise edges; an edge shared by two pixels appears once
    # each way and cancels, leaving only the shape's boundary.
    edges = set()
    for x, y in filled:
        for edge in (
            ((x, y), (x, y + 1)),
            ((x, y + 1), (x + 1, y + 1)),
            ((x + 1, y + 1), (x + 1, y)),
            ((x + 1, y), (x, y)),
        ):
            if (edge[1], edge[0]) in edges:
                edges.remove((edge[1], edge[0]))
            else:
                edges.add(edge)

    outgoing = {}
    for a, b in edges:
        outgoing.setdefault(a, []).append(b)

    def turn(prev, cur, nxt):
        """Cross product sign: negative is a right turn."""
        return (cur[0] - prev[0]) * (nxt[1] - cur[1]) - (cur[1] - prev[1]) * (nxt[0] - cur[0])

    contours = []
    while outgoing:
        start = next(iter(outgoing))
        path = [start]
        prev, cur = None, start
        while True:
            options = outgoing[cur]
            if len(options) > 1 and prev is not None:
                # Pixels touching only at a corner: take the right turn, which
                # keeps the two shapes as separate loops.
                options.sort(key=lambda n: turn(prev, cur, n))
            nxt = options.pop(0)
            if not options:
                del outgoing[cur]
            if nxt == start:
                break
            path.append(nxt)
            prev, cur = cur, nxt
        # Drop points that sit mid-way along a straight edge.
        simple = [
            p
            for i, p in enumerate(path)
            if turn(path[i - 1], p, path[(i + 1) % len(path)]) != 0
        ]
        contours.append(simple)
    return contours


def main():
    # Keeps head.modified as it was, so re-runs are byte-identical.
    font = TTFont(FONT, recalcTimestamp=False)
    name = font.getBestCmap()[ord('@')]

    pen = TTGlyphPen(font.getGlyphSet())
    for contour in outline(AT):
        pen.moveTo((contour[0][0] * PX, contour[0][1] * PX))
        for x, y in contour[1:]:
            pen.lineTo((x * PX, y * PX))
        pen.closePath()
    glyph = pen.glyph()
    glyph.recalcBounds(font['glyf'])

    font['glyf'][name] = glyph
    font['hmtx'][name] = (ADVANCE * PX, glyph.xMin)
    font.flavor = 'woff2'
    font.save(FONT)
    print(f'drew "{name}" into {FONT.name}')


if __name__ == '__main__':
    main()
