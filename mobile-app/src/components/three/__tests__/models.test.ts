/**
 * Modèles 3D (13.9, D-52) : chaque fichier est inventorié avec sa licence, le tout tient sous
 * 3 Mo, aucun modèle ne dépend d'une texture (fragile sous React Native), les matériaux
 * recolorables existent bien, et le chargement passe par expo-asset.
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
  modifications: string;
}

/** Partie JSON d'un fichier GLB (en-tête de 12 octets, puis le premier bloc). */
const gltfJson = (file: string): { materials?: { name: string }[]; images?: unknown[] } => {
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
      expect(credit!.license).toBe('CC0 1.0');
      expect(credit!.url).toMatch(/^https:\/\/kenney\.nl\//);
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
    expect(names('car-sedan.glb')).toEqual(expect.arrayContaining([...MODEL_MATERIALS.sedan]));
    expect(names('cone.glb')).toEqual(expect.arrayContaining([...MODEL_MATERIALS.cone]));
    expect(names('track-straight.glb')).toEqual(expect.arrayContaining([...MODEL_MATERIALS.track]));
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
      uri: 'http://metro/assets/car-sedan.glb',
      downloadAsync: jest.fn(async function (this: { localUri: string | null }) {
        asset.localUri = 'file:///cache/car-sedan.glb';
      }),
    };
    (Asset.fromModule as jest.Mock).mockReturnValue(asset);

    await expect(resolveModelUri('sedan')).resolves.toBe('file:///cache/car-sedan.glb');
    expect(asset.downloadAsync).toHaveBeenCalledTimes(1);
  });

  it('un modèle déjà en cache n’est pas retéléchargé', async () => {
    const asset = { localUri: 'file:///cache/cone.glb', uri: 'x', downloadAsync: jest.fn() };
    (Asset.fromModule as jest.Mock).mockReturnValue(asset);

    await expect(resolveModelUri('cone')).resolves.toBe('file:///cache/cone.glb');
    expect(asset.downloadAsync).not.toHaveBeenCalled();
  });
});
