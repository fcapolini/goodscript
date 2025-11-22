# GoodScript Copilot Instructions

## Project Overview

GoodScript is a **TypeScript specialization** for safe systems programming with **deterministic memory management**. It compiles TypeScript code with ownership annotations to C++, providing memory safety without garbage collection.

**Core Innovation**: Ownership qualifiers (`Unique<T>`, `Shared<T>`, `Weak<T>`) that are transparent type aliases in TypeScript but map to C++ smart pointers (unique_ptr, shared_ptr, weak_ptr).

## Architecture Phases

### Phase 1: TypeScript Restrictions (✅ Complete)
- Enforces "The Good Parts" - strict subset of TypeScript
- No `var`, only `===`/`!==`, no type coercion, no `any`, no dynamic features
- 244 tests validating restrictions
- **Key file**: `compiler/src/validator.ts`
- **Documentation**: `docs/GOOD-PARTS.md`

### Phase 2: Ownership Analysis (✅ Complete)  
- DAG (Directed Acyclic Graph) analysis prevents ownership cycles
- Validates ownership derivation rules (Unique→Weak, Shared→Shared/Weak, Weak→Weak)
- Enforces Pool Pattern for complex data structures
- 425 tests with 100% coverage
- **Key files**: `compiler/src/ownership-analyzer.ts`, `compiler/src/null-check-analyzer.ts`
- **Documentation**: `docs/DAG-ANALYSIS.md`, `docs/MEMORY-OWNERSHIP.md`

### Phase 3: C++ Code Generation (🚧 In Progress - Foundation Complete)
- Translates TypeScript AST to C++ code
- Maps ownership types: `Unique<T>` → `std::unique_ptr<T>`, `Shared<T>` → `std::shared_ptr<T>`, `Weak<T>` → `std::weak_ptr<T>`
- Generates idiomatic C++ with proper RAII, exception handling
- All code wrapped in `gs` namespace to avoid keyword conflicts
- **Status**: 35/35 basic tests passing (primitives, ownership types, classes, control flow)
- **Key file**: `compiler/src/cpp-codegen.ts` (725 lines)
- **Documentation**: `docs/COMPILATION-TARGET.md`, `test/phase3/README.md`
- **TODO**: Smart pointer construction, async/await coroutines, stdlib mappings

### Phase 4: Ecosystem (📋 Planned)
- Standard library APIs for Node.js/Deno compatibility
- Module system, package management, deployment
- **Documentation**: `docs/MINIMAL-STD-LIB.md`, `docs/PHASE-4-ECOSYSTEM.md`

## Critical Design Principles

### 1. Ownership Semantics

**Type Declarations** (transparent in TypeScript):
```typescript
declare type Unique<T> = T;  // Exclusive ownership
declare type Shared<T> = T;  // Reference-counted shared ownership  
declare type Weak<T> = T | null | undefined;  // Non-owning reference
```

**C++ Mapping**:
```cpp
Unique<T> → std::unique_ptr<T>  // Heap-allocated, single owner
Shared<T> → std::shared_ptr<T>  // Reference-counted, multiple owners
Weak<T>   → std::weak_ptr<T>    // Non-owning, prevents cycles
```

**Derivation Rules** (enforced in Phase 2):
- From `Unique<T>` → only `Weak<T>` (no aliasing of exclusive ownership)
- From `Shared<T>` → `Shared<T>` or `Weak<T>` (can share or downgrade)
- From `Weak<T>` → only `Weak<T>` (can't upgrade to ownership)

### 2. DAG Enforcement

**Purpose**: Prevent reference cycles that cause memory leaks in reference-counted systems.

**How it works**:
1. Build ownership graph: Types are nodes, `Shared<T>` fields are edges
2. Detect cycles using DFS
3. Reject code with cycles, forcing use of Pool Pattern

**Pool Pattern** (the escape hatch):
```typescript
// ❌ Rejected - potential cycle
class TreeNode {
  children: Shared<TreeNode>[];  // A -> TreeNode (self-reference)
}

// ✅ Accepted - Pool Pattern breaks cycle
class Tree {
  nodes: Unique<TreeNode>[];  // Tree owns all nodes
}
class TreeNode {
  children: Weak<TreeNode>[];  // Non-owning links (no edges)
}
```

### 3. AST-Based Type Preservation

**Problem**: TypeScript's type checker erases ownership annotations because they're type aliases.
```typescript
type Shared<T> = T;  // TypeChecker sees just T, not Shared<T>
```

**Solution**: Read types directly from AST using `symbol.valueDeclaration.type?.getText()`
```typescript
// This preserves the source text "Shared<CacheNode>"
const typeText = symbol.valueDeclaration.type?.getText();
if (typeText?.startsWith('Shared<')) {
  // We know it's Shared, not just T
}
```

**Why this matters**: Critical for C++ codegen to know when to use `std::make_shared()` vs `std::make_unique()`.

## Current Development Focus

### Phase 3 C++ Codegen - Early Implementation

**Current State**: Placeholder implementation in `cpp-codegen.ts`

**Key Challenges Ahead**:

1. **Smart Pointer Management**:
   - Must generate correct `std::make_unique()`, `std::make_shared()`, and `std::weak_ptr` usage
   - Avoid double-wrapping when transferring ownership
   - Handle container types with shared ownership (e.g., `std::vector<std::shared_ptr<T>>`)

2. **Memory Safety Translation**:
   - Map TypeScript ownership semantics to C++ RAII patterns
   - Ensure proper destruction order and lifetime management
   - Handle nullable types with `std::optional<T>` or raw pointers for weak references

3. **Async/Await Support**:
   - Use C++20 coroutines with `cppcoro::task<T>` or similar
   - Map Promise<T> to appropriate future/task types
   - Handle suspension points and lifetime across await boundaries

**Next Steps**:
- Implement basic AST → C++ traversal
- Add type mapping logic for ownership qualifiers
- Generate simple class and function translations

## Coding Guidelines

### When Working on C++ Codegen (`cpp-codegen.ts`)

1. **Always use AST-based type lookup for ownership types**:
   ```typescript
   // ❌ Don't use TypeChecker for ownership types
   const type = checker.getTypeAtLocation(node);
   
   // ✅ Do read from AST
   const typeText = symbol.valueDeclaration.type?.getText();
   const isShared = typeText?.match(/Shared<([^>]+)>/);
   // Then map to: std::shared_ptr<${elementType}>
   ```

2. **Track state across statements**:
   - Track variables with unique_ptr ownership (already moved/wrapped)
   - Track variables with shared_ptr (may need .get() for raw access)
   - Track nullable types (std::optional or pointer-based)

3. **Context-aware wrapping**:
   ```typescript
   // Same value needs different treatment based on context:
   // - Constructor field assignment: may need std::make_unique()
   // - Map insert with Shared<V>: needs std::make_shared()
   // - Function call with Shared<T> param: needs std::make_shared()
   // - Already wrapped: use std::move() or pass by reference
   ```

4. **Handle numeric literals carefully**:
   ```typescript
   // C++ handles integer/float literals naturally
   // Use explicit type suffixes when needed: 1.0f, 1.0, 1L
   ```

### When Working on Ownership Analysis (`ownership-analyzer.ts`)

1. **Follow DAG rules strictly**:
   - Only `Shared<T>` creates edges
   - `Unique<T>` and `Weak<T>` do NOT create edges
   - Container transitivity: `Array<Shared<T>>`, `Map<K, Shared<V>>`

2. **Cycle detection**:
   ```typescript
   // DFS with visited/visiting sets
   // visiting = currently on stack (gray)
   // visited = completely processed (black)
   // If we encounter a gray node, we have a cycle
   ```

3. **Error messages should suggest Pool Pattern**:
   ```typescript
   this.addError(
     `Type '${typeName}' contains a Shared<T> ownership cycle. ` +
     `Use the Pool Pattern: centralize ownership in a container type ` +
     `and use Weak<T> references for relationships.`,
     location,
     'GS305'
   );
   ```

### When Working on Validation (`validator.ts`)

1. **Error codes follow convention**:
   - GS1XX: Prohibited features (GS101=with, GS102=eval, GS105=var, GS106==/!=)
   - GS2XX: Type coercion (GS201=string+number)
   - GS3XX: Ownership/DAG (GS301=derivation, GS302=nullable, GS305=cycle)

2. **Diagnostic severity**:
   - `error`: Violates GoodScript rules (compilation fails)
   - `warning`: Suspicious but legal
   - `info`: Educational/best practice

### Test Organization

**Directory Structure**:
```
test/
├── phase1/          # Validator tests (142 tests)
│   ├── var-keyword.test.ts
│   ├── strict-equality.test.ts
│   └── ...
├── phase2/          # Ownership/DAG tests (283 tests)
│   ├── ownership-derivation.test.ts
│   ├── dag-cycles.test.ts
│   └── ...
└── phase3/          # C++ codegen tests (to be implemented)
    ├── basic/       # Unit tests for features
    ├── compile/     # Validation that generated code compiles with g++/clang
    ├── runtime/     # JS vs C++ equivalence tests
    └── concrete-examples/  # Real programs
```

**Testing Philosophy**:
1. **Unit tests** verify individual features work
2. **Compile tests** ensure generated C++ compiles with g++/clang++
3. **Runtime tests** verify JS and C++ produce identical output
4. **Concrete examples** are end-to-end real programs

### Common Patterns

**Pattern: Method Return Type Lookup**
```typescript
private getMethodReturnTypeFromSource(callExpr: ts.CallExpression): string | undefined {
  if (!this.checker) return undefined;
  
  const signature = this.checker.getResolvedSignature(callExpr);
  if (!signature || !signature.declaration) return undefined;
  
  if (ts.isMethodDeclaration(signature.declaration)) {
    const returnTypeNode = signature.declaration.type;
    return returnTypeNode?.getText();  // Preserves "Unique<Token>"
  }
  
  return undefined;
}
```

**Pattern: Tracking Variables Across Statements**
```typescript
// In constructor body generation:
this.uniquePtrVars.clear();  // Reset for each constructor

// When finding a method call returning Unique<T>:
const returnType = this.getMethodReturnTypeFromSource(callExpr);
if (returnType?.startsWith('Unique<')) {
  this.uniquePtrVars.add(localVarName);  // Mark as already unique_ptr
}

// Later, in member initialization:
if (field.type.startsWith('std::unique_ptr<') && !this.uniquePtrVars.has(field.name)) {
  emit(`${field.name}(std::make_unique<${elementType}>(${field.name}))`);
} else {
  emit(`${field.name}(std::move(${field.name}))`);
}
```

**Pattern: Container Type Detection**
```typescript
// Check if std::vector expects Shared<T> elements
const vecTypeText = symbol.valueDeclaration.type?.getText();
const sharedMatch = vecTypeText?.match(/Shared<([^>]+)>\[\]/);
if (sharedMatch) {
  const elementType = sharedMatch[1];
  // std::vector<std::shared_ptr<${elementType}>>
  // Use push_back(std::make_shared<${elementType}>())
}

// Check if Map expects Shared<V> values  
const mapTypeText = symbol.valueDeclaration.type?.getText();
const sharedMatch = mapTypeText?.match(/Map<[^,]+,\s*Shared<([^>]+)>>/);
if (sharedMatch) {
  const valueType = sharedMatch[1];
  // std::unordered_map<K, std::shared_ptr<${valueType}>>
  // Use insert or emplace with std::make_shared
}
```

## Documentation References

### Design Documents
- **`docs/LANGUAGE.md`**: Language specification for implementors
- **`docs/MEMORY-OWNERSHIP.md`**: Formal proof of memory safety model
- **`docs/DAG-ANALYSIS.md`**: DAG cycle detection algorithm specification
- **`docs/GOOD-PARTS.md`**: Phase 1 TypeScript restrictions with rationale
- **`docs/COMPILATION-TARGET.md`**: Why C++/Rust vs other targets
- **`docs/GOODSCRIPT-VS-RUST.md`**: Comparison with Rust's ownership model

### Implementation Guides  
- **`docs/COMPILATION-TARGET.md`**: Why C++ was chosen as compilation target
- **`docs/FOR-TS-DEVELOPERS.md`**: Developer-facing guide
- **`docs/REACT.md`**: React/JSX support
- **`docs/ASYNC-AWAIT.md`**: Async/await and Promise handling
- **`docs/MINIMAL-STD-LIB.md`**: Standard library design

### Test Documentation
- **`compiler/test/README.md`**: Test suite overview
- **`compiler/test/phase3/concrete-examples/README.md`**: Concrete examples guide
- **`notes/SESSION-*.md`**: Development session notes (not in git)

## Common Pitfalls & Solutions

### ❌ Pitfall 1: Using TypeChecker for Ownership Types
```typescript
// ❌ This loses ownership qualifiers
const type = checker.getTypeAtLocation(expr);
// type is "CacheNode", not "Shared<CacheNode>"
```

**✅ Solution**: Read from AST
```typescript
const symbol = checker.getSymbolAtLocation(expr);
const typeText = symbol.valueDeclaration.type?.getText();
// typeText is "Shared<CacheNode>"
```

### ❌ Pitfall 2: Double-Wrapping
```typescript
// ❌ Constructor returns Unique<T> (already unique_ptr<T>)
const token = tokenizer.nextToken();  // Returns unique_ptr<Token>
this.current = std::make_unique<Token>(token);  // Double wrap!
```

**✅ Solution**: Track unique_ptr variables and use std::move
```typescript
const returnType = this.getMethodReturnTypeFromSource(callExpr);
if (returnType?.startsWith('Unique<')) {
  this.uniquePtrVars.add('current');
}
// Later: if (!this.uniquePtrVars.has('current')) { wrap... } else { std::move... }
```

### ❌ Pitfall 3: Ignoring Context
```typescript
// ❌ Same value needs different treatment
map.insert(key, value);  // If map is Map<K, Shared<V>>, needs make_shared
vec.push_back(value);    // If vec is array of Shared<T>, needs make_shared
```

**✅ Solution**: Check container element types via AST
```typescript
const mapTypeText = getFieldType(mapSymbol);
if (mapTypeText?.includes('Shared<')) {
  value = `std::make_shared<${elementType}>(${value})`;
}
```

### ❌ Pitfall 4: Hardcoding Type Conversions
```typescript
// ❌ Assumes all numbers need .0
const literal = value + '.0';  // What if value is "1.0" already?
```

**✅ Solution**: Check before adding
```typescript
if (!value.includes('.')) {
  value += '.0';
}
```

## Key Files to Understand

### Core Compiler
1. **`compiler/src/cpp-codegen.ts`** (placeholder) - Main C++ code generator
   - `CppCodegen` class to be implemented
   - Will handle all AST → C++ transformations
   - Will require careful state tracking for smart pointer management

2. **`compiler/src/ownership-analyzer.ts`** (1314 lines) - DAG analysis
   - Builds ownership graph from AST
   - Detects cycles using DFS
   - Enforces derivation rules

3. **`compiler/src/validator.ts`** (453 lines) - Phase 1 restrictions
   - Checks for prohibited features
   - Enforces strict typing
   - Simple visitor pattern

### Type Definitions
4. **`lib/goodscript.d.ts`** - Type declarations for GoodScript
   - Defines `Unique<T>`, `Shared<T>`, `Weak<T>`
   - Transparent type aliases for TypeScript compatibility

### Test Infrastructure
5. **`compiler/test/phase3/concrete-examples/`** - Real programs
   - Each subdirectory is a complete program
   - Tests compilation, rustc validation, runtime equivalence
   - Best place to see GoodScript in action

## Development Workflow

### Adding a New Feature

1. **Update type definitions** if needed (`lib/goodscript.d.ts`)
2. **Add validation** if new restriction (`validator.ts`)
3. **Update ownership analysis** if affects DAG (`ownership-analyzer.ts`)
4. **Implement codegen** (`rust-codegen.ts`)
5. **Write tests**:
   - Unit test in `test/phase3/basic/`
   - Rustc validation test in `test/phase3/rustc/`
   - Runtime equivalence test in `test/phase3/runtime/`
6. **Update documentation** (`docs/PHASE-3-RUST.md`)

### Debugging Rust Codegen Issues

1. **Find failing test**:
   ```bash
   npm test -- --grep "test-name"
   ```

2. **Examine generated Rust**:
   ```bash
   npm run build && npm test
   # Check compiler/test/phase3/concrete-examples/example-name/dist/rust/
   ```

3. **Check C++ compiler errors**:
   ```bash
   cd compiler/test/phase3/concrete-examples/example-name/dist/cpp
   g++ -std=c++20 -o main src/main.cpp
   # Or use clang++
   # Read error messages
   ```

4. **Compare with TypeScript**:
   - Look at source `.gs.ts` file
   - Check what TypeScript equivalent would be
   - Ensure Rust captures same semantics

5. **Add debug logging** in `rust-codegen.ts`:
   ```typescript
   console.log(`[DEBUG] Generating for ${node.kind}: ${node.getText()}`);
   ```

### Running Tests

```bash
# All tests
npm test

# Phase 3 only
npm test -- test/phase3

# Concrete examples only
npm test -- test/phase3/concrete-examples

# Specific test file
npm test -- test/phase3/basic/classes.test.ts

# With coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

## Session Notes Convention

Development sessions are documented in `notes/SESSION-N.md` (not committed, in .gitignore):
- Problem statement
- Solutions implemented  
- Code changes with line numbers
- Test results (before/after)
- Architecture insights
- Lessons learned

These notes help track progress and reasoning over time.

## Questions to Ask

When implementing new features or fixing bugs:

1. **Does this affect ownership semantics?** → Update `ownership-analyzer.ts`
2. **Does TypeChecker preserve the type information I need?** → Probably not, use AST
3. **Could this cause double-wrapping?** → Track state, use std::move when appropriate
4. **Does the generated C++ compile?** → Add g++/clang++ compilation test
5. **Does it behave the same as TypeScript?** → Add runtime equivalence test
6. **Could this create an ownership cycle?** → Check DAG rules
7. **Is this a TypeScript "bad part"?** → Add validation in `validator.ts`

## Philosophy & Goals

1. **Memory safety without GC**: Deterministic destruction via ownership
2. **Familiar syntax**: TypeScript developers should feel at home
3. **Dual-mode execution**: Run in Node.js/Deno OR compile to C++
4. **Zero-cost abstractions**: C++ code should be as fast as hand-written
5. **Explicit over implicit**: If it can surprise, make it explicit
6. **Fail early**: Compile-time errors > Runtime errors > Memory corruption

## Current Status (as of Nov 22, 2025)

- **Phase 1**: ✅ 100% complete (244/244 tests)
- **Phase 2**: ✅ 100% complete (425/425 tests)  
- **Phase 3**: 🚧 Foundation complete (35/35 basic tests passing)
  - ✅ AST traversal and code emission
  - ✅ Type mappings (primitives, ownership types, collections)
  - ✅ Statement generation (variables, functions, classes, control flow)
  - ✅ Expression generation (operators, calls, literals)
  - ✅ Namespace wrapping (gs::) and keyword escaping
  - ⏳ Smart pointer construction (make_unique, make_shared)
  - ⏳ C++20 coroutines for async/await
  - ⏳ Standard library mappings
  - ⏳ Compilation validation tests (g++/clang++)
  - ⏳ Runtime equivalence tests (JS vs C++ output)
- **Phase 4**: 📋 Planned

**Next priorities**:
1. Implement smart pointer construction logic
2. Add state tracking to avoid double-wrapping
3. Create compilation validation tests (g++/clang++)
4. Implement runtime equivalence testing
5. Add stdlib mappings (console, Math, Array methods)

---

## Quick Reference

### Ownership Type Mappings
| GoodScript | TypeScript | C++ | Semantics |
|-----------|-----------|------|-----------|---|
| `Unique<T>` | `T` | `std::unique_ptr<T>` | Exclusive ownership |
| `Shared<T>` | `T` | `std::shared_ptr<T>` | Shared ownership |
| `Weak<T>` | `T \| null \| undefined` | `std::weak_ptr<T>` | Non-owning reference |

### Error Code Prefixes
- `GS1XX`: Language restrictions (var, eval, ==, etc.)
- `GS2XX`: Type coercion issues
- `GS3XX`: Ownership and DAG violations

### Key Directories
- `compiler/src/`: Compiler implementation
- `compiler/test/`: Test suite (organized by phase)
- `docs/`: Design documents and specifications
- `lib/`: Type definitions for GoodScript
- `notes/`: Development session notes (not committed)

---

**Remember**: When in doubt, check the documentation in `docs/` - it's comprehensive and kept up to date. The architecture is intentional, not accidental!
