"""Trim transparent margins off the polygon puzzle PNGs, in place.

The exports arrive with uneven transparent padding around the drawing, and
PuzzleImage frames with object-contain — which centers the image *canvas*, so
lopsided padding shows up as the artwork sitting small and off-centre. Cropping
each file to its alpha bounding box makes the canvas equal the drawing, and
object-contain does the rest.

Run with: python3 scripts/trim-polygons.py

Idempotent: a trimmed file's bounding box is the whole canvas, so re-running
rewrites nothing. The alpha threshold ignores near-invisible stray pixels
(antialiasing spill) that would otherwise pin the bounding box open.
"""

from pathlib import Path

from PIL import Image

POLYGONS = Path(__file__).resolve().parent.parent / "src/resources/images/polygons"
ALPHA_THRESHOLD = 8  # out of 255; anything fainter is treated as empty

trimmed = 0
skipped = 0
for path in sorted(POLYGONS.glob("*.png")):
    im = Image.open(path).convert("RGBA")
    mask = im.getchannel("A").point(lambda a: 255 if a > ALPHA_THRESHOLD else 0)
    bbox = mask.getbbox()
    if bbox is None:
        print(f"!! {path.name}: fully transparent, left alone")
        skipped += 1
        continue
    if bbox == (0, 0, *im.size):
        skipped += 1
        continue
    im.crop(bbox).save(path)
    left, top, right, bottom = bbox
    print(
        f"{path.name}: {im.size[0]}x{im.size[1]} -> {right - left}x{bottom - top}"
    )
    trimmed += 1

print(f"\n{trimmed} trimmed, {skipped} already tight")
