module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/src/tests/setupTests.js'],
  testMatch: ['<rootDir>/src/tests/**/*.test.js', '<rootDir>/src/tests/**/*.spec.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/tests/**',
    '!src/docs/**',
  ],
  coverageThreshold: {
    global: {
      branches: 45,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  clearMocks: true,
};

