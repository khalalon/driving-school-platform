/**
 * Parcours 3D (13.11, D-52 ; caméra qui suit la voiture 13b.5, D-53) : le circuit ovale vu du
 * ciel, un secteur par étape (ordre D-45). Fait → jaune signal, en cours → turquoise qui pulse
 * doucement, à venir → piste éteinte. Des cônes balisent Manœuvre et Parc.
 *
 * À l'ouverture, la voiture de l'auto-école part de la ligne de départ et roule jusqu'au
 * secteur en cours, roues qui tournent, pendant que la caméra la suit ; puis la caméra remonte
 * en vue d'ensemble. Choisir une étape (sur la barre de secteurs ou en touchant la piste,
 * `onSelect`) fait glisser la caméra au-dessus de son secteur (`focusKey`).
 *
 * Se monte dans `Scene3D` (repli : la `SectorBar`, toujours visible sous la scène). Les couleurs
 * arrivent en propriétés : le `Canvas` ne voit pas le thème.
 */

import React, { Suspense, useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber/native';
import * as THREE from 'three';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MODELS, ModelKey } from './models';
import {
  JourneyTrackPalette,
  PERIMETER,
  TRACK,
  driveU,
  journeyCamera,
  parkingU,
  sectorRange,
  stadiumHeading,
  stadiumPoint,
} from './journeyTrack';
import { WHEEL_RADIUS } from './homeCar';

/** La voiture réaliste (2,6 unités de long) ramenée à l'échelle de la piste (0,94 de long). */
const CAR_SCALE = 0.36;
import type { SectorState } from '../circuit/SectorBar';

const useModel = (key: ModelKey): GLTF => useLoader(GLTFLoader, MODELS[key] as string) as GLTF;

export interface TrackSector {
  key: string;
  state: SectorState;
}

/** Ruban plat qui suit le circuit entre deux fractions de tour. */
const ribbonGeometry = (from: number, to: number, width: number, y: number): THREE.BufferGeometry => {
  const steps = Math.max(8, Math.round((to - from) * 160));
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const u = from + ((to - from) * i) / steps;
    const p = stadiumPoint(u);
    const heading = stadiumHeading(u);
    // Normale au sol : perpendiculaire au cap
    const nx = Math.cos(heading);
    const nz = -Math.sin(heading);
    positions.push(p.x + (nx * width) / 2, y, p.z + (nz * width) / 2);
    positions.push(p.x - (nx * width) / 2, y, p.z - (nz * width) / 2);
    if (i < steps) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
};

const stateColor = (palette: JourneyTrackPalette, state: SectorState): string =>
  state === 'done' ? palette.done : state === 'current' ? palette.current : palette.todo;

const SectorMesh = ({
  index,
  count,
  sector,
  selected,
  palette,
  onSelect,
}: {
  index: number;
  count: number;
  sector: TrackSector;
  selected: boolean;
  palette: JourneyTrackPalette;
  onSelect?: (key: string) => void;
}) => {
  const [from, to] = sectorRange(index, count);
  const geometry = useMemo(() => ribbonGeometry(from, to, TRACK.width, 0.03), [from, to]);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const lit = sector.state !== 'todo';

  useFrame((state) => {
    if (material.current && sector.state === 'current') {
      // La télémétrie « respire » : l'étape en cours se remarque sans clignoter
      material.current.emissiveIntensity = 0.55 + Math.sin(state.clock.elapsedTime * 2.2) * 0.3;
    }
  });

  return (
    <mesh
      geometry={geometry}
      position={[0, selected ? 0.06 : 0, 0]}
      onClick={onSelect ? () => onSelect(sector.key) : undefined}
    >
      <meshStandardMaterial
        ref={material}
        color={stateColor(palette, sector.state)}
        emissive={lit ? stateColor(palette, sector.state) : palette.todo}
        emissiveIntensity={lit ? (selected ? 0.9 : 0.5) : 0}
        roughness={0.6}
      />
    </mesh>
  );
};

/** Voiture qui roule de la ligne de départ jusqu'à sa place (`elapsed` partagé avec la caméra). */
const Car = ({
  target,
  elapsed,
  palette,
}: {
  target: number;
  elapsed: React.MutableRefObject<number>;
  palette: JourneyTrackPalette;
}) => {
  const gltf = useModel('car');
  const car = useMemo(() => {
    const root = gltf.scene.clone(true);
    root.scale.setScalar(CAR_SCALE);
    const tint: Record<string, string> = {
      paint: palette.car,
      paintAccent: palette.glass,
      glass: palette.glass,
      tyre: palette.glass,
      rim: palette.glass,
      trim: palette.glass,
      chrome: palette.chrome,
      mechanical: palette.chrome,
    };
    root.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      const material = (mesh.material as THREE.MeshStandardMaterial).clone();
      const color = tint[material.name];
      if (color) material.color.set(color);
      if (material.name === 'headlight') {
        material.emissive.set(palette.headlight);
        material.emissiveIntensity = palette.night ? 2 : 0.4;
      }
      mesh.material = material;
    });
    return root;
  }, [gltf, palette]);
  const wheels = useMemo(() => {
    const found: THREE.Object3D[] = [];
    car.traverse((object) => {
      if (object.name.startsWith('wheel-')) found.push(object);
    });
    return found;
  }, [car]);
  const lastU = useRef(0);

  useFrame(() => {
    const u = driveU(elapsed.current, target);
    const p = stadiumPoint(u);
    car.position.set(p.x, 0.02, p.z);
    car.rotation.y = stadiumHeading(u);
    // Roues : la distance parcourue sur la piste, ramenée à l'échelle de la voiture
    const turn = ((u - lastU.current) * PERIMETER) / (WHEEL_RADIUS * CAR_SCALE);
    for (const wheel of wheels) wheel.rotation.x += turn;
    lastU.current = u;
  });

  return <primitive object={car} />;
};

/** Cônes de manœuvre à l'intérieur de la piste, au milieu d'un secteur. */
const Cones = ({ sectorIndex, count }: { sectorIndex: number; count: number }) => {
  const gltf = useModel('cone');
  const cones = useMemo(() => {
    const [from, to] = sectorRange(sectorIndex, count);
    return [0.3, 0.5, 0.7].map((f) => {
      const u = from + (to - from) * f;
      const p = stadiumPoint(u);
      const heading = stadiumHeading(u);
      const cone = gltf.scene.clone(true);
      cone.scale.setScalar(0.35);
      // Côté intérieur du virage : à gauche du sens de marche
      cone.position.set(p.x - Math.cos(heading) * 0.75, 0, p.z + Math.sin(heading) * 0.75);
      return cone;
    });
  }, [gltf, sectorIndex, count]);
  return (
    <>
      {cones.map((cone) => (
        <primitive key={cone.uuid} object={cone} />
      ))}
    </>
  );
};

export const JourneyTrackScene = ({
  sectors,
  carSector,
  selectedKey,
  focusKey,
  palette,
  onSelect,
}: {
  sectors: TrackSector[];
  /** Secteur de la voiture ; `null` quand tout est conclu (voiture sur la ligne d'arrivée). */
  carSector: number | null;
  /** Secteur mis en avant (celui dont le détail est ouvert sous la scène). */
  selectedKey?: string | null;
  /** Étape choisie par l'élève : la caméra glisse vers son secteur. Sans choix, vue d'ensemble. */
  focusKey?: string | null;
  palette: JourneyTrackPalette;
  onSelect?: (key: string) => void;
}) => {
  const elapsed = useRef(0);
  const look = useRef(new THREE.Vector3(0, 0, 0.3));
  const placed = useRef(false);
  const target = parkingU(carSector, sectors.length);
  const focusIndex = focusKey ? sectors.findIndex((sector) => sector.key === focusKey) : -1;

  const kerb = useMemo(() => ribbonGeometry(0, 1, TRACK.width + 0.24, 0.015), []);
  const start = stadiumPoint(0);
  const coneSectors = [2, 3].filter((index) => index < sectors.length);

  useFrame((state, delta) => {
    elapsed.current += delta;
    const pose = journeyCamera(
      elapsed.current,
      target,
      focusIndex >= 0 ? focusIndex : null,
      sectors.length
    );
    // La caméra glisse vers la pose voulue : un choix d'étape ne la fait jamais sauter
    const follow = placed.current ? 1 - Math.exp(-4 * delta) : 1;
    placed.current = true;
    state.camera.position.lerp(new THREE.Vector3(...pose.position), follow);
    look.current.lerp(new THREE.Vector3(...pose.look), follow);
    state.camera.lookAt(look.current);
  });

  return (
    <>
      <color attach="background" args={[palette.background]} />
      <ambientLight intensity={palette.night ? 0.55 : 1.1} />
      <directionalLight position={[3, 8, 4]} intensity={palette.night ? 0.7 : 1.4} />

      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color={palette.ground} roughness={1} />
      </mesh>
      <mesh geometry={kerb}>
        <meshStandardMaterial color={palette.kerb} roughness={0.9} />
      </mesh>

      {sectors.map((sector, index) => (
        <SectorMesh
          key={sector.key}
          index={index}
          count={sectors.length}
          sector={sector}
          selected={sector.key === selectedKey}
          palette={palette}
          onSelect={onSelect}
        />
      ))}

      {/* Ligne de départ / d'arrivée */}
      <mesh position={[start.x, 0.05, start.z]}>
        <boxGeometry args={[0.12, 0.02, TRACK.width + 0.24]} />
        <meshStandardMaterial color={palette.headlight} emissive={palette.headlight} emissiveIntensity={0.4} />
      </mesh>

      <Suspense fallback={null}>
        {coneSectors.map((index) => (
          <Cones key={index} sectorIndex={index} count={sectors.length} />
        ))}
        <Car target={target} elapsed={elapsed} palette={palette} />
      </Suspense>
    </>
  );
};
