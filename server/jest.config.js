module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/jest.setup.ts'],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/src/__tests__/setup.ts',
    '<rootDir>/src/__tests__/jest.setup.ts',
  ],
  // Run tests in serial to avoid database contention issues
  // This is especially important in CI environments
  runInBand: true,
  // Give tests a longer timeout to accommodate database operations
  testTimeout: 10000,
  // Improve error reporting
  verbose: true,
};
