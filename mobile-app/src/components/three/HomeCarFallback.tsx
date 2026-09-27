/**
 * Image fixe de la scène d'accueil (13.10, D-52 ; silhouette de la voiture réaliste en 13b.2,
 * D-53) : la voiture de profil sur sa route, phares et traînées de vitesse, dans les couleurs du
 * thème (de nuit en sombre, de jour en clair).
 * Affichée à la place de la 3D sous « réduire les animations », pendant son chargement, ou si
 * le téléphone ne suit pas. Vectorielle : nette à toute taille, sans fichier à charger.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';
import { homeCarPalette } from './homeCar';

const BODY =
  'M 99 106 L 113 100 L 134 97 L 161 94 L 196 94 L 216 97 L 237 102 L 257 107 L 278 109 L 292 114 ' +
  'L 299 118 L 299 141 L 280 142 L 276 126 L 271 119 L 264 113 L 257 110 L 251 112 L 244 120 ' +
  'L 240 143 L 148 143 L 144 126 L 141 122 L 134 114 L 127 111 L 120 111 L 113 116 L 108 140 L 99 140 Z';
const GLASS =
  'M 119 99 L 144 96 L 169 94 L 206 95 L 231 101 L 255 106 L 255 109 L 231 105 L 206 105 L 169 103 ' +
  'L 144 102 L 119 101 Z';

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
          <Path d="M 296 117 L 360 94 L 360 150 Z" fill={palette.beam} opacity={0.14} />
        ) : null}
        {/* Profil relevé sur car.glb (13b.2) : longueur 206 px, sol à y = 148 */}
        <Path d={BODY} fill={palette.paint} />
        <Path d={GLASS} fill={palette.glass} />
        <Rect x="286" y="114" width="10" height="5" rx="2" fill={palette.headlight} />
        <Rect x="100" y="100" width="12" height="4" rx="2" fill={palette.taillight} />
        {[126, 258].map((cx) => (
          <React.Fragment key={cx}>
            <Circle cx={cx} cy="130" r="18" fill={palette.tyre} />
            <Circle cx={cx} cy="130" r="11" fill={palette.chrome} />
            <Circle cx={cx} cy="130" r="4" fill={palette.tyre} />
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
});
