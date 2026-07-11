"""Create dark-mode logo: white Pehnawa + ART OF, keep rainbow RANGAT + heart."""
from __future__ import annotations

import colorsys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public" / "images" / "RangatPehnawa.png"
DST = ROOT / "public" / "images" / "RangatPehnawa-dark.png"


def main() -> None:
    im = Image.open(SRC).convert("RGBA")
    px = im.load()
    w, h = im.size
    white_n = keep_n = 0

    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a <= 8:
                continue

            hue, sat, val = colorsys.rgb_to_hsv(r / 255.0, g / 255.0, b / 255.0)
            hue_deg = hue * 360.0

            # Coral heart accent on the P
            is_heart = hue_deg <= 14 and sat >= 0.25 and r >= g and (r - b) > 20

            # Rainbow RANGAT: higher chroma / non-brown hues
            is_rainbow = (sat >= 0.56) or (
                sat >= 0.35 and not (14 < hue_deg < 36)
            )

            # Pehnawa script + ART OF — taupe/brown line work
            is_brown_text = (
                14 < hue_deg < 36 and 0.18 <= sat <= 0.55
            ) or (sat < 0.22 and val < 0.75 and a > 30)

            if is_heart or (is_rainbow and not is_brown_text):
                keep_n += 1
                continue

            if is_brown_text or sat < 0.35:
                px[x, y] = (255, 255, 255, a)
                white_n += 1
            else:
                keep_n += 1

    im.save(DST, optimize=True)
    print(f"wrote {DST} ({DST.stat().st_size} bytes)")
    print(f"white={white_n} kept={keep_n}")


if __name__ == "__main__":
    main()
