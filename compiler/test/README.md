# GoodScript Test Suite

Tests are organized by implementation phase to match the language development roadmap.

## Test Structure

```
test/
├── phase1/          # Phase 1: Strict TypeScript Semantics
│   ├── fixtures/                  # Phase 1 compliant source files
│   │   ├── basic-functions.gs.ts  # Arrow functions, rest parameters
│   │   ├── control-flow.gs.ts     # if/else, for-of, switch
│   │   ├── classes.gs.ts          # Class declarations and methods
│   │   ├── types.gs.ts            # Interfaces, generics, type unions
│   │   └── null-handling.gs.ts    # null/undefined semantics
│   ├── index.test.ts              # Test suite entry point
│   ├── test-helpers.ts            # Shared test utilities
│   ├── codegen-comparison.test.ts # Fixture validation tests
│   ├── interop.test.ts            # GoodScript/TypeScript interoperability
│   ├── var-keyword.test.ts        # GS105: No var keyword
│   ├── strict-equality.test.ts    # GS106/107: === and !== only
│   ├── arrow-functions.test.ts    # GS108: Arrow functions only
│   ├── no-arguments.test.ts       # GS103: No arguments object
│   ├── no-for-in.test.ts          # GS104: No for-in loops
│   ├── no-with.test.ts            # GS101: No with statement
│   ├── no-eval.test.ts            # GS102: No eval function
│   └── no-type-coercion.test.ts   # GS201: No implicit type coercion
│
├── cli/             # CLI Compatibility Tests
│   └── gsc-tsc-compatibility.test.ts  # gsc as tsc drop-in replacement
│
├── phase2/          # Phase 2: Ownership Analysis
│   ├── index.test.ts                 # Overview and basic tests
│   ├── ownership-cycles.test.ts      # DAG cycle detection (29 tests)
│   ├── null-checks.test.ts           # weak<T> null-safety (23 tests)
│   ├── test-helpers.ts               # Phase 2 test utilities
│   └── README.md                     # Phase 2 test documentation
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

# Run only Phase 2 tests
npm test -- test/phase2

# Run CLI compatibility tests
npm test -- test/cli

# Run specific test file
npm test -- test/phase2/ownership-cycles.test.ts

# Run in watch mode
npm test -- --watch
```

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
| `no-any-type.test.ts` | GS109 | No `any` type - use explicit types or generics |
| `no-truthy-falsy.test.ts` | GS110 | No implicit truthy/falsy - use explicit comparisons |
| `no-delete.test.ts` | GS111 | No `delete` operator - use optional properties or destructuring |
| `no-comma-operator.test.ts` | GS112 | No comma operator - use separate statements |
| `no-void-operator.test.ts` | GS115 | No `void` operator - use `undefined` directly |
| `no-arguments.test.ts` | GS103 | No `arguments` object - use rest parameters |
| `no-for-in.test.ts` | GS104 | No `for-in` loops - use `for-of` or explicit iteration |
| `no-with.test.ts` | GS101 | No `with` statement |
| `no-eval.test.ts` | GS102 | No `eval` function |
| `no-type-coercion.test.ts` | GS201 | No mixing string and number types |

### Interoperability

**`interop.test.ts`** - Validates seamless integration between `.gs.ts` and `.ts` files:

- **TypeScript importing from GoodScript** - Import types, functions, and classes from `.gs.ts` using `.gs` extension
- **GoodScript importing from TypeScript** - Import from standard `.ts` files without restrictions
- **Bidirectional imports** - Mixed projects with circular dependencies work correctly
- **Re-exports** - Both file types can re-export from each other
- **Restriction isolation** - Phase 1 restrictions only apply to `.gs.ts` files, not imported `.ts` code

See [docs/GOOD-PARTS.md](../../docs/GOOD-PARTS.md) for detailed rationale and examples.

## Test Fixtures

Phase 1 includes realistic fixture files demonstrating Phase 1 compliant code:

- **`basic-functions.gs.ts`** - Arrow functions, rest parameters, nested functions
- **`control-flow.gs.ts`** - if/else, for-of loops, switch statements
- **`classes.gs.ts`** - Class declarations, methods, constructors, private/readonly
- **`types.gs.ts`** - Interfaces, type aliases, generics, union types
- **`null-handling.gs.ts`** - null/undefined as synonyms, optional chaining patterns

These fixtures are validated to:
1. Be valid TypeScript (compile without errors)
2. Have no GoodScript Phase 1 violations
3. Not contain any forbidden constructs (var, ==, function keyword, etc.)
4. Generate identical JavaScript when compiled via GoodScript vs TypeScript

## CLI Compatibility Tests

The CLI test suite (`test/cli/`) validates that `gsc` can be used as a drop-in replacement for `tsc`:

- **Command-line arguments** - All tsc-compatible flags (--help, --version, --out-dir, --project, etc.)
- **tsconfig.json handling** - Auto-discovery, respect for settings, CLI overrides
- **Mixed projects** - Handles both .ts and .gs.ts files correctly
- **Exit codes** - Returns 0 on success, non-zero on errors
- **File resolution** - Absolute and relative paths

The CLI tests use real subprocess execution to validate end-to-end behavior.

## Test Helpers

Phase 1 tests use shared helpers from `test-helpers.ts`:

- **`compileSource(source, fileName?)`** - Compile source code string for testing
- **`getErrors(diagnostics, code)`** - Get all errors with a specific error code
- **`hasError(diagnostics, code)`** - Check if any error with the code exists

## Phase 2: Ownership Analysis

**Status**: Core implementation complete (54 tests passing, 7 skipped due to known limitations)

Phase 2 introduces ownership semantics with three-tier ownership system:
- **`unique<T>`** - Exclusive ownership (maps to Rust's `Box<T>`)
- **`shared<T>`** - Shared ownership with reference counting (maps to `Rc<T>`)
- **`weak<T>`** - Non-owning references (maps to `Weak<T>`) - implicitly nullable

See [test/phase2/README.md](phase2/README.md) for detailed test documentation.

### DAG Cycle Detection (ownership-cycles.test.ts)

All 29 tests passing - validates all rules from DAG-DETECTION.md:

| Test Category | Tests | Description |
|---------------|-------|-------------|
| Rule 1.1: Direct edges | 4 | Direct `shared<T>` fields create ownership edges |
| Rule 1.2: Container transitivity | 5 | `Array<shared<T>>`, `Map<K, shared<V>>`, `Set<shared<T>>` |
| Rule 1.3: Transitive ownership | 2 | Ownership chains through intermediate types |
| Rule 2.1: Cycle prohibition | 3 | Detects self-reference, mutual, and longer cycles |
| Rule 3.1: weak<T> breaks cycles | 4 | `weak<T>` doesn't create ownership edges |
| Rule 3.2: unique<T> orthogonal | 2 | `unique<T>` doesn't participate in shared graph |
| Rule 4.1: Pool Pattern | 3 | Validates correct patterns for data structures |
| Complex scenarios | 4 | Diamond dependencies, mixed ownership |
| Interface support | 2 | Cycle detection through interfaces |

**Error code**: **GS301** - Ownership cycle detected

### Null-Check Analysis (null-checks.test.ts)

All 23 tests passing:

| Test Category | Tests | Description |
|---------------|-------|-------------|
| Basic null checks | 4 passing | `!== null`, `!== undefined`, optional chaining |
| Flow-sensitive analysis | 5 passing | Tracking through if/while/for/ternary |
| Loop constructs | 2 passing | While and for loop null checks |
| Method calls | 3 passing | Checked vs unchecked method calls |
| Array/element access | 2 passing | Checked element access |
| Complex scenarios | 3 passing | Nested weak refs, reassignment |
| Function parameters | 2 passing | Weak parameter checking |
| Edge cases | 2 passing | Initialization, non-weak types |

**Error code**: **GS302** - Null check required for weak<T>

**Previous limitations resolved**:
- Fixed `undefined` detection (identifier vs keyword in TypeScript AST)
- Improved `weak<T>` type detection via symbol declarations
- Fixed control flow analysis double-recursion issue

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
