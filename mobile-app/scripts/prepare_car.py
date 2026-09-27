"""
Préparation de la voiture réaliste (13b.1, D-53) à partir du « Car Concept » des modèles
d'exemple glTF de Khronos — Eric Chadwick, © 2024 Darmstadt Graphics Group GmbH, CC-BY 4.0.

Source (téléchargée hors dépôt) :
  https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept
  fichier glTF-Binary/CarConcept.glb (11,8 Mo, 213 000 triangles, 14 textures)

Ce que fait le script :
  1. Ne garde que ce qui se voit de l'extérieur : intérieur, essuie-glaces, moteur, pédales,
     dessous du capot, plaque et étriers retirés. Les vitres deviennent opaques et teintées :
     l'intérieur n'existe plus, et la transmission coûte une passe de rendu de plus.
  2. Retire **toutes les textures**, dont celles qui portent les logos Khronos et 3D Commerce
     (plaque, flancs des pneus) — marques exclues de la licence. Le rendu réaliste vient de la
     géométrie, du vernis et des reflets calculés dans la scène.
  3. Regroupe les matériaux par **rôle** (`paint`, `paintAccent`, `glass`, `headlight`,
     `taillight`, `indicator`, `tyre`, `rim`, `chrome`, `trim`, `mechanical`) : une primitive
     par rôle, que la scène recolore au thème. Variantes de peinture abandonnées.
  4. Cuit les transformations dans les sommets : Y en haut, avant vers +z, longueur 2,6 unités
     (celle de l'ancienne berline Kenney), pneus posés sur y = 0. Les quatre roues restent des
     nœuds séparés (`wheel-front-left`…), pivot au centre du moyeu, sans braquage : une
     rotation autour de leur axe x les fait tourner.
  5. Soude et simplifie la géométrie avec `@gltf-transform/cli` (lancé par npx, version fixée,
     aucune dépendance ajoutée au dépôt), puis vérifie le budget de la Phase 13b.
  6. Écrit `mobile-app/assets/3d/car.glb` et son entrée dans `credits.json`.

Usage : python scripts/prepare_car.py <chemin de CarConcept.glb>
"""

import json
import os
import re
import struct
import subprocess
import sys
import tempfile

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.normpath(os.path.join(HERE, '..', 'assets', '3d'))
OUT = os.path.join(OUT_DIR, 'car.glb')
CREDITS = os.path.join(OUT_DIR, 'credits.json')

GLTF_TRANSFORM = '@gltf-transform/cli@4.5.0'
TARGET_LENGTH = 2.6
SIMPLIFY_RATIO = '0.4'
SIMPLIFY_ERROR = '0.0008'

BUDGET_BYTES = 3 * 1024 * 1024
BUDGET_TRIANGLES = 60_000
BUDGET_DRAW_CALLS = 30

COMPONENTS = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
DTYPES = {5121: np.uint8, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}

# Nœuds invisibles de l'extérieur, ou porteurs d'un logo
DROP = re.compile(
    r'^Interior|Wipers|^Engine|HoodInterior|HoodUnder|^License|BrakePad'
)

# Nom du matériau d'origine → rôle. `None` = matériau sans nom ou primitive sans matériau.
ROLE_OF = {
    'Paint 1 Carmine': 'paint',
    'Paint 2 Carmine': 'paintAccent',
    'Glass': 'glass',
    'Headlight': 'headlight',
    'Brakelight': 'taillight',
    'Signallight': 'indicator',
    'Tireside': 'tyre',
    'Tiretread': 'tyre',
    'Rim1': 'rim',
    'Rim2': 'chrome',
    'Mirror': 'chrome',
    'Mechanical': 'mechanical',
    'Disc': 'mechanical',
    'Brake': 'mechanical',
    'Hardware': 'mechanical',
    None: 'trim',
}

# Matériaux de sortie (valeurs linéaires glTF). Les couleurs sont des valeurs de départ :
# la scène les remplace par celles du thème (`homeCarPalette`).
def material(name, color, metallic, roughness, emissive=None, clearcoat=False, double=False):
    m = {
        'name': name,
        'pbrMetallicRoughness': {
            'baseColorFactor': [*color, 1],
            'metallicFactor': metallic,
            'roughnessFactor': roughness,
        },
    }
    if emissive:
        m['emissiveFactor'] = emissive
    if clearcoat:
        m['extensions'] = {
            'KHR_materials_clearcoat': {'clearcoatFactor': 1, 'clearcoatRoughnessFactor': 0.04}
        }
    if double:
        m['doubleSided'] = True
    return m


MATERIALS = [
    material('paint', (0.4, 0.3, 0.02), 0.5, 0.3, clearcoat=True, double=True),
    material('paintAccent', (0.03, 0.03, 0.035), 0.4, 0.3, clearcoat=True, double=True),
    material('glass', (0.01, 0.012, 0.015), 0.0, 0.04, double=True),
    material('headlight', (0.8, 0.8, 0.8), 0.0, 0.2, emissive=[1, 1, 1]),
    material('taillight', (0.3, 0.0, 0.0), 0.0, 0.3, emissive=[1, 0, 0]),
    material('indicator', (0.4, 0.2, 0.0), 0.0, 0.3, emissive=[1, 0.5, 0]),
    material('tyre', (0.015, 0.015, 0.015), 0.0, 0.9),
    material('rim', (0.02, 0.02, 0.022), 0.8, 0.35),
    material('chrome', (0.9, 0.9, 0.9), 1.0, 0.08),
    material('trim', (0.008, 0.008, 0.009), 0.0, 0.6, double=True),
    material('mechanical', (0.05, 0.05, 0.05), 0.6, 0.6),
]
ROLE_INDEX = {m['name']: i for i, m in enumerate(MATERIALS)}

WHEELS = {
    'WheelFrontL': 'wheel-front-left',
    'WheelFrontR': 'wheel-front-right',
    'WheelRearL': 'wheel-back-left',
    'WheelRearR': 'wheel-back-right',
}


# ------------------------------------------------------------------------------ lecture GLB

def read_glb(path):
    data = open(path, 'rb').read()
    json_len = struct.unpack('<I', data[12:16])[0]
    doc = json.loads(data[20:20 + json_len])
    bin_start = 20 + json_len + 8
    return doc, data[bin_start:]


def accessor(doc, binary, index):
    acc = doc['accessors'][index]
    view = doc['bufferViews'][acc['bufferView']]
    dtype = DTYPES[acc['componentType']]
    width = COMPONENTS[acc['type']]
    start = view.get('byteOffset', 0) + acc.get('byteOffset', 0)
    stride = view.get('byteStride')
    item = np.dtype(dtype).itemsize * width
    if stride and stride != item:
        raw = np.frombuffer(binary, np.uint8, acc['count'] * stride, start).reshape(-1, stride)
        return raw[:, :item].copy().view(dtype).reshape(acc['count'], width)
    arr = np.frombuffer(binary, dtype, acc['count'] * width, start)
    return arr.reshape(acc['count'], width) if width > 1 else arr.copy()


def local_matrix(node):
    if 'matrix' in node:
        return np.array(node['matrix'], dtype=np.float64).reshape(4, 4).T
    t = node.get('translation', [0, 0, 0])
    x, y, z, w = node.get('rotation', [0, 0, 0, 1])
    s = node.get('scale', [1, 1, 1])
    r = np.array([
        [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
        [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
        [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
    ])
    m = np.eye(4)
    m[:3, :3] = r * np.array(s)
    m[:3, 3] = t
    return m


def translation_only(node):
    m = np.eye(4)
    m[:3, 3] = local_matrix(node)[:3, 3]
    return m


# ------------------------------------------------------------------------------ extraction

def collect(doc, binary):
    """Primitives gardées, en coordonnées monde : [(groupe, rôle, positions, normales, indices)].
    `groupe` vaut 'body' ou le nom de sortie d'une roue."""
    out = []
    materials = doc['materials']

    def walk(index, parent, group):
        node = doc['nodes'][index]
        name = node.get('name') or ''
        if DROP.search(name):
            return
        if name in WHEELS:
            # Pas de braquage : on garde la position de la roue, pas sa rotation (le rayon
            # tourne sur lui-même, sa rotation propre ne se voit pas)
            world = parent @ translation_only(node)
            group = WHEELS[name]
        else:
            world = parent @ local_matrix(node)
        if 'mesh' in node:
            for prim in doc['meshes'][node['mesh']]['primitives']:
                mat = prim.get('material')
                source = materials[mat].get('name') if mat is not None else None
                role = ROLE_OF.get(source)
                if role is None:
                    continue  # matériaux d'intérieur restés sur une pièce extérieure
                pos = accessor(doc, binary, prim['attributes']['POSITION']).astype(np.float64)
                nor = accessor(doc, binary, prim['attributes']['NORMAL']).astype(np.float64)
                idx = accessor(doc, binary, prim['indices']).astype(np.uint32)
                hom = np.c_[pos, np.ones(len(pos))] @ world.T
                normal = nor @ np.linalg.inv(world[:3, :3])  # inverse transposée, appliquée à droite
                normal /= np.linalg.norm(normal, axis=1, keepdims=True) + 1e-12
                if np.linalg.det(world[:3, :3]) < 0:
                    idx = idx.reshape(-1, 3)[:, ::-1].reshape(-1)
                out.append((group, role, hom[:, :3], normal, idx))
        for child in node.get('children', []):
            walk(child, world, group)

    for root in doc['scenes'][doc.get('scene', 0)]['nodes']:
        walk(root, np.eye(4), 'body')
    return out


# ------------------------------------------------------------------------------ écriture GLB

class Writer:
    def __init__(self):
        self.doc = {
            'asset': {'version': '2.0', 'generator': 'prepare_car.py (13b.1, D-53)'},
            'extensionsUsed': ['KHR_materials_clearcoat'],
            'scene': 0, 'scenes': [{'nodes': [0]}], 'nodes': [], 'meshes': [],
            'materials': MATERIALS, 'accessors': [], 'bufferViews': [], 'buffers': [],
        }
        self.bin = bytearray()

    def add(self, array, target, component, kind, bounds=False):
        while len(self.bin) % 4:
            self.bin.append(0)
        raw = np.ascontiguousarray(array).tobytes()
        self.doc['bufferViews'].append(
            {'buffer': 0, 'byteOffset': len(self.bin), 'byteLength': len(raw), 'target': target}
        )
        self.bin += raw
        acc = {
            'bufferView': len(self.doc['bufferViews']) - 1, 'componentType': component,
            'count': len(array), 'type': kind,
        }
        if bounds:
            acc['min'] = array.min(axis=0).tolist()
            acc['max'] = array.max(axis=0).tolist()
        self.doc['accessors'].append(acc)
        return len(self.doc['accessors']) - 1

    def mesh(self, name, parts):
        prims = []
        for role, pos, nor, idx in parts:
            prims.append({
                'attributes': {
                    'POSITION': self.add(pos.astype(np.float32), 34962, 5126, 'VEC3', True),
                    'NORMAL': self.add(nor.astype(np.float32), 34962, 5126, 'VEC3'),
                },
                'indices': self.add(idx.astype(np.uint32), 34963, 5125, 'SCALAR'),
                'material': ROLE_INDEX[role],
            })
        self.doc['meshes'].append({'name': name, 'primitives': prims})
        return len(self.doc['meshes']) - 1

    def write(self, path):
        while len(self.bin) % 4:
            self.bin.append(0)
        self.doc['buffers'] = [{'byteLength': len(self.bin)}]
        js = json.dumps(self.doc, separators=(',', ':')).encode()
        js += b' ' * (-len(js) % 4)
        total = 12 + 8 + len(js) + 8 + len(self.bin)
        with open(path, 'wb') as f:
            f.write(struct.pack('<III', 0x46546C67, 2, total))
            f.write(struct.pack('<II', len(js), 0x4E4F534A) + js)
            f.write(struct.pack('<II', len(self.bin), 0x004E4942) + bytes(self.bin))


def merge(parts):
    """Concatène des primitives du même rôle en une seule."""
    positions, normals, indices, offset = [], [], [], 0
    for pos, nor, idx in parts:
        positions.append(pos)
        normals.append(nor)
        indices.append(idx + offset)
        offset += len(pos)
    return np.vstack(positions), np.vstack(normals), np.concatenate(indices)


def build(prims, path):
    everything = np.vstack([p[2] for p in prims])
    body = np.vstack([p[2] for p in prims if p[0] == 'body'])
    lo, hi = body.min(axis=0), body.max(axis=0)
    scale = TARGET_LENGTH / (hi[2] - lo[2])
    shift = np.array([-(lo[0] + hi[0]) / 2, -everything[:, 1].min(), -(lo[2] + hi[2]) / 2])

    def place(pos):
        return (pos + shift) * scale

    writer = Writer()
    root = {'name': 'car', 'children': []}
    writer.doc['nodes'].append(root)
    for group in ['body', *WHEELS.values()]:
        mine = [p for p in prims if p[0] == group]
        if not mine:
            sys.exit(f'aucune pièce pour {group}')
        centre = np.zeros(3)
        if group != 'body':
            pts = place(np.vstack([p[2] for p in mine]))
            centre = (pts.min(axis=0) + pts.max(axis=0)) / 2
        parts = []
        for role in ROLE_INDEX:
            same = [(place(p[2]) - centre, p[3], p[4]) for p in mine if p[1] == role]
            if same:
                parts.append((role, *merge(same)))
        node = {'name': group, 'mesh': writer.mesh(group, parts)}
        if group != 'body':
            node['translation'] = centre.tolist()
        writer.doc['nodes'].append(node)
        root['children'].append(len(writer.doc['nodes']) - 1)
    writer.write(path)


# ------------------------------------------------------------------------------ contrôle

def stats(path):
    doc, binary = read_glb(path)
    triangles = sum(doc['accessors'][p['indices']]['count'] // 3
                    for m in doc['meshes'] for p in m['primitives'])
    draws = sum(len(m['primitives']) for m in doc['meshes'])
    return triangles, draws, os.path.getsize(path), doc


def npx(*args):
    cmd = ' '.join(['npx', '--yes', GLTF_TRANSFORM, *args])
    subprocess.run(cmd, shell=True, check=True, stdout=subprocess.DEVNULL)


def update_credits(size):
    entries = json.load(open(CREDITS, encoding='utf-8')) if os.path.exists(CREDITS) else []
    entries = [e for e in entries if e.get('file') != 'car.glb']
    entries.insert(0, {
        'file': 'car.glb',
        'usage': 'Voiture de l’auto-école (accueil, parcours) — D-53',
        'source': 'Khronos glTF Sample Assets — Car Concept (glTF-Binary/CarConcept.glb)',
        'url': 'https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept',
        'author': 'Eric Chadwick (modèle et textures), d’après un modèle du domaine public de Unity Fan',
        'owner': '© 2024 Darmstadt Graphics Group GmbH',
        'license': 'CC-BY 4.0 (https://creativecommons.org/licenses/by/4.0/)',
        'modifications': 'Intérieur, essuie-glaces, moteur, plaque, étriers, variantes de peinture et '
                         'toutes les textures retirés (dont les logos Khronos et 3D Commerce, marques '
                         'exclues de la licence) ; vitres opaques ; matériaux regroupés par rôle et '
                         'recolorés au thème ; roues sans braquage ; géométrie soudée et simplifiée '
                         '(scripts/prepare_car.py).',
        'bytes': size,
    })
    with open(CREDITS, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)
        f.write('\n')


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    doc, binary = read_glb(sys.argv[1])
    source_tris = sum(doc['accessors'][p['indices']]['count'] // 3
                      for m in doc['meshes'] for p in m['primitives'])
    prims = collect(doc, binary)

    with tempfile.TemporaryDirectory() as tmp:
        raw = os.path.join(tmp, 'raw.glb')
        welded = os.path.join(tmp, 'welded.glb')
        build(prims, raw)
        raw_tris = stats(raw)[0]
        npx('weld', raw, welded)
        npx('simplify', welded, OUT, '--ratio', SIMPLIFY_RATIO, '--error', SIMPLIFY_ERROR)

    triangles, draws, size, out_doc = stats(OUT)
    names = [n.get('name') for n in out_doc['nodes']]
    print(f'source      : {source_tris} triangles')
    print(f'extérieur   : {raw_tris} triangles')
    print(f'car.glb     : {triangles} triangles, {draws} appels de dessin, {size / 1024:.0f} Ko')
    print(f'nœuds       : {names}')
    print(f'textures    : {len(out_doc.get("images", []))}')
    failures = []
    if size > BUDGET_BYTES:
        failures.append('taille')
    if triangles > BUDGET_TRIANGLES:
        failures.append('triangles')
    if draws > BUDGET_DRAW_CALLS:
        failures.append('appels de dessin')
    if out_doc.get('images'):
        failures.append('textures')
    if failures:
        sys.exit('budget dépassé : ' + ', '.join(failures))
    update_credits(size)
    print('budget respecté ; credits.json mis à jour')


if __name__ == '__main__':
    main()
