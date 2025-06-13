// Jest config for ESM + Babel
export default {
  transform: { '^.+\\.js$': ['babel-jest', { configFile: './babel.config.js' }] },
  testEnvironment: 'node',
  moduleNameMapper: {},
};
