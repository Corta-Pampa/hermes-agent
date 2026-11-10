#!/usr/bin/env python3
# CORTA CUSTOMIZATION
"""Render every icon the Corta desktop app ships from corta/brand/logo/corta-icon.svg.

Upstream's scripts/generate_icons.py draws the Hermes/Nous set from the girl art and
also feeds the website, dashboard and bootstrap installer. This script only rewrites
the apps/desktop files a Corta installer packages (the paths listed in
corta/brand/upstream-brand-assets.json, kept `merge=ours` in .gitattributes), reusing
upstream's renderer, platform geometry and MSIX catalog, so the platform rules
(macOS grid, Icon Composer layers, Windows qualifiers) stay upstream's.

One artwork everywhere: the Corta icon on an ink (#0A0A16) tile, in light and dark.

    <hermes runtime python> -I corta/scripts/generate-icons.py           # write
    <hermes runtime python> -I corta/scripts/generate-icons.py --check   # verify sizes

scripts/ci/check_icons.sh runs it right after upstream's generator, so the committed
Corta icons are what CI expects.
"""

from __future__ import annotations

import argparse
import importlib.util
import io
import json
import re
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
_spec = importlib.util.spec_from_file_location("upstream_icons", ROOT / "scripts" / "generate_icons.py")
up = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(up)

SOURCE = ROOT / "corta" / "brand" / "logo" / "corta-icon.svg"
INK = "#0A0A16"
PAPER = "#E7EDF7"
ICNS_SIZES = (16, 32, 64, 128, 256, 512, 1024)
ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]
# Upstream's squircle geometry (assets/backgrounds): full-bleed tile, and the
# macOS HIG 824-on-1024 grid. Kept identical so Corta sits like its neighbors.
TILE = (0, 0, 1024, 1024, 245)
MAC_TILE = (100, 100, 824, 824, 185.4)


def icon_inner() -> tuple[str, str]:
    """The icon's drawing (without the root <svg>) and its viewBox."""
    text = SOURCE.read_text(encoding="utf-8")
    view_box = re.search(r'viewBox="([^"]+)"', text).group(1)
    body = re.search(r"<svg[^>]*>(.*)</svg>", text, re.DOTALL).group(1)
    body = re.sub(r"<title>.*?</title>", "", body, flags=re.DOTALL)
    return body, view_box


def art_svg(box: tuple[float, float, float, float], *, tile: tuple | None, only: str | None = None) -> str:
    """The icon scaled into `box` on a 1024 canvas, over an ink tile when given.
    `only` keeps one class ('cls-1' badge, 'cls-2' glyphs) for coverage masks."""
    body, view_box = icon_inner()
    if only:
        hidden = {"cls-1": "cls-2", "cls-2": "cls-1"}[only]
        body = body.replace(f".{hidden}{{fill:", f".{hidden}{{fill-opacity:0;fill:")
    x, y, w, h = box
    plate = ""
    if tile:
        tx, ty, tw, th, rx = tile
        plate = f'<rect x="{tx}" y="{ty}" width="{tw}" height="{th}" rx="{rx}" fill="{INK}"/>'
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">'
        f'{plate}<svg x="{x}" y="{y}" width="{w}" height="{h}" viewBox="{view_box}">{body}</svg></svg>'
    )


MASTER = art_svg((0, 0, 1024, 1024), tile=TILE)
MASTER_MAC = art_svg((100, 100, 824, 824), tile=MAC_TILE)
# Icon Composer: the canvas is the plate; the system masks it and paints the fill.
LAYER_ART = art_svg((0, 0, 1024, 1024), tile=None)


def png(svg: str, size: int | tuple[int, int]) -> bytes:
    buf = io.BytesIO()
    up.save_png(up.render_svg(svg, size), buf)
    return buf.getvalue()


def icns(svg: str) -> bytes:
    img = up.render_svg(svg, 1024)
    frames = [img.resize((s, s), Image.LANCZOS) for s in ICNS_SIZES]
    buf = io.BytesIO()
    img.save(buf, format="ICNS", append_images=frames[1:])
    return buf.getvalue()


def ico(svg: str, sizes: list[int]) -> bytes:
    buf = io.BytesIO()
    up.render_svg(svg, max(sizes)).save(buf, format="ICO", sizes=[(s, s) for s in sizes])
    return buf.getvalue()


def wide(w: int, h: int, tile: int) -> bytes:
    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    up.paste_centered(canvas, up.render_svg(MASTER, tile))
    buf = io.BytesIO()
    canvas.save(buf, "PNG")
    return buf.getvalue()


def mono() -> bytes:
    """Clear/Tinted layer: the badge as white glass, the glyphs as upstream's ink material."""
    out = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    for only, (tone, opacity) in (("cls-1", (1.0, 1.0)), ("cls-2", up.MONO_INK)):
        alpha = up.render_svg(art_svg((0, 0, 1024, 1024), tile=None, only=only), 1024).getchannel("A")
        grey = round(tone * 255)
        layer = Image.new("RGBA", alpha.size, (grey, grey, grey, 0))
        layer.putalpha(alpha.point(lambda v: round(v * opacity)))
        out.paste(layer, (0, 0), alpha.point(lambda v: 255 if v > 127 else 0))
    buf = io.BytesIO()
    up.save_png(out, buf)
    return buf.getvalue()


def manifest() -> bytes:
    data = json.loads(up.icon_manifest(type("Art", (), {"colors": (INK, INK)})()))
    return (json.dumps(data, indent=2) + "\n").encode()


def targets() -> dict[str, bytes]:
    out: dict[str, bytes] = {
        "apps/desktop/assets/icon.png": png(MASTER, 1024),
        "apps/desktop/assets/icon-dark.png": png(MASTER, 1024),
        "apps/desktop/assets/icon.ico": ico(MASTER, ICO_SIZES),
        "apps/desktop/assets/icon-dark.ico": ico(MASTER, ICO_SIZES),
        "apps/desktop/assets/icon.icns": icns(MASTER_MAC),
        "apps/desktop/assets/icon-dark.icns": icns(MASTER_MAC),
        "apps/desktop/assets/icon-mac.png": png(MASTER_MAC, 1024),
        "apps/desktop/assets/icon.icon/icon.json": manifest(),
        "apps/desktop/assets/icon.icon/Assets/art-light.png": png(LAYER_ART, 1024),
        "apps/desktop/assets/icon.icon/Assets/art-dark.png": png(LAYER_ART, 1024),
        "apps/desktop/assets/icon.icon/Assets/mono.png": mono(),
        "apps/desktop/packaging/dmg-volume.icns": icns(MASTER_MAC),
        "apps/desktop/public/apple-touch-icon.png": png(MASTER, 1024),
        # Upstream's mark paths stay valid for any surface still naming them.
        "apps/desktop/public/nous-girl.png": png(MASTER, 256),
        "apps/desktop/public/nous-girl-dark.png": png(MASTER, 256),
    }
    for rel, kind, arg in up.APPX_TARGETS:
        out[rel] = wide(*arg) if kind == "wide" else png(MASTER, arg)
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--check", action="store_true", help="verify the committed files instead of writing")
    args = parser.parse_args()
    files = targets()
    if args.check:
        stale = [rel for rel, data in files.items() if not (ROOT / rel).exists() or (ROOT / rel).read_bytes() != data]
        for rel in stale:
            print(f"  stale: {rel}")
        print(f"[corta icons] {len(files) - len(stale)}/{len(files)} up to date")
        return int(bool(stale))
    for rel, data in files.items():
        path = ROOT / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
    print(f"[corta icons] wrote {len(files)} files")
    return 0


if __name__ == "__main__":
    sys.exit(main())
