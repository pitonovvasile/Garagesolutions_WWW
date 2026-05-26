#!/usr/bin/env python3
"""
Illustration → layered transparent asset with per-vehicle segmentation.

Each detected car is filled with a distinct non-white flat color internally so
vehicle bodies decouple cleanly from the wire background (asphalt, crowd, etc.).
"""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter, ImageOps

SEG_PRIMARY = (0, 210, 255)
SEG_SECONDARY = (255, 72, 168)
SEG_TERTIARY = (120, 255, 140)
WIRE_BG = (188, 198, 212)
WIRE_SECONDARY = (210, 195, 165)


def luminance(r: int, g: int, b: int) -> float:
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def saturation(r: int, g: int, b: int) -> float:
    mx = max(r, g, b)
    if mx <= 0:
        return 0.0
    return (mx - min(r, g, b)) / mx


def is_ink_pixel(r: int, g: int, b: int, *, bg_cutoff: int) -> bool:
    L = luminance(r, g, b)
    if L >= bg_cutoff:
        return False
    sat = saturation(r, g, b)
    return L < 205 or sat > 0.05 or L < 238


def find_seed(
    px_rgb,
    w: int,
    h: int,
    *,
    x_min: float,
    x_max: float,
    y_min: float,
    y_max: float,
    score_fn,
) -> tuple[int, int] | None:
    best: tuple[int, int] | None = None
    best_score = -1.0
    for y in range(int(h * y_min), int(h * y_max)):
        for x in range(int(w * x_min), int(w * x_max)):
            r, g, b = px_rgb[x, y]
            if luminance(r, g, b) >= 248:
                continue
            s = score_fn(r, g, b)
            if s > best_score:
                best_score = s
                best = (x, y)
    return best


def flood_vehicle(
    vehicle: list[list[int]],
    px_rgb,
    w: int,
    h: int,
    seed: tuple[int, int],
    role: int,
    *,
    max_radius: float,
    can_enter,
    overwrite: bool,
) -> None:
    sx, sy = seed
    q: deque[tuple[int, int, float]] = deque([(sx, sy, 0.0)])
    vehicle[sy][sx] = role
    while q:
        x, y, d = q.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if not (0 <= nx < w and 0 <= ny < h):
                continue
            nd = d + 1.0
            if nd > max_radius:
                continue
            cur = vehicle[ny][nx]
            if cur == role:
                continue
            if cur and not overwrite:
                continue
            r, g, b = px_rgb[nx, ny]
            if not can_enter(r, g, b, nx, ny):
                continue
            vehicle[ny][nx] = role
            q.append((nx, ny, nd))


def scanline_fill_vehicle(vehicle: list[list[int]], role: int) -> list[list[int]]:
    """Fill horizontal gaps inside the vehicle silhouette (e.g. white hood)."""
    h = len(vehicle)
    w = len(vehicle[0])
    ys = [y for y in range(h) if any(vehicle[y][x] == role for x in range(w))]
    if not ys:
        return vehicle
    y0, y1 = min(ys), max(ys)
    for y in range(y0, y1 + 1):
        xs = [x for x in range(w) if vehicle[y][x] == role]
        if len(xs) < 2:
            continue
        lx, rx = min(xs), max(xs)
        for x in range(lx, rx + 1):
            if vehicle[y][x] == 0:
                vehicle[y][x] = role
    return vehicle


def dilate_vehicle_role(
    vehicle: list[list[int]],
    role: int,
    *,
    steps: int = 10,
) -> list[list[int]]:
    for _ in range(steps):
        next_v = [row[:] for row in vehicle]
        changed = False
        h = len(vehicle)
        w = len(vehicle[0])
        for y in range(h):
            for x in range(w):
                if vehicle[y][x] != role:
                    continue
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if not (0 <= nx < w and 0 <= ny < h):
                        continue
                    if vehicle[ny][nx] == 0:
                        next_v[ny][nx] = role
                        changed = True
        vehicle = next_v
        if not changed:
            break
    return vehicle


def fill_vehicle_holes(
    vehicle: list[list[int]],
    px_rgb,
    w: int,
    h: int,
    *,
    bg_cutoff: int,
    passes: int = 6,
) -> list[list[int]]:
    """Expand vehicle labels into bright interior gaps (windshield, white body)."""
    for _ in range(passes):
        changed = False
        next_v = [row[:] for row in vehicle]
        for y in range(1, h - 1):
            for x in range(1, w - 1):
                if vehicle[y][x]:
                    continue
                neighbors = [vehicle[y + dy][x + dx] for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx]
                car_ids = [n for n in neighbors if n > 0]
                if len(car_ids) < 5:
                    continue
                role = max(set(car_ids), key=car_ids.count)
                if car_ids.count(role) < 5:
                    continue
                next_v[y][x] = role
                changed = True
        vehicle = next_v
        if not changed:
            break
    return vehicle


def build_vehicle_grid(
    px_rgb,
    w: int,
    h: int,
    *,
    bg_cutoff: int,
) -> list[list[int]]:
    vehicle = [[0] * w for _ in range(h)]

    def primary_enter(r: int, g: int, b: int, x: int, y: int) -> bool:
        if luminance(r, g, b) >= bg_cutoff:
            return False
        sat = saturation(r, g, b)
        if x < w * 0.28:
            return False
        return sat > 0.055 or luminance(r, g, b) < 198

    def secondary_enter(r: int, g: int, b: int, x: int, y: int) -> bool:
        if luminance(r, g, b) >= bg_cutoff:
            return False
        if x > w * 0.5:
            return False
        sat = saturation(r, g, b)
        L = luminance(r, g, b)
        return 0.02 < sat < 0.2 and 85 < L < 228

    primary_seed = find_seed(
        px_rgb,
        w,
        h,
        x_min=0.42,
        x_max=0.98,
        y_min=0.12,
        y_max=0.88,
        score_fn=lambda r, g, b: saturation(r, g, b) * (255 - luminance(r, g, b)),
    )
    secondary_seed = find_seed(
        px_rgb,
        w,
        h,
        x_min=0.02,
        x_max=0.46,
        y_min=0.18,
        y_max=0.72,
        score_fn=lambda r, g, b: (200 - abs(luminance(r, g, b) - 145))
        * (0.22 - abs(saturation(r, g, b) - 0.08)),
    )

    if primary_seed:
        flood_vehicle(
            vehicle,
            px_rgb,
            w,
            h,
            primary_seed,
            1,
            max_radius=max(w, h) * 0.42,
            can_enter=primary_enter,
            overwrite=True,
        )
        vehicle = dilate_vehicle_role(vehicle, 1, steps=14)
        vehicle = scanline_fill_vehicle(vehicle, 1)
    if secondary_seed:
        flood_vehicle(
            vehicle,
            px_rgb,
            w,
            h,
            secondary_seed,
            2,
            max_radius=max(w, h) * 0.22,
            can_enter=secondary_enter,
            overwrite=False,
        )

    vehicle = fill_vehicle_holes(vehicle, px_rgb, w, h, bg_cutoff=bg_cutoff)
    return vehicle


def save_segmentation_debug(
    vehicle: list[list[int]],
    w: int,
    h: int,
    path: Path,
) -> None:
    fills = {0: (0, 0, 0, 0), 1: (*SEG_PRIMARY, 255), 2: (*SEG_SECONDARY, 255), 3: (*SEG_TERTIARY, 255)}
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    px = im.load()
    for y in range(h):
        for x in range(w):
            px[x, y] = fills.get(vehicle[y][x], (0, 0, 0, 0))
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, format="PNG", optimize=True)


def wire_strength(
    L_gray: int,
    L_edge: int,
    *,
    line_threshold: int,
    edge_boost: float = 1.15,
    L_orig: int | None = None,
    sat: float = 0.0,
) -> tuple[float, int]:
    th = max(1, min(255, line_threshold))
    L_ink = L_gray
    if L_orig is not None:
        L_ink = min(L_gray, int(L_orig))
    t_gray = 0.0 if L_ink >= th else (th - L_ink) / th
    t_edge = min(1.0, L_edge / 255.0 * edge_boost)
    t = min(1.0, t_gray * 0.5 + t_edge * 0.7)
    if sat > 0.12 and L_orig is not None and L_orig < 252:
        t = min(1.0, max(t, sat * 0.75 * (252 - L_orig) / 252))
    wire_lum = min(255, int(150 + 105 * t))
    return t, wire_lum


def clean_rgba(
    im: Image.Image,
    *,
    min_alpha: int = 30,
    drop_black_lum: int = 42,
    weak_black_max_alpha: int = 130,
    min_neighbors: int = 3,
) -> Image.Image:
    out = im.copy()
    w, h = out.size
    px = out.load()

    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < min_alpha:
                px[x, y] = (0, 0, 0, 0)
                continue
            if luminance(r, g, b) < drop_black_lum and a < weak_black_max_alpha:
                px[x, y] = (0, 0, 0, 0)

    for y in range(1, h - 1):
        for x in range(1, w - 1):
            if px[x, y][3] < 22:
                continue
            strong = sum(
                1
                for dy in (-1, 0, 1)
                for dx in (-1, 0, 1)
                if (dx or dy) and px[x + dx, y + dy][3] > 68
            )
            if strong < min_neighbors:
                px[x, y] = (0, 0, 0, 0)

    alpha = out.split()[3]
    alpha = alpha.filter(ImageFilter.MinFilter(3))
    alpha = alpha.filter(ImageFilter.MaxFilter(3))
    out.putalpha(alpha)
    return out


def render_car_pixel(
    r0: int,
    g0: int,
    b0: int,
    Lg: int,
    *,
    car_line_threshold: int,
    car_alpha_gain: float,
    color_mix: float,
) -> tuple[int, int, int, int] | None:
    if Lg >= car_line_threshold:
        return None
    mix = color_mix
    sketch_w = 1.0 - mix
    t = (car_line_threshold - Lg) / car_line_threshold
    alpha = min(255, int(255 * min(1.0, t * car_alpha_gain)))
    if alpha < 22:
        return None
    sketch_lum = min(255, 168 + int(72 * t))
    r = int(round(r0 * mix + sketch_lum * sketch_w))
    g = int(round(g0 * mix + sketch_lum * sketch_w))
    b = int(round(b0 * mix + sketch_lum * sketch_w))
    if luminance(r, g, b) < 20 and alpha < 95:
        return None
    return r, g, b, alpha


def convert(
    src: Path,
    dst: Path,
    *,
    bg_line_threshold: int = 242,
    car_line_threshold: int = 218,
    bg_cutoff: int = 248,
    median_radius: int = 3,
    autocontrast_cutoff: int = 2,
    car_alpha_gain: float = 1.85,
    bg_alpha_gain: float = 2.35,
    color_mix: float = 0.8,
    secondary_color_mix: float = 0.55,
    seg_debug: Path | None = None,
) -> None:
    mix_primary = max(0.0, min(1.0, color_mix))
    mix_secondary = max(0.0, min(1.0, secondary_color_mix))

    im = Image.open(src).convert("RGB")
    gray = ImageOps.grayscale(im)
    if median_radius > 0:
        gray = gray.filter(ImageFilter.MedianFilter(median_radius))
    gray = ImageOps.autocontrast(gray, cutoff=autocontrast_cutoff)
    edges = gray.filter(ImageFilter.FIND_EDGES)
    edges = ImageOps.autocontrast(edges, cutoff=1)

    w, h = im.size
    px_rgb = im.load()
    px_g = gray.load()
    px_e = edges.load()

    vehicle = build_vehicle_grid(px_rgb, w, h, bg_cutoff=bg_cutoff)
    if seg_debug:
        save_segmentation_debug(vehicle, w, h, seg_debug)

    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    px_o = out.load()

    for y in range(h):
        for x in range(w):
            r0, g0, b0 = px_rgb[x, y]
            L_orig = luminance(r0, g0, b0)
            role = vehicle[y][x]
            if role == 0 and L_orig >= bg_cutoff:
                continue

            Lg = px_g[x, y]
            Le = px_e[x, y]

            if role == 1:
                px = render_car_pixel(
                    r0, g0, b0, Lg,
                    car_line_threshold=car_line_threshold,
                    car_alpha_gain=car_alpha_gain,
                    color_mix=mix_primary,
                )
                if not px and L_orig < 252:
                    # Interior highlights (white hood, glass) — keep body fill
                    px = (
                        int(round(r0 * mix_primary + 220 * (1 - mix_primary))),
                        int(round(g0 * mix_primary + 220 * (1 - mix_primary))),
                        int(round(b0 * mix_primary + 220 * (1 - mix_primary))),
                        200,
                    )
                if px:
                    px_o[x, y] = px
            elif role in (2, 3):
                px = render_car_pixel(
                    r0, g0, b0, Lg,
                    car_line_threshold=car_line_threshold + 6,
                    car_alpha_gain=car_alpha_gain * 0.95,
                    color_mix=mix_secondary,
                )
                if px:
                    r, g, b, a = px
                    wt = WIRE_SECONDARY
                    # Warm wire tint so secondary reads distinct from primary
                    r = int(round(r * 0.72 + wt[0] * 0.28))
                    g = int(round(g * 0.72 + wt[1] * 0.28))
                    b = int(round(b * 0.72 + wt[2] * 0.28))
                    px_o[x, y] = (r, g, b, a)
            else:
                sat_px = saturation(r0, g0, b0)
                t, wire_lum = wire_strength(
                    Lg,
                    Le,
                    line_threshold=bg_line_threshold,
                    edge_boost=1.35,
                    L_orig=int(L_orig),
                    sat=sat_px,
                )
                if t < 0.06:
                    continue
                alpha = min(255, int(255 * min(1.0, t * bg_alpha_gain)))
                if alpha < 18:
                    continue
                wt = WIRE_BG
                r = int(round(wt[0] * 0.35 + wire_lum * 0.65))
                g = int(round(wt[1] * 0.35 + wire_lum * 0.65))
                b = int(round(wt[2] * 0.35 + wire_lum * 0.65))
                px_o[x, y] = (r, g, b, alpha)

    out = clean_rgba(out, min_alpha=28, min_neighbors=3)
    rgb = out.convert("RGB")
    rgb = rgb.filter(ImageFilter.UnsharpMask(radius=1.0, percent=70, threshold=5))
    out = Image.merge("RGBA", (*rgb.split(), out.split()[3]))

    dst.parent.mkdir(parents=True, exist_ok=True)
    out.save(dst, format="PNG", optimize=True)


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("src", type=Path)
    p.add_argument("dst", type=Path)
    p.add_argument("--bg-line-threshold", type=int, default=242)
    p.add_argument("--car-line-threshold", type=int, default=218)
    p.add_argument("--bg-cutoff", type=int, default=248)
    p.add_argument("--median", type=int, default=3)
    p.add_argument("--car-alpha-gain", type=float, default=1.85)
    p.add_argument("--bg-alpha-gain", type=float, default=2.55)
    p.add_argument("--color-mix", type=float, default=0.8)
    p.add_argument("--secondary-color-mix", type=float, default=0.55)
    p.add_argument(
        "--seg-debug",
        type=Path,
        default=None,
        help="Save flat cyan/magenta vehicle mask PNG for inspection.",
    )
    args = p.parse_args()
    convert(
        args.src,
        args.dst,
        bg_line_threshold=args.bg_line_threshold,
        car_line_threshold=args.car_line_threshold,
        bg_cutoff=args.bg_cutoff,
        median_radius=args.median,
        car_alpha_gain=args.car_alpha_gain,
        bg_alpha_gain=args.bg_alpha_gain,
        color_mix=args.color_mix,
        secondary_color_mix=args.secondary_color_mix,
        seg_debug=args.seg_debug,
    )


if __name__ == "__main__":
    main()
