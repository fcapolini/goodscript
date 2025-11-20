# Phase 3 Tests

Tests for Rust code generation (Phase 3).

## Rust Validation with `rustc`

All Phase 3 tests now include **automatic Rust validation** using `rustc`. When `rustc` is available on the system:

- Generated Rust code is compiled with `rustc --crate-type lib`
- Compilation errors and warnings are captured and reported
- Tests automatically validate that generated Rust is syntactically correct

This ensures the GoodScript compiler generates valid, compilable Rust code.

### Running Tests

```bash
# Run all Phase 3 tests (includes rustc validation if available)
npm test -- test/phase3

# Run only validation tests
npm test -- test/phase3/rust-validation.test.ts

# If rustc is not available, validation tests will be skipped
```

## Test Structure

- `basic-types.test.ts` - Primitive type translation
- `ownership-types.test.ts` - Unique/Shared/Weak type translation
- `classes.test.ts` - Class to struct+impl translation
- `advanced-features.test.ts` - This→self, for-of loops, arrow functions
- `rust-validation.test.ts` - Comprehensive rustc validation suite
- `rust-validator.ts` - Rust compilation utilities

## Testing Strategy

Each test:
1. Compiles GoodScript source to Rust
2. Verifies Rust code is syntactically correct
3. **Validates with rustc** (if available) - compiles generated Rust code
4. Checks for expected ownership type mappings
5. Verifies imports are generated correctly

## Known Rust Validation Issues

Current known issues (tracked for future fixes):

1. **Ownership type construction** - `Rc<T>`, `Box<T>`, `Weak<T>` need proper constructors:
   - Current: `let x: Rc<f64> = 42.0;`
   - Should be: `let x: Rc<f64> = Rc::new(42.0);`

2. **For-loop iterators** - Need to iterate by reference for borrowed data:
   - Current: `for v in self.values`
   - Should be: `for v in &self.values` or `&mut self.values`

These issues are detected by the rustc validation and will be addressed in future iterations.
