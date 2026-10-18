#!/usr/bin/env python3
"""Render the NutriScan icon set into public/.

Drawn with Pillow so the icons can be regenerated without a design tool:
    python3 scripts/make-icons.py

The mark is the app's scan glyph: four viewfinder brackets around a barcode
line, in ink on lime. "maskable" is full-bleed and keeps the glyph inside the
80% safe zone so Android can crop it to any shape.
"""

from pathlib import Path

from PIL import Image, ImageDraw

INK = (10, 11, 15, 255)
LIME = (211, 255, 79, 255)
LIME_DEEP = (176, 226, 47, 255)

OUT = Path(__file__).resolve().parent.parent / "public" / "icons"
SS = 4  # supersampling factor


def draw_mark(img: Image.Image, size: int, glyph: float) -> None:
    """Draw the scan glyph centred in a `size` square, spanning `glyph` of it."""
    d = ImageDraw.Draw(img)
    span = size * glyph
    x0 = (size - span) / 2
    y0 = (size - span) / 2
    x1 = x0 + span
    y1 = y0 + span

    arm = span * 0.30          # length of each bracket arm
    stroke = max(1, round(span * 0.085))
    r = stroke / 2

    def line(a, b):
        d.line([a, b], fill=INK, width=stroke)
        # round the caps so the brackets read as one weight at small sizes
        for p in (a, b):
            d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=INK)

    # viewfinder corners
    line((x0, y0 + arm), (x0, y0))
    line((x0, y0), (x0 + arm, y0))
    line((x1 - arm, y0), (x1, y0))
    line((x1, y0), (x1, y0 + arm))
    line((x0, y1 - arm), (x0, y1))
    line((x0, y1), (x0 + arm, y1))
    line((x1 - arm, y1), (x1, y1))
    line((x1, y1), (x1, y1 - arm))

    # barcode: bars of alternating width across the middle
    bar_h = span * 0.34
    by0 = (size - bar_h) / 2
    by1 = by0 + bar_h
    widths = [0.10, 0.055, 0.10, 0.055, 0.16]
    gap = span * 0.045
    total = span * sum(widths) + gap * (len(widths) - 1)
    x = (size - total) / 2
    for i, w in enumerate(widths):
        bw = span * w
        d.rounded_rectangle([x, by0, x + bw, by1], radius=bw * 0.45, fill=INK)
        x += bw + (gap if i < len(widths) - 1 else 0)


def vertical_gradient(size: int, top, bottom) -> Image.Image:
    grad = Image.new("RGBA", (1, size))
    for y in range(size):
        t = y / max(1, size - 1)
        grad.putpixel(
            (0, y),
            tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(4)),
        )
    return grad.resize((size, size))


def render(size: int, glyph: float, maskable: bool, bg=LIME, top=None) -> Image.Image:
    big = size * SS
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    fill = vertical_gradient(big, top, bg) if top else Image.new("RGBA", (big, big), bg)
    if maskable:
        img.paste(fill, (0, 0))
    else:
        mask = Image.new("L", (big, big), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, big - 1, big - 1], radius=big * 0.22, fill=255)
        img.paste(fill, (0, 0), mask)
    draw_mark(img, big, glyph)
    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    jobs = [
        ("icon-192.png", 192, 0.60, False, LIME, (233, 255, 160, 255)),
        ("icon-512.png", 512, 0.60, False, LIME, (233, 255, 160, 255)),
        ("maskable-192.png", 192, 0.46, True, LIME_DEEP, None),
        ("maskable-512.png", 512, 0.46, True, LIME_DEEP, None),
        ("apple-touch-icon.png", 180, 0.54, True, LIME_DEEP, None),
        ("favicon-64.png", 64, 0.68, False, LIME, None),
    ]
    for name, size, glyph, maskable, bg, top in jobs:
        render(size, glyph, maskable, bg, top).save(OUT / name, optimize=True)
        print(f"wrote public/icons/{name} ({size}x{size})")


if __name__ == "__main__":
    main()
