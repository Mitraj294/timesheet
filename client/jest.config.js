module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  moduleFileExtensions: ['js', 'jsx', 'json', 'node'],
  transformIgnorePatterns: [
    '/node_modules/(?!(axios|@?reduxjs|@?react|@?testing-library|date-fns|nanoid|uuid|lodash-es|@?babel|react-leaflet|leaflet|@react-leaflet/core)/)'
  ],
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    // fallback for any legacy tests
    '<rootDir>/src/**/*.test.js',
  ],
  moduleNameMapper: {
    '\\.(css|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/tests/mocks/fileMock.js'
  },
  verbose: true,
};
