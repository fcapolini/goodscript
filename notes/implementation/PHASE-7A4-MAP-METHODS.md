# Phase 7a.4: Map<K,V> Methods - COMPLETE ✅

**Date**: December 8, 2025 (Late Evening)  
**Status**: Fully implemented and tested  
**Tests**: 12/12 passing (216 total tests, 201 passing)

## Overview

Implemented full Map<K,V> support including IR lowering and C++ code generation for all Map operations. This enables the standard library modules (core, http, json) that heavily use Map for dynamic data storage.

## Implemented Features

### Map Operations

1. **Constructor**
   - `new Map<K, V>()` - Empty map
   - `new Map<K, V>([[k1, v1], [k2, v2]])` - With initial entries

2. **Basic Operations**
   - `map.set(key, value)` - Add/update entry
   - `map.get(key)` - Retrieve value
   - `map.has(key)` - Check existence
   - `map.delete(key)` - Remove entry (keyword sanitized to `delete_`)
   - `map.clear()` - Remove all entries

3. **Iteration**
   - `map.keys()` - Iterate over keys
   - `map.values()` - Iterate over values
   - `map.entries()` - Iterate over [key, value] pairs
   - `map.forEach(callback)` - Execute callback for each entry

4. **Properties**
   - `map.size` - Number of entries (property → method call in C++)

## Implementation Details

### IR Lowering

All Map operations lower to standard IR nodes:
- Constructor: `{ kind: 'newExpression', className: 'Map', ... }`
- Method calls: `{ kind: 'call', callee: { kind: 'memberAccess' } }`
- Property access: `{ kind: 'memberAccess', member: 'size' }`

### C++ Code Generation

1. **Template Parameters**
   - Type inference from IR `{ kind: 'map', key: IRType, value: IRType }`
   - Generates `gs::Map<KeyType, ValueType>`
   - Example: `Map<string, number>` → `gs::Map<gs::String, double>`

2. **Keyword Sanitization**
   - Split C++ keywords from stdlib type names
   - `CPP_KEYWORDS`: Actual language keywords (delete, new, etc.)
   - `CPP_STDLIB_NAMES`: Standard library types (map, set, vector, etc.)
   - Method names only sanitized if they're C++ keywords
   - Example: `map.delete(k)` → `map_.delete_(k)` (delete is keyword)
   - Example: `map.set(k, v)` → `map_.set(k, v)` (set is stdlib name, OK as method)

3. **Property-to-Method Conversion**
   - `.size` property → `.size()` method call
   - Same handling as Array `.length`

## Test Coverage

### Test File: `test/map-methods.test.ts`

1. **Map.set and Map.get** (2 tests)
   - Basic insertion and retrieval
   - Type preservation (string keys, number values)

2. **Map.has** (1 test)
   - Existence checking

3. **Map.delete** (1 test)
   - Entry removal
   - Keyword sanitization verification

4. **Map.clear** (1 test)
   - Bulk removal

5. **Map.forEach** (1 test)
   - Callback execution
   - Lambda parameter handling

6. **Map.keys, values, entries** (3 tests)
   - Iterator methods for for-of loops
   - Type signatures for arrays

7. **Map.size** (1 test)
   - Property access handling

8. **Map constructor** (2 tests)
   - Empty constructor
   - Constructor with initial entries

### End-to-End Test: `examples/map-test-gs.ts`

Complete Map usage example that:
- Creates Map instances
- Tests all operations (set, get, has, delete, clear)
- Iterates using keys() and values()
- Verifies size tracking
- Compiles to C++ and runs successfully

**Output**:
```
=== Basic Operations ===
Map has 'two': true
Map get 'two': true
Map size: 3

=== Iteration ===
Keys:
   a
   b
   c
Values:
   1
   2
   3

=== Delete ===
Before delete, size: 2
After delete, size: 1
Has 'x': false

=== Clear ===
Before clear, size: 2
After clear, size: 0
```

## Technical Challenges Solved

### 1. Keyword Sanitization Strategy

**Problem**: Method names like `delete` and `set` conflicted with C++ keywords/stdlib.

**Solution**: 
- Created two separate keyword sets: `CPP_KEYWORDS` and `CPP_STDLIB_NAMES`
- Only sanitize method names if they're actual C++ keywords
- Stdlib type names (`set`, `map`) are fine as method names on objects
- Example: `obj.delete()` → `obj.delete_()` (keyword)
- Example: `map.set()` → `map.set()` (stdlib name, OK)

### 2. Template Parameter Generation

**Problem**: Map constructors need template parameters in C++.

**Solution**:
- Check IR expression type: `expr.type.kind === 'map'`
- Extract key and value types from IR type
- Generate `gs::Map<KeyType, ValueType>(args)`
- Provides compile-time type safety

### 3. Property vs Method Conversion

**Problem**: `.size` is a property in TypeScript but method in C++.

**Solution**:
- Detect `member === 'size' || member === 'length'` in memberAccess
- Generate method call: `${obj}.${member}()`
- Same pattern as Array `.length`

## Generated C++ Code Example

```cpp
// TypeScript:
const map = new Map<string, number>();
map.set("one", 1);
const val = map.get("one");
map.delete("one");
console.log(map.size);

// Generated C++:
auto map_ = gs::Map<gs::String, double>();
map_.set(gs::String("one"), 1);
auto val = map_.get(gs::String("one"));
map_.delete_(gs::String("one"));
gs::console::log(map_.size());
```

## Runtime Support

**Header**: `runtime/cpp/ownership/gs_map.hpp`

Full TypeScript-compatible Map implementation:
- Insertion order preservation (like JavaScript Map)
- All standard Map methods
- Template-based for type safety
- Compatible with both GC and ownership memory modes

## Impact on Standard Library

This implementation unblocks:
- **30+ Map usages** across stdlib modules
- `@goodscript/stdlib-core`: Polyfills, utility functions
- `@goodscript/stdlib-http`: Headers, query params
- `@goodscript/stdlib-json`: Object representation

## Files Modified

1. **compiler/src/backend/cpp/codegen.ts**
   - Added CPP_KEYWORDS and CPP_STDLIB_NAMES separation
   - Enhanced memberAccess case for keyword sanitization
   - Added Map template parameter generation in newExpression
   - Added size/length property-to-method conversion

2. **compiler/test/map-methods.test.ts** (NEW)
   - 12 comprehensive tests for all Map operations

3. **examples/map-test-gs.ts** (NEW)
   - End-to-end Map usage example
   - Demonstrates all features in working code

4. **.github/copilot-instructions.md**
   - Updated recent progress
   - Updated test count (189 → 216)
   - Added Map<K,V> to completed features

## Next Steps

With Map<K,V> complete, recommended next priorities:

1. **Optional Chaining** (HIGH)
   - `obj?.prop`, `arr?.[0]`, `fn?.()`
   - Used in 15+ stdlib locations
   - Required for http module

2. **Async/Await** (CRITICAL)
   - 30+ async functions across stdlib
   - cppcoro already vendored
   - Core for I/O-heavy modules

3. **Union Types** (MEDIUM)
   - `T | undefined` return types
   - `find()` returns `T | undefined`
   - Type narrowing with `===`

4. **Object Literals** (IN PROGRESS)
   - IR lowering complete
   - C++ codegen needs struct generation
   - Required for config objects

## References

- **IR Type System**: `compiler/src/ir/types.ts` - `IRMapType` definition
- **Lowering Logic**: `compiler/src/frontend/lowering.ts` - Map operation lowering
- **C++ Runtime**: `runtime/cpp/ownership/gs_map.hpp` - Full Map implementation
- **Test Suite**: `compiler/test/map-methods.test.ts` - Comprehensive test coverage

---

**Completion Date**: December 8, 2025  
**Commits**: Phase 7a.4 Map methods implementation  
**Test Status**: ✅ 12/12 tests passing, end-to-end compilation verified
