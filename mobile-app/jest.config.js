// Tests unitaires du mobile (tâche 4.5) : jest-expo (Babel + mocks Expo / React Native),
// AsyncStorage remplacé par son mock officiel (jest.setup.js).
// babel-preset-expo inline `process.env.EXPO_PUBLIC_*` à la transformation : l'URL du backend
// est donc fixée ici, avant toute transformation, et non dans un setupFile.
process.env.EXPO_PUBLIC_API_BASE_URL = 'http://api.test';

module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts', '<rootDir>/src/**/__tests__/**/*.test.tsx'],
  clearMocks: true,
  // Modèles 3D (13.9) : un `.glb` est un fichier binaire servi par Metro ; en test, un simple
  // identifiant d'asset suffit (expo-asset est mocké là où il sert).
  moduleNameMapper: { '\.glb$': '<rootDir>/jest.assetStub.js' },
};
