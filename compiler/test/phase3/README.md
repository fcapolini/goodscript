# Phase 3 Tests

Tests for Rust code generation (Phase 3).

## Runtime Equivalence Testing

**New in this session**: All Phase 3 tests now support **runtime equivalence validation**. When `rustc` is available:

- Generated JavaScript and Rust code are **both executed**
- Their stdout outputs are compared for equivalence
- Tests verify that GoodScript produces functionally identical code in both targets

This provides much stronger validation than syntax checking alone - it proves the Rust code generation is semantically correct.

### Example

```typescript
const result = compileAndExecute(`
  const x: number = 10;
  const y: number = 20;
  const sum: number = x + y;
  console.log(sum);
`);

expect(result.jsResult.success).toBe(true);
expect(result.rustResult.success).toBe(true);
expect(result.equivalent).toBe(true);  // Both print "30"
```

## Rust Validation with `rustc`

All Phase 3 tests include **automatic Rust validation** using `rustc`. When `rustc` is available on the system:

- Generated Rust code is compiled with `rustc --crate-type lib` or as an executable
- Compilation errors and warnings are captured and reported
- Tests automatically validate that generated Rust is syntactically correct
- **Runtime tests execute the compiled binary and compare output with JavaScript**

This ensures the GoodScript compiler generates valid, compilable, and functionally equivalent Rust code.

### Running Tests

```bash
# Run all Phase 3 tests (includes rustc validation if available)
npm test -- test/phase3

# Run only runtime equivalence tests
npm test -- test/phase3/runtime-equivalence.test.ts

# Run only validation tests
npm test -- test/phase3/rust-validation.test.ts

# If rustc is not available, runtime tests will be skipped
```

## Test Structure

- `runtime-equivalence.test.ts` - **Runtime equivalence tests** (NEW) - Execute JS and Rust, compare outputs
- `basic-types.test.ts` - Primitive type translation
- `ownership-types.test.ts` - Unique/Shared/Weak type translation
- `classes.test.ts` - Class to struct+impl translation
- `control-flow.test.ts` - Control flow and error handling translation
- `advanced-features.test.ts` - This→self, for-of loops, arrow functions
- `extended-features.test.ts` - Additional language features
- `error-propagation.test.ts` - Error handling with Result<T, E>
- `rust-validation.test.ts` - Comprehensive rustc validation suite
- `rust-validator.ts` - Rust compilation utilities
- `runtime-helpers.ts` - Runtime execution and comparison utilities

## Testing Strategy

Each test:
1. Compiles GoodScript source to **both TypeScript/JavaScript and Rust**
2. Verifies both outputs are syntactically correct
3. **Validates with rustc** (if available) - compiles generated Rust code
4. **Executes both JS and Rust** (runtime equivalence tests) - compares outputs
5. Checks for expected ownership type mappings
6. Verifies imports are generated correctly

This multi-layered approach ensures:
- Syntactic correctness (code parses and compiles)
- Semantic correctness (code produces the same results)
- Type system correctness (ownership types map properly)
- Build system correctness (generated code integrates properly)

## Known Rust Validation Issues

Current known issues (tracked for future fixes):

1. **Ownership type construction** - `Rc<T>`, `Box<T>`, `Weak<T>` need proper constructors:
   - Current: `let x: Rc<f64> = 42.0;`
   - Should be: `let x: Rc<f64> = Rc::new(42.0);`

2. **For-loop iterators** - Need to iterate by reference for borrowed data:
   - Current: `for v in self.values`
   - Should be: `for v in &self.values` or `&mut self.values`

These issues are detected by the rustc validation and will be addressed in future iterations.
