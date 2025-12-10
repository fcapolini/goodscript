# Phase 8: Union Types Implementation Plan

**Date**: December 9, 2025  
**Status**: In Progress  
**Goal**: Implement union type support (T | null, T | undefined) for optional values

## Overview

Union types are essential for representing optional values in GoodScript. The most common use case is `T | null` for nullable types and `T | undefined` for optional properties/returns.

**Critical for stdlib**: Many stdlib methods return optional values:
- `Array.find(): T | undefined`
- `Map.get(): V | undefined`
- `String.indexOf(): number` (returns -1, not undefined, but pattern is similar)

## Current State

**Existing nullable support**:
- ✅ `own<T>`, `share<T>`, `use<T>` can be null (via pointers)
- ✅ Optional chaining (`obj?.field`) already implemented
- ✅ Null checks work in control flow
- ❌ No union type syntax support (`T | null`)
- ❌ No type narrowing based on null checks

**Implementation gap**:
```typescript
// Currently NOT supported:
function find<T>(arr: Array<T>, predicate: (item: T) => boolean): T | undefined {
  // ...
}

// Workaround (awkward):
function find<T>(arr: Array<T>, predicate: (item: T) => boolean): use<T> {
  // Returns null if not found, but type system doesn't express this
}
```

## Implementation Steps

### Step 1: IR Type System ⏳

**Goal**: Add UnionType to IR type system

**Files to modify**:
1. `compiler/src/ir/types.ts`
   - Add `UnionType` interface: `{ kind: 'union', types: IRType[] }`
   - Update `IRType` discriminated union
   - Add type equality/compatibility checks for unions

**Design decisions**:
- Normalize unions: `T | T` → `T`, `T | never` → `T`
- Order-independent: `A | B` === `B | A`
- Flatten nested unions: `A | (B | C)` → `A | B | C`
- Special handling for `null` and `undefined`

**Example IR**:
```typescript
{
  kind: 'union',
  types: [
    { kind: 'primitive', type: PrimitiveType.String },
    { kind: 'null' }
  ]
}
```

**Tests** (est. 10 tests):
- Union type creation
- Union type equality
- Union normalization
- Subtype relationships (T <: T | null)

---

### Step 2: AST Lowering

**Goal**: Detect and lower union type syntax from TypeScript AST

**Files to modify**:
1. `compiler/src/frontend/lowering.ts`
   - Handle `ts.SyntaxKind.UnionType`
   - Convert `node.types` array to `IRType[]`
   - Apply normalization rules

**TypeScript AST structure**:
```typescript
// TypeScript: string | null
{
  kind: ts.SyntaxKind.UnionType,
  types: [
    { kind: ts.SyntaxKind.StringKeyword },
    { kind: ts.SyntaxKind.NullKeyword }
  ]
}
```

**Lowering algorithm**:
```typescript
private lowerUnionType(node: ts.UnionTypeNode): IRType {
  const types = node.types.map(t => this.lowerType(t));
  return normalizeUnion(types);
}
```

**Tests** (est. 8 tests):
- Lower `string | null`
- Lower `number | undefined`
- Lower `T | null | undefined`
- Lower complex unions `A | B | C`

---

### Step 3: Type Checker Integration

**Goal**: Handle union types in type checking and inference

**Files to modify**:
1. `compiler/src/analysis/null-checker.ts`
   - Recognize `T | null` as nullable
   - Track null narrowing in control flow
   
2. `compiler/src/ir/signatures.ts`
   - Add union type signatures
   - Handle structural compatibility

**Type narrowing example**:
```typescript
function process(value: string | null): void {
  if (value !== null) {
    // value is narrowed to 'string' here
    console.log(value.length);
  }
}
```

**Challenges**:
- Control flow analysis (if checks narrow types)
- Discriminated unions (future: `{ type: 'a', x: number } | { type: 'b', y: string }`)

**Tests** (est. 12 tests):
- Type compatibility checks
- Null narrowing in if statements
- Union type assignment
- Method call on union members

---

### Step 4: C++ Code Generation

**Goal**: Map union types to C++ representation

**Files to modify**:
1. `compiler/src/backend/cpp/codegen.ts`
   - Generate `std::optional<T>` for `T | null` (ownership mode)
   - Generate `T*` for `T | null` (GC mode)
   - Generate `std::variant<T, U>` for general unions (future)

**Mapping strategy**:

**GC Mode**:
```typescript
// TypeScript: string | null
// C++: gs::String*  (nullptr for null)
```

**Ownership Mode**:
```typescript
// TypeScript: string | null
// C++: std::optional<gs::String>
```

**General unions** (future):
```typescript
// TypeScript: string | number
// C++: std::variant<gs::String, double>
```

**Codegen patterns**:
```cpp
// Null check
if (value != nullptr) { /* GC mode */ }
if (value.has_value()) { /* ownership mode */ }

// Access value
value->length()  // GC mode
value.value().length()  // ownership mode
```

**Tests** (est. 10 tests):
- Generate std::optional for T | null
- Generate nullptr checks
- Generate .has_value() checks
- Handle union type parameters
- Handle union type returns

---

### Step 5: Runtime Library Updates

**Goal**: Ensure runtime supports optional types

**Files to check/modify**:
1. `runtime/cpp/ownership/gs_runtime.hpp`
   - Verify std::optional is included
   - Add helper utilities if needed

**Required headers**:
```cpp
#include <optional>  // For std::optional<T>
#include <variant>   // For std::variant<T, U> (future)
```

**Helper utilities** (optional):
```cpp
namespace gs {
  // Helper for optional access
  template<typename T>
  T& unwrap(std::optional<T>& opt) {
    if (!opt.has_value()) {
      throw std::runtime_error("Unwrap called on empty optional");
    }
    return opt.value();
  }
}
```

**Tests** (est. 5 tests):
- Optional type construction
- Optional value access
- Optional null checks
- Optional with ownership types

---

### Step 6: Integration & Documentation

**Goal**: End-to-end tests and documentation

**Files to create**:
1. `compiler/test/union-types.test.ts` - Comprehensive test suite
2. `examples/union-types-demo-gs.ts` - Demo program
3. `compiler/docs/UNION-TYPES-GUIDE.md` - User documentation

**Integration tests**:
- Array.find() with T | undefined
- Map.get() with V | undefined
- Null coalescing patterns
- Control flow narrowing

**Documentation topics**:
- Union type syntax
- Null vs undefined
- Type narrowing
- C++ mapping (GC vs ownership)
- Limitations (no discriminated unions yet)

**Tests** (est. 10 tests):
- Full pipeline: TS → IR → C++ → Binary
- Array.find() implementation
- Map.get() implementation
- Practical examples

---

## Scope & Limitations

### Phase 8 Scope (Implemented)
✅ `T | null` - Nullable types  
✅ `T | undefined` - Optional types  
✅ `T | null | undefined` - Combined  
✅ Type narrowing on null checks  
✅ std::optional mapping (ownership mode)  
✅ Pointer mapping (GC mode)

### Not in Scope (Future Phases)
❌ General unions (`string | number`) - requires std::variant  
❌ Discriminated unions - requires pattern matching  
❌ Type guards (`typeof`, `instanceof`) - needs runtime checks  
❌ Intersection types (`A & B`) - different feature  
❌ Conditional types (`T extends U ? X : Y`) - advanced  

### Workarounds for Unsupported
For `string | number`, use:
- Method overloads
- Generic types
- Explicit branching

---

## Success Criteria

**Minimum** (Phase 8 complete):
- ✅ Union types parse and lower to IR
- ✅ Type checker understands `T | null`
- ✅ Codegen produces correct C++ (optional/pointer)
- ✅ Array.find() works with `T | undefined`
- ✅ Map.get() works with `V | undefined`
- ✅ All tests passing (319 → 350+)

**Nice-to-have**:
- Type narrowing in if statements
- Optional chaining works with unions
- Good error messages for type mismatches

---

## Timeline

**Estimated effort**: 6-8 hours
- Step 1 (IR types): 2 hours
- Step 2 (Lowering): 1 hour
- Step 3 (Type checker): 2 hours
- Step 4 (Codegen): 2 hours
- Step 5 (Runtime): 30 minutes
- Step 6 (Integration): 1 hour

**Priority**: HIGH - Blocks stdlib development

---

## Dependencies

**None** - Can proceed immediately

**Blocked by**: Nothing

**Blocks**: 
- stdlib/core (needs optional returns)
- stdlib/collections (Array.find, Map.get)
- Full Phase 7c completion

---

## Notes

**Design Philosophy**:
- Start simple: Focus on `T | null` and `T | undefined`
- Pragmatic: Use std::optional (well-tested, standard)
- Incremental: General unions (std::variant) can come later
- TypeScript-compatible: Follow TS semantics where possible

**C++ std::optional advantages**:
- Standard library (C++17)
- Zero overhead when value present
- Explicit null checking
- Type-safe value access
- Works with move semantics

**Future extensions**:
- Discriminated unions → pattern matching
- Type guards → runtime type info
- Union narrowing → dataflow analysis

---

Last Updated: December 9, 2025
