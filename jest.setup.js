// jest.setup.js
// Suppress console.log and console.error during tests to keep test output clean
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
