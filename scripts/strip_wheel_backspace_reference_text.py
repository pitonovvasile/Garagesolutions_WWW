#!/usr/bin/env python3
"""Remove baked-in labels from wheel-backspace-reference.png (keep diagram art)."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

TEXT_ZONES = [
    (300, 8, 720, 62),
    (100, 68, 960, 128),
    (108, 518, 348, 548),
    (712, 518, 952, 548),
]


def strip_text(src: Path) -> None:
    im = Image.open(src).convert("RGBA")
    px = im.load()
    w, h = im.size
    for x1, y1, x2, y2 in TEXT_ZONES:
        for y in range(max(0, y1), min(h, y2)):
            for x in range(max(0, x1), min(w, x2)):
                if px[x, y][3] == 0:
                    continue
                px[x, y] = (0, 0, 0, 0)
    im.save(src, optimize=True)


if __name__ == "__main__":
    strip_text(
        Path(__file__).resolve().parents[1] / "assets/reference/wheel-backspace-reference.png"
    )
