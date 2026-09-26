"""
Préparation des modèles 3D (13.9, D-52) à partir des kits Kenney (CC0).

Sources (téléchargées hors dépôt) :
  - Car Kit 3.1    https://kenney.nl/assets/car-kit      (kenney_car-kit.zip)
  - Racing Kit 1.0 https://kenney.nl/assets/racing-kit   (kenney_racing-kit.zip)

Ce que fait le script, pour chaque modèle retenu :
  1. La voiture et le cône tirent leurs couleurs d'une texture palette externe
     (`Textures/colormap.png`), que React Native ne sait pas retrouver. La palette est « cuite » :
     chaque triangle rejoint un matériau de couleur unie selon la case de palette qu'il utilise,
     et la texture disparaît. Les matériaux portent un nom de rôle (`paint`, `glass`,
     `headlight`…) : une scène peut les recolorer au rendu (thème clair / sombre).
  2. Les pièces de circuit ont déjà des matériaux unis : on les recolore aux jetons « Circuit ».
  3. Le résultat est écrit dans `mobile-app/assets/3d/` avec l'inventaire `credits.json`.

Usage : python scripts/prepare_models.py <dossier contenant les deux .zip>
"""

import json
import os
import struct
import sys
import zipfile

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, '..', 'assets', '3d'))

COMPONENTS = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
DTYPES = {5121: np.uint8, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}

# --- Couleurs « Circuit » (D-52), en sRGB ; glTF attend du linéaire (converti plus bas) ---
CIRCUIT = {
    'asphalt950': '#0A0C0F',
    'asphalt900': '#14171C',
    'asphalt800': '#23282F',
    'graphite': '#2B3038',
    'glass': '#0E1116',
    'chalk200': '#C9CED6',
    'concrete400': '#9BA3AF',
    'concrete200': '#E3E6EB',
    'signal': '#FFC21A',
    'signalSoft': '#FFF3CC',
    'red': '#FF5A4E',
    'cone': '#FF8A3D',
    'white': '#F3F4F6',
}

# Case de palette (colonne, rangée) → (rôle, couleur). Cases de 32 × 128 px dans la palette
# 512 × 512 du Car Kit ; relevées sur les coordonnées de texture de la berline et du cône.
CAR_CELLS = {
    (13, 1): ('paint', 'graphite'),
    (7, 2): ('glass', 'glass'),
    (5, 2): ('dark', 'asphalt900'),
    (11, 2): ('rim', 'concrete400'),
    (13, 2): ('chrome', 'chalk200'),
    (1, 3): ('headlight', 'signalSoft'),
    (3, 3): ('indicator', 'signal'),
    (5, 3): ('taillight', 'red'),
}
CONE_CELLS = {
    (11, 1): ('cone', 'cone'),
    (13, 2): ('stripe', 'white'),
}

# Matériaux du Racing Kit → couleur « Circuit »
TRACK_MATERIALS = {
    'road': 'asphalt800',
    'grass': 'asphalt900',
    'grey': 'concrete200',
    'red': 'signal',
    '_defaultMat': 'concrete400',
}

CAR_MODELS = [
    ('Models/GLB format/sedan.glb', 'car-sedan.glb', 'Voiture de l’auto-école (accueil, parcours)'),
    ('Models/GLB format/cone.glb', 'cone.glb', 'Cône de manœuvre (secteurs Manœuvre / Parc)'),
]
TRACK_MODELS = [
    ('Models/GLTF format/roadStraight.glb', 'track-straight.glb', 'Portion droite du circuit'),
    ('Models/GLTF format/roadCornerLarge.glb', 'track-corner.glb', 'Virage du circuit'),
    ('Models/GLTF format/roadStart.glb', 'track-start.glb', 'Ligne de départ'),
    ('Models/GLTF format/overheadLights.glb', 'gate-lights.glb', 'Portique de feux (départ)'),
    ('Models/GLTF format/barrierRed.glb', 'barrier.glb', 'Barrière de bord de piste'),
    ('Models/GLTF format/lightPostModern.glb', 'light-post.glb', 'Lampadaire (éclairage de nuit)'),
]


def srgb_to_linear(hex_color: str):
    rgb = [int(hex_color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in rgb]
    return [round(c, 5) for c in lin] + [1.0]


def read_glb(data: bytes):
    magic, _, length = struct.unpack('<III', data[:12])
    assert magic == 0x46546C67, 'pas un GLB'
    offset, doc, binary = 12, None, b''
    while offset < length:
        chunk_len, chunk_type = struct.unpack('<II', data[offset:offset + 8])
        chunk = data[offset + 8:offset + 8 + chunk_len]
        if chunk_type == 0x4E4F534A:
            doc = json.loads(chunk)
        elif chunk_type == 0x004E4942:
            binary = chunk
        offset += 8 + chunk_len
    return doc, bytearray(binary)


def write_glb(doc, binary: bytes) -> bytes:
    js = json.dumps(doc, separators=(',', ':')).encode()
    js += b' ' * ((4 - len(js) % 4) % 4)
    binary = bytes(binary) + b'\0' * ((4 - len(binary) % 4) % 4)
    total = 12 + 8 + len(js) + 8 + len(binary)
    out = struct.pack('<III', 0x46546C67, 2, total)
    out += struct.pack('<II', len(js), 0x4E4F534A) + js
    out += struct.pack('<II', len(binary), 0x004E4942) + binary
    return out


def read_accessor(doc, binary, index):
    acc = doc['accessors'][index]
    view = doc['bufferViews'][acc['bufferView']]
    dtype = DTYPES[acc['componentType']]
    n = COMPONENTS[acc['type']]
    start = view.get('byteOffset', 0) + acc.get('byteOffset', 0)
    stride = view.get('byteStride', 0)
    size = np.dtype(dtype).itemsize * n
    # Copie : une vue `frombuffer` empêcherait d'agrandir le tampon ensuite
    if stride and stride != size:
        return np.array([np.frombuffer(binary, dtype, n, start + i * stride) for i in range(acc['count'])])
    return np.frombuffer(binary, dtype, acc['count'] * n, start).reshape(acc['count'], n).copy()


def append_indices(doc, binary: bytearray, indices: np.ndarray) -> int:
    while len(binary) % 4:
        binary.append(0)
    data = indices.astype(np.uint32).tobytes()
    doc['bufferViews'].append(
        {'buffer': 0, 'byteOffset': len(binary), 'byteLength': len(data), 'target': 34963}
    )
    binary.extend(data)
    doc['accessors'].append({
        'bufferView': len(doc['bufferViews']) - 1,
        'componentType': 5125,
        'count': int(len(indices)),
        'type': 'SCALAR',
        'max': [int(indices.max())],
        'min': [int(indices.min())],
    })
    return len(doc['accessors']) - 1


def bake_palette(doc, binary: bytearray, cells: dict, palette: np.ndarray):
    """Remplace la texture palette par un matériau uni par case utilisée."""
    height, width = palette.shape[:2]
    materials, by_cell = [], {}

    def material_for(cell):
        if cell not in by_cell:
            role, color = cells.get(cell, (f'cell-{cell[0]}-{cell[1]}', None))
            if color is None:
                x, y = cell[0] * 32 + 16, cell[1] * 128 + 64
                r, g, b = palette[y, x][:3]
                factor = srgb_to_linear('#%02X%02X%02X' % (r, g, b))
            else:
                factor = srgb_to_linear(CIRCUIT[color])
            materials.append({
                'name': role,
                'pbrMetallicRoughness': {
                    'baseColorFactor': factor,
                    'metallicFactor': 0.35 if role == 'paint' else 0.0,
                    'roughnessFactor': 0.45 if role in ('paint', 'glass', 'chrome') else 0.8,
                },
            })
            by_cell[cell] = len(materials) - 1
        return by_cell[cell]

    for mesh in doc['meshes']:
        new_primitives = []
        for primitive in mesh['primitives']:
            uv = read_accessor(doc, binary, primitive['attributes']['TEXCOORD_0'])
            tris = read_accessor(doc, binary, primitive['indices']).reshape(-1, 3)
            centre = uv[tris].mean(axis=1)
            px = np.clip((centre[:, 0] * width).astype(int), 0, width - 1)
            py = np.clip((centre[:, 1] * height).astype(int), 0, height - 1)
            groups = {}
            for tri, x, y in zip(tris, px, py):
                groups.setdefault((int(x // 32), int(y // 128)), []).append(tri)
            for cell, group in sorted(groups.items()):
                attributes = {k: v for k, v in primitive['attributes'].items() if k != 'TEXCOORD_0'}
                new_primitives.append({
                    'attributes': attributes,
                    'indices': append_indices(doc, binary, np.array(group).reshape(-1)),
                    'material': material_for(cell),
                    'mode': primitive.get('mode', 4),
                })
        mesh['primitives'] = new_primitives

    doc['materials'] = materials
    for key in ('textures', 'images', 'samplers'):
        doc.pop(key, None)
    doc['buffers'][0]['byteLength'] = len(binary)
    doc['buffers'][0].pop('uri', None)


def compact(doc, binary: bytearray) -> bytearray:
    """Ne garde que les vues binaires encore référencées (les anciens index cuits disparaissent)."""
    used_accessors = set()
    for mesh in doc['meshes']:
        for p in mesh['primitives']:
            used_accessors.update(p['attributes'].values())
            used_accessors.add(p['indices'])
    old_accessors = doc['accessors']
    keep = sorted(used_accessors)
    remap_acc = {old: new for new, old in enumerate(keep)}
    accessors = [old_accessors[i] for i in keep]
    used_views = sorted({a['bufferView'] for a in accessors} | {
        img['bufferView'] for img in doc.get('images', []) if 'bufferView' in img
    })
    out, remap_view, views = bytearray(), {}, []
    for new, old in enumerate(used_views):
        view = dict(doc['bufferViews'][old])
        start = view.get('byteOffset', 0)
        chunk = binary[start:start + view['byteLength']]
        while len(out) % 4:
            out.append(0)
        view['byteOffset'] = len(out)
        out.extend(chunk)
        views.append(view)
        remap_view[old] = new
    for a in accessors:
        a['bufferView'] = remap_view[a['bufferView']]
    for img in doc.get('images', []):
        if 'bufferView' in img:
            img['bufferView'] = remap_view[img['bufferView']]
    for mesh in doc['meshes']:
        for p in mesh['primitives']:
            p['attributes'] = {k: remap_acc[v] for k, v in p['attributes'].items()}
            p['indices'] = remap_acc[p['indices']]
    doc['accessors'], doc['bufferViews'] = accessors, views
    doc['buffers'] = [{'byteLength': len(out)}]
    return out


def recolor_track(doc):
    for material in doc.get('materials', []):
        target = TRACK_MATERIALS.get(material.get('name'))
        if target:
            material.setdefault('pbrMetallicRoughness', {})['baseColorFactor'] = srgb_to_linear(CIRCUIT[target])


def main(source_dir: str) -> None:
    from PIL import Image
    import io

    os.makedirs(OUT, exist_ok=True)
    car_zip = zipfile.ZipFile(os.path.join(source_dir, 'car-kit.zip'))
    track_zip = zipfile.ZipFile(os.path.join(source_dir, 'racing-kit.zip'))
    palette = np.array(Image.open(io.BytesIO(car_zip.read('Models/GLB format/Textures/colormap.png'))).convert('RGBA'))

    credits = []
    for source, target, usage in CAR_MODELS:
        doc, binary = read_glb(car_zip.read(source))
        cells = CAR_CELLS if 'sedan' in source else CONE_CELLS
        bake_palette(doc, binary, cells, palette)
        binary = compact(doc, binary)
        data = write_glb(doc, binary)
        open(os.path.join(OUT, target), 'wb').write(data)
        credits.append({
            'file': target,
            'usage': usage,
            'source': 'Kenney — Car Kit 3.1 (' + source.split('/')[-1] + ')',
            'url': 'https://kenney.nl/assets/car-kit',
            'author': 'Kenney (www.kenney.nl)',
            'license': 'CC0 1.0',
            'modifications': 'Texture palette cuite en matériaux unis nommés par rôle, recolorés aux jetons « Circuit » (D-52)',
            'bytes': len(data),
        })

    for source, target, usage in TRACK_MODELS:
        doc, binary = read_glb(track_zip.read(source))
        recolor_track(doc)
        data = write_glb(doc, binary)
        open(os.path.join(OUT, target), 'wb').write(data)
        credits.append({
            'file': target,
            'usage': usage,
            'source': 'Kenney — Racing Kit 1.0 (' + source.split('/')[-1] + ')',
            'url': 'https://kenney.nl/assets/racing-kit',
            'author': 'Kenney (www.kenney.nl)',
            'license': 'CC0 1.0',
            'modifications': 'Matériaux recolorés aux jetons « Circuit » (D-52)',
            'bytes': len(data),
        })

    with open(os.path.join(OUT, 'credits.json'), 'w', encoding='utf-8') as f:
        json.dump(credits, f, ensure_ascii=False, indent=2)
        f.write('\n')
    total = sum(c['bytes'] for c in credits)
    for c in credits:
        print(f"{c['file']:<20} {c['bytes']:>8} octets")
    print(f'total {total} octets')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '.')
