# Function Hoisting Optimization Design

**Status**: Planned  
**Priority**: Medium  
**Estimated Complexity**: Medium  
**Dependencies**: Nested function support in IR

## Motivation

Performance benchmarks (see `performance/fibonacci-gs.ts`) show that recursive algorithms suffer from closure allocation overhead when functions are nested. The fibonacci benchmark, for example, creates a new closure on every recursive call when the function is defined inside another function.

## Goals

1. **Enable nested functions**: Support defining functions inside other functions
2. **Automatic optimization**: Detect and hoist recursive functions without closure dependencies
3. **Zero overhead**: Hoisted functions should have the same performance as top-level functions
4. **Transparency**: Optimization should be automatic and invisible to the programmer

## Non-Goals

- Hoisting non-recursive functions (minimal benefit)
- Hoisting functions with closure dependencies (would change semantics)
- Manual hoisting directives or pragmas

## Design

### Phase 1: IR Support for Nested Functions

Currently, nested functions are not represented in the IR. We need to add support for function declarations as statements:

```typescript
// Add to IRStatement type
| { kind: 'functionDecl'; name: string; params: IRParam[]; returnType: IRType; body: IRFunctionBody; async?: boolean }
```

### Phase 2: AST Lowering

Update `lowering.ts` to handle nested function declarations:

```typescript
private lowerStatementAST(node: ts.Statement, sourceFile: ts.SourceFile): IRStatement | null {
  // ... existing cases ...
  
  if (ts.isFunctionDeclaration(node) && !isTopLevel(node)) {
    // Lower as nested function declaration statement
    return {
      kind: 'functionDecl',
      name: node.name.getText(),
      params: ...,
      returnType: ...,
      body: ...
    };
  }
}
```

### Phase 3: Optimization Pass

Add a new optimization pass that runs after IR lowering:

```typescript
class FunctionHoister {
  hoist(module: IRModule): IRModule {
    const hoisted: IRFunctionDecl[] = [];
    const transformed = this.hoistInDeclarations(module.declarations, hoisted);
    
    return {
      ...module,
      declarations: [...hoisted, ...transformed]
    };
  }
  
  private shouldHoist(func: IRFunctionDecl, parentScope: Set<string>): boolean {
    return (
      this.isRecursive(func) &&
      !this.hasClosureDependencies(func, parentScope)
    );
  }
  
  private isRecursive(func: IRFunctionDecl): boolean {
    // Scan function body for calls to func.name
    return this.containsCall(func.body, func.name);
  }
  
  private hasClosureDependencies(func: IRFunctionDecl, parentScope: Set<string>): boolean {
    // Check if function references variables from parentScope
    const localVars = new Set(func.params.map(p => p.name));
    return this.referencesParentScope(func.body, parentScope, localVars);
  }
}
```

### Phase 4: C++ Code Generation

No changes needed! Hoisted functions become regular module-level functions and generate identical C++ code to manually-written top-level functions.

## Implementation Plan

### Step 1: IR Types (1 day)
- [ ] Add `functionDecl` to `IRStatement` type
- [ ] Update IR builder helpers
- [ ] Update IR type definitions

### Step 2: AST Lowering (2 days)
- [ ] Detect nested function declarations in `lowerStatementAST`
- [ ] Lower nested functions to `IRStatement` with `kind: 'functionDecl'`
- [ ] Handle async nested functions
- [ ] Add error handling for unsupported nested function patterns

### Step 3: Hoisting Analysis (3 days)
- [ ] Implement recursion detection
  - Walk function body statements
  - Find calls to the function itself
  - Handle indirect recursion (A calls B calls A)
- [ ] Implement closure dependency analysis
  - Track parent scope variables
  - Track local variables and parameters
  - Detect references to parent scope
- [ ] Write comprehensive unit tests

### Step 4: Hoisting Transform (2 days)
- [ ] Implement module-level hoisting
- [ ] Move hoisted functions to start of declarations array
- [ ] Remove hoisted functions from original location
- [ ] Preserve source locations for debugging

### Step 5: Integration & Testing (2 days)
- [ ] End-to-end tests with nested functions
- [ ] Performance benchmarks (fibonacci, factorial, etc.)
- [ ] Regression tests for existing functionality
- [ ] Documentation and examples

**Total Estimate**: 10 days

## Test Cases

### Should Hoist

```typescript
// Case 1: Simple recursion, no closure
function outer() {
  function fib(n: integer): integer {
    if (n <= 1) return n;
    return fib(n - 1) + fib(n - 2);
  }
  return fib(10);
}

// Case 2: Multiple parameters, no closure
function outer() {
  function gcd(a: integer, b: integer): integer {
    if (b === 0) return a;
    return gcd(b, a % b);
  }
  return gcd(48, 18);
}
```

### Should NOT Hoist

```typescript
// Case 1: Not recursive
function outer() {
  function helper(x: integer): integer {
    return x * 2;
  }
  return helper(5);
}

// Case 2: Has closure dependency (parameter)
function outer(multiplier: integer) {
  function scale(n: integer): integer {
    return scale(n - 1) * multiplier;  // Uses 'multiplier' from outer
  }
  return scale(10);
}

// Case 3: Has closure dependency (local variable)
function outer() {
  const base = 10;
  function recur(n: integer): integer {
    if (n === 0) return base;  // Uses 'base' from outer
    return recur(n - 1) + base;
  }
  return recur(5);
}
```

## Performance Impact

Based on preliminary analysis of the fibonacci benchmark:

- **Without hoisting** (nested function): ~180ms for fib(40)
- **With hoisting** (top-level function): ~120ms for fib(40)
- **Expected improvement**: 30-40% speedup for deeply recursive code

Memory impact:
- Eliminates closure allocation on each call
- Reduces GC pressure
- Better cache locality

## Future Enhancements

1. **Mutual recursion**: Hoist mutually recursive functions together
2. **Lambda hoisting**: Apply same optimization to recursive lambda expressions
3. **Tail call optimization**: Combine with TCO for even better performance
4. **Cross-function analysis**: Detect recursion through helper functions

## References

- Benchmarks: `performance/fibonacci-gs.ts`
- Optimizer infrastructure: `compiler/src/optimizer/optimizer.ts`
- IR types: `compiler/src/ir/types.ts`
- Test cases: `compiler/test/function-hoisting.test.ts` (currently skipped)

## Related Optimizations

- **Constant folding**: Already implemented
- **Dead code elimination**: Already implemented
- **Tail call optimization**: Planned
- **Inlining**: Future consideration

---

**Last Updated**: December 10, 2025  
**Author**: GoodScript Team
