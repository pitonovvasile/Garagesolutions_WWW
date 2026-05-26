#!/usr/bin/env python3
"""
Convert white-on-black line art to RGBA suitable for CSS mask-image + mask-mode: luminance.

- Background (near-black) → transparent (alpha 0).
- Foreground keeps luminance L in RGB (L,L,L) with alpha 255 so antialiased edges
  still modulate the luminance mask correctly.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def luminance(r: int, g: int, b: int) -> float:
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def convert(src: Path, dst: Path, threshold: float = 8.0) -> None:
    im = Image.open(src).convert("RGB")
    w, h = im.size
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    px = im.load()
    op = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            L = luminance(r, g, b)
            if L <= threshold:
                op[x, y] = (0, 0, 0, 0)
            else:
                v = int(round(L))
                v = max(0, min(255, v))
                op[x, y] = (v, v, v, 255)
    dst.parent.mkdir(parents=True, exist_ok=True)
    out.save(dst, format="PNG", optimize=True)


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("src", type=Path)
    p.add_argument("dst", type=Path)
    p.add_argument("--threshold", type=float, default=8.0, help="Pixels darker than this (0–255 luminance) become fully transparent.")
    args = p.parse_args()
    convert(args.src, args.dst, threshold=args.threshold)


if __name__ == "__main__":
    main()
