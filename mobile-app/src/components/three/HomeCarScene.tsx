/**
 * Scène d'accueil (13.10, D-52) : la voiture de l'auto-école sort de l'obscurité phares allumés,
 * ralentit jusqu'à sa place, puis « roule » sur place — le marquage jaune et les lampadaires
 * défilent, les roues tournent — pendant que la caméra oscille lentement autour d'elle.
 * De nuit en thème sombre (brouillard, faisceaux des phares), de jour en thème clair.
 *
 * Se monte toujours dans `Scene3D` (repli sur image fixe, pause hors écran). Les couleurs
 * arrivent en propriétés (`homeCarPalette`) : le `Canvas` ne voit pas le thème.
 */

import React, { Suspense, useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber/native';
import * as THREE from 'three';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MODELS, ModelKey } from './models';
import {
  HomeCarPalette,
  introState,
  scrollOffset,
} from './homeCar';

/** Les pièces du Racing Kit sont petites à côté de la voiture : on les agrandit d'autant. */
const TRACK_SCALE = 3.5;
/** Longueur de la boucle de défilement du décor (unités). */
const SPAN = 24;
const DASHES = Array.from({ length: 12 }, (_, i) => i * 2);
const POSTS = Array.from({ length: 3 }, (_, i) => i * 8);
const ROAD_TILES = Array.from({ length: 9 }, (_, i) => 8 - i * TRACK_SCALE);

/** Charge un modèle du registre (polyfills de react-three-fiber : expo-asset + expo-file-system). */
const useModel = (key: ModelKey): GLTF => useLoader(GLTFLoader, MODELS[key] as string) as GLTF;

type Tint = Record<string, string>;
type Glow = Record<string, [string, number]>;

/** Clone chaque matériau du modèle et le recolore par son nom de rôle (`prepare_models.py`). */
const recolor = (root: THREE.Object3D, tint: Tint, glow: Glow = {}) => {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const base = mesh.material as THREE.MeshStandardMaterial;
    const material = base.clone();
    const color = tint[base.name];
    if (color) material.color.set(color);
    const light = glow[base.name];
    if (light) {
      material.emissive.set(light[0]);
      material.emissiveIntensity = light[1];
    }
    mesh.material = material;
  });
  return root;
};

const Car = ({ palette, speed }: { palette: HomeCarPalette; speed: React.MutableRefObject<number> }) => {
  const gltf = useModel('sedan');
  const car = useMemo(
    () =>
      recolor(
        gltf.scene.clone(true),
        {
          paint: palette.paint,
          glass: palette.glass,
          dark: palette.tyre,
          rim: palette.trim,
          chrome: palette.trim,
        },
        {
          headlight: [palette.headlight, palette.headlightIntensity],
          indicator: [palette.beam, palette.headlightIntensity * 0.5],
          taillight: [palette.taillight, palette.mode === 'night' ? 1.4 : 0.3],
        }
      ),
    [gltf, palette]
  );
  const wheels = useMemo(() => {
    const found: THREE.Object3D[] = [];
    car.traverse((object) => {
      if (/wheel/.test(object.name) && !(object as THREE.Mesh).isMesh) found.push(object);
    });
    return found;
  }, [car]);

  useFrame((_, delta) => {
    // Roues de 0,3 de rayon : un tour pour 2π × 0,3 parcourus
    for (const wheel of wheels) wheel.rotation.x += (speed.current * delta) / 0.3;
  });

  return <primitive object={car} />;
};

const Road = ({ palette }: { palette: HomeCarPalette }) => {
  const gltf = useModel('trackStraight');
  const tiles = useMemo(
    () =>
      ROAD_TILES.map((z) => {
        const tile = recolor(gltf.scene.clone(true), {
          road: palette.road,
          grey: palette.kerb,
          grass: palette.ground,
        });
        // Pivot de la pièce Kenney dans un coin : on la recentre sur la voiture
        tile.scale.setScalar(TRACK_SCALE);
        tile.position.set(-0.15 * TRACK_SCALE, 0, z + 1.15 * TRACK_SCALE);
        return tile;
      }),
    [gltf, palette]
  );
  return (
    <>
      {tiles.map((tile) => (
        <primitive key={tile.uuid} object={tile} />
      ))}
    </>
  );
};

const LightPosts = ({ palette, travelled }: { palette: HomeCarPalette; travelled: React.MutableRefObject<number> }) => {
  const gltf = useModel('lightPost');
  const posts = useMemo(
    () =>
      POSTS.flatMap((base) =>
        [-1, 1].map((side) => {
          const post = recolor(gltf.scene.clone(true), { _defaultMat: palette.post, grey: palette.post });
          post.scale.setScalar(TRACK_SCALE);
          post.rotation.y = side > 0 ? Math.PI : 0;
          return { post, base, side };
        })
      ),
    [gltf, palette]
  );

  useFrame(() => {
    for (const { post, base, side } of posts) {
      post.position.set(side * 2.6, 0, scrollOffset(base, travelled.current, SPAN) - 16);
    }
  });

  return (
    <>
      {posts.map(({ post }) => (
        <primitive key={post.uuid} object={post} />
      ))}
    </>
  );
};

const Dashes = ({ palette, travelled }: { palette: HomeCarPalette; travelled: React.MutableRefObject<number> }) => {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(() => {
    DASHES.forEach((base, i) => {
      const dash = refs.current[i];
      if (dash) dash.position.z = scrollOffset(base, travelled.current, SPAN) - 16;
    });
  });
  return (
    <>
      {DASHES.map((base, i) => (
        <mesh
          key={base}
          ref={(mesh) => {
            refs.current[i] = mesh;
          }}
          position={[0, 0.03, base - 16]}
        >
          <boxGeometry args={[0.1, 0.01, 0.8]} />
          <meshStandardMaterial
            color={palette.line}
            emissive={palette.line}
            emissiveIntensity={palette.mode === 'night' ? 0.6 : 0.1}
          />
        </mesh>
      ))}
    </>
  );
};

/** Faisceaux des phares : deux cônes translucides en mélange additif (de nuit seulement). */
const Beams = ({ palette }: { palette: HomeCarPalette }) => (
  <>
    {[-0.42, 0.42].map((x) => (
      <mesh key={x} position={[x, 0.55, 3.2]} rotation={[-Math.PI / 2 - 0.08, 0, 0]}>
        <coneGeometry args={[0.95, 4, 24, 1, true]} />
        <meshBasicMaterial
          color={palette.beam}
          transparent
          opacity={0.1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
    ))}
  </>
);

export const HomeCarScene = ({ palette }: { palette: HomeCarPalette }) => {
  const elapsed = useRef(0);
  const travelled = useRef(0);
  const speed = useRef(0);
  const carGroup = useRef<THREE.Group>(null);
  const beamTarget = useMemo(() => {
    const target = new THREE.Object3D();
    target.position.set(0, 0, 9);
    return target;
  }, []);

  useFrame((state, delta) => {
    elapsed.current += delta;
    const intro = introState(elapsed.current);
    speed.current = intro.speed;
    travelled.current += intro.speed * delta;
    if (carGroup.current) carGroup.current.position.z = intro.carZ;

    // Caméra : trois-quarts avant, qui oscille lentement autour de la voiture
    const angle = 0.6 + Math.sin(elapsed.current * 0.2) * 0.45;
    state.camera.position.set(Math.sin(angle) * 6.2, 2.3, Math.cos(angle) * 6.2);
    state.camera.lookAt(0, 0.55, 0);
  });

  const night = palette.mode === 'night';

  return (
    <>
      <color attach="background" args={[palette.background]} />
      <fog attach="fog" args={[palette.background, palette.fogNear, palette.fogFar]} />
      <ambientLight color={palette.ambient} intensity={palette.ambientIntensity} />
      <directionalLight position={[4, 6, 3]} intensity={palette.keyIntensity} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, -4]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color={palette.ground} roughness={1} />
      </mesh>

      <Suspense fallback={null}>
        <Road palette={palette} />
        <LightPosts palette={palette} travelled={travelled} />
      </Suspense>
      <Dashes palette={palette} travelled={travelled} />

      <group ref={carGroup} position={[0, 0, -10]}>
        <Suspense fallback={null}>
          <Car palette={palette} speed={speed} />
        </Suspense>
        {night ? (
          <>
            <Beams palette={palette} />
            <primitive object={beamTarget} />
            <spotLight
              position={[0, 0.8, 1.3]}
              target={beamTarget}
              color={palette.headlight}
              intensity={palette.headlightIntensity * 12}
              angle={0.55}
              penumbra={0.7}
              distance={14}
              decay={1.6}
            />
            <pointLight position={[0, 0.9, -1.6]} color={palette.taillight} intensity={2} distance={3} />
          </>
        ) : null}
      </group>
    </>
  );
};
