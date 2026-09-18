module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/index.ts',
  ],
  // Suite obsolète supprimée le 18/09/2026 (D-39) : les tests sont réécrits par module en Phase 2.
  passWithNoTests: true,
};
