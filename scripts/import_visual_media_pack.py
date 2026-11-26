"""Slice and export the 14 uploaded brand, artwork, cityscape, and template sheets into frontend/public/."""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(r"C:\Users\mirav\OneDrive\Desktop\MiraverseOSx")
PUBLIC = ROOT / "frontend" / "public"
UPLOAD_DIR = Path(
    r"C:\Users\mirav\.gemini\antigravity\brain\c3cd15f2-808a-410e-9d73-7cf34b00e6e8\.user_uploaded"
)


def _auto_trim_rgba(im: Image.Image, pad: int = 6) -> Image.Image:
    rgba = im.convert("RGBA")
    arr = np.array(rgba)
    ys, xs = np.where(arr[:, :, 3] > 10)
    if len(xs) == 0:
        return rgba
    x0 = max(0, int(xs.min()) - pad)
    y0 = max(0, int(ys.min()) - pad)
    x1 = min(rgba.width, int(xs.max()) + 1 + pad)
    y1 = min(rgba.height, int(ys.max()) + 1 + pad)
    return rgba.crop((x0, y0, x1, y1))


def _key_dark_to_alpha(im: Image.Image, low: int = 16, high: int = 48) -> Image.Image:
    rgba = np.array(im.convert("RGBA"))
    rgb = rgba[:, :, :3].astype(np.float32)
    lum = 0.2126 * rgb[:, :, 0] + 0.7152 * rgb[:, :, 1] + 0.0722 * rgb[:, :, 2]
    alpha = np.clip((lum - low) / max(1, (high - low)), 0.0, 1.0) * 255.0
    rgba[:, :, 3] = alpha.astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")


def _key_paper_to_alpha(im: Image.Image) -> Image.Image:
    rgba = np.array(im.convert("RGBA"))
    r, g, b = rgba[:, :, 0].astype(np.float32), rgba[:, :, 1].astype(np.float32), rgba[:, :, 2].astype(np.float32)
    # Paper background on Meridian sheet is cool pale slate-white ~(202, 210, 221)
    dist_paper = np.sqrt((r - 204.0) ** 2 + (g - 212.0) ** 2 + (b - 222.0) ** 2)
    # Keep dark slate typography and gold star/border colors opaque
    brightness = (r + g + b) / 3.0
    mask = np.where((dist_paper < 34.0) & (brightness > 175.0), np.clip((dist_paper - 14.0) / 20.0, 0.0, 1.0), 1.0)
    rgba[:, :, 3] = (mask * 255.0).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")


def export_all() -> dict[str, list[str]]:
    brands_dir = PUBLIC / "media" / "brands"
    orn_dir = PUBLIC / "media" / "ornaments"
    albums_dir = PUBLIC / "media" / "albums"
    posters_dir = PUBLIC / "media" / "posters"
    guides_dir = PUBLIC / "media" / "style-guides"
    wall_dir = PUBLIC / "images" / "wallpapers"

    for d in (brands_dir, orn_dir, albums_dir, posters_dir, guides_dir, wall_dir):
        d.mkdir(parents=True, exist_ok=True)

    outputs: dict[str, list[str]] = {
        "brands": [],
        "ornaments": [],
        "wallpapers": [],
        "albums": [],
        "posters": [],
        "style_guides": [],
    }

    # 1. Illustrated Brand Marks
    sr_masthead = Image.open(UPLOAD_DIR / "media_1795696814883_b8b2ddfc.png")
    p = brands_dir / "social-register-masthead-illustrated.png"
    _auto_trim_rgba(sr_masthead, pad=8).save(p, "PNG")
    outputs["brands"].append(p.name)

    sr_mono = Image.open(UPLOAD_DIR / "media_1795696814885_e082a1da.jpg")
    sr_mono_rgba = _key_dark_to_alpha(sr_mono).resize((512, 512), Image.Resampling.LANCZOS)
    p = brands_dir / "social-register-monogram-illustrated.png"
    sr_mono_rgba.save(p, "PNG")
    outputs["brands"].append(p.name)

    mer_sheet = Image.open(UPLOAD_DIR / "media_1795696814892_7d1c96eb.jpg")
    for fname, box in (
        ("meridian-masthead-illustrated.png", (48, 16, 976, 286)),
        ("meridian-laurel-emblem.png", (415, 290, 665, 462)),
        ("meridian-shield-badge.png", (745, 300, 915, 462)),
    ):
        crop = _auto_trim_rgba(_key_paper_to_alpha(mer_sheet.crop(box)), pad=4)
        out_p = brands_dir / fname
        crop.save(out_p, "PNG")
        outputs["brands"].append(fname)

    # 2. Transparent Ornaments
    orn_sheet = Image.open(UPLOAD_DIR / "media_1795696814893_6488e650.png")
    for fname, box in (
        ("lily-corner-tl.png", (20, 30, 312, 312)),
        ("lily-corner-tr.png", (712, 30, 1002, 312)),
        ("lily-corner-bl.png", (20, 308, 292, 512)),
        ("lily-corner-br.png", (732, 308, 1004, 510)),
        ("celestial-floral-divider.png", (236, 38, 784, 188)),
        ("gold-filigree-divider.png", (226, 184, 798, 276)),
        ("celestial-starburst.png", (308, 262, 492, 446)),
        ("ornate-title-plaque.png", (282, 442, 742, 598)),
        ("lily-crown-crest.png", (308, 588, 718, 708)),
    ):
        crop = _auto_trim_rgba(orn_sheet.crop(box), pad=4)
        out_p = orn_dir / fname
        crop.save(out_p, "PNG")
        outputs["ornaments"].append(fname)

    # 3. 2 New Twin-Moon Aureline Wallpapers
    for src_name, dst_name in (
        ("media_1795696814901_43dc6790.jpg", "aureline-harbor-twin-moons.jpg"),
        ("media_1795696814918_98fb55fd.jpg", "aureline-terraces-twin-moons.jpg"),
    ):
        im = Image.open(UPLOAD_DIR / src_name).convert("RGB")
        im.save(wall_dir / dst_name, "JPEG", quality=90, optimize=True)
        outputs["wallpapers"].append(dst_name)

    # 4. 6 Sliced Square Album Covers
    alb_sheet = Image.open(UPLOAD_DIR / "media_1795696814917_d120ef80.jpg").convert("RGB")
    for fname, box in (
        ("album-neon-starlight.jpg", (2, 2, 339, 337)),
        ("album-marble-lilies.jpg", (345, 2, 680, 337)),
        ("album-chamber-violin.jpg", (686, 2, 1022, 337)),
        ("album-amber-silhouette.jpg", (2, 343, 339, 680)),
        ("album-prism-eclipse.jpg", (345, 343, 680, 680)),
        ("album-meadow-dusk.jpg", (686, 343, 1022, 680)),
    ):
        alb_sheet.crop(box).save(albums_dir / fname, "JPEG", quality=92, optimize=True)
        outputs["albums"].append(fname)

    # 5. 5 Sliced Vertical Film/Stage/Story Posters
    poster_sheet = Image.open(UPLOAD_DIR / "media_1795696814915_df5f4c17.jpg").convert("RGB")
    for fname, box in (
        ("poster-last-witness-noir.jpg", (2, 2, 201, 510)),
        ("poster-promenade-sunset.jpg", (208, 2, 406, 510)),
        ("poster-citadel-of-echoes.jpg", (413, 2, 610, 510)),
        ("poster-wind-archive-collage.jpg", (617, 2, 814, 510)),
        ("poster-coastal-escapade.jpg", (821, 2, 1022, 510)),
    ):
        poster_sheet.crop(box).save(posters_dir / fname, "JPEG", quality=92, optimize=True)
        outputs["posters"].append(fname)

    # 6. 7 Design System & Template Reference Sheets
    for src_name, dst_name in (
        ("media_1795696814883_a7154512.jpg", "social-register-brand-sheet.jpg"),
        ("media_1795696814892_7d1c96eb.jpg", "meridian-brand-sheet.jpg"),
        ("media_1795696814904_7fbe0308.jpg", "media-template-system.jpg"),
        ("media_1795696814921_cec87b8d.jpg", "universal-creative-families.jpg"),
        ("media_1795696814885_eb70006d.jpg", "poll-question-templates.jpg"),
        ("media_1795696814905_2196d910.jpg", "sponsored-collab-templates.jpg"),
        ("media_1795696814915_a2fd37a0.jpg", "story-announcement-templates.jpg"),
    ):
        im = Image.open(UPLOAD_DIR / src_name).convert("RGB")
        im.save(guides_dir / dst_name, "JPEG", quality=88, optimize=True)
        outputs["style_guides"].append(dst_name)

    return outputs


if __name__ == "__main__":
    print(json.dumps(export_all(), indent=2))
