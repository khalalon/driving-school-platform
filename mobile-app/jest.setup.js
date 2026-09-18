// Chargé avant les modules testés (jest.config.js → setupFiles).
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
