# Array Semantics - Remaining Work

## Current Status ✅

We've implemented:
- ✅ Array element assignment: `arr[index] = value`
- ✅ Property assignment: `arr.length = value`
- ✅ Compound assignment: `arr[0] += 5`
- ✅ Auto-resizing on out-of-bounds write
- ✅ Runtime methods: `setLength()`, `set()`

## Remaining JavaScript Semantics Gaps

### 1. Out-of-Bounds Read Safety 🔴 CRITICAL

**Problem:** `arr[5]` when arr.length=3 currently:
- Returns `nullptr` 
- Dereferencing `*arr[5]` causes segfault

**JavaScript behavior:** Returns `undefined` (no crash)

**Solutions:**

#### Option A: Change IR type system (big change)
```typescript
// Array access returns T | undefined
type IRIndexAccess = {
  kind: 'index';
  type: IRType;  // Should be nullable<element>
}
```
Pros: Type-safe, matches JS semantics
Cons: Every array access needs null check, breaks existing code

#### Option B: Runtime helper with default value (pragmatic)
```cpp
// In C++ runtime
template<typename T>
T Array<T>::get_or_default(int index, T defaultValue = T{}) const {
  if (index < 0 || index >= size()) return defaultValue;
  return impl_[index];
}
```
Codegen: `arr.get_or_default(5)` instead of `*arr[5]`

Pros: No type system changes, safe by default
Cons: Less efficient, doesn't match JS `undefined` exactly

#### Option C: Bounds-checked access with exception
```cpp
T& Array<T>::at(int index) {
  if (index < 0 || index >= size()) {
    throw std::out_of_range("Array index out of bounds");
  }
  return impl_[index];
}
```
Codegen: `arr.at(5)` instead of `*arr[5]`

Pros: Clear error, prevents undefined behavior
Cons: Exceptions are slow, doesn't match JS semantics

**Recommendation:** Start with Option B for safety, migrate to Option A for correctness

### 2. Optional Return Types Support 🟡 MEDIUM

**Problem:** Methods like `pop()`, `shift()` return `std::optional<T>` but:
- Can't console.log them
- Can't use in expressions without unwrapping

**Solution:**
```cpp
// Add console.log overload
template<typename T>
void log_impl(const std::optional<T>& value) {
  if (value.has_value()) {
    log_impl(*value);
  } else {
    std::cout << "undefined";
  }
}
```

### 3. Multi-Argument Array Methods 🟢 LOW

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

#### Initializer list:
```cpp
int push(std::initializer_list<T> elements) {
  for (const auto& elem : elements) {
    impl_.push_back(elem);
  }
  return static_cast<int>(impl_.size());
}
```

**Codegen challenge:** Need to detect variadic calls in lowering

## Implementation Priority

1. **CRITICAL:** Out-of-bounds read safety (Option B first)
2. **MEDIUM:** Optional console.log support
3. **LOW:** Multi-argument push (nice-to-have)

## Testing Checklist

- [ ] Out-of-bounds read doesn't crash
- [ ] Out-of-bounds write creates sparse array
- [ ] arr.length setter works both ways
- [ ] Compound assignment on elements
- [ ] pop/shift return handling
- [ ] Negative indices return undefined
- [ ] Empty array operations
