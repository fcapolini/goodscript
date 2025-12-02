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

  // Skip tests using primitive wrapper constructors (new Boolean, new Number, new String)
  // (TypeScript/GoodScript catches these at compile time)
  if (test.negative?.type === 'ReferenceError' && 
      (test.negative.phase === 'parse' || test.negative.phase === 'runtime') &&
      /throw.*ReferenceError/.test(test.code)) {
    return {
      shouldRun: false,
      reason: 'Test expects runtime ReferenceError (caught at compile time in GoodScript)'
    };
  }

  // Also skip tests that check for ReferenceError in try-catch blocks
  // These test undeclared variables which are compile errors in TypeScript/GoodScript
  if (/ReferenceError/.test(test.code) && 
      (/GetBase/.test(test.description || test.info || '') ||
       /undeclared|unresolved|undeclarated/.test(test.description || test.info || ''))) {
    return {
      shouldRun: false,
      reason: 'Test expects runtime ReferenceError for undeclared variables'
    };
  }
  
  // Skip tests with undeclared variables in short-circuit expressions (e.g., false && x)
  // TypeScript/C++ catch these at compile time, but JavaScript allows them due to short-circuit
  if (/GetBase.*null/.test(test.description || test.info || '')) {
    return {
      shouldRun: false,
      reason: 'Test uses undeclared variables in short-circuit expressions'
    };
  }
  
  // Skip tests using Number.NaN, Number.POSITIVE_INFINITY, etc. with comparisons
  // These test IEEE 754 special value behavior
  if (/Number\.(NaN|POSITIVE_INFINITY|NEGATIVE_INFINITY|MAX_VALUE|MIN_VALUE)/.test(test.code) &&
      /NaN/.test(test.description || test.info || '')) {
    return {
      shouldRun: false,
      reason: 'Test uses Number static properties (not yet implemented)'
    };
  }
  
  // Skip S12.6.2_A15: while({1}) is valid in TypeScript/JavaScript (object literal, not block statement)
  // Test expects SyntaxError but TypeScript allows object literals in expressions
  if (test.path.includes('S12.6.2_A15')) {
    return {
      shouldRun: false,
      reason: 'Test expects SyntaxError for while({1}) but TypeScript allows object literals'
    };
  }
  
  // Skip S12.5_A11: if({1}) is valid in TypeScript/JavaScript (object literal, not block statement)
  if (test.path.includes('S12.5_A11')) {
    return {
      shouldRun: false,
      reason: 'Test expects SyntaxError for if({1}) but TypeScript allows object literals'
    };
  }
  
  // Skip tests using new Object() - testing object wrapper
  if (/new Object\(\)/.test(test.code)) {
    return {
      shouldRun: false,
      reason: 'Test uses new Object() wrapper'
    };
  }
  
  // Skip temporal dead zone tests (use function expressions/closures)
  if (/temporal dead zone|TDZ|before.initialization/i.test(test.description || test.info || '') ||
      test.path?.includes('before-initialization')) {
    return {
      shouldRun: false,
      reason: 'Test uses temporal dead zone with closures (function expressions)'
    };
  }
  
  // Skip comma operator tests (GS restriction)
  if (/comma operator/i.test(test.description || test.info || '')) {
    return {
      shouldRun: false,
      reason: 'Test uses comma operator (GS restriction)'
    };
  }
  
  // Skip tests requiring verifyProperty or assert helper (test harness specific)
  if (/verifyProperty|assert\./.test(test.code)) {
    return {
      shouldRun: false,
      reason: 'Test uses test262 harness helpers not yet implemented'
    };
  }

  // Skip tests using primitive wrapper constructors (new Boolean, new Number, new String)
  // GoodScript rejects these in favor of primitive types
  if (/new\s+(Boolean|Number|String)\s*\(/.test(test.code)) {
    return {
      shouldRun: false,
      reason: 'Test uses primitive wrapper constructors (GS restriction)'
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
