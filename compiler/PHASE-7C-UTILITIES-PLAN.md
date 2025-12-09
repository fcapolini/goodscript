# Phase 7c: Utilities & Polish - Implementation Plan

**Date**: December 9, 2025  
**Status**: In Progress  
**Goal**: Complete stdlib utility support (Math, JSON, union types)

## Overview

Phase 7c focuses on integrating existing runtime utilities and implementing missing type system features needed by the stdlib. Unlike previous phases, much of the runtime code already exists - we just need to wire it up to the compiler.

## Current State

**Existing Runtime** (already implemented in `runtime/cpp/ownership/`):
- ✅ `gs_math.hpp` - Complete Math object (20+ methods, all constants)
- ✅ `gs_json.hpp` - Basic JSON.stringify() implementation
- ✅ `gs_tuple.hpp` - Tuple type support

**Missing Integration**:
- ❌ Math not wired to codegen (Math.min(), Math.max(), etc. don't compile)
- ❌ JSON not wired to codegen (JSON.stringify() doesn't compile)
- ❌ Union types (T | null) not supported in type system
- ❌ Tuple types not fully integrated

## Implementation Steps

### Step 1: Math Object Integration ⏳

**Goal**: Enable Math.min(), Math.max(), Math.abs(), and all other Math methods.

**Files to Modify**:
1. `compiler/src/backend/cpp/codegen.ts`
   - Add Math to built-in globals (like console, FileSystem, HTTP)
   - Pattern: `Math.min(a, b)` → `gs::Math::min(a, b)`

**Test Cases**:
- Math.min(1, 2) → 1
- Math.max(1, 2) → 2
- Math.abs(-5) → 5
- Math.floor(3.7) → 3
- Math.ceil(3.2) → 4
- Math.PI → 3.141592...
- Math.sqrt(16) → 4

**Implementation Pattern** (following FileSystem/HTTP):
```typescript
// In generateExpression, case 'call':
if (expr.callee.kind === 'memberAccess' && 
    expr.callee.object.kind === 'identifier' && 
    expr.callee.object.name === 'Math') {
  const method = expr.callee.member;
  const args = expr.arguments.map((arg: IRExpression) => 
    this.generateExpression(arg)).join(', ');
  return `gs::Math::${method}(${args})`;
}

// In generateExpression, case 'memberAccess':
if (expr.object.kind === 'identifier' && expr.object.name === 'Math') {
  return `gs::Math::${member}`;
}
```

**Also need SSA support**:
```typescript
// In generateSSAMemberAccess:
if (obj === 'Math') {
  return `gs::Math::${expr.member}`;
}

// In generateSSACall for method calls:
if (expr.callee.kind === 'ssa-member-access' && 
    /* similar check for Math */) {
  // handle Math method calls
}
```

---

### Step 2: JSON Object Integration

**Goal**: Enable JSON.stringify() for basic types.

**Files to Modify**:
1. `compiler/src/backend/cpp/codegen.ts`
   - Add JSON to built-in globals
   - Pattern: `JSON.stringify(obj)` → `gs::JSON::stringify(obj)`

**Note**: Current `gs_json.hpp` has basic stringify() for primitives. Full JSON support would require vendoring nlohmann/json (future enhancement).

**Test Cases**:
- JSON.stringify(42) → "42"
- JSON.stringify("hello") → "\"hello\""
- JSON.stringify(true) → "true"

---

### Step 3: Testing & Validation

**Create Test Files**:
1. `test/math-integration.test.ts` - Test Math object compilation
2. `test/json-integration.test.ts` - Test JSON object compilation
3. `examples/math-demo-gs.ts` - End-to-end Math usage
4. `examples/json-demo-gs.ts` - End-to-end JSON usage

**Success Criteria**:
- All Math methods compile and generate correct C++ code
- All JSON methods compile and generate correct C++ code
- No regressions in existing 297 tests
- New tests pass (estimate: +10 tests)

---

### Step 4: Union Types (Future)

**Goal**: Support `T | null` for optional returns (needed by stdlib).

**Complexity**: HIGH - requires type system changes

**Required Changes**:
1. IR type system: Add union type support
2. Type checker: Handle union type checking
3. Codegen: Map to `std::optional<T>` or nullable pointers
4. Lowering: Detect union type syntax

**Decision**: DEFER to separate phase - not blocking for Phase 7c completion.

**Workaround**: Stdlib can use nullable types (share<T>) for now.

---

### Step 5: Tuple Types (Future)

**Goal**: Full tuple type support `[T1, T2]` with type inference.

**Complexity**: MEDIUM - runtime exists, needs IR integration

**Required Changes**:
1. IR type system: Add tuple type
2. Lowering: Detect tuple literal syntax `[a, b]`
3. Type inference: Distinguish arrays from tuples
4. Codegen: Already partially implemented

**Decision**: DEFER - gs_tuple.hpp exists but full integration is complex.

**Workaround**: Stdlib can use 2-element arrays or custom structs.

---

## Phase 7c Completion Criteria

**Minimum** (for Phase 7c success):
- ✅ Math object fully integrated (all methods work)
- ✅ JSON.stringify() works for basic types
- ✅ All tests passing (297 → 307+)
- ✅ Documentation updated

**Optional** (nice-to-have):
- Union types (T | null)
- Tuple types ([T1, T2])
- JSON.parse() (requires nlohmann/json)

## Timeline

**Estimated Effort**: 2-3 hours
- Step 1 (Math): 1 hour (codegen + tests)
- Step 2 (JSON): 30 minutes (codegen + tests)
- Step 3 (Testing): 1 hour (comprehensive tests + examples)

**Priority**: Math > JSON > Union types > Tuple types

## Dependencies

**None** - All required runtime code exists.

**Blocked By**: Nothing - can proceed immediately.

**Blocks**: stdlib/core, stdlib/json modules (once complete)

---

## Notes

**Why This is Fast**:
- Runtime implementations already exist (gs_math.hpp, gs_json.hpp)
- Pattern established by FileSystem/HTTP/console integration
- Just need to wire up codegen (similar to previous work)
- No new language features required

**Why Union Types Are Deferred**:
- Requires fundamental type system changes
- Affects ownership analysis, null checker, type signatures
- Better as separate Phase 8 feature
- Not blocking for basic stdlib functionality

**Next After 7c**:
- Phase 8: Advanced Types (union types, literal types, type guards)
- stdlib implementation (using completed Phase 7 features)
- CLI tool for end-to-end compilation

---

Last Updated: December 9, 2025
