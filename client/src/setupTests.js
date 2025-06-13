// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

// Suppress console.error in tests unless DEBUG_CONSOLE is set
if (!process.env.DEBUG_CONSOLE) {
  // eslint-disable-next-line no-console
  console.error = () => {};
}
// To enable real error logging, run tests with DEBUG_CONSOLE=1
