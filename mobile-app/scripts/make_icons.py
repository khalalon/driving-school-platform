"""
Icône et écran de démarrage « Circuit » (13.20, D-52).

La marque reprend la jauge de l'accueil : un arc de compteur jaune signal sur asphalte, rempli
aux trois quarts, avec son point de télémétrie turquoise, au-dessus d'une route marquée de jaune.
Dessinée à 4× puis réduite (lissage), en couleurs des jetons D-52.

Fichiers écrits dans `assets/` :
  icon.png              1024 × 1024  fond asphalte, coins laissés au système
  adaptive-icon.png     1024 × 1024  premier plan transparent, dans la zone sûre Android (66 %)
  splash-icon.png        512 ×  512  marque pour le démarrage en thème clair (transparent)
  splash-icon-dark.png   512 ×  512  marque pour le démarrage en thème sombre (transparent)
  favicon.png             64 ×   64

Usage : python scripts/make_icons.py
"""

import math
import os

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.normpath(os.path.join(HERE, '..', 'assets'))

ASPHALT = (10, 12, 15, 255)          # #0A0C0F
TRACK_DARK = (35, 40, 47, 255)       # #23282F
TRACK_LIGHT = (221, 225, 231, 255)   # #DDE1E7
SIGNAL = (255, 194, 26, 255)         # #FFC21A
GAUGE_LIGHT = (176, 125, 0, 255)     # #B07D00 (jauge du thème clair, ≥ 3:1 sur fond clair)
TELEMETRY = (45, 212, 191, 255)      # #2DD4BF
TELEMETRY_LIGHT = (15, 118, 110, 255)  # #0F766E
SCALE = 4


def mark(size, track, fill, dot, background=None, content=1.0):
    """La marque sur un carré de `size` px ; `content` = part du carré occupée par le dessin."""
    big = size * SCALE
    image = Image.new('RGBA', (big, big), background or (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    unit = big * content
    offset = (big - unit) / 2

    # Arc de compteur : 240° d'ouverture, rempli à 75 %
    stroke = unit * 0.11
    radius = unit * 0.34
    cx, cy = big / 2, offset + unit * 0.47
    box = [cx - radius, cy - radius, cx + radius, cy + radius]
    start, sweep = 150, 240
    draw.arc(box, start, start + sweep, fill=track, width=int(stroke))
    # Bout arrondi de la piste, comme celui de l'arc rempli
    track_end = start + sweep
    tx = cx + (radius - stroke / 2) * math.cos(math.radians(track_end))
    ty = cy + (radius - stroke / 2) * math.sin(math.radians(track_end))
    draw.ellipse([tx - stroke / 2, ty - stroke / 2, tx + stroke / 2, ty + stroke / 2], fill=track)
    end = start + sweep * 0.75
    draw.arc(box, start, end, fill=fill, width=int(stroke))
    # Bouts arrondis de l'arc rempli
    for angle in (start, end):
        x = cx + (radius - stroke / 2) * math.cos(math.radians(angle))
        y = cy + (radius - stroke / 2) * math.sin(math.radians(angle))
        r = stroke / 2
        draw.ellipse([x - r, y - r, x + r, y + r], fill=fill)

    # Point de télémétrie au bout de la course
    tip = start + sweep * 0.75
    x = cx + (radius - stroke / 2) * math.cos(math.radians(tip))
    y = cy + (radius - stroke / 2) * math.sin(math.radians(tip))
    r = stroke * 0.32
    draw.ellipse([x - r, y - r, x + r, y + r], fill=dot)

    # Route : bande sombre et trois tirets jaunes sous la jauge
    road_top = offset + unit * 0.80
    road_height = unit * 0.07
    dash_w, gap = unit * 0.13, unit * 0.07
    total = 3 * dash_w + 2 * gap
    x0 = cx - total / 2
    for index in range(3):
        left = x0 + index * (dash_w + gap)
        draw.rounded_rectangle(
            [left, road_top, left + dash_w, road_top + road_height],
            radius=road_height / 2,
            fill=fill,
        )
    return image.resize((size, size), Image.LANCZOS)


def main():
    outputs = {
        'icon.png': mark(1024, TRACK_DARK, SIGNAL, TELEMETRY, background=ASPHALT, content=0.78),
        # Zone sûre des icônes adaptatives : le dessin tient dans les 66 % centraux
        'adaptive-icon.png': mark(1024, TRACK_DARK, SIGNAL, TELEMETRY, content=0.58),
        'splash-icon.png': mark(512, TRACK_LIGHT, GAUGE_LIGHT, TELEMETRY_LIGHT, content=0.9),
        'splash-icon-dark.png': mark(512, TRACK_DARK, SIGNAL, TELEMETRY, content=0.9),
        'favicon.png': mark(64, TRACK_DARK, SIGNAL, TELEMETRY, background=ASPHALT, content=0.86),
    }
    for name, image in outputs.items():
        image.save(os.path.join(ASSETS, name), optimize=True)
        print(name, image.size)


if __name__ == '__main__':
    main()
