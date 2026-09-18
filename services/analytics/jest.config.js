module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/index.ts',
    '!src/types/**',
  ],
  // Seuils = couverture mesurée le 18/09/2026 (D-37) ; à remonter avec les tests des phases 2–5.
  coverageThreshold: {
    global: {
      branches: 28,
      functions: 30,
      lines: 35,
      statements: 34,
    },
  },
  coverageDirectory: 'coverage',
  verbose: true,
};
