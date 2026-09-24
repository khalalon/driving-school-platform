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
