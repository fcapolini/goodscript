# Phase 2 Tests: Ownership Analysis & DAG Validation

Phase 2 introduces ownership semantics and enforces the DAG (Directed Acyclic Graph) constraint for memory safety.

## Test Organization

```
test/phase2/
├── index.test.ts              # Overview and basic sanity tests
├── ownership-cycles.test.ts   # DAG cycle detection tests
├── null-checks.test.ts        # Weak<T> null-safety tests
└── test-helpers.ts            # Phase 2 test utilities
```

## Test Coverage

### Ownership Cycle Detection (ownership-cycles.test.ts)

Tests for all DAG-DETECTION.md rules:

- **Rule 1.1**: Direct `Shared<T>` field creates edge
  - Direct self-reference (A → A)
  - Mutual cycles (A → B → A)
  - Longer cycles (A → B → C → A)

- **Rule 1.2**: Container transitivity
  - `Array<Shared<T>>`
  - `Shared<T>[]` syntax
  - `Set<Shared<T>>`
  - `Map<K, Shared<T>>`

- **Rule 1.3**: Intermediate wrapper transitivity
  - Transitive ownership chains
  - Deep nesting cycles

- **Rule 2.1**: Self-ownership prohibition
  - Linked lists with `Shared<T>`
  - Trees with `Shared<T>` children
  - Graphs with `Shared<T>` edges

- **Rule 3.1**: `Weak<T>` does NOT create edges
  - Self-references with `Weak<T>`
  - Bidirectional references
  - Weak arrays and containers

- **Rule 3.2**: `Unique<T>` does NOT create edges
  - Unique ownership
  - Unique arrays

- **Rule 4.1**: Pool Pattern enforcement
  - Tree structures
  - Linked lists
  - Graphs

Additional coverage:
- Cross-file cycle detection
- Complex scenarios (diamond dependencies, mixed ownership)
- Interface support

### Null-Check Analysis (null-checks.test.ts)

Tests for `Weak<T>` null-safety:

- **Basic null checks**
  - Property access without check (error)
  - `!== null` check (valid)
  - `!== undefined` check (valid)
  - Optional chaining `?.` (valid)

- **Flow-sensitive analysis**
  - Tracking through `if` statements
  - Else branches
  - Early returns
  - Short-circuit `&&` pattern
  - Ternary conditionals

- **Loop constructs**
  - While loops
  - For loops

- **Method calls**
  - Unchecked method calls (error)
  - Checked method calls (valid)
  - Optional chaining for methods

- **Array/element access**
  - Unchecked element access (error)
  - Checked element access (valid)

- **Complex scenarios**
  - Nested weak references
  - Multiple weak references
  - Invalidation on reassignment

- **Function parameters**
  - Unchecked weak parameters (error)
  - Checked weak parameters (valid)

## Running Tests

```bash
# Run all Phase 2 tests
npm test -- test/phase2

# Run specific test file
npm test -- test/phase2/ownership-cycles.test.ts
npm test -- test/phase2/null-checks.test.ts

# Run in watch mode
npm test -- test/phase2 --watch
```

## Error Codes

- **GS301**: Ownership cycle detected
  - Reports cycle path (e.g., "A → B → A")
  - Suggests Pool Pattern for self-referential structures
  
- **GS302**: Null check required for Weak<T>
  - Points to unchecked weak reference usage
  - Suggests using `!== null` or optional chaining

## Test Helpers

### `compileWithOwnership(source, fileName?, level?)`

Compiles source with ownership analysis enabled (level='dag' by default).

```typescript
const result = compileWithOwnership(`
  class Node {
    next: Shared<Node> | null = null;
  }
`);
expect(hasError(result.diagnostics, 'GS301')).toBe(true);
```

### `compileMultipleWithOwnership(files, level?)`

Compiles multiple files together (for cross-file cycle detection).

```typescript
const result = compileMultipleWithOwnership([
  { name: 'a.gs.ts', source: '...' },
  { name: 'b.gs.ts', source: '...' }
]);
```

### Assertion Helpers

- `hasError(diagnostics, code)`: Check if error code exists
- `getErrors(diagnostics, code)`: Get all errors with code
- `isSuccess(result)`: Check if compilation succeeded

## Writing New Tests

1. Import test helpers:
```typescript
import { compileWithOwnership, hasError, getErrors } from './test-helpers';
```

2. Write test cases:
```typescript
it('should detect my cycle', () => {
  const source = `...`;
  const result = compileWithOwnership(source);
  expect(hasError(result.diagnostics, 'GS301')).toBe(true);
});
```

3. Add to appropriate test file or create new one

## Known Limitations

Only 1 test currently skipped:

1. **Pool Pattern with Unique<T> arrays** (`index.test.ts`)
   - TypeScript type compatibility issue with `Unique<Node>[]` initialization
   - Not a bug in ownership/null-check analysis
   - Related to type definition integration

**All core functionality is working**: 60/61 tests passing (98.4% pass rate)

Previous limitations with `Weak<T>` type detection have been resolved by:
- Checking symbol declarations directly instead of relying only on `typeToTypeNode()`
- Properly handling `undefined` as an identifier (not a keyword) in the AST
- Fixing control flow analysis to avoid double-recursion through handled nodes
