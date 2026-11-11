/**
 * Global Jest teardown that runs once after the test suite.
 * @file
 */

/**
 * Runs once after every test file, and currently has nothing to release.
 * @example
 * // Jest loads this module through globalTeardown in jest.config.mjs.
 * await globalTeardown();
 */
export default async function globalTeardown(): Promise<void> {
  // no-op
}
