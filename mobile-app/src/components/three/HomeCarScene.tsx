/**
 * Scène d'accueil (13.10, D-52 ; rendu réaliste 13b.2, feu tricolore 13b.3, D-53) : la voiture
 * de l'auto-école sort de l'obscurité phares allumés, freine jusqu'à sa place (feux stop), puis
 * « roule » sur place — le marquage jaune et les lampadaires défilent, les roues tournent —
 * pendant que la caméra oscille lentement autour d'elle. Ensuite, en boucle, un feu tricolore
 * arrive : orange, rouge, la voiture s'arrête à la ligne, vert, elle repart (`trafficState`).
 * De nuit en thème sombre (brouillard, faisceaux des phares), de jour en thème clair.
 *
 * Réalisme : la carrosserie vernie reflète un environnement calculé dans la scène (aucun
 * fichier HDR) ; une ombre de contact, texture dégradée construite en code, la pose au sol.
 * Si le téléphone ne sait pas calculer l'environnement, la scène reste lisible sans reflets.
 *
 * Se monte toujours dans `Scene3D` (repli sur image fixe, pause hors écran). Les couleurs
 * arrivent en propriétés (`homeCarPalette`) : le `Canvas` ne voit pas le thème.
 */

import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber/native';
import * as THREE from 'three';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { MODELS, ModelKey } from './models';
import { TrafficLight } from './TrafficLight';
import { OrbitState, stepOrbit, tiltOffset } from './orbit';
import {
  HomeCarPalette,
  INTRO_DURATION,
  TrafficState,
  brakeLevel,
  cameraRig,
  introState,
  scrollOffset,
  trafficState,
  wheelTurn,
} from './homeCar';

/** Les pièces du Racing Kit sont petites à côté de la voiture : on les agrandit d'autant. */
const TRACK_SCALE = 3.5;
/** Longueur de la boucle de défilement du décor (unités). */
const SPAN = 24;
const DASHES = Array.from({ length: 12 }, (_, i) => i * 2);
const POSTS = Array.from({ length: 3 }, (_, i) => i * 8);
const ROAD_TILES = Array.from({ length: 9 }, (_, i) => 8 - i * TRACK_SCALE);
/** Phares de `car.glb` : centre de chaque bloc optique (x), hauteur et nez de la voiture. */
const HEADLIGHTS_X = [-0.36, 0.36];
const HEADLIGHT_Y = 0.39;
const NOSE_Z = 1.22;

/** Charge un modèle du registre (polyfills de react-three-fiber : expo-asset + expo-file-system). */
const useModel = (key: ModelKey): GLTF => useLoader(GLTFLoader, MODELS[key] as string) as GLTF;

type Tint = Record<string, string>;
type Glow = Record<string, [string, number]>;

/** Clone chaque matériau du modèle et le recolore par son nom de rôle (`prepare_*.py`). */
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

/**
 * Reflets : un environnement de studio (`RoomEnvironment`, géométrie seule) préfiltré par
 * `PMREMGenerator` devient l'environnement de la scène. Échec possible sur un GPU modeste
 * (cibles de rendu flottantes) : la scène garde alors son seul éclairage direct.
 */
const Reflections = ({ intensity }: { intensity: number }) => {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);

  useEffect(() => {
    let texture: THREE.Texture | null = null;
    let generator: THREE.PMREMGenerator | null = null;
    try {
      generator = new THREE.PMREMGenerator(gl);
      const room = new RoomEnvironment();
      texture = generator.fromScene(room, 0.04).texture;
      room.clear();
      scene.environment = texture;
      scene.environmentIntensity = intensity;
    } catch {
      scene.environment = null;
    }
    return () => {
      scene.environment = null;
      texture?.dispose();
      generator?.dispose();
    };
  }, [gl, scene, intensity]);

  return null;
};

/** Texture 64 × 64 : disque dont l'opacité décroît du centre vers le bord (ombre douce). */
const makeShadowTexture = () => {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (x + 0.5) / size - 0.5;
      const dy = (y + 0.5) / size - 0.5;
      const d = Math.min(Math.sqrt(dx * dx + dy * dy) * 2, 1);
      const i = (y * size + x) * 4;
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = Math.round(255 * Math.pow(1 - d, 1.6));
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.needsUpdate = true;
  return texture;
};

const ContactShadow = ({ palette }: { palette: HomeCarPalette }) => {
  const texture = useMemo(makeShadowTexture, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
      <planeGeometry args={[1.9, 3.2]} />
      <meshBasicMaterial
        map={texture}
        color={palette.shadow}
        transparent
        opacity={palette.shadowOpacity}
        depthWrite={false}
      />
    </mesh>
  );
};

interface Motion {
  /** Vitesse sur la route (fait tourner les roues). */
  groundSpeed: React.MutableRefObject<number>;
  /** Freinage de 0 à 1 (feux stop). */
  brake: React.MutableRefObject<number>;
}

const Car = ({ palette, motion }: { palette: HomeCarPalette; motion: Motion }) => {
  const gltf = useModel('car');
  const car = useMemo(
    () =>
      recolor(
        gltf.scene.clone(true),
        {
          paint: palette.paint,
          paintAccent: palette.paintAccent,
          glass: palette.glass,
          tyre: palette.tyre,
          rim: palette.tyre,
          chrome: palette.chrome,
          trim: palette.tyre,
          mechanical: palette.trim,
        },
        {
          headlight: [palette.headlight, palette.headlightIntensity],
          indicator: [palette.beam, palette.headlightIntensity * 0.3],
          taillight: [palette.taillight, palette.taillightIntensity],
        }
      ),
    [gltf, palette]
  );
  const { wheels, taillights } = useMemo(() => {
    const found = { wheels: [] as THREE.Object3D[], taillights: [] as THREE.MeshStandardMaterial[] };
    car.traverse((object) => {
      if (object.name.startsWith('wheel-')) found.wheels.push(object);
      const mesh = object as THREE.Mesh;
      const material = mesh.material as THREE.MeshStandardMaterial | undefined;
      if (mesh.isMesh && material?.name === 'taillight') found.taillights.push(material);
    });
    return found;
  }, [car]);

  useFrame((_, delta) => {
    const turn = wheelTurn(motion.groundSpeed.current * delta);
    for (const wheel of wheels) wheel.rotation.x += turn;
    const glow = palette.taillightIntensity + palette.brakeBoost * motion.brake.current;
    for (const material of taillights) material.emissiveIntensity = glow;
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
    {HEADLIGHTS_X.map((x) => (
      <mesh key={x} position={[x, HEADLIGHT_Y, NOSE_Z + 2]} rotation={[-Math.PI / 2 - 0.06, 0, 0]}>
        <coneGeometry args={[0.85, 4, 24, 1, true]} />
        <meshBasicMaterial
          color={palette.beam}
          transparent
          opacity={0.09}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
    ))}
  </>
);

interface HomeCarSceneProps {
  palette: HomeCarPalette;
  /** Voiture au doigt et inclinaison (13b.4) ; sans lui, la caméra suit son seul balancement. */
  orbit?: OrbitState;
}

export const HomeCarScene = ({ palette, orbit }: HomeCarSceneProps) => {
  const elapsed = useRef(0);
  const travelled = useRef(0);
  const groundSpeed = useRef(0);
  const brake = useRef(0);
  const traffic = useRef<TrafficState>(trafficState(0));
  const motion = useMemo<Motion>(() => ({ groundSpeed, brake }), []);
  const carGroup = useRef<THREE.Group>(null);
  const beamTarget = useMemo(() => {
    const target = new THREE.Object3D();
    target.position.set(0, 0, 9);
    return target;
  }, []);

  useFrame((state, delta) => {
    elapsed.current += delta;
    const intro = introState(elapsed.current);
    // Pendant l'arrivée, le feu attend hors champ (début de cycle) ; ensuite, il mène la danse
    traffic.current = trafficState(intro.done ? elapsed.current - INTRO_DURATION : 0);
    const scroll = intro.done ? traffic.current.speed : intro.speed;
    const ground = intro.done ? traffic.current.speed : intro.groundSpeed;
    // Feux stop lissés : une image lente ne doit pas les faire clignoter. Au rouge, la voiture
    // arrêtée garde le pied sur le frein.
    const target = Math.max(
      brakeLevel(groundSpeed.current, ground, delta),
      intro.done ? traffic.current.braking : 0
    );
    brake.current += (target - brake.current) * Math.min(delta * 10, 1);
    groundSpeed.current = ground;
    travelled.current += scroll * delta;
    if (carGroup.current) carGroup.current.position.z = intro.carZ;

    // Caméra : trois-quarts avant, qui oscille lentement autour de la voiture ; plan large
    // quand le feu est proche, pour garder sa tête dans le cadre
    const rig = cameraRig(elapsed.current, traffic.current.lightDistance);
    let angle = rig.angle;
    let height = rig.height;
    if (orbit) {
      stepOrbit(orbit, delta);
      const tilt = tiltOffset(orbit);
      angle += orbit.offset + tilt.angle;
      height = Math.max(0.6, height + tilt.height);
    }
    state.camera.position.set(Math.sin(angle) * rig.distance, height, Math.cos(angle) * rig.distance);
    state.camera.lookAt(rig.lookX, rig.lookY, 0);
  });

  const night = palette.mode === 'night';

  return (
    <>
      <color attach="background" args={[palette.background]} />
      <fog attach="fog" args={[palette.background, palette.fogNear, palette.fogFar]} />
      <Reflections intensity={palette.envIntensity} />
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
      <TrafficLight palette={palette} state={traffic} noseZ={NOSE_Z} />

      <group ref={carGroup} position={[0, 0, -10]}>
        <ContactShadow palette={palette} />
        <Suspense fallback={null}>
          <Car palette={palette} motion={motion} />
        </Suspense>
        {night ? (
          <>
            <Beams palette={palette} />
            <primitive object={beamTarget} />
            <spotLight
              position={[0, 0.55, NOSE_Z]}
              target={beamTarget}
              color={palette.headlight}
              intensity={palette.headlightIntensity * 12}
              angle={0.55}
              penumbra={0.7}
              distance={14}
              decay={1.6}
            />
            <pointLight position={[0, 0.6, -1.5]} color={palette.taillight} intensity={2} distance={3} />
          </>
        ) : null}
      </group>
    </>
  );
};
