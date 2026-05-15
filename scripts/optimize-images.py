#!/usr/bin/env python3
"""
Generate WebP versions for PNG/JPG images in assets.

Usage:
  python3 scripts/optimize-images.py
  python3 scripts/optimize-images.py --root assets --quality 80 --watch
"""

import argparse
import sys
import time
from pathlib import Path

from PIL import Image


IMAGE_EXTS = {".png", ".jpg", ".jpeg"}


def iter_images(root):
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix.lower() not in IMAGE_EXTS:
            continue
        yield path


def has_alpha(img):
    if img.mode in ("RGBA", "LA"):
        return True
    if img.mode == "P" and "transparency" in img.info:
        return True
    return False


def convert_image(path, quality, force, lossless_alpha):
    dest = path.with_suffix(".webp")

    if not force and dest.exists():
        try:
            if dest.stat().st_mtime >= path.stat().st_mtime:
                return False
        except FileNotFoundError:
            pass

    tmp = dest.with_suffix(".webp.tmp")
    try:
        img = Image.open(path)
        alpha = has_alpha(img)
        if alpha:
            img = img.convert("RGBA")
        else:
            img = img.convert("RGB")

        save_kwargs = {
            "format": "WEBP",
            "quality": quality,
            "method": 6,
        }
        if alpha and lossless_alpha:
            save_kwargs["lossless"] = True

        img.save(tmp, **save_kwargs)
        tmp.replace(dest)
        return True
    except Exception:
        try:
            if tmp.exists():
                tmp.unlink()
        except Exception:
            pass
        return False


def optimize_once(root, quality, force, lossless_alpha):
    count = 0
    for path in iter_images(root):
        if convert_image(path, quality, force=force, lossless_alpha=lossless_alpha):
            count += 1
    return count


def watch(root, quality, force, lossless_alpha, interval):
    seen = {}
    while True:
        changed = False
        for path in iter_images(root):
            try:
                mtime = path.stat().st_mtime
            except FileNotFoundError:
                continue
            if force or seen.get(path) != mtime:
                if convert_image(path, quality, force=True, lossless_alpha=lossless_alpha):
                    changed = True
                seen[path] = mtime
        if not changed:
            time.sleep(interval)


def main(argv):
    parser = argparse.ArgumentParser(description="Generate WebP variants for site images.")
    parser.add_argument("--root", default="assets", help="Root folder to scan (default: assets)")
    parser.add_argument("--quality", type=int, default=80, help="WebP quality for lossy images (default: 80)")
    parser.add_argument("--force", action="store_true", help="Rebuild all WebP images")
    parser.add_argument("--watch", action="store_true", help="Watch for changes and auto-generate WebP")
    parser.add_argument("--interval", type=float, default=2.0, help="Watch polling interval in seconds (default: 2.0)")
    parser.add_argument("--lossless-alpha", dest="lossless_alpha", action="store_true", help="Use lossless WebP for images with alpha")
    parser.add_argument("--no-lossless-alpha", dest="lossless_alpha", action="store_false", help="Disable lossless WebP for images with alpha")
    parser.set_defaults(lossless_alpha=True)
    args = parser.parse_args(argv)

    root = Path(args.root)
    if not root.exists():
        print(f"Root not found: {root}", file=sys.stderr)
        return 1

    if args.watch:
        watch(root, args.quality, args.force, args.lossless_alpha, args.interval)
        return 0

    count = optimize_once(root, args.quality, args.force, args.lossless_alpha)
    print(f"Generated {count} WebP image(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
