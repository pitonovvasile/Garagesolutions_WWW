#!/usr/bin/env python3
"""Redraw backspace reference guides and recolor suspension coil springs."""

from __future__ import annotations

import argparse
import math
from collections import defaultdict
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SRC = ROOT / "assets/reference/wheel-backspace-reference.png"
DEFAULT_ORIG = (
    Path.home()
    / ".cursor/projects/Users-vasilepitonov-Desktop-Garagesolutions-WWW/assets/image-6d4d99ee-7e4f-4802-a2dd-03636841a486.png"
)

SPRING_BOXES = (
    (58, 118, 182, 292),
    (388, 445, 182, 292),
    (715, 775, 182, 292),
)

PANEL_COLORS = (
    (80, 170, 255, 255),
    (255, 150, 58, 255),
    (62, 220, 118, 255),
)


def is_guide_pixel(r: int, g: int, b: int, a: int) -> bool:
    if a == 0:
        return False
    if abs(r - g) < 28 and abs(g - b) < 28 and 40 < min(r, g, b) < 220:
        return False
    if b > 110 and b > r + 12:
        return True
    if r > 150 and 65 < g < 205 and b < 115:
        return True
    if g > 95 and r < 115 and b < 115:
        return True
    return False


def is_yellow_damper(r: int, g: int, b: int) -> bool:
    return r > 145 and g > 125 and b < 115 and g >= r - 20


def luminance(r: int, g: int, b: int) -> float:
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def red_from_luma(r: int, g: int, b: int) -> tuple[int, int, int, int]:
    l = luminance(r, g, b)
    tone = max(0.0, min(1.0, l / 220.0))
    nr = int(115 + tone * 125)
    ng = int(18 + tone * 38)
    nb = int(20 + tone * 32)
    return nr, ng, nb, 255


def recolor_suspension_springs(im: Image.Image) -> None:
    px = im.load()
    w, h = im.size
    for x1, x2, y1, y2 in SPRING_BOXES:
        for y in range(max(0, y1), min(h, y2)):
            for x in range(max(0, x1), min(w, x2)):
                r, g, b, a = px[x, y]
                if a == 0 or is_yellow_damper(r, g, b):
                    continue
                px[x, y] = red_from_luma(r, g, b)


def detect_panel_geometry(
    orig: Image.Image,
    x0: int,
    x1: int,
    guide_pred,
) -> dict[str, float | tuple[float, float] | None]:
    px = orig.load()
    cols: dict[int, list[int]] = defaultdict(list)
    for y in range(130, 480):
        for x in range(x0, x1):
            r, g, b, a = px[x, y]
            if a == 0 or not guide_pred(r, g, b):
                continue
            cols[x].append(y)

    columns = sorted(
        ((x, ys) for x, ys in cols.items() if len(ys) >= 35 and x >= x0 + 50),
        key=lambda item: item[0],
    )
    if not columns:
        raise ValueError(f"Could not detect guide columns for panel {x0}-{x1}")

    strong = [(x, ys) for x, ys in columns if len(ys) >= 80]
    if not strong:
        strong = sorted(columns, key=lambda item: (-len(item[1]), item[0]))[:2]
        strong.sort(key=lambda item: item[0])

    mount_x, mount_span = max(strong, key=lambda item: (len(item[1]), item[0]))
    back_candidates = [(x, ys) for x, ys in columns if x <= mount_x - 15]
    if not back_candidates:
        raise ValueError(f"Could not detect back guide for panel {x0}-{x1}")

    strong_back = [(x, ys) for x, ys in back_candidates if len(ys) >= 80]
    if strong_back:
        back_x, back_span = min(strong_back, key=lambda item: item[0])
    else:
        back_x, back_span = min(back_candidates, key=lambda item: item[0])

    top_candidates = sorted(set(back_span[:8] + mount_span[:8]))
    top_y = float(min(y for y in top_candidates if y <= 170))

    bottom_y = float(
        max(
            max(back_span or [top_y]),
            max(mount_span or [top_y]),
            top_y + 120,
        )
    )
    return {
        "back_x": float(back_x),
        "mount_x": float(mount_x),
        "top_y": top_y,
        "bottom_y": bottom_y,
    }


def detect_bottom_arrow(
    orig: Image.Image,
    x0: int,
    x1: int,
    guide_pred,
) -> tuple[float, float, float] | None:
    px = orig.load()
    rows: dict[int, list[int]] = defaultdict(list)
    for y in range(518, 548):
        for x in range(x0, x1):
            r, g, b, a = px[x, y]
            if a == 0 or not guide_pred(r, g, b):
                continue
            rows[y].append(x)

    best = None
    for y, xs in rows.items():
        span = max(xs) - min(xs)
        if span < 120 or len(xs) < 20:
            continue
        score = span + len(xs) * 0.35
        if best is None or score > best[0]:
            best = (score, y, min(xs), max(xs))
    if best is None:
        return None
    _, y, x_left, x_right = best
    return float(x_left), float(y), float(x_right)


def build_panels(orig: Image.Image) -> tuple[dict, ...]:
    specs = (
        (0, 341, lambda r, g, b: b > 140 and b > r + 30, True),
        (341, 683, lambda r, g, b: r > 180 and 80 < g < 200 and b < 100, False),
        (683, orig.width, lambda r, g, b: g > 120 and r < 100 and b < 100, True),
    )
    panels = []
    for idx, (x0, x1, pred, with_arrow) in enumerate(specs):
        geom = detect_panel_geometry(orig, x0, x1, pred)
        arrow = None
        if with_arrow:
            detected = detect_bottom_arrow(orig, x0, x1, pred)
            if detected:
                x_left, y, x_right = detected
                if idx == 0:
                    arrow = {"y": y, "x1": x_left, "x2": x_right}
                else:
                    arrow = {"y": y, "x1": x_right, "x2": x_left}
        panels.append(
            {
                "name": ("less", "mid", "more")[idx],
                "color": PANEL_COLORS[idx],
                "arrow": arrow,
                **geom,
            }
        )
    return tuple(panels)


def erase_guides(im: Image.Image) -> None:
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if is_guide_pixel(r, g, b, a):
                px[x, y] = (0, 0, 0, 0)


def draw_dashed(
    draw: ImageDraw.ImageDraw,
    x1: float,
    y1: float,
    x2: float,
    y2: float,
    color: tuple[int, int, int, int],
    width: int = 2,
    dash: float = 9,
    gap: float = 6,
) -> None:
    dx = x2 - x1
    dy = y2 - y1
    length = math.hypot(dx, dy)
    if length < 1:
        return
    ux, uy = dx / length, dy / length
    pos = 0.0
    while pos < length:
        start = pos
        end = min(pos + dash, length)
        sx = x1 + ux * start
        sy = y1 + uy * start
        ex = x1 + ux * end
        ey = y1 + uy * end
        draw.line((sx, sy, ex, ey), fill=color, width=width, joint="curve")
        pos += dash + gap


def draw_tick(
    draw: ImageDraw.ImageDraw,
    x: float,
    y: float,
    color: tuple[int, int, int, int],
    width: int = 2,
    height: float = 9,
) -> None:
    draw.line((x, y - height, x, y + height), fill=color, width=width, joint="curve")


def draw_dimension_bar(
    draw: ImageDraw.ImageDraw,
    x1: float,
    x2: float,
    y: float,
    color: tuple[int, int, int, int],
    width: int = 2,
    tick: float = 9,
    head: float = 8,
) -> None:
    left = min(x1, x2)
    right = max(x1, x2)
    draw.line((left, y, right, y), fill=color, width=width, joint="curve")
    draw_tick(draw, left, y, color, width=width, height=tick)
    draw_tick(draw, right, y, color, width=width, height=tick)
    draw.polygon(
        [(left, y), (left + head, y - head * 0.38), (left + head, y + head * 0.38)],
        fill=color,
    )
    draw.polygon(
        [(right, y), (right - head, y - head * 0.38), (right - head, y + head * 0.38)],
        fill=color,
    )


def draw_arrow(
    draw: ImageDraw.ImageDraw,
    x1: float,
    y: float,
    x2: float,
    color: tuple[int, int, int, int],
    width: int = 2,
    head: float = 13,
) -> None:
    draw.line((x1, y, x2, y), fill=color, width=width, joint="curve")
    direction = 1 if x2 >= x1 else -1
    tip_x = x2
    draw.polygon(
        [
            (tip_x, y),
            (tip_x - direction * head, y - head * 0.42),
            (tip_x - direction * head, y + head * 0.42),
        ],
        fill=color,
    )


def draw_panel_guides(draw: ImageDraw.ImageDraw, panel: dict) -> None:
    color = panel["color"]
    back_x = panel["back_x"]
    mount_x = panel["mount_x"]
    top_y = panel["top_y"]
    bottom_y = panel["bottom_y"]
    width = 2

    draw_dashed(draw, back_x, top_y, back_x, bottom_y, color, width=width)
    draw_dashed(draw, mount_x, top_y, mount_x, bottom_y, color, width=width)
    draw_dimension_bar(draw, back_x, mount_x, top_y, color, width=width)

    arrow = panel.get("arrow")
    if arrow:
        draw_arrow(draw, arrow["x1"], arrow["y"], arrow["x2"], color, width=width)


def redraw_guides(
    src: Path,
    dst: Path | None = None,
    orig_path: Path = DEFAULT_ORIG,
) -> tuple[dict, ...]:
    orig = Image.open(orig_path).convert("RGBA")
    panels = build_panels(orig)

    im = Image.open(src).convert("RGBA")
    recolor_suspension_springs(im)
    erase_guides(im)
    draw = ImageDraw.Draw(im)
    for panel in panels:
        draw_panel_guides(draw, panel)

    out = dst or src
    out.parent.mkdir(parents=True, exist_ok=True)
    im.save(out, format="PNG", optimize=True)
    return panels


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", nargs="?", type=Path, default=DEFAULT_SRC)
    parser.add_argument("output", nargs="?", type=Path, default=None)
    parser.add_argument("--orig", type=Path, default=DEFAULT_ORIG)
    args = parser.parse_args()
    panels = redraw_guides(args.input, args.output, args.orig)
    for panel in panels:
        gap = panel["mount_x"] - panel["back_x"]
        print(
            f"{panel['name']}: back={panel['back_x']:.0f} mount={panel['mount_x']:.0f} "
            f"gap={gap:.0f}px top={panel['top_y']:.0f} bottom={panel['bottom_y']:.0f}"
        )
    print(f"Wrote {args.output or args.input}")


if __name__ == "__main__":
    main()
