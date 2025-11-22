# Phase 3: C++ Code Generation

**Status:** 🚧 Foundation Complete (35/35 basic tests passing)

**Test Coverage:** 35 basic feature tests (100% passing)
- Primitives and basic expressions (18 tests)
- Ownership types and collections (10 tests)
- Classes and interfaces (7 tests)

## Overview

Phase 3 implements the C++ code generator that transforms GoodScript's TypeScript AST into idiomatic, memory-safe C++20 code. The generator maps GoodScript's ownership semantics to C++'s smart pointers while ensuring RAII (Resource Acquisition Is Initialization) patterns and deterministic memory management.

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
  #include <vector>        // When arrays used
  #include <unordered_map> // When Map used
  #include <unordered_set> // When Set used
  ```

### 🚧 In Progress / Planned

#### Smart Pointer Management
- [ ] **Construction** - `std::make_unique()`, `std::make_shared()` wrapping
- [ ] **Dereferencing** - Context-aware use of `->` vs `.`
- [ ] **State Tracking** - Avoid double-wrapping already-wrapped pointers
- [ ] **Move Semantics** - Use `std::move()` for efficiency
- [ ] **Method Chaining** - Handle fluent interfaces with smart pointers

#### Advanced Features
- [ ] **Async/Await** - Map to C++20 coroutines (`co_await`, `co_return`)
- [ ] **Promises** - Use `cppcoro::task<T>` or similar
- [ ] **Generic Types** - Map TypeScript generics to C++ templates
- [ ] **Template Specialization** - Type-specific optimizations
- [ ] **Exception Handling** - Try/catch with RAII-safe cleanup

#### Standard Library
- [ ] **console.log** - Currently maps to `std::cout`, needs refinement
- [ ] **Math** - Map to `<cmath>` functions
- [ ] **Array Methods** - map(), filter(), reduce() → algorithms or ranges
- [ ] **String Methods** - substring(), indexOf(), etc.
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
├── basic/                    # Feature unit tests (35 tests - 100% passing)
│   ├── primitives.test.ts    # Types, expressions, control flow
│   ├── ownership-types.test.ts # Smart pointer mappings
│   └── classes.test.ts       # Classes, constructors, methods
├── compile/                  # Compilation validation (planned)
│   └── *.test.ts            # Verify generated C++ compiles
├── runtime/                  # Runtime equivalence (planned)
│   └── *.test.ts            # JS vs C++ output comparison
└── concrete-examples/        # End-to-end programs (planned)
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

Writing tests first clarified requirements and caught edge cases early. The 35/35 passing tests provide confidence for future refactoring.

---

**Last Updated**: November 22, 2025
**Status**: Foundation complete, ready for advanced features
**Next Milestone**: Smart pointer construction and compilation validation
