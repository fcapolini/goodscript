# Functional Equivalence Tests

This directory contains tests that verify **functional equivalence** across all three execution modes:
- **Node.js** (TypeScript/JavaScript execution)
- **GC C++** (Garbage-collected native code)
- **Ownership C++** (RAII-based native code)

## Purpose

Unlike unit tests (which test compiler internals) or performance benchmarks (which focus on speed), equivalence tests ensure that:
1. All three modes produce **identical outputs** for the same inputs
2. Edge cases are handled consistently across modes
3. Optimizations don't break correctness

## Directory Structure

```
equivalence/
├── README.md               # This file
├── EXPANSION-PLAN.md       # Roadmap for test expansion (250+ tests target)
├── run-equivalence.ts      # Test runner (compiles & executes in all 3 modes)
├── test-framework.ts       # Test framework core
├── index.ts                # Test suite index and exports
├── basic/                  # Basic language features (14 suites, ~110 tests)
│   ├── arithmetic.test.ts      # Arithmetic operations (8 tests)
│   ├── arrays.test.ts          # Array operations (6 tests)
│   ├── strings.test.ts         # String operations (7 tests)
│   ├── functions.test.ts       # Functions and lambdas (10 tests)
│   ├── control-flow.test.ts    # If/while/for/switch (11 tests)
│   ├── classes.test.ts         # Class instantiation (6 tests)
│   ├── exceptions.test.ts      # Try/catch/finally (6 tests)
│   ├── types.test.ts           # Type system features (6 tests)
│   ├── template-literals.test.ts # Template strings (7 tests)
│   ├── variables.test.ts       # Variable declarations (7 tests)
│   ├── operators.test.ts       # Operator precedence (10 tests)
│   ├── union-types.test.ts     # Union types (T | null, T | undefined) (10 tests) ✨ NEW
│   ├── object-literals.test.ts # Object literals and structs (8 tests) ✨ NEW
│   └── interfaces.test.ts      # Interface declarations (7 tests) ✨ NEW
├── edge-cases/             # Edge cases and corner cases (6 suites, ~46 tests)
│   ├── empty-collections.test.ts   # Empty arrays/maps (7 tests)
│   ├── number-edge-cases.test.ts   # Zero, negatives, overflow (8 tests)
│   ├── string-edge-cases.test.ts   # Special chars, slicing (10 tests)
│   ├── boolean-logic.test.ts       # AND/OR/NOT (9 tests)
│   ├── optional-chaining.test.ts   # ?. operator (2 tests)
│   └── nested-control-flow.test.ts # Nested loops, breaks (10 tests) ✨ NEW
├── stdlib/                 # Standard library equivalence (6 suites, ~51 tests)
│   ├── map.test.ts             # Map operations (10 tests)
│   ├── math.test.ts            # Math object (11 tests)
│   ├── date.test.ts            # Date.now() (4 tests)
│   ├── json.test.ts            # JSON.stringify (6 tests)
│   ├── array-methods.test.ts   # Array methods (10 tests)
│   └── array-advanced.test.ts  # Advanced array operations (10 tests) ✨ NEW
└── integration/            # Complex integration scenarios (4 suites, ~49 tests) ✨ NEW
    ├── async-await.test.ts     # Promise<T> and async/await (15 tests) ✨ NEW
    ├── recursion.test.ts       # Recursive functions (12 tests) ✨ NEW
    ├── lambda-closures.test.ts # Closure semantics (12 tests) ✨ NEW
    └── function-hoisting.test.ts # Hoisting optimization (10 tests) ✨ NEW
```

**Total: 30 test suites, ~256 tests, 768 total executions (3 modes each)**
**New: +9 test suites, +95 tests added! 🎉**

## Running Tests

```bash
# Run all equivalence tests
pnpm test:equivalence

# Run specific test suite
pnpm test:equivalence basic/arithmetic

# Run specific category
pnpm test:equivalence basic
pnpm test:equivalence stdlib
pnpm test:equivalence edge-cases

# Run with verbose output
pnpm test:equivalence --verbose
```

## Writing Tests

Each test file exports test cases that will be executed in all three modes:

```typescript
// equivalence/basic/arithmetic.test.ts
import { defineEquivalenceTest } from '../test-framework';

export const tests = [
  defineEquivalenceTest({
    name: 'Addition of positive integers',
    code: `
      function add(a: integer, b: integer): integer {
        return a + b;
      }
      console.log(add(5, 3));
    `,
    expectedOutput: '8\n'
  }),
  
  defineEquivalenceTest({
    name: 'Division by zero returns Infinity',
    code: `
      const result: number = 10 / 0;
      console.log(result);
    `,
    expectedOutput: 'Infinity\n'
  }),
];
```

## Test Framework

The equivalence test framework:
1. **Compiles** each test in all three modes (Node.js, GC C++, Ownership C++)
2. **Executes** the compiled code
3. **Compares** outputs (exact string match)
4. **Reports** any discrepancies with clear diagnostics

## Guidelines

### What to Test
✅ **DO test:**
- Correct computation results (math, string operations, array methods)
- Edge cases (empty collections, null/undefined, boundary values)
- Standard library behavior (Map, Array, Math, JSON, Date)
- Error handling (exceptions, type errors)
- Unicode and special characters
- Large numbers (integer overflow, floating-point precision)

❌ **DON'T test:**
- Performance (use `performance/` instead)
- Compiler internals (use `compiler/test/` instead)
- Memory layout or GC behavior (implementation details)
- Exact timing values (non-deterministic)

### Test Design Principles

1. **Deterministic**: Tests must produce identical output every time
2. **Self-contained**: Each test is independent, no shared state
3. **Fast**: Avoid long-running computations (< 100ms per test)
4. **Clear**: Expected output should be obvious
5. **Focused**: Test one concept per test case

### Handling Non-Deterministic Output

For timing or randomness, normalize before comparison:

```typescript
defineEquivalenceTest({
  name: 'Date.now() returns a number',
  code: `
    const now = Date.now();
    console.log(typeof now);  // 'number', not the actual value
    console.log(now > 0);     // true
  `,
  expectedOutput: 'number\ntrue\n'
})
```

## Performance Considerations

Equivalence tests run **3x** the number of compilations (one per mode), so:
- Keep test suite focused (< 100 test cases)
- Use fast-compiling code (avoid large files)
- Run in parallel where possible
- Cache compiled binaries when source unchanged

## Current Status

**Test Coverage:**
- ✅ Basic language features: 11 test suites, 84 tests
- ✅ Standard library: 5 test suites, 41 tests
- ✅ Edge cases: 5 test suites, 36 tests
- 📋 Integration scenarios (coming soon)

**Known Equivalence Issues:**
- None identified yet! 🎉

## CI Integration

Equivalence tests run in CI after unit tests:
```yaml
- name: Unit Tests
  run: pnpm test
- name: Equivalence Tests  
  run: pnpm test:equivalence
- name: Performance Benchmarks
  run: pnpm bench:all
```

---

Last Updated: December 10, 2025
