# Phase 3: C++ Code Generation Tests

This directory contains tests for the C++ code generator (`cpp-codegen.ts`), which transforms GoodScript TypeScript AST to idiomatic C++ code with smart pointer-based ownership semantics.

## Test Organization

### `basic/` - Feature Unit Tests

Individual feature tests that verify specific aspects of C++ code generation:

- **`primitives.test.ts`** (18 tests)
  - Primitive type mapping (number → double, string → std::string, bool)
  - Basic expressions and arithmetic
  - Strict equality conversion (`===` → `==`, `!==` → `!=`)
  - Functions (parameters, return types, void)
  - Control flow (if/else, for, while)
  - Arrays and for-of loops
  - Standard header inclusion
  - C++ keyword escaping

- **`ownership-types.test.ts`** (10 tests)
  - `own<T>` → `std::unique_ptr<T>`
  - `share<T>` → `std::shared_ptr<T>`
  - `use<T>` → `std::weak_ptr<T>`
  - Nullable types (`T | null` → `std::optional<T>`)
  - Collections (`Map<K,V>` → `std::unordered_map`, `Set<T>` → `std::unordered_set`)
  - Smart pointers in containers

- **`classes.test.ts`** (7 tests)
  - Class declarations with fields
  - Constructors
  - Methods (void and returning values)
  - Interfaces → structs
  - Keyword escaping in class/field names

## Key Design Decisions

### 1. Namespace Wrapping

All generated C++ code is wrapped in the `gs` namespace to avoid keyword conflicts:

```cpp
namespace gs {

class MyClass {
  // ...
};

} // namespace gs
```

### 2. Keyword Escaping

C++ reserved keywords are escaped by appending `_`:

```typescript
// GoodScript
interface Config {
  class: string;  // 'class' is a C++ keyword
}
```

```cpp
// Generated C++
struct Config {
  std::string class_;  // Escaped
};
```

### 3. Type Mappings

| GoodScript | C++ | Notes |
|-----------|-----|-------|
| `number` | `double` | Default floating-point precision |
| `string` | `gs::String` | Runtime library wrapper |
| `boolean` | `bool` | Native C++ bool |
| `void` | `void` | Direct mapping |
| `null` | `std::nullopt` | For std::optional |
| `T[]` | `gs::Array<T>` | Runtime library wrapper |
| `Map<K,V>` | `gs::Map<K,V>` | Runtime library wrapper |
| `Set<T>` | `gs::Set<T>` | Runtime library wrapper |
| `own<T>` | `std::unique_ptr<T>` | Exclusive ownership |
| `share<T>` | `std::shared_ptr<T>` | Shared ownership |
| `use<T>` | `std::weak_ptr<T>` | Non-owning reference |
| `T \| null` | `std::optional<T>` | Nullable value |

### 4. Standard Headers

The codegen automatically includes necessary C++ headers:

```cpp
#include <memory>        // Smart pointers
#include <string>        // std::string
#include <optional>      // std::optional
#include <iostream>      // I/O (for console.log)
#include <vector>        // When arrays are used
#include <unordered_map> // When Map is used
#include <unordered_set> // When Set is used
```

### 5. Strict Equality Conversion

TypeScript's strict equality operators are mapped to C++ equivalents:

```typescript
// GoodScript (Phase 1 requires strict equality)
if (x === 5) { }
if (y !== 10) { }
```

```cpp
// Generated C++
if (x == 5) { }
if (y != 10) { }
```

## Test Status

**Current Status**: ✅ **107/107 Phase 3 tests passing (100%)** 🎉
- Basic tests: 66/66 passing (100%)
- Runtime tests: 28/28 passing (100%)
- Concrete examples: 64/64 passing (100%)
  - All examples working correctly!
  - **Nov 24, 2025**: Fixed linked-list object-push-modify pattern

## Runtime Library Integration

As of November 2025, code generation uses a runtime library (`runtime/`) with:
- `gs::String` - String wrapper with TypeScript-like methods
- `gs::Array<T>` - Dynamic array with `.push()`, `.length()`, operator[]
- `gs::Map<K,V>` - Hash map with `.set()`, `.get()`, `.has()`, `.delete()`
- `gs::Set<T>` - Hash set with `.add()`, `.has()`, `.delete()`
- `gs::JSON` - JSON stringification support
- `gs::console` - Console logging (`gs::console::log()`)

Key changes:
- String literals wrapped in `gs::String()` constructor
- Template literals generate proper `gs::String` concatenation
- Array access generates `operator[]` with `static_cast<int>()` for indices
- Method calls use runtime library APIs (e.g., `.push()` not `.push_back()`)
- Compilation requires: `zig c++ -std=c++20 -O2 -I${RUNTIME_DIR}`

## Running Tests

```bash
# Run all Phase 3 tests
npm test -- test/phase3

# Run specific test file
npm test -- test/phase3/basic/primitives.test.ts

# Run with coverage
npm test -- --coverage test/phase3

# Watch mode
npm test -- --watch test/phase3
```

## Next Steps

### Planned Test Categories

1. **`compile/`** - C++ Compilation Validation
   - Tests that generated C++ compiles with g++/clang++
   - Uses `-std=c++20 -Wall -Wextra -Werror`
   - Validates no compilation errors or warnings

2. **`runtime/`** - Runtime Equivalence Tests
   - Executes identical code in both Node.js and compiled C++
   - Compares stdout/stderr/exit codes
   - Validates semantic equivalence

3. **`concrete-examples/`** - End-to-End Programs
   - Complete, real-world programs
   - Tests full compilation pipeline
   - Examples: algorithms, data structures, utilities

### Features to Implement

- [ ] Smart pointer construction (`std::make_unique`, `std::make_shared`)
- [ ] Smart pointer dereferencing (when to use `->` vs `.`)
- [ ] State tracking (avoid double-wrapping)
- [ ] Async/await → C++20 coroutines
- [ ] Template classes (generics)
- [ ] Exception handling
- [ ] RAII patterns for resources
- [ ] Move semantics optimization
- [ ] Standard library mappings (console, Math, etc.)

## Implementation Notes

### Current Limitations

1. **Nullable Types**: Basic support exists, but union type handling needs refinement for edge cases
2. **Smart Pointer Usage**: Types are mapped correctly, but construction/dereferencing needs implementation
3. **Generic Types**: Not yet implemented (will use C++ templates)
4. **Async/Await**: Placeholder - will use C++20 coroutines
5. **Standard Library**: Minimal mappings (console.log → std::cout)

### Testing Philosophy

1. **Unit tests first**: Verify individual features work correctly
2. **Compilation tests**: Ensure generated code compiles without errors
3. **Runtime tests**: Validate JS and C++ produce identical behavior
4. **Incremental development**: Add features one at a time, test thoroughly

### Code Quality Standards

Generated C++ should be:
- **Idiomatic**: Follows modern C++ best practices (C++20)
- **Safe**: Uses RAII, smart pointers, no manual memory management
- **Readable**: Clear variable names, proper indentation, comments where needed
- **Efficient**: Zero-cost abstractions, move semantics, no unnecessary copies

## Related Documentation

- `/docs/LANGUAGE.md` - GoodScript language specification
- `/docs/MEMORY-OWNERSHIP.md` - Ownership semantics formal proof
- `/docs/COMPILATION-TARGET.md` - Why C++ was chosen
- `/.github/copilot-instructions.md` - Development guidelines
- `/compiler/src/cpp-codegen.ts` - Code generator implementation

---

**Last Updated**: Nov 24, 2025
**Status**: 56/64 concrete examples passing (87.5%), STL compatibility added
