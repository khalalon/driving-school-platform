"""
Génère les animations de célébration (13.12, D-52) au format Lottie (bodymovin 5).

Création originale du projet : aucun fichier tiers, aucune licence à suivre. Chaque calque porte
un nom de rôle (`ring`, `check`, `confetti-a`…) ; l'application le recolore au rendu avec les
jetons du thème (`colorFilters` de lottie-react-native, clé `<calque>.**`). Les couleurs écrites
ici ne sont donc qu'un brouillon neutre.

  - enrolled.json : un anneau se dessine, une coche s'y trace, confettis    (inscription acceptée)
  - theory.json   : anneau, coche et rayons qui jaillissent, confettis      (examen du code réussi)
  - licence.json  : drapeau à damier qui flotte au bout de son mât, confettis (permis obtenu)

Usage : python scripts/make_celebrations.py
"""

import json
import math
import os
import random

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, '..', 'assets', 'lottie'))

FPS = 60
DURATION = 150  # 2,5 s, lue une fois
SIZE = 400
CX = CY = SIZE / 2

GREY = [0.6, 0.6, 0.6, 1]
LIGHT = [0.95, 0.95, 0.95, 1]
DARK = [0.1, 0.1, 0.1, 1]


def static(value):
    return {'a': 0, 'k': value}


def ease(out=(0.2, 1.0), inn=(0.8, 0.0)):
    return {'i': {'x': [out[0]], 'y': [out[1]]}, 'o': {'x': [inn[0]], 'y': [inn[1]]}}


def animated(frames):
    """frames : liste de (temps, valeur) ; courbe douce entre chaque clé."""
    keys = []
    for index, (time, value) in enumerate(frames):
        key = {'t': time, 's': value if isinstance(value, list) else [value]}
        if index < len(frames) - 1:
            key.update(ease())
        keys.append(key)
    return {'a': 1, 'k': keys}


def transform(position=None, scale=None, rotation=None, opacity=None, anchor=(0, 0)):
    return {
        'ty': 'tr',
        'p': position or static([0, 0]),
        'a': static(list(anchor)),
        's': scale or static([100, 100]),
        'r': rotation or static(0),
        'o': opacity or static(100),
    }


def layer(name, index, shapes, position=(CX, CY), scale=None, opacity=None, start=0):
    return {
        'ddd': 0,
        'ind': index,
        'ty': 4,
        'nm': name,
        'sr': 1,
        'ks': {
            'o': opacity or static(100),
            'r': static(0),
            'p': static([position[0], position[1], 0]),
            'a': static([0, 0, 0]),
            's': scale or static([100, 100, 100]),
        },
        'ao': 0,
        'shapes': shapes,
        'ip': start,
        'op': DURATION,
        'st': 0,
        'bm': 0,
    }


def path(points, closed=False):
    zeros = [[0, 0] for _ in points]
    return {'ty': 'sh', 'ks': static({'i': zeros, 'o': zeros, 'v': [list(p) for p in points], 'c': closed})}


def stroke(width, color=GREY):
    return {'ty': 'st', 'c': static(color), 'o': static(100), 'w': static(width), 'lc': 2, 'lj': 2}


def fill(color=GREY):
    return {'ty': 'fl', 'c': static(color), 'o': static(100), 'r': 1}


def trim(start, end):
    return {'ty': 'tm', 's': static(0), 'e': animated([(start, 0), (end, 100)]), 'o': static(0), 'm': 1}


def group(name, items):
    return {'ty': 'gr', 'nm': name, 'it': items}


def ring_and_check(first_index):
    ring = layer(
        'ring',
        first_index,
        [group('ring', [
            {'ty': 'el', 'p': static([0, 0]), 's': static([220, 220])},
            stroke(16),
            trim(4, 40),
            transform(),
        ])],
        scale=animated([(0, [70, 70, 100]), (40, [100, 100, 100]), (52, [108, 108, 100]), (66, [100, 100, 100])]),
    )
    check = layer(
        'check',
        first_index + 1,
        [group('check', [
            path([(-52, 4), (-14, 42), (58, -40)]),
            stroke(22),
            trim(34, 64),
            transform(),
        ])],
    )
    return [ring, check]


def confetti(first_index, seed, origin=(CX, CY), count=30, spread=190):
    """Trois calques de confettis (un par couleur), chaque éclat a sa trajectoire."""
    rng = random.Random(seed)
    layers = []
    for color_index, name in enumerate(('confetti-a', 'confetti-b', 'confetti-c')):
        groups = []
        for piece in range(count // 3):
            angle = rng.uniform(-math.pi, 0) if piece % 2 else rng.uniform(-math.pi * 0.95, -math.pi * 0.05)
            distance = rng.uniform(spread * 0.45, spread)
            burst = (math.cos(angle) * distance, math.sin(angle) * distance)
            fall = (burst[0] * 1.15, burst[1] + rng.uniform(150, 240))
            start = rng.randint(24, 40)
            spin = rng.choice([-1, 1]) * rng.uniform(260, 620)
            width, height = rng.uniform(8, 14), rng.uniform(14, 22)
            groups.append(group(f'p{piece}', [
                {'ty': 'rc', 'p': static([0, 0]), 's': static([width, height]), 'r': static(2)},
                fill(),
                transform(
                    position=animated([(start, [0, 0]), (start + 22, list(burst)), (DURATION, list(fall))]),
                    rotation=animated([(start, 0), (DURATION, spin)]),
                    opacity=animated([(start, 0), (start + 4, 100), (DURATION - 30, 100), (DURATION, 0)]),
                ),
            ]))
        layers.append(layer(name, first_index + color_index, groups, position=origin))
    return layers


def rays(first_index):
    groups = []
    for index in range(12):
        angle = index * math.pi / 6
        inner, outer = 128, 176
        groups.append(group(f'r{index}', [
            path([(math.cos(angle) * inner, math.sin(angle) * inner), (math.cos(angle) * outer, math.sin(angle) * outer)]),
            stroke(10),
            trim(40, 60),
            transform(),
        ]))
    return [layer(
        'rays',
        first_index,
        groups,
        opacity=animated([(38, 0), (46, 100), (110, 100), (DURATION, 0)]),
        scale=animated([(40, [80, 80, 100]), (70, [112, 112, 100])]),
    )]


def checkered_flag(first_index):
    cols, rows, cell = 6, 4, 34
    left, top = -80, -120
    dark, light = [], []
    for col in range(cols):
        for row in range(rows):
            # La vague : chaque colonne ondule avec un léger retard sur la précédente
            frames = []
            for step in range(0, DURATION + 1, 10):
                offset = math.sin(step / 12 - col * 0.7) * (4 + col * 2.2)
                frames.append((step, [0, offset]))
            square = group(f'c{col}r{row}', [
                {'ty': 'rc', 'p': static([left + col * cell + cell / 2, top + row * cell + cell / 2]),
                 's': static([cell + 0.5, cell + 0.5]), 'r': static(0)},
                fill(DARK if (col + row) % 2 == 0 else LIGHT),
                transform(position=animated(frames)),
            ])
            (dark if (col + row) % 2 == 0 else light).append(square)
    pop = animated([(0, [0, 0, 100]), (26, [108, 108, 100]), (38, [100, 100, 100])])
    pole = layer(
        'pole',
        first_index,
        [group('pole', [{'ty': 'rc', 'p': static([-92, -10]), 's': static([12, 260]), 'r': static(6)}, fill(), transform()])],
        scale=pop,
    )
    return [
        pole,
        layer('flag-dark', first_index + 1, dark, scale=pop),
        layer('flag-light', first_index + 2, light, scale=pop),
    ]


def composition(name, layers):
    # Lottie dessine le premier calque au-dessus : l'ordre est inversé (confettis devant)
    for index, item in enumerate(reversed(layers), start=1):
        item['ind'] = index
    return {
        'v': '5.7.4',
        'fr': FPS,
        'ip': 0,
        'op': DURATION,
        'w': SIZE,
        'h': SIZE,
        'nm': name,
        'ddd': 0,
        'assets': [],
        'layers': list(reversed(layers)),
    }


def main():
    os.makedirs(OUT, exist_ok=True)
    animations = {
        'enrolled': composition('enrolled', ring_and_check(1) + confetti(3, seed=7)),
        'theory': composition('theory', rays(1) + ring_and_check(2) + confetti(4, seed=11, count=24)),
        'licence': composition('licence', checkered_flag(1) + confetti(4, seed=23, origin=(CX, CY - 40), count=36)),
    }
    for name, data in animations.items():
        target = os.path.join(OUT, f'{name}.json')
        with open(target, 'w', encoding='utf-8', newline='
') as f:
            json.dump(data, f, separators=(',', ':'))
            f.write('\n')
        print(f'{name}.json {os.path.getsize(target)} octets, calques : {[l["nm"] for l in data["layers"]]}')


if __name__ == '__main__':
    main()
