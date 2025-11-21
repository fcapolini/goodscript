# N-Queens Rust Codegen Issues

This document tracks the Rust code generation issues exposed by the N-Queens example.

## Current Status

❌ Rust compilation fails with multiple errors
✅ JavaScript/TypeScript compilation and execution works correctly

## Identified Issues

### 1. **String Literal vs Character Literal** (CRITICAL)
```rust
// Generated (WRONG):
String::from('failed')

// Should be:
String::from("failed")
```
**Fix needed**: String literals should use double quotes in Rust, not single quotes.

### 2. **Missing Array Type** (CRITICAL)
```rust
// Generated:
let mut board = Array::new();

// Issue: Array type doesn't exist in Rust
```
**Fix needed**: Need to use `Vec<f64>` or implement an `Array` type wrapper. Should translate `new Array<number>()` to `Vec<f64>::new()`.

### 3. **Number Type Mismatch in Ranges** (CRITICAL)
```rust
// Generated:
for i in 0..N * N {  // N is f64, but range needs integer

// Should be:
for i in 0..(N * N) as usize {
```
**Fix needed**: TypeScript `number` mapped to `f64` in Rust, but for-loop ranges require integers. Need smart type inference or explicit casting.

### 4. **Array Indexing with f64** (CRITICAL)
```rust
// Generated:
board[x + (y * N) as usize] = id;  // x is f64, can't add f64 + usize

// Should be:
board[(x as usize) + (y * N) as usize] = id;
```
**Fix needed**: Array indices must be `usize` in Rust. Need to cast all arithmetic to integers when used for indexing.

### 5. **Result Type Mismatch in get()** (CRITICAL)
```rust
// Generated:
let get = |x: f64, y: f64| -> Result<(), String> {
    return Ok(board[x + (y * N) as usize]);  // Returns value, not ()
};

// Should be:
let get = |x: f64, y: f64| -> Result<f64, String> {
    Ok(board[(x as usize) + ((y * N) as usize)])
}
```
**Fix needed**: Return type should match the returned value. `get` returns a `number`, not `void`.

### 6. **Using Result<()> where Result<T> Expected** (CRITICAL)
```rust
// Generated:
if get(x, y)? {  // get returns Result<()>, can't use as bool

// Should be:
if get(x, y)? != 0.0 {  // or > 0.0 depending on context
```
**Fix needed**: When a function returns a value that's used in a boolean context, need to generate the comparison explicitly.

### 7. **String Methods Don't Exist** (MAJOR)
```rust
// Generated:
String.fromCharCode(96.0 + x)?

// Issue: Rust's String doesn't have fromCharCode
```
**Fix needed**: Either provide runtime polyfills or map to Rust equivalents:
```rust
char::from_u32((96.0 + x) as u32).unwrap_or('?').to_string()
```

### 8. **Array Slice Method Missing** (MAJOR)
```rust
// Generated:
board.slice(i, i + N)?

// Issue: Rust Vec doesn't have slice() method
```
**Fix needed**: Use Rust's slice syntax:
```rust
&board[i as usize..(i + N) as usize]
```

### 9. **Mutable Variable Capture in Closures** (MAJOR)
```rust
// Generated:
let clear = || -> Result<(), String> {
    for i in 0..N * N {
        board[i] = 0.0;  // Tries to mutate board from closure
    }
};

// Issue: board needs to be mutable and closure needs mut
```
**Fix needed**: Complex - need to use `RefCell` or restructure to avoid closure captures of mutable state.

### 10. **Recursive Closures** (MAJOR)
```rust
// Generated:
let place = |id: f64| -> Result<bool, String> {
    ...
    if place(id + 1.0)? {  // Closure calling itself recursively
        return Ok(true);
    }
    ...
};
```
**Issue**: Rust closures can't call themselves recursively without special handling.
**Fix needed**: Use `fn` functions or `Box<dyn Fn>` with `Rc<RefCell<>>`.

## Priority Order

1. **HIGH**: Fix string literals (trivial fix, breaks compilation)
2. **HIGH**: Array type mapping (`new Array<T>()` → `Vec<T>::new()`)
3. **HIGH**: Function return type inference (void vs value)
4. **HIGH**: Number type coercion for array indexing
5. **HIGH**: Number type coercion for ranges
6. **MEDIUM**: String method polyfills or mapping
7. **MEDIUM**: Array method mapping (slice, map, join, etc.)
8. **MEDIUM**: Closure mutable captures (requires structural changes)
9. **MEDIUM**: Recursive closures (requires structural changes)

## Notes

The N-Queens example is excellent for testing because it uses:
- ✅ Closures (basic)
- ✅ Nested closures
- ✅ Array creation and manipulation
- ✅ For loops with ranges
- ✅ String methods
- ✅ Recursive algorithms
- ✅ Boolean logic
- ✅ Console output

It exposes fundamental issues in:
1. Type system mapping (number → f64 vs usize)
2. Standard library equivalents (Array, String methods)
3. Closure semantics (mutable captures, recursion)
