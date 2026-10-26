#!/usr/bin/env python3
"""Turn a downloaded stock photo into the small WebP files the site serves.

Usage: python3 tools/photos.py SOURCE NAME [--ratio 3:2] [--focus 0.5,0.4]

Writes assets/photos/NAME-640.webp and NAME-1200.webp, cropped to the ratio
around the focus point (0..1 from the left and top). Metadata is dropped.
Record the photo's source page and license in assets/photos/CREDITS.md.
"""
import argparse
from pathlib import Path

from PIL import Image, ImageOps

OUT = Path(__file__).resolve().parent.parent / "assets" / "photos"
WIDTHS = (640, 1200)


def crop(img, ratio, fx, fy):
    w, h = img.size
    if w / h > ratio:
        cw, ch = round(h * ratio), h
    else:
        cw, ch = w, round(w / ratio)
    left = min(max(round(fx * w - cw / 2), 0), w - cw)
    top = min(max(round(fy * h - ch / 2), 0), h - ch)
    return img.crop((left, top, left + cw, top + ch))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("source")
    ap.add_argument("name")
    ap.add_argument("--ratio", default="3:2")
    ap.add_argument("--focus", default="0.5,0.45")
    a = ap.parse_args()
    rw, rh = (float(x) for x in a.ratio.split(":"))
    fx, fy = (float(x) for x in a.focus.split(","))
    img = ImageOps.exif_transpose(Image.open(a.source)).convert("RGB")
    img = crop(img, rw / rh, fx, fy)
    OUT.mkdir(parents=True, exist_ok=True)
    for width in WIDTHS:
        size = (width, round(width * rh / rw))
        path = OUT / f"{a.name}-{width}.webp"
        img.resize(size, Image.LANCZOS).save(path, "WEBP", quality=74, method=6)
        print(f"{path.relative_to(OUT.parent.parent)}  {size[0]}x{size[1]}  {path.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
