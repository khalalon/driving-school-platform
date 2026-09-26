/**
 * Scène d'essai (13.8, D-52) : une voiture assemblée de primitives (caisse, habitacle, roues,
 * phares), éclairage de nuit, rotation lente. Elle ne sert qu'à mesurer la fluidité de la 3D
 * sur un vrai téléphone avant d'investir dans les modèles (13.9) ; elle est retirée en 13.10
 * avec l'indicateur `SHOW_3D_PROBE`.
 *
 * Les couleurs arrivent en propriétés : `Canvas` ne voit pas le thème (voir `Scene3D`).
 */

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber/native';
import type { Group } from 'three';

/** Affiche la scène d'essai en tête de l'accueil élève (vérification humaine de 13.8). */
export const SHOW_3D_PROBE = true;

export interface ProbeSceneColors {
  body: string;
  glass: string;
  lights: string;
  tyres: string;
  ground: string;
}

const WHEELS: [number, number, number][] = [
  [-0.85, 0.32, 0.72],
  [0.85, 0.32, 0.72],
  [-0.85, 0.32, -0.72],
  [0.85, 0.32, -0.72],
];

export const ProbeScene = ({ colors }: { colors: ProbeSceneColors }) => {
  const car = useRef<Group>(null);

  useFrame((_, delta) => {
    if (car.current) {
      car.current.rotation.y += delta * 0.35;
    }
  });

  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 5, 2]} intensity={0.9} />
      <pointLight position={[0, 1.2, 2.6]} intensity={2.2} distance={6} color={colors.lights} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[2.6, 48]} />
        <meshStandardMaterial color={colors.ground} roughness={0.95} />
      </mesh>

      <group ref={car} position={[0, 0, 0]}>
        {/* Caisse */}
        <mesh position={[0, 0.55, 0]}>
          <boxGeometry args={[2.1, 0.5, 1.2]} />
          <meshStandardMaterial color={colors.body} metalness={0.6} roughness={0.35} />
        </mesh>
        {/* Habitacle */}
        <mesh position={[-0.1, 0.98, 0]}>
          <boxGeometry args={[1.1, 0.42, 1.0]} />
          <meshStandardMaterial color={colors.glass} metalness={0.2} roughness={0.1} />
        </mesh>
        {/* Roues */}
        {WHEELS.map((position) => (
          <mesh key={position.join(',')} position={position} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 0.22, 24]} />
            <meshStandardMaterial color={colors.tyres} roughness={0.8} />
          </mesh>
        ))}
        {/* Phares */}
        {[-0.38, 0.38].map((z) => (
          <mesh key={z} position={[1.06, 0.6, z]}>
            <boxGeometry args={[0.04, 0.1, 0.26]} />
            <meshStandardMaterial
              color={colors.lights}
              emissive={colors.lights}
              emissiveIntensity={2}
            />
          </mesh>
        ))}
      </group>
    </>
  );
};
