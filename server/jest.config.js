module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],

  // Default configuration that applies to all tests
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

  // Separate configurations for different test types
  projects: [
    {
      displayName: 'unit',
      testMatch: ['**/__tests__/unit/**/*.test.ts'],
      testPathIgnorePatterns: [
        '<rootDir>/node_modules/',
        '<rootDir>/src/__tests__/setup.ts',
        '<rootDir>/src/__tests__/jest.setup.ts',
      ],
    },
    {
      displayName: 'integration',
      testMatch: ['**/__tests__/integration/**/*.test.ts'],
      testPathIgnorePatterns: [
        '<rootDir>/node_modules/',
        '<rootDir>/src/__tests__/setup.ts',
        '<rootDir>/src/__tests__/jest.setup.ts',
      ],
      // Running these serially to prevent database conflicts
      maxWorkers: 1,
    },
  ],
};
