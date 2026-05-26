#!/usr/bin/env python3
"""Color white-on-black coilover wireframe by vertical/horizontal regions (E46-style)."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def luminance(r: int, g: int, b: int) -> float:
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def region_color(x: int, y: int, w: int, h: int, x0: int, y0: int, x1: int, y1: int) -> tuple[int, int, int, int]:
    """Map pixel to RGBA fill by normalized position inside line-art bbox."""
    bw = max(x1 - x0, 1)
    bh = max(y1 - y0, 1)
    xr = (x - x0) / bw
    yr = (y - y0) / bh

    # Piggyback reservoir (right side, mid-lower)
    if xr > 0.52 and 0.48 < yr < 0.78:
        return (45, 52, 64, 255)

    if yr < 0.14:
        return (192, 198, 208, 255)  # top mount
    if yr < 0.52:
        return (220, 38, 38, 255)  # spring
    if yr < 0.58:
        return (148, 163, 184, 255)  # spring perches / collars
    if yr < 0.86:
        return (26, 32, 42, 255)  # damper body
    return (156, 163, 175, 255)  # lower clevis


# E46 coilover accent red (tailwind red-600 family)
COILOVER_SOLID_RED = (220, 38, 38, 255)


def convert(
    src: Path,
    dst: Path,
    line_threshold: float = 32.0,
    *,
    solid_red: bool = False,
) -> None:
    im = Image.open(src).convert("RGBA")
    w, h = im.size
    px = im.load()

    x0, y0, x1, y1 = w, h, 0, 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 12 or luminance(r, g, b) > line_threshold:
                x0 = min(x0, x)
                y0 = min(y0, y)
                x1 = max(x1, x)
                y1 = max(y1, y)

    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    op = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a <= 12 and luminance(r, g, b) <= line_threshold:
                continue
            if solid_red:
                op[x, y] = COILOVER_SOLID_RED
            else:
                op[x, y] = region_color(x, y, w, h, x0, y0, x1, y1)

    dst.parent.mkdir(parents=True, exist_ok=True)
    out.save(dst, format="PNG", optimize=True)


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("src", type=Path)
    p.add_argument("dst", type=Path)
    p.add_argument(
        "--solid-red",
        action="store_true",
        help="Color entire coilover silhouette solid red (no per-part tones).",
    )
    args = p.parse_args()
    convert(args.src, args.dst, solid_red=args.solid_red)


if __name__ == "__main__":
    main()
