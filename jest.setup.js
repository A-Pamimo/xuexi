/**
 * Jest setup. Installs the official react-native-reanimated mock so component
 * tests that (transitively) import an animated component can run under jest-expo.
 * The current suite is pure-logic (node env, src test files only) and imports no
 * components, so this is a no-op guard today and a safety net for future tests.
 *
 * Wrapped in try/catch: the pure-logic suite never loads reanimated, and if the
 * mock entrypoint is unavailable in the node env we don't want setup to throw.
 */
try {
  require('react-native-reanimated').setUpTests?.();
} catch {
  /* reanimated not present in this environment — fine for the logic-only suite */
}
