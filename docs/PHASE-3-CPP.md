# Phase 3: C++ Code Generation

**Status:** ✅ Foundation Complete + Zig Toolchain Integrated

**Test Coverage:** 
- 45 basic feature tests (100% passing) - includes array auto-resize tests
- 13 semantic equivalence tests (documenting JS/C++ behavior differences)
- 12/12 concrete example tests (100% passing)
  - ✅ cli-args (3/3)
  - ✅ json-parser (3/3)
  - ✅ lru-cache (3/3)
  - ✅ n-queens (3/3)
- 54 CLI tests (100% passing)
  - ✅ 20 tsc compatibility tests
  - ✅ 19 native compilation tests
  - ✅ 15 gs wrapper tests

**Recent Updates (Nov 23, 2025):**
- ✅ **Zig C++ Compiler Integration** - Drop-in replacement for g++/clang++
- ✅ **Cross-compilation Support** - Target any platform from any platform
- ✅ **Optimized Binary Compilation** - `-O3 -march=native -ffast-math -funroll-loops`
- ✅ **Inlined Helper Functions** - `array_get` and `map_get` marked `inline`
- ✅ **CLI Binary Compilation** - `gsc -t native -b` compiles to native binary
- ✅ **Architecture Targeting** - `gsc -a x86_64-linux` for cross-compilation
- ✅ **Comprehensive CLI Tests** - 34 new tests for native/cross-compilation
- ✅ Smart pointer null comparisons fixed (`nullptr` vs `std::nullopt`)
- ✅ Smart pointer member access fixed (`->` vs `.`)
- ✅ Array/vector member access fixed (proper `.` usage)
- ✅ Map.delete() mapped to erase()
- ✅ JavaScript-compatible array auto-resize on out-of-bounds assignment
- ✅ Optional unwrapping for `Map.get()` results (`(*node)->property`)
- ✅ Smart pointer construction from `new T()` with type annotations
- ✅ Context-aware Map method detection (`.get()`, `.has()`)
- ✅ Comprehensive semantic equivalence test suite (13 tests documenting JS/C++ correspondences)

## Overview

Phase 3 implements the C++ code generator that transforms GoodScript's TypeScript AST into idiomatic, memory-safe C++20 code. The generator maps GoodScript's ownership semantics to C++'s smart pointers while ensuring RAII (Resource Acquisition Is Initialization) patterns and deterministic memory management.

**Compilation Toolchain:** GoodScript uses the **Zig C++ compiler** (`zig c++`) as the default compilation backend, providing:
- Zero-config cross-compilation to any platform
- Single self-contained binary (no complex toolchain installation)
- Aggressive optimizations (`-O3 -march=native` for native, `-O3` for cross-compilation)
- Support for targeting Linux, Windows, macOS, WebAssembly, and more

See `docs/ZIG-TOOLCHAIN.md` for detailed information on Zig integration.

## Implementation Status

### ✅ Completed Features

#### Core Infrastructure
- **AST Traversal Framework** - Complete visitor pattern for all TypeScript node types
- **Code Emission System** - Proper indentation, line management, and code formatting
- **Include Management** - Automatic header inclusion based on feature usage
- **Namespace Wrapping** - All code wrapped in `namespace gs { }` to avoid C++ keyword conflicts
- **Keyword Escaping** - Automatic escaping of C++ reserved words (e.g., `class` → `class_`)

#### Type System Mapping

| GoodScript Type | C++ Type | Notes |
|----------------|----------|-------|
| `number` | `double` | Default floating-point precision |
| `string` | `std::string` | STL string |
| `boolean` | `bool` | Native C++ bool |
| `void` | `void` | Direct mapping |
| `null` | `std::nullopt` | For std::optional |
| `undefined` | `std::nullopt` | For std::optional |
| `T[]` | `std::vector<T>` | Dynamic array |
| `Map<K,V>` | `std::unordered_map<K,V>` | Hash map |
| `Set<T>` | `std::unordered_set<T>` | Hash set |
| `own<T>` | `std::unique_ptr<T>` | Exclusive ownership |
| `share<T>` | `std::shared_ptr<T>` | Reference-counted ownership |
| `use<T>` | `std::weak_ptr<T>` | Non-owning reference |
| `T \| null` | `std::optional<T>` | Nullable value |

#### Statement Generation
- **Variable Declarations** - `const`/`let` with proper type inference
- **Function Declarations** - Parameters, return types, body generation
- **Class Declarations** - Fields, constructors, methods with proper access control
- **Interface Declarations** - Translated to `struct` for POD types
- **Control Flow**:
  - `if`/`else` statements
  - `for` loops (traditional C-style)
  - `for-of` loops → range-based for loops
  - `while` loops
  - `return` statements

#### Expression Generation
- **Literals** - Numbers, strings, booleans, null
- **Binary Operators** - Arithmetic, comparison, logical
- **Strict Equality Conversion** - `===` → `==`, `!==` → `!=`
- **Unary Operators** - Prefix and postfix (`++`, `--`, `!`, `-`, `+`)
- **Ternary Operator** - `a ? b : c` → `(a ? b : c)`
- **Function Calls** - With argument translation
- **Property Access** - Object member access
- **Array Literals** - Brace-initialized lists
- **`this` Keyword** - Preserved for member access

#### Special Features
- **Standard Headers** - Automatically included:
  ```cpp
  #include <memory>        // Smart pointers
  #include <string>        // std::string
  #include <optional>      // std::optional
  #include <iostream>      // I/O operations
  #include <algorithm>     // std::transform, etc.
  #include <vector>        // When arrays used
  #include <unordered_map> // When Map used
  #include <unordered_set> // When Set used
  ```

- **JavaScript Array Semantics** - Arrays auto-resize on out-of-bounds assignment:
  ```typescript
  const a = [];
  a[10] = 0;  // Auto-resizes array to size 11
  ```
  ```cpp
  std::vector<double> a = {};
  ([&]() { auto& __arr = a; auto __idx = 10; 
    if (__idx >= __arr.size()) __arr.resize(__idx + 1); 
    return __arr[__idx] = 0; }());
  ```

- **Optional Unwrapping for Map.get()** - Double unwrapping for `optional<shared_ptr<T>>`:
  ```typescript
  const cache: Map<string, share<Node>> = new Map();
  const node = cache.get(key);  // share<Node> | undefined
  if (node !== undefined) {
    return node.value;  // Accessing property on optional shared_ptr
  }
  ```
  ```cpp
  std::unordered_map<std::string, std::shared_ptr<Node>> cache = {};
  auto node = gs::map_get(cache, key);  // optional<shared_ptr<Node>>
  if (node != std::nullopt) {
    return (*node)->value;  // Unwrap optional, then dereference shared_ptr
  }
  ```

- **Smart Pointer Construction** - Automatic wrapping when type annotation present:
  ```typescript
  const node: share<CacheNode> = new CacheNode(key, value);
  ```
  ```cpp
  std::shared_ptr<CacheNode> node = std::make_shared<CacheNode>(key, value);
  ```

- **Smart Pointer Type Detection** - Context-aware pointer dereferencing:
  ```typescript
  const node: share<Node> = ...;
  node.value = 42;  // Uses -> for smart pointers
  ```
  ```cpp
  std::shared_ptr<Node> node = ...;
  node->value = 42;  // Correct arrow operator
  ```

### 🚧 In Progress / Planned

#### Smart Pointer Management
- [x] **Null Comparisons** - Smart pointers compare to `nullptr`, optionals to `std::nullopt`
- [x] **Member Access** - Context-aware use of `->` for smart pointers, `.` for values/vectors
- [x] **Type Inference** - Handles variables initialized from smart pointer arrays
- [ ] **Construction** - `std::make_unique()`, `std::make_shared()` wrapping (partial)
- [ ] **Optional Unwrapping** - Automatic dereferencing of `optional<shared_ptr<T>>`
- [ ] **State Tracking** - Avoid double-wrapping already-wrapped pointers (partial)
- [ ] **Move Semantics** - Use `std::move()` for efficiency (partial)
- [ ] **Method Chaining** - Handle fluent interfaces with smart pointers

#### Advanced Features
- [ ] **Async/Await** - Map to C++20 coroutines (`co_await`, `co_return`)
- [ ] **Promises** - Use `cppcoro::task<T>` or similar
- [ ] **Generic Types** - Map TypeScript generics to C++ templates
- [ ] **Template Specialization** - Type-specific optimizations
- [ ] **Exception Handling** - Try/catch with RAII-safe cleanup

#### Standard Library
- [x] **console.log** - Maps to `std::cout << ... << std::endl`
- [x] **Array Methods** - push_back(), size(), basic operations
- [x] **Array Auto-Resize** - JavaScript-compatible out-of-bounds assignment
- [x] **Map Methods** - get() → map_get helper, set() → emplace/insert, delete() → erase(), has() → find
- [x] **String Methods** - startsWith(), indexOf(), charAt(), charCodeAt(), substring()
- [ ] **Math** - Map to `<cmath>` functions
- [ ] **Advanced Array Methods** - map(), filter(), reduce() → algorithms or ranges
- [ ] **Date/Time** - Map to `<chrono>`

#### Testing Infrastructure
- [ ] **Compilation Tests** - Validate generated C++ compiles with g++/clang++
- [ ] **Runtime Equivalence** - Compare JS and C++ execution output
- [ ] **Concrete Examples** - End-to-end programs (algorithms, data structures)
- [ ] **Performance Benchmarks** - Measure C++ vs JS performance

## Code Generation Architecture

### Namespace Protection

All generated code is wrapped in the `gs` namespace to prevent conflicts with C++ keywords and standard library names:

```cpp
namespace gs {

class MyClass {
public:
  double value;
  
  MyClass(double value) {
    this->value = value;
  }
};

} // namespace gs
```

### Keyword Escaping

C++ reserved keywords are automatically escaped by appending an underscore:

```typescript
// GoodScript
interface Config {
  class: string;    // 'class' is a C++ keyword
  template: number; // 'template' is a C++ keyword
}
```

```cpp
// Generated C++
namespace gs {

struct Config {
  std::string class_;
  double template_;
};

} // namespace gs
```

### Type Reference Resolution

The code generator preserves ownership qualifiers by reading directly from the AST rather than using TypeScript's type checker (which erases type aliases):

```typescript
// GoodScript
const node: share<TreeNode> = new TreeNode();
```

```cpp
// Generated C++
namespace gs {

std::shared_ptr<TreeNode> node = TreeNode();  // Will add make_shared

} // namespace gs
```

## Testing Strategy

### Phase 3 Test Organization

```
test/phase3/
├── basic/                    # Feature unit tests (45 tests - 100% passing)
│   ├── primitives.test.ts    # Types, expressions, control flow
│   ├── ownership-types.test.ts # Smart pointer mappings
│   ├── classes.test.ts       # Classes, constructors, methods
│   └── js-cpp-semantics.test.ts # Semantic equivalence documentation (13 tests)
├── compile/                  # Compilation validation (planned)
│   └── *.test.ts            # Verify generated C++ compiles
├── runtime/                  # Runtime equivalence (planned)
│   └── *.test.ts            # JS vs C++ output comparison
└── concrete-examples/        # End-to-end programs (12/12 passing)
    └── */                   # Complete applications
```

### Test Examples

**Primitives Test**:
```typescript
const x: number = 42;
```
```cpp
namespace gs {

const double x = 42;

} // namespace gs
```

**Ownership Types Test**:
```typescript
class Node {
  value: number;
  next: own<Node>;
}
```
```cpp
namespace gs {

class Node {
public:
  double value;
  std::unique_ptr<Node> next;
};

} // namespace gs
```

**Control Flow Test**:
```typescript
for (let i: number = 0; i < n; i++) {
  sum = sum + i;
}
```
```cpp
namespace gs {

for (int i = 0; i < n; i++) {
  sum = sum + i;
}

} // namespace gs
```

## Design Decisions

### 1. C++ as Compilation Target

**Rationale**: C++ was chosen over Rust because:
- Mature ecosystem with excellent tooling
- Universal platform support (embedded, mobile, desktop, server)
- Direct control over memory layout and performance
- Seamless FFI with existing C/C++ libraries
- Smart pointers map naturally to ownership semantics
- RAII provides deterministic destruction
- C++20 features (concepts, ranges, coroutines) enable modern patterns

See `docs/COMPILATION-TARGET.md` for detailed analysis.

### 2. Namespace Wrapping

**Problem**: GoodScript identifiers might conflict with C++ keywords or STL names.

**Solution**: Wrap all generated code in `namespace gs { }` and escape individual keywords:
- Prevents global namespace pollution
- Allows natural identifier names in GoodScript
- Makes generated code composable with other C++ code
- Clear separation between GoodScript and native C++

### 3. Smart Pointer Types

**Ownership Mapping**:
- `own<T>` → `std::unique_ptr<T>` - Exclusive, movable ownership
- `share<T>` → `std::shared_ptr<T>` - Reference-counted, copyable
- `use<T>` → `std::weak_ptr<T>` - Non-owning, must lock() before use

**Construction** (planned):
```cpp
// Will generate
auto node = std::make_unique<Node>(42);
auto shared = std::make_shared<Data>(value);
std::weak_ptr<Node> weak = shared;  // Implicit conversion
```

**Dereferencing** (planned):
```cpp
// Smart pointer method access
node->getValue();

// Optional access
if (auto locked = weak.lock()) {
  locked->getValue();
}
```

### 4. Number Type Default

**Decision**: Map `number` to `double` (not `int`).

**Rationale**:
- JavaScript's `number` is always IEEE 754 double
- Preserves numeric semantics from TypeScript mode
- Avoids truncation surprises
- Can specialize to `int` with type hints if needed

### 5. Strict Equality Semantics

**GoodScript** (Phase 1 restriction):
```typescript
if (x === 5) { }  // Only === allowed
```

**C++**:
```cpp
if (x == 5) { }   // === maps to ==
```

**Rationale**: GoodScript requires strict equality to avoid type coercion bugs. C++ has no `===`, so `==` is the natural mapping.

### 6. Semantic Equivalence Documentation

**Test Suite**: `test/phase3/basic/js-cpp-semantics.test.ts` (13 tests)

Documents how JavaScript and C++ behaviors correspond across:

1. **Array Access**: JavaScript `undefined` vs C++ default values for out-of-bounds reads
   - Both are safe (no crash)
   - Both are predictable
   - GoodScript's no-truthy-falsy rule prevents relying on the difference

2. **Array Assignment**: Auto-resize behavior matches JavaScript exactly
   ```javascript
   arr[10] = 42;  // Resizes to length 11 in both JS and C++
   ```

3. **Object Members**: TypeScript `field?: type` → C++ `std::optional<T>`
   - JavaScript `undefined` → C++ `std::nullopt`
   - Similar semantics: both represent "no value present"

4. **Numeric Types**: Both use IEEE 754 double precision
   - `5 / 2 === 2.5` in both languages (not truncated to 2)
   - Same precision and range

5. **Equality Operators**: `===` → `==` is safe because:
   - GoodScript prohibits `==` (only `===` allowed)
   - GoodScript prohibits type coercion
   - C++ `==` with same types ≡ JavaScript `===`

6. **Boolean Semantics**: No truthy/falsy coercion
   - GoodScript (GS110): conditions must be explicit boolean expressions
   - C++: same requirement
   - Result: identical behavior in both languages

7. **Null/Undefined**: Combined into `std::optional<T>`
   - JavaScript: two distinct values (`null` and `undefined`)
   - C++: one concept (`std::nullopt`)
   - Functionally equivalent for safety

These tests serve as **documentation** rather than validation, explicitly showing where JavaScript and C++ semantics align and where they diverge. The key insight: **GoodScript's Phase 1 restrictions** (no type coercion, no truthy/falsy, strict equality only) are what enable semantic equivalence—without them, mapping TypeScript to C++ would be impossible.

## Implementation Notes

### Current File Structure

**`compiler/src/cpp-codegen.ts`** (725 lines):
```typescript
export class CppCodegen {
  private indentLevel = 0;
  private output: string[] = [];
  private includes = new Set<string>();
  private uniquePtrVars = new Set<string>();
  
  // Public API
  generate(sourceFile: ts.SourceFile, checker?: ts.TypeChecker): string
  
  // Statement generation
  private generateStatement(statement: ts.Statement): void
  private generateVariableStatement(statement: ts.VariableStatement): void
  private generateFunctionDeclaration(func: ts.FunctionDeclaration): void
  private generateClassDeclaration(classDecl: ts.ClassDeclaration): void
  
  // Expression generation
  private generateExpression(expr: ts.Expression): string
  private generateBinaryExpression(expr: ts.BinaryExpression): string
  private generateCallExpression(expr: ts.CallExpression): string
  
  // Type generation
  private generateType(type: ts.TypeNode): string
  private generateTypeReference(type: ts.TypeReferenceNode): string
  
  // Utilities
  private emit(line: string): void
  private escapeIdentifier(name: string): string
  private addInclude(include: string): void
}
```

### Key Patterns

**AST-Based Type Reading**:
```typescript
// Don't use TypeChecker for ownership types (erases aliases)
const typeText = symbol.valueDeclaration.type?.getText();
if (typeText?.startsWith('share<')) {
  // Extract inner type and generate std::shared_ptr
}
```

**State Tracking** (planned):
```typescript
// Track variables already wrapped in smart pointers
if (this.uniquePtrVars.has(varName)) {
  return `std::move(${varName})`;
} else {
  return `std::make_unique<T>(${varName})`;
}
```

## Next Steps

### Priority 1: Smart Pointer Construction

Implement logic to wrap values in smart pointers based on context:

```typescript
// Detect return type is own<T>
function create(): own<Node> {
  return new Node();  // Must wrap in make_unique
}
```

```cpp
namespace gs {

std::unique_ptr<Node> create() {
  return std::make_unique<Node>(Node());
}

} // namespace gs
```

### Priority 2: Compilation Validation

Set up tests that compile generated C++ with g++ and clang++:

```typescript
it('should compile with g++', async () => {
  const cpp = generateCpp(source);
  const result = await compileCpp(cpp, 'g++');
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe('');
});
```

### Priority 3: Runtime Equivalence

Compare JavaScript and C++ execution output:

```typescript
it('should produce identical output', async () => {
  const jsResult = await executeJS(source);
  const cppResult = await executeCpp(generateCpp(source));
  
  expect(cppResult.stdout).toBe(jsResult.stdout);
  expect(cppResult.exitCode).toBe(jsResult.exitCode);
});
```

### Priority 4: Standard Library

Implement mappings for common APIs:

```typescript
// console.log
console.log("Hello", 42);
// → std::cout << "Hello" << " " << 42 << std::endl;

// Math functions
Math.sqrt(x);
// → std::sqrt(x)

// Array methods
arr.map(x => x * 2);
// → std::transform(...) or ranges::views::transform
```

## Related Documentation

- **Language Spec**: `docs/LANGUAGE.md`
- **Ownership Model**: `docs/MEMORY-OWNERSHIP.md`
- **DAG Analysis**: `docs/DAG-ANALYSIS.md`
- **Compilation Target**: `docs/COMPILATION-TARGET.md`
- **Zig Integration**: `docs/ZIG-TOOLCHAIN.md`
- **Test Documentation**: `compiler/test/phase3/README.md`
- **Copilot Instructions**: `.github/copilot-instructions.md`

## Lessons Learned

### 1. Namespace Protection is Essential

C++ has many more keywords than TypeScript. The `gs::` namespace wrapper prevents the vast majority of conflicts without requiring aggressive identifier rewriting.

### 2. AST Reading for Ownership Types

TypeScript's type checker erases type aliases, making it impossible to distinguish `share<T>` from `T`. Reading directly from the AST preserves the source text, enabling correct smart pointer generation.

### 3. Incremental Implementation

Building features incrementally with comprehensive tests prevented regression. Each feature (primitives → ownership → classes → control flow) builds on the previous foundation.

### 4. Test-Driven Development

Writing tests first clarified requirements and caught edge cases early. The 45/45 passing tests provide confidence for future refactoring.

### 5. Semantic Equivalence is a Feature

The semantic equivalence test suite (13 tests) documents the correspondence between JavaScript and C++ behaviors. This is critical because:
- Developers need to understand where behaviors align
- The one documented difference (array out-of-bounds) is intentional and safe
- GoodScript's restrictions are what enable cross-language equivalence
- Tests serve as executable documentation

---

**Last Updated**: November 23, 2025
**Status**: Foundation complete, ready for advanced features
**Next Milestone**: Smart pointer construction and compilation validation
