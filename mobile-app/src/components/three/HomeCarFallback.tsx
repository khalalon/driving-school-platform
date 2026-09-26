/**
 * Image fixe de la scène d'accueil (13.10, D-52) : la voiture de profil sur sa route, phares et
 * traînées de vitesse, dans les couleurs du thème (de nuit en sombre, de jour en clair).
 * Affichée à la place de la 3D sous « réduire les animations », pendant son chargement, ou si
 * le téléphone ne suit pas. Vectorielle : nette à toute taille, sans fichier à charger.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';
import { homeCarPalette } from './homeCar';

export const HomeCarFallback = () => {
  const theme = useTheme();
  const palette = homeCarPalette(theme);
  const night = palette.mode === 'night';

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]} testID="home-car-fallback">
      <Svg width="100%" height="100%" viewBox="0 0 360 200" preserveAspectRatio="xMidYMid slice">
        <Rect x="0" y="146" width="360" height="54" fill={palette.road} />
        {[18, 78, 138, 198, 258, 318].map((x) => (
          <Rect key={x} x={x} y="171" width="30" height="4" rx="2" fill={palette.line} />
        ))}
        {[108, 124, 140].map((y, i) => (
          <Rect
            key={y}
            x="0"
            y={y}
            width={[96, 64, 82][i]}
            height="2"
            fill={palette.line}
            opacity={night ? 0.45 : 0.3}
          />
        ))}
        {night ? (
          <Path d="M 306 118 L 360 96 L 360 150 Z" fill={palette.beam} opacity={0.14} />
        ) : null}
        <Path
          d="M 96 132 L 100 122 C 120 116 142 112 160 110 L 186 94 C 204 88 230 88 246 94 L 270 108 C 286 111 298 116 302 124 L 302 134 L 96 134 Z"
          fill={palette.paint}
        />
        <Path d="M 190 108 L 198 98 C 211 94 226 94 236 97 L 240 108 Z" fill={palette.glass} />
        <Rect x="290" y="117" width="12" height="5" rx="2" fill={palette.headlight} />
        <Rect x="96" y="118" width="7" height="5" rx="2" fill={palette.taillight} />
        <Circle cx="138" cy="134" r="14" fill={palette.tyre} />
        <Circle cx="138" cy="134" r="6" fill={palette.trim} />
        <Circle cx="262" cy="134" r="14" fill={palette.tyre} />
        <Circle cx="262" cy="134" r="6" fill={palette.trim} />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
});
