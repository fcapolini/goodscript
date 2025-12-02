/**
 * Test filters for TypeScript conformance tests
 * 
 * Determines which tests should run based on GoodScript feature support
 */

import { TscTest } from '../utils/baseline';

export interface FilterResult {
  shouldRun: boolean;
  reason?: string;
}

/**
 * Determine if a test should run based on its content
 */
export function shouldRunTest(test: TscTest): FilterResult {
  const { source, name, expectedErrors, hasErrors } = test;
  
  // Skip tests that expect TypeScript compilation errors
  // GoodScript may have different error messages or error locations
  if (hasErrors && expectedErrors && expectedErrors.length > 0) {
    return {
      shouldRun: false,
      reason: 'Test expects TypeScript compilation errors (error handling differs)'
    };
  }
  
  // Skip .d.ts declaration files (type-only, no runtime code)
  if (name.endsWith('.d')) {
    return {
      shouldRun: false,
      reason: 'Test is a .d.ts declaration file (type-only)'
    };
  }
  
  // Skip tests using var keyword (GS105)
  if (source.includes('var ')) {
    return {
      shouldRun: false,
      reason: 'Test uses var keyword (GS105)'
    };
  }
  
  // Skip tests using == or != operators (GS106)
  if (source.includes(' == ') || source.includes(' != ')) {
    return {
      shouldRun: false,
      reason: 'Test uses == or != operators (GS106)'
    };
  }
  
  // Skip tests using eval (GS102)
  if (source.includes('eval(')) {
    return {
      shouldRun: false,
      reason: 'Test uses eval (GS102)'
    };
  }
  
  // Skip tests using with statement (GS101)
  if (source.includes('with (') || source.includes('with(')) {
    return {
      shouldRun: false,
      reason: 'Test uses with statement (GS101)'
    };
  }
  
  // Skip tests using 'any' type (GoodScript restriction)
  if (source.match(/:\s*any\b/) || source.match(/<any>/)) {
    return {
      shouldRun: false,
      reason: 'Test uses any type (GoodScript restriction)'
    };
  }
  
  // Skip decorator tests (future feature)
  if (source.includes('@') && source.match(/@\w+/)) {
    return {
      shouldRun: false,
      reason: 'Test uses decorators (future feature)'
    };
  }
  
  // Skip dynamic import tests (Phase 4)
  if (source.includes('import(')) {
    return {
      shouldRun: false,
      reason: 'Test uses dynamic imports (Phase 4)'
    };
  }
  
  // Skip tests with module/namespace exports (Phase 4)
  if (source.includes('export ') || source.includes('module ')) {
    return {
      shouldRun: false,
      reason: 'Test uses modules/exports (Phase 4)'
    };
  }
  
  // Skip tests using arguments object (not supported)
  if (source.match(/\barguments\b/)) {
    return {
      shouldRun: false,
      reason: 'Test uses arguments object (not supported)'
    };
  }
  
  // Skip tests manipulating prototype
  if (source.includes('.prototype')) {
    return {
      shouldRun: false,
      reason: 'Test uses prototype manipulation (not supported)'
    };
  }
  
  // Skip tests using typeof for constructor types (TypeScript-specific type system feature)
  // Example: function foo(Factory: typeof MyClass)
  // This doesn't translate to C++ - it's pure compile-time type checking
  if (source.match(/:\s*typeof\s+\w+/)) {
    return {
      shouldRun: false,
      reason: 'Test uses typeof for constructor types (type system only, no C++ equivalent)'
    };
  }
  
  // Skip tests with declaration merging (class + interface with same name)
  // TypeScript-specific feature with no C++ equivalent
  if (source.match(/class\s+(\w+)[\s\S]*interface\s+\1/) || 
      source.match(/interface\s+(\w+)[\s\S]*class\s+\1/)) {
    return {
      shouldRun: false,
      reason: 'Test uses declaration merging (TypeScript-specific, no C++ equivalent)'
    };
  }
  
  // Skip tests with static abstract methods (invalid in C++)
  if (source.includes('abstract static') || source.includes('static abstract')) {
    return {
      shouldRun: false,
      reason: 'Test uses static abstract methods (invalid in C++)'
    };
  }
  
  // Skip tests with class expressions (const C = class extends A {})
  // These require runtime class construction which C++ doesn't support
  if (source.match(/=\s*class\s+(extends|implements|\{)/)) {
    return {
      shouldRun: false,
      reason: 'Test uses class expressions (runtime class construction not supported in C++)'
    };
  }
  
  // Skip tests with method overloads (C++ doesn't support return-type-only overloading)
  // TypeScript allows multiple declarations with different return types
  if (source.match(/abstract\s+\w+\s*\([^)]*\)\s*;[\s\S]*abstract\s+\w+\s*\([^)]*\)\s*;/)) {
    return {
      shouldRun: false,
      reason: 'Test uses method overloads with different return types (not supported in C++)'
    };
  }
  
  // Skip tests with arrow function types as class members (e.g., m: () => void)
  // This is TypeScript syntax that doesn't map cleanly to C++
  if (source.match(/\w+\s*:\s*\([^)]*\)\s*=>/)) {
    return {
      shouldRun: false,
      reason: 'Test uses arrow function types in class members (ambiguous C++ mapping)'
    };
  }
  
  // Skip tests using super as a property accessor (super.foo)
  // C++ super calls require different syntax
  if (source.includes('super.') || source.includes('super[')) {
    return {
      shouldRun: false,
      reason: 'Test uses super property access (requires different C++ approach)'
    };
  }
  
  return { shouldRun: true };
}
