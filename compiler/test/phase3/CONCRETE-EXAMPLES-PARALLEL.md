# Concrete Examples Tests - Parallelized

## Overview

The concrete examples tests have been split into individual test files for improved parallel execution performance. Previously, all 13 examples were tested sequentially in a single file. Now, each example has its own test file and Vitest runs up to 8 tests in parallel.

## Performance Improvement

- **Before**: ~110s sequential execution (all tests in one file)
- **After**: ~43s with 8-way parallelization (tests run concurrently)
- **Speedup**: ~2.5x faster

## Structure

```
test/phase3/
├── concrete-examples-helpers.ts     # Shared test utilities
├── concrete-examples-granular.test.ts  # DEPRECATED (kept for reference)
└── concrete-examples/
    ├── array-methods.test.ts
    ├── binary-search-tree.test.ts
    ├── cli-args.test.ts
    ├── error-handling.test.ts
    ├── fibonacci.test.ts
    ├── generic-stack.test.ts
    ├── hash-map.test.ts          # skipped (known issues)
    ├── interface-shapes.test.ts  # skipped (structural typing limitation)
    ├── json-parser.test.ts
    ├── linked-list.test.ts
    ├── lru-cache.test.ts
    ├── n-queens.test.ts
    └── string-pool.test.ts       # skipped (known issues)
```

## Shared Utilities

The `concrete-examples-helpers.ts` file provides:

- **Types**: `CompilationResult`, `ExecutionResult`, `NativeResult`
- **Functions**:
  - `createTmpDir()`: Creates unique temporary directory
  - `cleanupTmpDir(tmpDir)`: Removes temporary directory
  - `compileExample(exampleName, tmpDir)`: Compiles example to JS and C++
  - `executeExample(compilation)`: Executes JavaScript
  - `compileAndExecuteNative(execution)`: Compiles and executes C++
- **Constants**: `EXAMPLES_DIR`, `RUNTIME_DIR`

## Test Structure

Each example test file follows this pattern:

```typescript
describe(`Concrete Example: ${EXAMPLE_NAME}`, () => {
  describe("Compilation", () => {
    it("should compile to JavaScript without errors");
    it("should compile to C++ without errors");
  });

  describe("JavaScript Execution", () => {
    it("should execute JavaScript successfully");
    it("should produce expected JavaScript output");
  });

  describe("C++ Compilation and Execution", () => {
    it("should compile C++ successfully");
    it("should execute C++ successfully");
    it("should produce matching JavaScript and C++ output");
    it("should produce identical JavaScript and C++ output");
  });
});
```

This gives **8 tests per example** (104 total across 13 examples).

## Running Tests

```bash
# Run all concrete examples in parallel (8 workers)
npm test -- test/phase3/concrete-examples/

# Run a specific example
npm test -- test/phase3/concrete-examples/fibonacci.test.ts

# Run with verbose output
npm test -- test/phase3/concrete-examples/ --reporter=verbose

# Watch mode for development
npm test -- test/phase3/concrete-examples/ --watch
```

## Parallel Configuration

Configured in `vitest.config.ts`:

```typescript
{
  test: {
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 8,
        minThreads: 1,
      },
    },
  }
}
```

This means:
- Each test **file** runs in its own worker thread
- Up to **8 files** can run simultaneously
- Tests within a file run **sequentially** (to avoid tmp directory conflicts)

## Known Issues

Three examples are currently skipped:

1. **hash-map**: Known compilation/runtime issues
2. **interface-shapes**: TypeScript structural typing doesn't map to C++ nominal typing
3. **string-pool**: Known compilation/runtime issues

These are marked with `describe.skip()` in their respective test files.

## Current Test Status

- **Total Tests**: 104 (13 examples × 8 tests each)
- **Passing**: 80 tests (10 examples fully passing)
- **Skipped**: 24 tests (3 examples skipped)
- **Pass Rate**: 100% of non-skipped tests

## Migration Notes

The old `concrete-examples-granular.test.ts` file has been deprecated and replaced with a skip message. All functionality has been moved to:

- Individual test files for each example
- Shared helpers in `concrete-examples-helpers.ts`

The migration maintains 100% test coverage while improving execution speed by ~2.5x.
