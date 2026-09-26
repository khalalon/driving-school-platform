// Chargé avant les modules testés (jest.config.js → setupFiles).
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Les icônes (11.2) : hors téléphone, `@expo/vector-icons` veut charger des polices (expo-font →
// expo-asset, absent du paquet Node). On les remplace par un texte qui garde `name`, `size` et
// `color` : les tests de rendu peuvent donc continuer à vérifier la couleur posée par le thème.
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  const Icon = ({ name, size, color, style, ...rest }) =>
    React.createElement(Text, { ...rest, style: [{ fontSize: size, color }, style] }, name);

  return new Proxy(
    { __esModule: true },
    {
      get: (target, property) => (property in target ? target[property] : Icon),
    }
  );
});

// Retour haptique (13.4) : aucun moteur de vibration hors téléphone. Le mock garde les énumérations
// réelles pour que les tests vérifient le type de vibration demandé.
jest.mock('expo-haptics', () => {
  const actual = jest.requireActual('expo-haptics/src/Haptics.types');
  return {
    ...actual,
    notificationAsync: jest.fn(() => Promise.resolve()),
    impactAsync: jest.fn(() => Promise.resolve()),
    selectionAsync: jest.fn(() => Promise.resolve()),
  };
});

// 3D (13.8) : pas de contexte GL hors téléphone. `Canvas` devient une vue qui garde ses
// propriétés (`frameloop`) et rend ses enfants tels quels ; `useFrame` ne tourne jamais.
jest.mock('@react-three/fiber/native', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Canvas = ({ children, ...props }) =>
    React.createElement(View, { ...props, testID: 'r3f-canvas' }, children);
  return { Canvas, useFrame: jest.fn(), useThree: jest.fn(() => ({})) };
});

// Scène d'accueil (13.10) : elle importe three.js (ESM, non transformé par Jest) et ses modèles.
// Les écrans qui la montent la reçoivent vide ; sa logique est testée dans `homeCar.ts`.
jest.mock('./src/components/three/HomeCarScene', () => ({ HomeCarScene: () => null }));
