# TC39 Test262 Conformance Testing for GoodScript

## Overview

This document describes GoodScript's conformance testing strategy using the TC39 Test262 suite—the official ECMAScript conformance test suite maintained by Ecma International TC39.

## Why Test262?

Test262 is the authoritative test suite for ECMAScript implementations, containing:

- **50,000+ test files** covering ES5 through the latest ECMAScript specifications
- **Comprehensive coverage** of language syntax, semantics, and built-in objects
- **Edge cases and error conditions** that validate correctness
- **Well-structured metadata** (YAML frontmatter) indicating features, expected behavior
- **Active maintenance** by TC39 with contributions from major browser vendors and runtime implementors

For GoodScript, Test262 validation ensures:

1. **Semantic Correctness**: GoodScript's TypeScript subset behaves identically to JavaScript for all supported features
2. **Type System Fidelity**: Type checking and inference match TypeScript/JavaScript behavior
3. **Runtime Equivalence**: Generated C++ code produces identical results to JavaScript execution
4. **Regression Prevention**: Continuous validation that changes don't break existing behavior

## GoodScript's Approach

### 1. Feature Filtering

GoodScript is a **TypeScript specialization** that supports only "The Good Parts." Our conformance testing strategy:

**Include:**
- Tests for supported ECMAScript features (let/const, classes, async/await, etc.)
- Tests that validate strict equality, control flow, error handling
- Tests for Map, Set, Array methods, JSON, etc.
- Tests that verify ownership semantics work correctly

**Exclude:**
- Tests for prohibited features (`var`, `==`/`!=`, `eval`, `with`, etc.)
- Tests for dynamic features (Proxy, Reflect, Symbol, WeakMap/WeakSet)
- Tests for prototype manipulation and dynamic property access
- Tests for generator functions and async iteration (Phase 4)

### 2. Dual-Mode Validation

Each test runs in **two modes** to validate equivalence:

```
                   ┌─────────────────┐
                   │  Test262 Test   │
                   │   (JavaScript)  │
                   └────────┬────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
    ┌──────────────────┐        ┌──────────────────┐
    │  JavaScript Mode │        │    C++ Mode      │
    │  (Node.js/Deno)  │        │  (g++/clang++)   │
    └────────┬─────────┘        └────────┬─────────┘
             │                           │
             │    ┌───────────────┐      │
             └───▶│   Comparator  │◀─────┘
                  │  (Output/Err) │
                  └───────┬───────┘
                          ▼
                   ✓ Pass / ✗ Fail
```

**JavaScript Mode:**
- Parse and validate GoodScript restrictions (Phase 1)
- Run ownership analysis (Phase 2)
- Execute code in Node.js runtime
- Capture stdout, stderr, exit code

**C++ Mode:**
- Generate C++ code (Phase 3)
- Compile with g++/clang++ (std=c++20)
- Execute native binary
- Capture stdout, stderr, exit code

**Comparison:**
- Outputs must match exactly (after normalization)
- Error types and messages must align
- Exit codes must match

### 3. Test Metadata Processing

Test262 tests include YAML frontmatter:

```javascript
/*---
description: Verify const binding is immutable
esid: sec-let-and-const-declarations
features: [const]
flags: [onlyStrict]
negative:
  phase: runtime
  type: TypeError
---*/

const x = 1;
x = 2; // TypeError
```

Our harness parses this to:

- **Skip unsupported features** (`features` field)
- **Expect compilation errors** for parse/early errors
- **Expect runtime errors** with specific types
- **Configure execution environment** (strict mode, etc.)

### 4. Error Handling

Test262 distinguishes error phases:

| Phase | Meaning | GoodScript Handling |
|-------|---------|---------------------|
| `parse` | Syntax error | Should fail in Phase 1 validation |
| `early` | Static semantic error | Should fail in Phase 1 or 2 |
| `resolution` | Module resolution error | N/A (Phase 4) |
| `runtime` | Runtime exception | Should throw during execution |

For negative tests (expected errors):
- Validate error type matches (`SyntaxError`, `TypeError`, etc.)
- Ensure both JS and C++ modes fail consistently
- Verify error messages are meaningful

## Test Organization

### Directory Structure

```
conformance/
├── src/
│   ├── harness/
│   │   ├── runner.ts      # Test execution engine
│   │   ├── parser.ts      # YAML frontmatter parser
│   │   └── filters.ts     # Feature inclusion/exclusion logic
│   ├── suites/
│   │   ├── basics.test.ts         # Core language (let/const/if/for)
│   │   ├── collections.test.ts    # Map/Set/Array
│   │   ├── async.test.ts          # Promise/async-await
│   │   ├── classes.test.ts        # Class syntax/inheritance
│   │   └── ownership.test.ts      # GoodScript-specific ownership
│   └── utils/
│       ├── compiler.ts    # GoodScript compiler wrapper
│       └── comparator.ts  # JS vs C++ output comparison
└── test262/               # Git submodule (tc39/test262)
```

### Test Suites

**`basics.test.ts`:** Core language features
- Variable declarations (let/const)
- Control flow (if/else/switch)
- Loops (for/while/do-while)
- Functions (regular, arrow, async)
- Template literals
- Strict equality operators

**`collections.test.ts`:** Collection types
- Array methods (map, filter, reduce, forEach, etc.)
- Map operations (set, get, has, delete, keys, values)
- Set operations (add, has, delete, keys, values)
- JSON.parse/stringify

**`async.test.ts`:** Asynchronous features
- Promise constructor and methods (then, catch, finally)
- async/await syntax
- Error handling in async contexts
- Promise.all/race/allSettled/any

**`classes.test.ts`:** Class syntax
- Class declarations and expressions
- Constructors and methods
- Inheritance (extends, super)
- Static members
- Getters and setters (when implemented)

**`ownership.test.ts`:** GoodScript-specific
- own<T> translates to std::unique_ptr<T>
- share<T> translates to std::shared_ptr<T>
- use<T> translates to std::weak_ptr<T>
- Ownership derivation rules
- DAG cycle detection
- Pool Pattern enforcement

## Running Tests

### Basic Usage

```bash
# Initialize (one-time setup)
cd conformance
./setup.sh

# Run all tests
npm test

# Run specific suite
npm run test:subset basics

# Watch mode
npm test:watch

# Coverage report
npm test:coverage
```

### Test Output

```
✓ test/language/statements/let/syntax.js (12ms)
✓ test/language/statements/const/syntax.js (8ms)
⊘ test/language/statements/var/syntax.js (skipped: var not supported)
✗ test/built-ins/Array/prototype/map/callback-this.js
  Expected: [2,4,6]
  Got (C++): [1,2,3]
  Reason: this binding in callbacks not yet implemented

Summary:
  Total:    1,247
  Passed:   1,189 (95.3%)
  Failed:   12 (0.96%)
  Skipped:  46 (3.7%)
```

### CI Integration

Add to `.github/workflows/conformance.yml`:

```yaml
name: Conformance Testing

on:
  pull_request:
  push:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'  # Nightly at 2 AM

jobs:
  test262:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: recursive
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: |
          cd conformance
          npm ci
      
      - name: Update test262
        run: |
          cd conformance
          npm run update-test262
      
      - name: Run conformance tests
        run: |
          cd conformance
          npm test
      
      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: conformance-report
          path: conformance/reports/
```

## Reporting

### Summary Report

Generated as `reports/summary.json`:

```json
{
  "timestamp": "2025-12-02T10:30:00Z",
  "total": 1247,
  "passed": 1189,
  "failed": 12,
  "skipped": 46,
  "passRate": 95.3,
  "avgDuration": 15.2,
  "suites": {
    "basics": { "passed": 456, "failed": 2, "skipped": 5 },
    "collections": { "passed": 389, "failed": 4, "skipped": 12 },
    "async": { "passed": 234, "failed": 3, "skipped": 8 },
    "classes": { "passed": 110, "failed": 3, "skipped": 21 }
  }
}
```

### Failure Report

Generated as `reports/failures.json`:

```json
[
  {
    "path": "test/built-ins/Array/prototype/map/callback-this.js",
    "error": "Output mismatch: this binding incorrect",
    "expected": "[2,4,6]",
    "actual": "[1,2,3]",
    "phase": "runtime"
  }
]
```

### Coverage Matrix

Generated as `reports/coverage.json`:

```json
{
  "features": {
    "let": { "tests": 45, "passed": 45, "coverage": 100 },
    "const": { "tests": 38, "passed": 38, "coverage": 100 },
    "class": { "tests": 156, "passed": 153, "coverage": 98.1 },
    "async-functions": { "tests": 89, "passed": 86, "coverage": 96.6 }
  }
}
```

## Success Criteria

### Phase 3.5 Goals

- [ ] **Setup Complete**: Test262 submodule integrated, harness functional
- [ ] **Initial Coverage**: 1,000+ applicable tests identified and categorized
- [ ] **Core Features**: 95%+ pass rate for let/const/if/for/functions
- [ ] **Collections**: 90%+ pass rate for Array/Map/Set
- [ ] **Async**: 90%+ pass rate for Promise/async-await
- [ ] **Classes**: 90%+ pass rate for class syntax/inheritance
- [ ] **Ownership**: 100% pass rate for GoodScript ownership tests
- [ ] **CI Integration**: Automated testing on PR/merge
- [ ] **Regression Tracking**: Compare results across commits

### Long-term Goals

- [ ] **Comprehensive Coverage**: 5,000+ applicable Test262 tests
- [ ] **High Pass Rate**: 98%+ for all supported features
- [ ] **Performance Benchmarks**: C++ binary performance vs Node.js
- [ ] **Cross-platform Validation**: Test on Linux/macOS/Windows
- [ ] **Error Message Quality**: Helpful diagnostics for failures

## Maintenance

### Updating Test262

```bash
cd conformance
npm run update-test262
```

This pulls the latest test262 changes. New tests may:
- Add coverage for existing features
- Test new ECMAScript proposals (may need filtering)
- Fix bugs in existing tests

### Adding New Feature Support

When implementing a new GoodScript feature:

1. Update `src/harness/filters.ts` to include the feature
2. Create/update test suite in `src/suites/`
3. Run conformance tests to verify behavior
4. Update documentation with pass rates

### Debugging Failures

For test failures:

1. Check `reports/failures.json` for error details
2. Run specific test: `npm run test:subset path/to/test.js`
3. Compare JS vs C++ outputs manually
4. Fix compiler bug or update test filter if unsupported
5. Re-run and verify fix

## References

- [TC39 Test262 Repository](https://github.com/tc39/test262)
- [Test262 Interpreting Guide](https://github.com/tc39/test262/blob/main/INTERPRETING.md)
- [Test262 Contributing Guide](https://github.com/tc39/test262/blob/main/CONTRIBUTING.md)
- [ECMA-262 Specification](https://tc39.es/ecma262/)
- [GoodScript Language Spec](LANGUAGE.md)
- [GoodScript Good Parts](GOOD-PARTS.md)

## License

Test262 tests are licensed under BSD-3-Clause. See `conformance/test262/LICENSE`.

GoodScript conformance harness is MIT licensed (same as GoodScript).
