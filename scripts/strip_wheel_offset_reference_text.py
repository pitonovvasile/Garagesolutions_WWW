#!/usr/bin/env python3
"""Remove baked-in labels from wheel-offset-reference.png (keep diagram lines)."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

TEXT_ZONES = [
    (220, 40, 804, 108),
    (260, 98, 764, 138),
    (30, 150, 270, 194),
    (350, 150, 600, 194),
    (680, 150, 930, 194),
    (40, 610, 320, 678),
    (370, 610, 650, 678),
    (700, 610, 984, 678),
    (880, 160, 1024, 560),
]


def keep_pixel(r: int, g: int, b: int) -> bool:
    if r > 170 and g < 100 and b < 100:
        return True
    if b > 140 and r < 130 and g < 180:
        return True
    if r > 240 and g > 240 and b > 240:
        return True
    return False


def strip_text(src: Path) -> None:
    im = Image.open(src).convert("RGBA")
    px = im.load()
    w, h = im.size
    for x1, y1, x2, y2 in TEXT_ZONES:
        for y in range(max(0, y1), min(h, y2)):
            for x in range(max(0, x1), min(w, x2)):
                r, g, b, a = px[x, y]
                if a == 0 or keep_pixel(r, g, b):
                    continue
                px[x, y] = (0, 0, 0, 0)
    im.save(src, optimize=True)


if __name__ == "__main__":
    strip_text(
        Path(__file__).resolve().parents[1] / "assets/reference/wheel-offset-reference.png"
    )
