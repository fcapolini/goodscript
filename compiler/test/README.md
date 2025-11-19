# GoodScript Test Suite

Tests are organized by implementation phase to match the language development roadmap.

## Test Structure

```
test/
├── phase1/          # Phase 1: Strict TypeScript Semantics
│   ├── index.test.ts              # Test suite entry point
│   ├── test-helpers.ts            # Shared test utilities
│   ├── var-keyword.test.ts        # GS105: No var keyword
│   ├── strict-equality.test.ts    # GS106/107: === and !== only
│   ├── arrow-functions.test.ts    # GS108: Arrow functions only
│   ├── no-arguments.test.ts       # GS103: No arguments object
│   ├── no-for-in.test.ts          # GS104: No for-in loops
│   ├── no-with.test.ts            # GS101: No with statement
│   ├── no-eval.test.ts            # GS102: No eval function
│   └── no-type-coercion.test.ts   # GS201: No implicit type coercion
│
├── phase2/          # Phase 2: Ownership Analysis (TBD)
│   └── (ownership tests go here)
│
└── phase3/          # Phase 3: Rust Code Generation (TBD)
    └── (codegen tests go here)
```

## Running Tests

```bash
# Run all tests
npm test

# Run only Phase 1 tests
npm test -- test/phase1

# Run specific test file
npm test -- test/phase1/var-keyword.test.ts

# Run in watch mode
npm test -- --watch
```

## Phase 1: Strict TypeScript Semantics

Phase 1 tests verify that GoodScript correctly enforces the "Good Parts" restrictions:

### Language Restrictions

| Test File | Error Code | Description |
|-----------|------------|-------------|
| `var-keyword.test.ts` | GS105 | No `var` keyword - use `let` or `const` |
| `strict-equality.test.ts` | GS106, GS107 | Use `===` and `!==` instead of `==` and `!=` |
| `arrow-functions.test.ts` | GS108 | Use arrow functions instead of `function` keyword |
| `no-arguments.test.ts` | GS103 | No `arguments` object - use rest parameters |
| `no-for-in.test.ts` | GS104 | No `for-in` loops - use `for-of` or explicit iteration |
| `no-with.test.ts` | GS101 | No `with` statement |
| `no-eval.test.ts` | GS102 | No `eval` function |
| `no-type-coercion.test.ts` | GS201 | No mixing string and number types |

See [docs/GOOD-PARTS.md](../../docs/GOOD-PARTS.md) for detailed rationale and examples.

## Test Helpers

Phase 1 tests use shared helpers from `test-helpers.ts`:

- **`compileSource(source, fileName?)`** - Compile source code string for testing
- **`getErrors(diagnostics, code)`** - Get all errors with a specific error code
- **`hasError(diagnostics, code)`** - Check if any error with the code exists

## Phase 2: Ownership Analysis (Future)

Tests for:
- `unique<T>` ownership semantics
- `shared<T>` reference counting
- `weak<T>` non-owning references
- DAG cycle detection
- Null-check enforcement

## Phase 3: Rust Code Generation (Future)

Tests for:
- TypeScript to Rust transpilation
- Ownership mapping (Box<T>, Rc<T>, Weak<T>)
- Generated code correctness
- Performance characteristics

## Writing New Tests

When adding new restrictions or features:

1. Create a new test file in the appropriate phase directory
2. Import test helpers: `import { compileSource, getErrors, hasError } from './test-helpers';`
3. Test both positive (should accept) and negative (should reject) cases
4. Document the error code and restriction being tested
5. Add the test file to `index.test.ts` if in Phase 1

Example:
```typescript
import { describe, it, expect } from 'vitest';
import { compileSource, getErrors, hasError } from './test-helpers';

describe('Phase 1: My restriction', () => {
  it('should reject bad code', () => {
    const result = compileSource('bad code here');
    expect(hasError(result.diagnostics, 'GS999')).toBe(true);
  });

  it('should accept good code', () => {
    const result = compileSource('good code here');
    expect(hasError(result.diagnostics, 'GS999')).toBe(false);
  });
});
```
