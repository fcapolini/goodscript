# Array Semantics - Implementation Notes

## ✅ Completed Features

**Phase 1 - Assignment Semantics:**
- ✅ Array element assignment: `arr[index] = value`
- ✅ Property assignment: `arr.length = value`
- ✅ Compound assignment: `arr[0] += 5`
- ✅ Auto-resizing on out-of-bounds write
- ✅ Runtime methods: `setLength()`, `set()`

**Phase 2 - Safe Access:**
- ✅ Out-of-bounds read safety (returns default value)
- ✅ Negative index handling (returns default value)
- ✅ Optional value support in console.log
- ✅ Crash-free array access

## 📊 JavaScript Semantics Coverage

| Feature | JavaScript | GoodScript | Status |
|---------|-----------|------------|--------|
| Out-of-bounds read | `undefined` | `0` (default) | ✅ Safe |
| Out-of-bounds write | Sparse array | Dense array | ✅ Works |
| Negative index | `undefined` | `0` (default) | ✅ Safe |
| `arr.length = n` | Truncate/extend | Same | ✅ Works |
| `arr[i] += x` | Compound assign | Same | ✅ Works |
| `pop()` on empty | `undefined` | Optional | ✅ Works |
| Sparse arrays | Holes (undefined) | **Not supported** | ⚠️ By design |

## ⚠️ Design Decision: No Sparse Arrays

**JavaScript sparse arrays:**
```javascript
const arr = [];
arr[5] = 99;
// Result: [<5 empty items>, 99]
// arr[2] === undefined
// arr.length === 6
```

**GoodScript dense arrays:**
```typescript
const arr: number[] = [];
arr[5] = 99;
// Result: [0, 0, 0, 0, 0, 99]
// arr[2] === 0  (default value)
// arr.length === 6
```

**Rationale:**
1. **Memory efficiency**: Sparse arrays would require either:
   - Hash table (slower, complex iteration)
   - Bit vector for holes (memory overhead, iteration complexity)
   - Vector of optionals (2x memory, cache inefficiency)

2. **Performance**: Dense arrays are faster:
   - Contiguous memory layout
   - No hole checking during iteration
   - Better cache locality
   - Simpler C++ implementation

3. **Type safety**: Default values are type-safe:
   - `0` for numbers
   - `false` for booleans
   - `""` for strings
   - No `undefined` coercion edge cases

4. **Alternative exists**: `Map<number, T>` for truly sparse data:
   ```typescript
   // ❌ Don't do this (wastes memory)
   const sparse: number[] = [];
   sparse[1000000] = 1;  // Allocates 4MB+
   
   // ✅ Use Map for sparse indices
   const sparse = new Map<number, number>();
   sparse.set(1000000, 1);  // O(1) space
   ```

**Documentation**: See LANGUAGE.md for user-facing documentation.

## 🔧 Remaining Work (Lower Priority)

### 1. Multi-Argument Array Methods 🟢 LOW

**Problem:** JavaScript allows `arr.push(1, 2, 3)` but C++ only supports one element

**Solutions:**

#### Variadic templates:
```cpp
template<typename... Args>
int push(Args&&... elements) {
  (impl_.push_back(std::forward<Args>(elements)), ...);
  return static_cast<int>(impl_.size());
}
```

**Codegen challenge:** Need to detect variadic calls in lowering and generate 
multiple push statements or expand arguments inline.

**Priority:** Low - workaround is simple: `arr.push(1); arr.push(2); arr.push(3);`

### 2. Performance Optimizations 🟢 LOW

Future optimizations for known-safe access patterns:
- Range analysis to eliminate bounds checks
- Inline `get_or_default()` when provably safe
- SIMD operations for bulk array operations

**Priority:** Low - current implementation is correct and reasonably fast

## 📝 Implementation Notes

### Memory Layout

**Ownership Mode:**
- Uses `std::vector<T>` for dense storage
- Auto-resizes with 1.5x growth factor
- Fills new elements with `T{}` (default value)

**GC Mode:**
- Uses custom GC-allocated array
- Optimized growth strategy (1.5x)
- memcpy for POD types

### Type-Specific Defaults

| Type | Default Value | C++ Expression |
|------|---------------|----------------|
| `number` | `0` | `double{}` = `0.0` |
| `integer` | `0` | `int{}` = `0` |
| `boolean` | `false` | `bool{}` = `false` |
| `string` | `""` | `String{}` = `""` |
| Objects | `nullptr` | `T*{}` = `nullptr` |

### Codegen Examples

**Before (unsafe):**
```cpp
auto val = *arr[5];  // Crashes if out of bounds!
```

**After (safe):**
```cpp
auto val = arr.get_or_default(5);  // Returns 0.0 if out of bounds
```

**Write operations:**
```cpp
arr.set(5, 99);              // Auto-resizes to length 6
arr.setLength(10);           // Extends to length 10
```

## Remaining JavaScript Semantics Gaps

### 1. Out-of-Bounds Read Safety 🔴 CRITICAL

**Problem:** `arr[5]` when arr.length=3 currently:
- Returns `nullptr` 
- Dereferencing `*arr[5]` causes segfault

**JavaScript behavior:** Returns `undefined` (no crash)

**Solutions:**

