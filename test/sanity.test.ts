/**
 * Sanity checks that prove the Jest pipeline executes test files.
 * @file
 */

// Sanity check — proves the jest pipeline actually executes a test file here.
// Reach this far, the canonical jest setup is wired correctly.

describe('the obligatory sanity test', () => {
  it('the answer to life, the universe, and everything', () => {
    // eslint-disable-next-line sonarjs/no-trivial-assertions -- pipeline sanity check deliberately asserts a constant
    expect(6 * 7).toBe(42);
  });

  it('javascript can still be trusted on basic arithmetic', () => {
    expect(0.1 + 0.2).toBeCloseTo(0.3);
  });

  it('yes, the canonical jest.config.mjs has indeed been adopted', () => {
    expect('canonical').toMatch(/canon/);
  });
});
