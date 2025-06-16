// Jest config for ESM + Babel (CommonJS)
module.exports = {
  // Removed extensionsToTreatAsEsm per Jest warning
  transform: { '^.+\\.js$': ['babel-jest', { configFile: './babel.config.js' }] },
  testEnvironment: 'node',
  moduleNameMapper: {},
  globals: {
    'babel-jest': {
      useESM: true
    }
  },
};
