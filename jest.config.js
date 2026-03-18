module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/tests/**/*.test.js', '<rootDir>/src/tests/**/*.spec.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/tests/**'],
};

