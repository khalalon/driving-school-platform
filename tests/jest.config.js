module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/**/*.e2e.test.ts'],
  // Attend la passerelle puis applique fixtures/seed.sql (idempotent) avant la campagne.
  globalSetup: '<rootDir>/setup.ts',
  // Une seule base partagée : jamais de fichiers de test en parallèle.
  maxWorkers: 1,
  testTimeout: 30000,
};
