/**
 * Test262 test filters for GoodScript
 * Determines which tests are applicable based on supported features
 */

import { Test262Test } from './parser';

export interface FilterResult {
  shouldRun: boolean;
  reason?: string;
}

/**
 * Features explicitly NOT supported by GoodScript (The Good Parts restrictions)
 */
const UNSUPPORTED_FEATURES = new Set([
  'var',                           // GS105: Only let/const allowed
  'eval',                          // GS102: No eval
  'Function',                      // GS102: No Function() constructor
  'with',                          // GS101: No with statement
  'Symbol',                        // Dynamic features not supported
  'Proxy',                         // Dynamic features not supported
  'Reflect',                       // Dynamic features not supported
  'WeakMap',                       // Use use<T> instead
  'WeakSet',                       // Use use<T> instead
  '__proto__',                     // No prototype manipulation
  'legacy-regexp',                 // Only modern RegExp
  'caller',                        // No function introspection
  'arguments-caller',              // No arguments.caller
  'generators',                    // Not yet supported (Phase 4)
  'async-iteration',               // Not yet supported (Phase 4)
  'SharedArrayBuffer',             // Concurrency not supported
  'Atomics',                       // Concurrency not supported
  'FinalizationRegistry',          // GC-specific features
  'WeakRef',                       // Use use<T> instead
]);

/**
 * Features supported by GoodScript
 */
const SUPPORTED_FEATURES = new Set([
  'let',
  'const',
  'class',
  'arrow-function',
  'async-functions',
  'async-await',
  'Promise',
  'Map',
  'Set',
  'Array.prototype.map',
  'Array.prototype.filter',
  'Array.prototype.reduce',
  'String.prototype.includes',
  'String.prototype.startsWith',
  'String.prototype.endsWith',
  'template-literals',
  'destructuring-binding',
  'destructuring-assignment',
  'spread-operator',
  'rest-parameters',
  'default-parameters',
  'object-literal-computed-properties',
  'object-literal-shorthand-properties',
  'strict-mode',
  'JSON',
]);

/**
 * Flags that indicate test should be skipped
 */
const SKIP_FLAGS = new Set([
  'raw',              // Raw test, not applicable
  'module',           // Module system not yet implemented (Phase 4)
  'noStrict',         // GoodScript is always strict
  'onlyStrict',       // OK, we're always strict (but flag is informational)
]);

/**
 * Error types we should handle
 */
const EXPECTED_ERRORS = new Set([
  'SyntaxError',
  'ReferenceError',
  'TypeError',
  'RangeError',
]);

/**
 * Determine if a Test262 test should run in GoodScript
 */
export function shouldRunTest(test: Test262Test): FilterResult {
  // Check for unsupported features
  if (test.features) {
    for (const feature of test.features) {
      if (UNSUPPORTED_FEATURES.has(feature)) {
        return {
          shouldRun: false,
          reason: `Unsupported feature: ${feature} (GoodScript restriction)`
        };
      }
      
      // If feature is not in supported list and not a minor variant, skip
      if (!SUPPORTED_FEATURES.has(feature) && 
          !feature.includes('.prototype.') &&
          !feature.startsWith('Array') &&
          !feature.startsWith('String') &&
          !feature.startsWith('Object')) {
        return {
          shouldRun: false,
          reason: `Feature not yet implemented: ${feature}`
        };
      }
    }
  }

  // Check flags
  if (test.flags) {
    for (const flag of test.flags) {
      if (SKIP_FLAGS.has(flag) && flag !== 'onlyStrict') {
        return {
          shouldRun: false,
          reason: `Incompatible flag: ${flag}`
        };
      }
    }
  }

  // Check for unsupported error types
  if (test.negative && !EXPECTED_ERRORS.has(test.negative.type)) {
    return {
      shouldRun: false,
      reason: `Unsupported error type: ${test.negative.type}`
    };
  }

  // Additional content-based checks
  if (test.code.includes('var ') || test.code.includes('var\t')) {
    return {
      shouldRun: false,
      reason: 'Test uses var (GS105)'
    };
  }

  if (test.code.includes(' == ') || test.code.includes(' != ')) {
    return {
      shouldRun: false,
      reason: 'Test uses == or != (GS106)'
    };
  }

  if (test.code.includes('eval(')) {
    return {
      shouldRun: false,
      reason: 'Test uses eval (GS102)'
    };
  }

  if (test.code.includes('with (') || test.code.includes('with(')) {
    return {
      shouldRun: false,
      reason: 'Test uses with (GS101)'
    };
  }

  return { shouldRun: true };
}

/**
 * Get list of Test262 features that map to GoodScript capabilities
 */
export function getRelevantFeatures(): string[] {
  return Array.from(SUPPORTED_FEATURES).sort();
}

/**
 * Get list of excluded Test262 features
 */
export function getExcludedFeatures(): string[] {
  return Array.from(UNSUPPORTED_FEATURES).sort();
}
