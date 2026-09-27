/**
 * Feu tricolore de la scène d'accueil (13b.3, D-53), construit en code : mât, deux têtes dos à
 * dos (les deux sens d'un même axe voient la même couleur — la caméra, placée devant la voiture,
 * voit ainsi le feu allumé), ligne d'arrêt en travers de la route, et un halo de la couleur
 * allumée qui se reflète sur la carrosserie. Position et couleur suivent `trafficState`, lu à
 * chaque image dans `state` : aucun rendu React pendant l'animation.
 */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';
import type { HomeCarPalette, SignalColor, TrafficState } from './homeCar';

/** Bas-côté droit de la voiture (elle regarde vers +z : sa droite est du côté -x). */
const SIDE_X = -2.1;
/** Le mât se dresse juste après la ligne d'arrêt. */
const POLE_AFTER_LINE = 0.5;
const POLE_HEIGHT = 2.1;
const LAMPS: SignalColor[] = ['red', 'orange', 'green'];
const LAMP_SPACING = 0.24;

interface Props {
  palette: HomeCarPalette;
  state: React.MutableRefObject<TrafficState>;
  /** Position z de la ligne d'arrêt quand `lightDistance` vaut 0 (nez de la voiture). */
  noseZ: number;
}

export const TrafficLight = ({ palette, state, noseZ }: Props) => {
  const group = useRef<THREE.Group>(null);
  const line = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.PointLight>(null);

  const colors = useMemo(
    () => ({
      red: new THREE.Color(palette.signalRed),
      orange: new THREE.Color(palette.signalOrange),
      green: new THREE.Color(palette.signalGreen),
      off: new THREE.Color(palette.signalOff),
    }),
    [palette]
  );

  // Un matériau par feu, partagé par les deux têtes : une seule mise à jour par image
  const lamps = useMemo(
    () =>
      LAMPS.map(
        (color) =>
          new THREE.MeshStandardMaterial({
            color: colors.off,
            emissive: colors[color],
            emissiveIntensity: 0,
            roughness: 0.3,
          })
      ),
    [colors]
  );

  useFrame(() => {
    const { lightDistance, signal } = state.current;
    const z = noseZ + lightDistance;
    if (line.current) line.current.position.z = z;
    if (group.current) group.current.position.z = z + POLE_AFTER_LINE;
    LAMPS.forEach((color, i) => {
      const on = color === signal;
      lamps[i].emissiveIntensity = on ? palette.signalGlow : 0;
      lamps[i].color.copy(on ? colors[color] : colors.off);
    });
    if (halo.current) halo.current.color.copy(colors[signal]);
  });

  return (
    <>
      <mesh ref={line} position={[SIDE_X / 2, 0.025, noseZ]}>
        <boxGeometry args={[Math.abs(SIDE_X) + 0.6, 0.01, 0.25]} />
        <meshStandardMaterial color={palette.stopLine} roughness={0.8} />
      </mesh>
      <group ref={group} position={[SIDE_X, 0, noseZ]}>
        <mesh position={[0, POLE_HEIGHT / 2, 0]}>
          <cylinderGeometry args={[0.05, 0.06, POLE_HEIGHT, 12]} />
          <meshStandardMaterial color={palette.post} metalness={0.6} roughness={0.4} />
        </mesh>
        {[1, -1].map((face) => (
          <group key={face} position={[0, POLE_HEIGHT + 0.3, face * 0.1]}>
            <mesh>
              <boxGeometry args={[0.3, 0.84, 0.16]} />
              <meshStandardMaterial color={palette.signalHousing} roughness={0.6} />
            </mesh>
            {lamps.map((material, i) => (
              <mesh
                key={LAMPS[i]}
                position={[0, LAMP_SPACING * (1 - i), face * 0.085]}
                rotation={[face * (Math.PI / 2), 0, 0]}
                material={material}
              >
                <cylinderGeometry args={[0.09, 0.09, 0.02, 20]} />
              </mesh>
            ))}
          </group>
        ))}
        <pointLight
          ref={halo}
          position={[0.6, POLE_HEIGHT, 0]}
          intensity={palette.signalHalo}
          distance={5}
          decay={1.5}
        />
      </group>
    </>
  );
};
