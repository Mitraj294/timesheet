// Suppress console.error in tests unless DEBUG_CONSOLE is set
if (!process.env.DEBUG_CONSOLE) {
  // eslint-disable-next-line no-console
  console.error = () => {};
}
// To enable real error logging, run tests with DEBUG_CONSOLE=1
