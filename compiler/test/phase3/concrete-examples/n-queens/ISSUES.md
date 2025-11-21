# N-Queens Rust Codegen Issues

This document tracks the Rust code generation issues exposed by the N-Queens example.

## Current Status (Updated)

**Completed Fixes:**
- ✅ Validator now checks actual function return types (not assuming all functions return boolean)
- ✅ String literals now use double quotes
- ✅ `new Array()` → `Vec::new()`  
- ✅ `array.slice()` method implemented with proper parentheses for arithmetic
- ✅ `String.fromCharCode()` → `char::from_u32((expr) as u32).unwrap_or('?').to_string()`
- ✅ For-loop ranges with f64 variables → Cast to usize: `0..(N) as usize`
- ✅ Array indexing with f64 arithmetic → Cast to usize: `board[(x + y * N) as usize]`
- ✅ Auto-cast usize loop variables to f64 when passed to functions  
- ✅ Mixed type arithmetic (usize * f64) → Cast usize to f64
- ✅ Return type inference for arrow functions using TypeChecker
- ✅ if/else return types in Result-returning functions (allPathsReturn check)

**Current Issue:**
- ❌ Recursive closures (Rust limitation - closures can't call themselves)

**Compilation Status:** Reduced from ~15 errors to **1 error**

## Known Limitations

### Recursive Closures
**Issue**: Rust closures cannot call themselves directly because they're anonymous.

**Example**:
```typescript
const place = (id: number): boolean => {
  if (id < N) {
    if (place(id + 1)) {  // ❌ Can't call itself
      return true;
    }
  }
  return false;
};
```

**Workaround Options**:
1. Convert to named function declarations (not arrow functions)
2. Use a different algorithm that doesn't require recursion
3. Manually convert to iteration with a stack

**Status**: Tracked as known limitation. Future enhancement could auto-detect and convert to local functions.

## Fixed Issues

### 1. ✅ **String Literal vs Character Literal**
```rust
// Before:
String::from('failed')

// After:
String::from("failed")
```
**Fix**: Modified `generateExpression` to use `expr.text` instead of `expr.getText()`, ensuring double quotes.

### 2. ✅ **Missing Array Type**  
```rust
// Before:
let mut board = Array::new();

// After:
let mut board = Vec::new();
```
**Fix**: Added `Array` case in `generateNewExpression` to return `Vec::new()`.

### 3. ✅ **String.fromCharCode**
```rust
// Before:
String.fromCharCode(96.0 + x)?

// After:
char::from_u32(96.0 + x as u32).unwrap_or('?').to_string()
```
**Fix**: Added special handling in `generateCallExpression` for `String.fromCharCode`.

### 4. ✅ **Array Slice Method**
```rust
// Before:
board.slice(i, i + N)?

// After:
board[i as usize..i + N as usize].to_vec()
```
**Fix**: Implemented `generateArraySlice` method.

### 5. ✅ **For-Loop Ranges with f64**
```rust
// Before:
for i in 0..N * N {  // N is f64, error: expected integer

// After:
for i in 0..(N * N) as usize {
```
**Fix**: Enhanced `convertToIntegerLiteral` to detect complex expressions and wrap in `as usize` cast.

### 6. ✅ **Array Indexing with f64 Arithmetic**
```rust
// Before:
board[x + (y * N) as usize] = id;  // x is f64, can't add f64 + usize

// After:
board[(x + (y * N)) as usize] = id;
```
**Fix**: Modified `generateElementAccess` to wrap entire index arithmetic in parentheses before casting to usize.

## Remaining Issues

### 5. **Number Type Mismatch in Ranges** (CRITICAL - TODO)
```rust
// Generated:
for i in 0..N * N {  // N is f64, but range needs integer

// Should be:
for i in 0..(N * N) as usize {
```
**Fix needed**: TypeScript `number` mapped to `f64` in Rust, but for-loop ranges require integers. Need smart type inference or explicit casting.

### 6. **Array Indexing with f64** (CRITICAL - TODO)
```rust
// Generated:
board[x + (y * N) as usize] = id;  // x is f64, can't add f64 + usize

// Should be:
board[(x as usize) + (y * N) as usize] = id;
```
**Fix needed**: Array indices must be `usize` in Rust. Need to cast all arithmetic to integers when used for indexing.

### 7. **Return Type Inference for Closures** (CRITICAL - LIMITATION)
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
**Issue**: Without explicit return type annotations in TypeScript, we can't reliably infer the return type.
**Workaround needed**: Require explicit return type annotations for Rust target, or implement type inference using TypeScript's type checker.

### 8. **Using Result<T> in Boolean Context** (CRITICAL - TODO)  
```rust
// Generated:
if get(x, y)? {  // get returns Result<f64>, extracted value used as bool

// Should be:
if get(x, y)? != 0.0 {  // or > 0.0 depending on context
```
**Fix needed**: When unwrapping Result<number> in boolean context, need to generate explicit comparison.

### 9. **Mutable Variable Capture in Closures** (MAJOR - COMPLEX)
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
