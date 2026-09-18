module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/index.ts',
    '!src/config/**',
    '!src/**/types/**',
    '!src/test-utils/**',
  ],
  // Seuils = couverture mesurée à la création du paquet (18/09/2026, D-37) ; à remonter à
  // chaque module porté (2.3, 2.4, 2.5) puis avec les phases 3–5.
  coverageThreshold: {
    global: {
      branches: 88,
      functions: 95,
      lines: 88,
      statements: 88,
    },
  },
};
