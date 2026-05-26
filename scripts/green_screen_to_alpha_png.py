#!/usr/bin/env python3
"""Remove a uniform green-screen backdrop and write RGBA PNG with edge despill."""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image


def color_distance(r: int, g: int, b: int, ref: tuple[int, int, int]) -> float:
    dr = r - ref[0]
    dg = g - ref[1]
    db = b - ref[2]
    return (dr * dr + dg * dg + db * db) ** 0.5


def edge_green_ref(im: Image.Image) -> tuple[int, int, int]:
    w, h = im.size
    px = im.load()
    samples: list[tuple[int, int, int]] = []
    for x in range(w):
        samples.append(px[x, 0][:3])
        samples.append(px[x, h - 1][:3])
    for y in range(h):
        samples.append(px[0, y][:3])
        samples.append(px[w - 1, y][:3])
    return (
        round(sum(s[0] for s in samples) / len(samples)),
        round(sum(s[1] for s in samples) / len(samples)),
        round(sum(s[2] for s in samples) / len(samples)),
    )


def despill_pixel(r: int, g: int, b: int, ref: tuple[int, int, int]) -> tuple[int, int, int]:
    """Remove green-screen spill while preserving intentional bright-green artwork."""
    if g <= max(r, b) + 6:
        return r, g, b
    if g > 150 and r < 120 and b < 120 and g > r * 1.45 and g > b * 1.45:
        return r, g, b
    spill = g - max(r, b)
    g = max(0, g - int(round(spill * 0.92)))
    if color_distance(r, g, b, ref) < 36:
        blend = max(r, b)
        g = int(round(g * 0.35 + blend * 0.65))
    return r, g, b


def flood_green_background(
    im: Image.Image,
    ref: tuple[int, int, int],
    tolerance: float,
    soft: float,
) -> Image.Image:
    w, h = im.size
    src = im.convert("RGBA")
    px = src.load()
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    op = out.load()

    hard = tolerance
    soft_end = tolerance + soft
    bg = bytearray(w * h)

    stack: deque[tuple[int, int]] = deque()
    for x in range(w):
        stack.append((x, 0))
        stack.append((x, h - 1))
    for y in range(h):
        stack.append((0, y))
        stack.append((w - 1, y))

    while stack:
        x, y = stack.pop()
        idx = y * w + x
        if bg[idx]:
            continue
        r, g, b, _ = px[x, y]
        dist = color_distance(r, g, b, ref)
        if dist > soft_end:
            continue
        bg[idx] = 1
        if x > 0:
            stack.append((x - 1, y))
        if x + 1 < w:
            stack.append((x + 1, y))
        if y > 0:
            stack.append((x, y - 1))
        if y + 1 < h:
            stack.append((x, y + 1))

    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            if bg[y * w + x]:
                op[x, y] = (0, 0, 0, 0)
                continue

            dist = color_distance(r, g, b, ref)
            if dist <= hard:
                op[x, y] = (0, 0, 0, 0)
                continue

            alpha = 255
            if dist < soft_end:
                alpha = int(round(255 * (dist - hard) / max(soft, 1e-6)))
                alpha = max(0, min(255, alpha))

            r, g, b = despill_pixel(r, g, b, ref)
            op[x, y] = (r, g, b, alpha)

    return out


def convert(src: Path, dst: Path, tolerance: float, soft: float) -> None:
    im = Image.open(src).convert("RGBA")
    ref = edge_green_ref(im)
    out = flood_green_background(im, ref, tolerance=tolerance, soft=soft)
    dst.parent.mkdir(parents=True, exist_ok=True)
    out.save(dst, format="PNG", optimize=True)


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "input",
        nargs="?",
        type=Path,
        default=Path.home()
        / ".cursor/projects/Users-vasilepitonov-Desktop-Garagesolutions-WWW/assets/image-6d4d99ee-7e4f-4802-a2dd-03636841a486.png",
    )
    parser.add_argument("output", nargs="?", type=Path, default=root / "assets/reference/wheel-backspace-reference.png")
    parser.add_argument("--tolerance", type=float, default=58.0)
    parser.add_argument("--soft", type=float, default=22.0)
    args = parser.parse_args()
    convert(args.input, args.output, args.tolerance, args.soft)
    print(f"Wrote {args.output}")


if __name__ == "__main__":
    main()
