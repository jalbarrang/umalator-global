/**
 * Browser-compatible assertion utilities
 * Replacement for Node.js 'assert' module
 */

export function assert(condition: unknown, message?: string): asserts condition {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// Create a callable object that acts as both a function and has methods
interface StrictAssert {
  (condition: unknown, message?: string): asserts condition;
  equal<T>(actual: T, expected: T, message?: string): void;
  notEqual<T>(actual: T, expected: T, message?: string): void;
  ok(condition: unknown, message?: string): asserts condition;
  fail(message?: string): never;
}

// Explicitly type the function to satisfy TypeScript's assertion requirements
const strictAssertFn: (condition: unknown, message?: string) => asserts condition =
  function(condition: unknown, message?: string): asserts condition {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  };

const strictAssert = strictAssertFn as StrictAssert;

strictAssert.equal = function<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(
      message || `Expected ${expected} but got ${actual}`,
    );
  }
};

strictAssert.notEqual = function<T>(actual: T, expected: T, message?: string): void {
  if (actual === expected) {
    throw new Error(
      message || `Expected values to be different but got ${actual}`,
    );
  }
};

strictAssert.ok = function(condition: unknown, message?: string): asserts condition {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
};

strictAssert.fail = function(message?: string): never {
  throw new Error(message || 'Assertion failed');
};

export const strict = strictAssert;

export default assert;
