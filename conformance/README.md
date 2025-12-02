# GoodScript Conformance Tests

This subproject validates GoodScript's TypeScript engine against the TC39 Test262 ECMAScript conformance test suite, focusing on the "Good Parts" subset that GoodScript supports.

## Overview

GoodScript is a TypeScript specialization with strict restrictions (no `var`, no type coercion, etc.) and ownership semantics. This conformance suite ensures that:

1. **Language Semantics**: GoodScript's TypeScript subset behaves identically to standard JavaScript for supported features
2. **Type System**: Type checking and inference align with TypeScript/JavaScript semantics
3. **Runtime Behavior**: Generated C++ code produces identical results to JavaScript execution

## Current Status (December 2, 2024)

✅ **Infrastructure Complete**
- Test262 submodule initialized (50,000+ tests available)
- Conformance harness built and functional
- Dual-mode validation (JavaScript + C++ GC) working
- Test execution pipeline operational

📊 **Initial Results**
- 5 Test262 numeric literal tests executed
- 0% pass rate (expected - YAML parser needs refinement)
- All infrastructure components working end-to-end

🎯 **Next Steps**
- Improve YAML frontmatter extraction
- Implement Test262 helper functions (Test262Error, assert)
- Add feature filtering for GoodScript-compatible tests
- Target 95%+ pass rate for core features

## Test262 Integration

Test262 is the official ECMAScript conformance test suite maintained by TC39. It contains over 50,000 test files covering:

- Language features (ES5, ES6, ES2016+)
- Built-in objects and methods
- Syntax validation
- Edge cases and error conditions

### What We Test

GoodScript tests focus on features within "The Good Parts":

✅ **Included**:
- `let`/`const` declarations
- Strict equality (`===`, `!==`)
- Classes and inheritance
- Functions (regular, arrow, async)
- Objects and arrays
- Control flow (if/else, for/while, switch)
- Error handling (try/catch/finally)
- Promises and async/await
- Template literals
- Destructuring
- Spread/rest operators
- Map/Set collections
- JSON operations

❌ **Excluded** (GoodScript restrictions):
- `var` declarations (GS105)
- Type coercion operators (`==`, `!=`) (GS106)
- `with` statement (GS101)
- `eval`/`Function()` (GS102)
- `any` type
- Dynamic property access patterns
- Prototype chain manipulation

## Project Structure

```
conformance/
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── vitest.config.ts       # Test runner configuration
├── README.md              # This file
├── test262/               # Git submodule pointing to tc39/test262
├── src/
│   ├── harness/           # Test262 harness adapter for GoodScript
│   │   ├── runner.ts      # Test execution engine
│   │   ├── parser.ts      # Test262 metadata parser
│   │   └── filters.ts     # Feature/restriction filters
│   ├── suites/            # Organized test suites
│   │   ├── basics.test.ts         # Core language features
│   │   ├── collections.test.ts    # Map/Set/Array
│   │   ├── async.test.ts          # Promises/async-await
│   │   ├── classes.test.ts        # Class syntax and inheritance
│   │   └── ownership.test.ts      # GoodScript ownership semantics
│   └── utils/
│       ├── compiler.ts    # GoodScript compiler wrapper
│       └── comparator.ts  # JS vs C++ output comparison
└── reports/               # Generated conformance reports (gitignored)
```

## Getting Started

### 1. Initialize Test262 Submodule

```bash
cd conformance
npm run update-test262
```

This clones the test262 repository as a git submodule.

### 2. Install Dependencies

```bash
npm install
```

### 3. Build

```bash
npm run build
```

### 4. Run Tests

```bash
# Run all conformance tests
npm test

# Run specific suite
npm run test:subset basics

# Watch mode for development
npm test:watch

# Generate coverage report
npm test:coverage
```

## Test Harness

The test harness (`src/harness/`) adapts Test262 tests for GoodScript:

### Test Execution Flow

1. **Filter**: Select tests matching GoodScript's feature set
2. **Parse**: Extract test metadata (frontmatter, expected errors, features)
3. **Compile**: Run GoodScript compiler (validate + codegen with GC mode)
4. **Execute**: Run both TypeScript (Node.js) and C++ GC versions
5. **Compare**: Verify identical behavior (output, errors, exceptions)

**Note**: Conformance tests use GoodScript's **GC mode** for C++ compilation (`-DGS_GC_MODE`). This provides simpler memory management that's closer to JavaScript semantics, making it ideal for validating language behavior without the complexity of ownership types.

### Test262 Metadata

Each Test262 test includes YAML frontmatter:

```javascript
/*---
description: Test const declaration
esid: sec-let-and-const-declarations
features: [const]
flags: [noStrict]
negative:
  phase: parse
  type: SyntaxError
---*/
```

The harness uses this to:
- Skip unsupported features
- Expect compilation errors for invalid code
- Configure execution environment

## Feature Mapping

Test262 features map to GoodScript phases:

| Test262 Feature | GoodScript Support | Phase |
|----------------|-------------------|-------|
| `let` | ✅ Fully supported | 1 |
| `const` | ✅ Fully supported | 1 |
| `class` | ✅ With ownership types | 2 |
| `async-functions` | ✅ Supported | 3 |
| `Promise` | ✅ Supported | 3 |
| `Map` | ✅ Runtime library | 3 |
| `Set` | ✅ Runtime library | 3 |
| `Array.prototype.*` | ⚠️ Partial (subset) | 3 |
| `String.prototype.*` | ⚠️ Partial (subset) | 3 |
| `Symbol` | ❌ Not supported | - |
| `Proxy` | ❌ Not supported | - |
| `Reflect` | ❌ Not supported | - |
| `WeakMap/WeakSet` | ❌ Use `use<T>` instead | 2 |

## Writing Conformance Tests

### Basic Structure

```typescript
import { describe, it, expect } from 'vitest';
import { runTest262Test } from '../harness/runner';

describe('Test262: Basics', () => {
  it('should support let declarations', async () => {
    const result = await runTest262Test('test/language/statements/let/syntax.js');
    expect(result.passed).toBe(true);
  });
});
```

### Batch Testing

```typescript
import { runTest262Suite } from '../harness/runner';

describe('Test262: Array Methods', () => {
  const tests = runTest262Suite('test/built-ins/Array/prototype/');
  
  it.each(tests)('$name', async ({ path }) => {
    const result = await runTest262Test(path);
    expect(result.passed).toBe(true);
  });
});
```

### Custom Filters

```typescript
import { filterTests } from '../harness/filters';

const goodPartsTests = filterTests({
  exclude: ['var', 'eval', 'with', 'Symbol', 'Proxy'],
  include: ['let', 'const', 'class', 'async-functions'],
  strictMode: true
});
```

## Conformance Reporting

Test runs generate detailed reports:

```
reports/
├── summary.json           # Overall pass/fail statistics
├── failures.json          # Failed test details
├── coverage.json          # Feature coverage matrix
└── index.html             # Human-readable report
```

### Report Metrics

- **Total Tests**: Number of applicable Test262 tests
- **Pass Rate**: Percentage of tests passing
- **Feature Coverage**: Which Test262 features are tested
- **Regression Tracking**: Changes from previous runs

## CI Integration

Conformance tests run on:
- Pull requests (blocking)
- Main branch commits
- Nightly builds (full suite)

Target: **95%+ pass rate** for GoodScript-supported features.

## Contributing

When adding new GoodScript features:

1. Update `src/harness/filters.ts` to include new Test262 features
2. Add suite in `src/suites/` for the feature
3. Run conformance tests to verify behavior
4. Update this README with feature support status

## References

- [TC39 Test262](https://github.com/tc39/test262)
- [Test262 Interpreting Guide](https://github.com/tc39/test262/blob/main/INTERPRETING.md)
- [GoodScript Language Spec](../docs/LANGUAGE.md)
- [GoodScript Good Parts](../docs/GOOD-PARTS.md)

## License

MIT (same as GoodScript)

Test262 files are under their own license (BSD-3-Clause) - see `test262/LICENSE`.
