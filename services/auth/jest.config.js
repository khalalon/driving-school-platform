module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.interface.ts',
    '!src/index.ts'
  ],
  // Seuils = couverture mesurée le 18/09/2026 (D-37) ; à remonter avec les tests des phases 2–5.
  coverageThreshold: {
    global: {
      branches: 21,
      functions: 17,
      lines: 16,
      statements: 16
    }
  },
  moduleNameMapper: {
    '@/(.*)': '<rootDir>/src/$1'
  }
};
