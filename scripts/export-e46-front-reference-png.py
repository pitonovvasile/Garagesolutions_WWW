#!/usr/bin/env python3
"""
Export BMW E46 front reference PNGs:
  - bmw-e46-front.png — body + suspension (flat composite, UI reference)
  - bmw-e46-front-body.png — body strokes only (optional asset)

  python3 scripts/export-e46-front-reference-png.py
"""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SIL = ROOT / "garage-engineered-engine/src/assets/reference/e46-front-silhouette.png"
SUSP = ROOT / "garage-engineered-engine/src/assets/reference/e46-front-suspension.png"
OUT = ROOT / "garage-engineered-engine/src/assets/reference/bmw-e46-front.png"
OUT_BODY = ROOT / "garage-engineered-engine/src/assets/reference/bmw-e46-front-body.png"

EXPORT_MAX = 720
WORK_MAX = min(1600, EXPORT_MAX * 2)
STROKE = (238, 242, 248)
ZOOM_OUT_CANVAS = 1.20

SUSP_MAX_W_FRAC = 0.84
SUSP_MAX_H_FRAC = 0.64
SUSP_LAYER_ZOOM = 1.22
SUSP_BOTTOM_MARGIN_FRAC = 0.02
SUSP_MIN_TOP_FRAC = 0.26
SUSP_SHIFT_DOWN_PX = 40
# Horizontal margin so scaled suspension never exceeds body canvas (avoids PIL clip on paste).
SUSP_SIDE_PAD_PX = 4


def _tight_crop(gray: Image.Image, thresh: int = 18, pad: int = 4) -> Image.Image:
    m = gray.point(lambda p: 255 if p > thresh else 0)
    bb = m.getbbox()
    if not bb:
        return gray
    x0, y0, x1, y1 = bb
    w, h = gray.size
    return gray.crop(
        (
            max(0, x0 - pad),
            max(0, y0 - pad),
            min(w, x1 + pad),
            min(h, y1 + pad),
        )
    )


def _build_body_strokes() -> Image.Image:
    if not SIL.is_file():
        raise SystemExit(f"Missing body: {SIL}")

    g = Image.open(SIL).convert("L")
    g = _tight_crop(g, thresh=18, pad=4)
    g.thumbnail((WORK_MAX, WORK_MAX), Image.Resampling.LANCZOS)
    g = g.filter(ImageFilter.MedianFilter(size=3))
    g.thumbnail((EXPORT_MAX, EXPORT_MAX), Image.Resampling.LANCZOS)
    mask = g.point(lambda p: 255 if p > 50 else 0)
    bb = mask.getbbox()
    if bb:
        pad = 2
        x0, y0, x1, y1 = bb
        w, h = mask.size
        mask = mask.crop(
            (
                max(0, x0 - pad),
                max(0, y0 - pad),
                min(w, x1 + pad),
                min(h, y1 + pad),
            )
        )
    sw, sh = mask.size
    r = Image.new("L", (sw, sh), STROKE[0])
    gch = Image.new("L", (sw, sh), STROKE[1])
    bch = Image.new("L", (sw, sh), STROKE[2])
    return Image.merge("RGBA", (r, gch, bch, mask))


def _suspension_to_rgba(im: Image.Image) -> Image.Image:
    rgb = im.convert("RGB")
    L = rgb.convert("L")
    a = L.point(lambda p: 255 if p > 14 else 0)
    a = a.filter(ImageFilter.GaussianBlur(radius=0.35))
    r, g, b = rgb.split()
    return Image.merge("RGBA", (r, g, b, a))


def _fit_suspension(body: Image.Image, sus_src: Image.Image) -> tuple[Image.Image, Image.Image]:
    sw, sh = body.size
    sus = _suspension_to_rgba(sus_src)
    bb = sus.getbbox()
    if not bb:
        return body, body
    sus0 = sus.crop(bb)

    box_w = int(sw * SUSP_MAX_W_FRAC)
    box_h = int(sh * SUSP_MAX_H_FRAC)
    scale = min(box_w / sus0.width, box_h / sus0.height) * SUSP_LAYER_ZOOM
    # Critical: scaled width must not exceed canvas sw or paste() clips tire tread on both sides.
    max_scale_by_canvas = max(0.01, (sw - SUSP_SIDE_PAD_PX) / sus0.width)
    scale = min(scale, max_scale_by_canvas)
    margin_b = int(sh * SUSP_BOTTOM_MARGIN_FRAC)
    min_top = int(sh * SUSP_MIN_TOP_FRAC)

    sus = sus0
    while scale >= 0.18:
        nw = max(1, int(round(sus0.width * scale)))
        nh = max(1, int(round(sus0.height * scale)))
        sus = sus0.resize((nw, nh), Image.Resampling.LANCZOS)
        paste_y_try = sh - nh - margin_b
        if paste_y_try >= min_top:
            break
        scale *= 0.9

    nw, nh = sus.size
    paste_x = (sw - nw) // 2
    paste_y = sh - nh - margin_b
    paste_y = max(min_top, paste_y)
    paste_y += SUSP_SHIFT_DOWN_PX

    H = max(sh, paste_y + nh + max(margin_b, 2))
    plate = Image.new("RGBA", (sw, H), (0, 0, 0, 0))
    plate.paste(sus, (paste_x, paste_y), sus)

    body_pad = Image.new("RGBA", (sw, H), (0, 0, 0, 0))
    body_pad.paste(body, (0, 0))

    combined = Image.alpha_composite(plate, body_pad)
    return combined, body_pad


def _apply_zoom_canvas(img: Image.Image) -> Image.Image:
    cw = max(1, int(math.ceil(img.width * ZOOM_OUT_CANVAS)))
    ch = max(1, int(math.ceil(img.height * ZOOM_OUT_CANVAS)))
    canvas = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    ox = (cw - img.width) // 2
    oy = (ch - img.height) // 2
    canvas.paste(img, (ox, oy), img.split()[3])
    return canvas


def main() -> None:
    body = _build_body_strokes()

    if SUSP.is_file():
        sus_src = Image.open(SUSP)
        combined, body_pad = _fit_suspension(body, sus_src)
        OUT_BODY.parent.mkdir(parents=True, exist_ok=True)
        _apply_zoom_canvas(body_pad).save(OUT_BODY, optimize=True)
        out = _apply_zoom_canvas(combined)
    else:
        out = _apply_zoom_canvas(body)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    out.save(OUT, optimize=True)
    print(
        f"Wrote {OUT} ({OUT.stat().st_size // 1024} KiB) {out.width}x{out.height} "
        f"(suspension={'yes' if SUSP.is_file() else 'no'})"
    )


if __name__ == "__main__":
    main()
