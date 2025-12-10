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
├── README.md           # This file
├── run-equivalence.ts  # Test runner (compiles & executes in all 3 modes)
├── basic/              # Basic language features
│   ├── arithmetic.test.ts
│   ├── strings.test.ts
│   ├── arrays.test.ts
│   └── objects.test.ts
├── edge-cases/         # Edge cases and corner cases
│   ├── empty-arrays.test.ts
│   ├── null-handling.test.ts
│   ├── unicode.test.ts
│   └── large-numbers.test.ts
├── stdlib/             # Standard library equivalence
│   ├── map.test.ts
│   ├── date.test.ts
│   ├── math.test.ts
│   └── json.test.ts
└── integration/        # Complex integration scenarios
    ├── recursion.test.ts
    ├── async-await.test.ts
    └── class-inheritance.test.ts
```

## Running Tests

```bash
# Run all equivalence tests
pnpm test:equivalence

# Run specific test suite
pnpm test:equivalence basic/arithmetic

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
- ✅ Performance benchmarks verified (4 tests, all passing)
- 📋 Basic language features (TODO)
- 📋 Edge cases (TODO)
- 📋 Standard library (TODO)
- 📋 Integration scenarios (TODO)

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
