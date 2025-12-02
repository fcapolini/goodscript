# TypeScript Compiler Conformance Tests

This subproject validates GoodScript's TypeScript compatibility using TypeScript's own conformance test suite.

## Current Results

**Classes Category (Pilot 30 tests)**:
- **JavaScript Mode**: ✅ **100% pass rate** (17/17 eligible tests)
- **Native Mode (C++ GC)**: 🎉 **Infrastructure complete**, 1/17 tests passing (5.9%)
- Total: 30 tests  
- Passed (JS): 17/17 tests (100%)
- Passed (Native): 1/17 tests (5.9%)
- Skipped: 13 tests (GoodScript restrictions: var, decorators, modules)

**Key Achievement**: First TypeScript conformance test (`classAbstractAsIdentifier`) successfully compiles to C++ and executes with MPS GC! Native mode is now a valuable tool for discovering codegen gaps.

See [STATUS.md](./STATUS.md) for detailed per-batch results.

## Overview

Tests GoodScript against TypeScript's `tests/cases/conformance/` suite, ensuring:
- TypeScript source compatibility
- Type system correctness
- Baseline output equivalence
- Continuous compatibility with TypeScript evolution

## Quick Start

```bash
# Install dependencies
npm install

# Run all tests (JavaScript transpilation only, fast)
npm test

# Run specific batches (fast iteration, ~1.6s per batch)
npm run test:classes:batch1  # Tests 1-5
npm run test:classes:batch2  # Tests 6-10
# ... batch3-6

# Run summary only
npm run test:classes:summary

# Enable native C++ compilation and execution (slower but thorough)
TEST_NATIVE=1 npm test
npm run test:native:batch1   # Test batch 1 with C++ compilation
npm run test:native:summary  # Full native validation

# Watch mode
npm run test:watch
```

## Testing Modes

### JavaScript Mode (default)
- Validates TypeScript → JavaScript transpilation
- Fast execution (~1.6s per batch of 5 tests)
- Checks Phase 1 validation (Good Parts)
- Ensures JavaScript output is generated

### Native Mode (`TEST_NATIVE=1`)
- **Full validation**: TypeScript → C++ → Binary → Execution
- Validates Phase 3 C++ codegen
- Compiles with Zig C++ compiler
- Executes and captures output
- Slower (~3-5s per test) but ensures complete compatibility
- Use for thorough validation before releases

**Recommendation**: Use JavaScript mode for rapid iteration, Native mode for thorough validation.

## Test Categories

### Phase 1 (Core Language)
- ✅ **classes/** - Class declarations, expressions, inheritance (27 tests)
- ✅ **controlFlow/** - Type narrowing, if/else, loops (59 tests)
- ✅ **es6/** - Destructuring, spread, templates (30 tests)

### Phase 2 (Type System)
- 📋 **types/** - Primitives, unions, intersections
- 📋 **interfaces/** - Declarations, extends, implements
- 📋 **generics/** - Generic functions, classes, constraints

### Future
- 📋 **async/** - Async/await, promises
- 📋 **enums/** - Enum declarations
- 📋 **modules/** - Import/export (Phase 4)

## Test Structure

```
conformance-tsc/
├── src/
│   ├── harness/         # Test execution infrastructure
│   │   ├── runner.ts    # Execute TSC tests
│   │   ├── parser.ts    # Parse test files and baselines
│   │   ├── comparator.ts # Compare outputs
│   │   └── filters.ts   # Feature filtering
│   ├── suites/          # Test suites by category
│   │   ├── classes.test.ts
│   │   ├── controlFlow.test.ts
│   │   └── es6.test.ts
│   └── utils/           # Utilities
│       └── baseline.ts  # Baseline file handling
└── typescript/          # Git submodule (TypeScript repo)
    └── tests/
        ├── cases/conformance/
        └── baselines/reference/
```

## How It Works

For each test file (e.g., `classExpression.ts`):

1. **Parse Test**
   - Read `.ts` source file
   - Check `.errors.txt` for expected errors
   - Load baseline `.js` output

2. **Compile with GoodScript**
   - Phase 1: Validate (permissive mode)
   - Phase 2: Ownership analysis (skip for GC mode)
   - Phase 3: Generate C++

3. **Compare Outputs**
   - JS output vs baseline `.js`
   - C++ execution vs JS execution
   - Errors vs `.errors.txt` (if present)

4. **Report Results**
   - Pass: All comparisons match
   - Fail: Output mismatch or unexpected errors
   - Skip: Unsupported features

## Filtering

Tests are skipped if they use unsupported features:
- `var` keyword (GS105)
- `==` / `!=` operators (GS106)
- `eval` / `with` statements (GS101/GS102)
- Decorators (future)
- Dynamic imports (Phase 4)
- `any` type
- Prototype manipulation

## Success Criteria

A test passes when:
- ✅ Compilation succeeds (or matches expected errors)
- ✅ JS output is semantically equivalent to baseline
- ✅ C++ output matches JS output

## Benefits

### Continuous Compatibility
- Track TypeScript evolution automatically
- Catch breaking changes early
- Ensure long-term compatibility

### Type System Validation
- Tests ownership annotations
- Validates type inference
- Ensures structural typing works

### Better Coverage
- TypeScript-specific patterns
- Real-world code structures
- Idiomatic usage examples

## Metrics

Current status (as tests are implemented):

| Category | Total | Executed | Passed | Pass Rate |
|----------|-------|----------|--------|-----------|
| Classes | 27 | - | - | - |
| Control Flow | 59 | - | - | - |
| ES6 | 30 | - | - | - |
| **Total** | **116** | **-** | **-** | **-** |

Target: 65% pass rate on core categories

## References

- [Proposal Document](../docs/TSC-CONFORMANCE.md)
- [TypeScript Tests](https://github.com/microsoft/TypeScript/tree/main/tests)
- [GoodScript Docs](../docs/)
