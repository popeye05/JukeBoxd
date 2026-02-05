const baseConfig = require('./jest.config');

module.exports = {
  ...baseConfig,
  displayName: 'Integration Tests',
  testMatch: [
    '<rootDir>/src/tests/integration/**/*.test.ts',
    '<rootDir>/frontend/src/tests/integration/**/*.test.tsx'
  ],
  testTimeout: 30000, // Longer timeout for integration tests
  setupFilesAfterEnv: [
    '<rootDir>/src/test/setup-integration.ts'
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'frontend/src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/test/**',
    '!src/scripts/**',
    '!frontend/src/**/*.d.ts',
    '!frontend/src/test/**'
  ],
  coverageDirectory: 'coverage/integration',
  coverageReporters: ['text', 'lcov', 'html'],
  // Run tests serially to avoid database conflicts
  maxWorkers: 1,
  // Ensure clean environment for each test
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true
};