# TypeScript Compiler Conformance Tests

This subproject validates GoodScript's TypeScript compatibility using TypeScript's own conformance test suite.

## Current Results

**Classes Category (First 50 files, 30 tests)**:
- **JavaScript Mode**: ✅ **100% pass rate** (8/8 eligible tests, 9 seconds)
- **Native Mode (C++ GC)**: ✅ **87.5% pass rate** (7/8 eligible tests, 25.7 seconds)
- Tests executed: 30 total, 8 eligible after filtering, 22 skipped
- Average native compile time: ~3.2 seconds per test

**Key Achievement**: TypeScript conformance tests successfully compile to C++ and execute with MPS GC! Features validated include abstract classes, inheritance, generics, and C++ keyword escaping (`abstract` → `abstract_`).

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

# Run all tests (JavaScript transpilation only, fast ~9s)
npm test

# Run specific batch (JavaScript mode)
npm test -- -t "Batch 1/6"

# Enable native C++ compilation and execution (~26s for all batches)
TEST_NATIVE=1 npm test

# Run single batch with native compilation
TEST_NATIVE=1 npm test -- -t "Batch 2/6"

# Use the batch script
./run-batch.sh 1          # JavaScript mode, batch 1
./run-batch.sh 2 native   # Native mode, batch 2
./run-batch.sh all        # All batches, JavaScript mode
```

## Testing Modes

### JavaScript Mode (default)
- Validates TypeScript → JavaScript transpilation
### JavaScript Mode (default)
- Validates TypeScript → JavaScript transpilation
- Fast execution (~9s for all 30 tests)
- Checks Phase 1 validation (Good Parts)
- Ensures JavaScript output is generated

### Native Mode (`TEST_NATIVE=1`)
- **Full validation**: TypeScript → C++ → Binary → Execution
- Validates Phase 3 C++ codegen with GC
- Compiles with Zig C++ compiler + MPS library
- Executes and captures output
- Duration: ~25.7s for all eligible tests (~3.2s average per test)
- Use for thorough validation before releases

**Recommendation**: Use JavaScript mode for rapid iteration, Native mode for release validation.

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

### GoodScript Language Restrictions
- `var` keyword (GS105 - use let/const)
- `==` / `!=` operators (GS106 - use ===)
- `eval` / `with` statements (GS101/GS102)
- `any` type
- `arguments` object (use rest parameters)
- Prototype manipulation (use classes)

### TypeScript-Specific Features (No C++ Equivalent)
- Decorators (future feature)
- Dynamic imports (Phase 4)
- Module/namespace exports (Phase 4)
- Declaration merging (class + interface with same name)
- typeof for constructor types (compile-time only)
- Static abstract methods (invalid in C++)
- Class expressions (runtime class construction)
- Method overloads (return-type-only)
- Arrow function type members
- Super property access (requires different C++ approach)
- Tests expecting compilation errors (error messages differ)

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
