# GoodScript Conformance Testing - Quick Reference

## Overview

The `conformance/` subproject validates GoodScript against the TC39 Test262 suite—the official ECMAScript conformance test suite with 50,000+ tests.

## Project Structure

```
conformance/
├── package.json              # Dependencies & scripts
├── tsconfig.json             # TypeScript config
├── vitest.config.ts          # Test runner config
├── setup.sh                  # One-time setup script
├── README.md                 # Full documentation
├── STATUS.md                 # Current state
├── .gitignore                # Excluded files
├── test262/                  # Git submodule (tc39/test262) - not committed
├── src/
│   ├── harness/              # Test262 test runner
│   │   ├── runner.ts         # Main test execution engine
│   │   ├── parser.ts         # YAML metadata parser
│   │   └── filters.ts        # Feature inclusion/exclusion
│   ├── suites/               # Test suites
│   │   ├── basics.test.ts    # Core language (let/const/if/for)
│   │   ├── collections.test.ts  # Map/Set/Array
│   │   ├── async.test.ts     # Promise/async-await
│   │   ├── classes.test.ts   # Class syntax/inheritance
│   │   └── ownership.test.ts # GoodScript ownership semantics
│   └── utils/
│       ├── compiler.ts       # GoodScript compiler wrapper
│       └── comparator.ts     # JS vs C++ output comparison
└── reports/                  # Generated reports (gitignored)
    ├── summary.json
    ├── failures.json
    └── coverage.json
```

## Quick Commands

```bash
# Initial setup (one-time)
cd conformance
./setup.sh

# Run all tests
npm test

# Run specific suite
npm run test:subset basics

# Watch mode (for development)
npm test:watch

# Generate coverage report
npm test:coverage

# Update test262 to latest
npm run update-test262

# Clean build artifacts
npm run clean
```

## Test Execution Flow

```
Test262 Test (JavaScript)
          ↓
    Parse Metadata
          ↓
    Feature Filtering ───→ Skip if unsupported
          ↓
    GoodScript Compile (GC Mode)
      /           \
     /             \
JavaScript      C++ GC Binary
Execution       Execution
     \             /
      \           /
    Compare Outputs
          ↓
    ✓ Pass / ✗ Fail
```

**Note**: Uses GC mode (`-DGS_GC_MODE`) for simpler semantics closer to JavaScript.

## Feature Support

### ✅ Supported (Tested)
- `let`/`const` declarations
- Strict equality (`===`, `!==`)
- Classes and inheritance
- Functions (regular, arrow, async)
- Control flow (if/else, for/while, switch)
- Error handling (try/catch/finally)
- Promises and async/await
- Map/Set/Array collections
- JSON operations
- Template literals

### ❌ Excluded (GoodScript Restrictions)
- `var` declarations (GS105)
- Type coercion (`==`, `!=`) (GS106)
- `with`, `eval`, `Function()` (GS101, GS102)
- Dynamic features (Proxy, Reflect, Symbol)
- WeakMap/WeakSet (use `use<T>` instead)

## Key Components

### 1. Test Harness (`src/harness/`)

**`runner.ts`**: Main test execution
- `runTest262Test(path)` - Run single test
- `runTest262Suite(dir)` - Run all tests in directory
- `summarizeResults()` - Generate statistics

**`parser.ts`**: YAML frontmatter parser
- Extracts test metadata (features, flags, expected errors)
- Parses `/*---...---*/` blocks

**`filters.ts`**: Feature filtering
- `shouldRunTest(test)` - Determines if test applies to GoodScript
- `getRelevantFeatures()` - Lists supported features
- `getExcludedFeatures()` - Lists excluded features

### 2. Test Suites (`src/suites/`)

Organized by feature area:
- **basics**: Core language features
- **collections**: Array/Map/Set
- **async**: Promise/async-await
- **classes**: Class syntax
- **ownership**: GoodScript-specific ownership semantics

### 3. Utilities (`src/utils/`)

**`compiler.ts`**: GoodScript compiler wrapper
- Validates "Good Parts" (Phase 1)
- Runs ownership analysis (Phase 2)
- Generates C++ code (Phase 3)

**`comparator.ts`**: Output comparison
- Executes JavaScript (Node.js)
- Compiles and executes C++
- Compares stdout/stderr/exit codes

## Test262 Metadata

Tests include YAML frontmatter:

```javascript
/*---
description: Test description
esid: sec-ecma-spec-reference
features: [const, let]
flags: [onlyStrict]
negative:
  phase: parse
  type: SyntaxError
---*/
```

**Fields:**
- `features`: ECMAScript features used
- `flags`: Test configuration (strict mode, etc.)
- `negative`: Expected error (phase + type)

## Adding New Tests

### From Test262

```typescript
import { runTest262Test } from '../harness/runner';

it('should handle specific feature', async () => {
  const result = await runTest262Test('test/language/path/to/test.js');
  expect(result.passed).toBe(true);
});
```

### Custom GoodScript Tests

```typescript
import { compileGoodScript } from '../utils/compiler';
import { compareOutputs } from '../utils/comparator';

it('should handle ownership correctly', async () => {
  const code = `
    class Node { value: number; }
    const node: own<Node> = new Node();
  `;
  
  const result = await compileGoodScript(code, { generateCpp: true });
  expect(result.success).toBe(true);
  expect(result.cppCode).toContain('std::unique_ptr');
});
```

## Interpreting Results

### Success
```
✓ test/language/statements/let/syntax.js (12ms)
```
Both JS and C++ executed with identical output.

### Failure
```
✗ test/built-ins/Array/prototype/map/this-binding.js
  Expected: [2,4,6]
  Got (C++): [1,2,3]
  Difference: this binding in callbacks incorrect
```
JS and C++ outputs differed.

### Skipped
```
⊘ test/language/statements/var/syntax.js (skipped: var not supported)
```
Test uses unsupported feature.

## CI Integration

Add to `.github/workflows/conformance.yml`:

```yaml
- name: Conformance Tests
  run: |
    cd conformance
    npm ci
    npm run update-test262
    npm test
```

## Target Metrics

- **Total Tests**: 1,000+ (Phase 3.5), 5,000+ (long-term)
- **Pass Rate**: 95%+ (Phase 3.5), 98%+ (long-term)
- **Coverage**: All GoodScript "Good Parts" features

## Troubleshooting

### Test262 not found
```bash
cd conformance
./setup.sh  # Re-run setup
```

### Compilation failures
Check that GoodScript compiler is built:
```bash
cd ../compiler
npm run build
```

### C++ execution failures
Ensure g++ or clang++ is installed:
```bash
g++ --version  # or clang++ --version
```

## References

- [conformance/README.md](../conformance/README.md) - Full documentation
- [docs/TEST262-CONFORMANCE.md](../docs/TEST262-CONFORMANCE.md) - Strategy & design
- [CONFORMANCE.md](../CONFORMANCE.md) - High-level overview
- [TC39 Test262](https://github.com/tc39/test262) - Official suite

## License

- GoodScript conformance harness: MIT
- Test262 tests: BSD-3-Clause (see `test262/LICENSE`)
