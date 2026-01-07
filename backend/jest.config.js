export default {
  testEnvironment: 'node',
  transform: {},
  injectGlobals: true,
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  moduleFileExtensions: ['js'],
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'controllers/**/*.js',
    'services/**/*.js',
    'schedulers/**/*.js',
    'middleware/**/*.js',
    'utils/**/*.js',
    'routes/**/*.js',
    'config/**/*.js',
    'server.js',
    '!controllers/**/*.test.js',
    '!routes/**/*.test.js',
    '!middleware/**/*.test.js',
    '!utils/**/*.test.js',
    '!config/**/*.test.js',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/tests/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  testTimeout: 10000,
  // Ensure all tests run even if some fail
  bail: false,
  // Force exit after tests complete to avoid hanging
  forceExit: true,
  // Detect open handles that may prevent Jest from exiting
  detectOpenHandles: true
};

