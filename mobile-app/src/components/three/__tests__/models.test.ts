/**
 * Modèles 3D (13.9, D-52 ; 13b.1, D-53) : chaque fichier est inventorié avec sa licence, le tout
 * tient sous 3 Mo, aucun modèle ne dépend d'une texture (fragile sous React Native, et les logos
 * Khronos de la voiture vivaient dans des textures), les matériaux recolorables existent bien,
 * la voiture tient dans le budget de la Phase 13b et le chargement passe par expo-asset.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { Asset } from 'expo-asset';
import { MODELS, MODEL_MATERIALS, resolveModelUri } from '../models';

jest.mock('expo-asset', () => ({
  Asset: { fromModule: jest.fn() },
}));

const DIR = join(__dirname, '..', '..', '..', '..', 'assets', '3d');
const GLB_FILES = readdirSync(DIR).filter((file) => file.endsWith('.glb'));

interface Credit {
  file: string;
  license: string;
  url: string;
  author: string;
  modifications: string;
}

/** Seule exception au CC0 de D-52 : la voiture réaliste, en CC-BY 4.0 (D-53). */
const CC_BY_FILES = ['car.glb'];

interface GltfJson {
  materials?: { name: string }[];
  images?: unknown[];
  nodes?: { name?: string; mesh?: number; translation?: number[] }[];
  meshes?: { primitives: unknown[] }[];
  accessors?: { count: number; min?: number[]; max?: number[] }[];
}

/** Partie JSON d'un fichier GLB (en-tête de 12 octets, puis le premier bloc). */
const gltfJson = (file: string): GltfJson => {
  const data = readFileSync(join(DIR, file));
  expect(data.readUInt32LE(0)).toBe(0x46546c67);
  const length = data.readUInt32LE(12);
  return JSON.parse(data.subarray(20, 20 + length).toString('utf8'));
};

describe('fichiers de assets/3d', () => {
  const credits: Credit[] = JSON.parse(readFileSync(join(DIR, 'credits.json'), 'utf8'));

  it('chaque modèle est inventorié avec sa source et une licence libre', () => {
    expect(GLB_FILES.length).toBeGreaterThan(0);
    for (const file of GLB_FILES) {
      const credit = credits.find((entry) => entry.file === file);
      expect({ file, inventorié: Boolean(credit) }).toEqual({ file, inventorié: true });
      if (CC_BY_FILES.includes(file)) {
        expect(credit!.license).toMatch(/^CC-BY 4\.0/);
        expect(credit!.url).toMatch(/^https:\/\/github\.com\/KhronosGroup\//);
        expect(credit!.author).toMatch(/Eric Chadwick/);
        expect(credit!.modifications).toMatch(/logos Khronos/);
      } else {
        expect(credit!.license).toBe('CC0 1.0');
        expect(credit!.url).toMatch(/^https:\/\/kenney\.nl\//);
      }
      expect(credit!.modifications.length).toBeGreaterThan(0);
    }
  });

  it('le tout tient sous 3 Mo', () => {
    const total = GLB_FILES.reduce((sum, file) => sum + statSync(join(DIR, file)).size, 0);
    expect(total).toBeLessThanOrEqual(3 * 1024 * 1024);
  });

  it('aucun modèle ne dépend d’une texture', () => {
    for (const file of GLB_FILES) {
      expect({ file, images: gltfJson(file).images ?? [] }).toEqual({ file, images: [] });
    }
  });

  it('les matériaux recolorables existent dans les fichiers', () => {
    const names = (file: string) => (gltfJson(file).materials ?? []).map((m) => m.name);
    expect(names('car.glb')).toEqual(expect.arrayContaining([...MODEL_MATERIALS.car]));
    expect(names('cone.glb')).toEqual(expect.arrayContaining([...MODEL_MATERIALS.cone]));
    expect(names('track-straight.glb')).toEqual(expect.arrayContaining([...MODEL_MATERIALS.track]));
  });

  it('la voiture réaliste tient dans le budget de la Phase 13b', () => {
    const car = gltfJson('car.glb');
    const primitives = (car.meshes ?? []).flatMap((mesh) => mesh.primitives) as {
      indices: number;
    }[];
    const triangles = primitives.reduce(
      (sum, primitive) => sum + car.accessors![primitive.indices].count / 3,
      0
    );
    expect(statSync(join(DIR, 'car.glb')).size).toBeLessThanOrEqual(3 * 1024 * 1024);
    expect(triangles).toBeLessThanOrEqual(60000);
    expect(primitives.length).toBeLessThanOrEqual(30);
  });

  it('la voiture a quatre roues séparées, pivot au moyeu, et regarde vers +z', () => {
    const car = gltfJson('car.glb');
    const wheels = (car.nodes ?? []).filter((node) => node.name?.startsWith('wheel-'));
    expect(wheels.map((node) => node.name).sort()).toEqual([
      'wheel-back-left',
      'wheel-back-right',
      'wheel-front-left',
      'wheel-front-right',
    ]);
    const z = (name: string) => wheels.find((node) => node.name === name)!.translation![2];
    // Roues avant du côté +z : la voiture avance vers +z comme la berline Kenney
    expect(z('wheel-front-left')).toBeGreaterThan(0);
    expect(z('wheel-back-left')).toBeLessThan(0);
    // Pneus posés sur le sol : le bas de la roue est à y ≈ 0
    for (const wheel of wheels) {
      const primitive = car.meshes![wheel.mesh!].primitives[0] as { attributes: { POSITION: number } };
      const bottom = wheel.translation![1] + car.accessors![primitive.attributes.POSITION].min![1];
      expect(Math.abs(bottom)).toBeLessThan(0.02);
    }
  });

  it('chaque entrée du registre pointe vers un fichier présent', () => {
    const source = readFileSync(join(__dirname, '..', 'models.ts'), 'utf8');
    const referenced = [...source.matchAll(/assets\/3d\/([\w-]+\.glb)/g)].map((match) => match[1]);
    expect(referenced.sort()).toEqual([...GLB_FILES].sort());
    expect(Object.keys(MODELS)).toHaveLength(GLB_FILES.length);
  });
});

describe('resolveModelUri', () => {
  it('télécharge le modèle au besoin puis renvoie son chemin local', async () => {
    const asset = {
      localUri: null as string | null,
      uri: 'http://metro/assets/car.glb',
      downloadAsync: jest.fn(async function (this: { localUri: string | null }) {
        asset.localUri = 'file:///cache/car.glb';
      }),
    };
    (Asset.fromModule as jest.Mock).mockReturnValue(asset);

    await expect(resolveModelUri('car')).resolves.toBe('file:///cache/car.glb');
    expect(asset.downloadAsync).toHaveBeenCalledTimes(1);
  });

  it('un modèle déjà en cache n’est pas retéléchargé', async () => {
    const asset = { localUri: 'file:///cache/cone.glb', uri: 'x', downloadAsync: jest.fn() };
    (Asset.fromModule as jest.Mock).mockReturnValue(asset);

    await expect(resolveModelUri('cone')).resolves.toBe('file:///cache/cone.glb');
    expect(asset.downloadAsync).not.toHaveBeenCalled();
  });
});
