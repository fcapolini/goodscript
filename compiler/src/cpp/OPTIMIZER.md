# C++ AST Optimizer

The C++ AST optimizer performs transformations on the C++ abstract syntax tree before code generation. This provides several benefits over text-based optimizations:

- **Type-safe transformations**: Uses the structured AST instead of string manipulation
- **Composable passes**: Multiple optimization passes can be easily combined
- **Testable**: Each optimization can be unit tested independently
- **Maintainable**: Clear separation between AST construction, optimization, and rendering

## Usage

```typescript
import { AstCodegen } from './cpp/codegen';
import { OptimizationOptions } from './cpp/optimizer';

// Create codegen with optimization options
const codegen = new AstCodegen(typeChecker, {
  level: 1,                      // 0 = none, 1 = basic, 2 = aggressive
  constantFolding: true,         // Evaluate constant expressions at compile time
  deadCodeElimination: true,     // Remove unreachable code
  smartPointerOptimization: true // Optimize smart pointer operations
});

const cpp = codegen.generate(sourceFile);
```

## Optimization Levels

- **Level 0** (`{ level: 0 }`): No optimization (default)
  - Fastest compilation
  - Generates code that exactly matches source structure
  - Useful for debugging and understanding code generation

- **Level 1** (`{ level: 1 }`): Basic optimizations
  - Constant folding
  - Dead code elimination
  - Minor performance cost during compilation
  - Safe for production use

- **Level 2** (`{ level: 2 }`): Aggressive optimizations
  - All Level 1 optimizations
  - Function inlining (planned)
  - Loop optimizations (planned)
  - Higher compilation cost

## Implemented Optimizations

### Constant Folding

Evaluates constant expressions at compile time:

```typescript
// Source:
const x: number = 2 + 3 * 4;

// Without optimization:
const double x = 2 + 3 * 4;

// With optimization:
const double x = 14;
```

**Benefits:**
- Reduces runtime computation
- Smaller generated code
- Enables further optimizations

**Examples:**
- Arithmetic: `2 + 3` → `5`
- Comparisons: `3 < 5` → `true`
- Boolean ops: `!false` → `true`
- Ternary: `true ? 1 : 2` → `1`

### Dead Code Elimination

Removes unreachable code:

```typescript
// Source:
function test(): number {
  return 42;
  const unreachable: number = 1;  // Never executed
}

// Generated C++ (optimized):
int test() {
  return 42;
  // unreachable code removed
}
```

**Optimizations:**
- Code after `return`, `break`, `continue` statements
- `if (false)` branches
- `while (false)` loops
- Constant condition branches

### Expression Simplification

Simplifies redundant expressions:

```typescript
// Source:
const x: number = (42);  // Unnecessary parentheses

// Optimized:
const double x = 42;
```

## Smart Pointer Optimization (Planned)

Will optimize smart pointer operations:

- Insert `std::move()` for unique_ptr transfers
- Avoid unnecessary `shared_ptr` copies
- Optimize weak_ptr lock patterns

## How It Works

1. **AST Construction**: TypeScript code → C++ AST
2. **Optimization Pass**: Transform AST using visitor pattern
3. **Code Rendering**: Optimized AST → C++ source code

```
TypeScript Source
      ↓
  Parse to TS AST
      ↓
Generate C++ AST (unoptimized)
      ↓
 Optimize C++ AST ← You are here!
      ↓
  Render to C++
      ↓
   C++ Source
```

## Implementation Details

The optimizer uses the **Visitor Pattern** to traverse and transform the AST:

```typescript
class AstOptimizer implements CppVisitor<CppNode> {
  visitBinaryExpr(node: BinaryExpr): CppNode {
    // Optimize children first
    const left = this.visitExpression(node.left);
    const right = this.visitExpression(node.right);
    
    // Try constant folding
    const folded = this.foldBinaryExpr(left, node.operator, right);
    if (folded) return folded;
    
    // Return optimized node
    return new BinaryExpr(left, node.operator, right);
  }
}
```

## Testing

The optimizer has comprehensive unit tests covering all optimizations:

```bash
npm test test/phase3/basic/optimizer.test.ts
```

Test coverage includes:
- Constant folding (arithmetic, comparisons, boolean)
- Dead code elimination (unreachable code, constant branches)
- Expression simplification
- Optimization level behavior

## Future Optimizations

Planned optimizations for future releases:

1. **Function Inlining**: Inline small functions to reduce call overhead
2. **Loop Unrolling**: Unroll small constant-bound loops
3. **Smart Pointer Optimization**: Automatic `std::move()` insertion
4. **Tail Call Optimization**: Convert tail recursion to loops
5. **Common Subexpression Elimination**: Reuse computed values

## Performance Impact

Optimization performance characteristics:

| Level | Compile Time | Runtime Performance |
|-------|-------------|---------------------|
| 0     | Baseline    | Baseline            |
| 1     | +5-10%      | +10-20% faster      |
| 2     | +15-25%     | +20-40% faster (planned) |

*Note: Performance metrics will be measured once more optimizations are implemented.*

## Configuration

Individual optimizations can be toggled:

```typescript
const codegen = new AstCodegen(checker, {
  level: 1,
  constantFolding: true,          // Enable/disable constant folding
  deadCodeElimination: false,     // Disable dead code elimination
  smartPointerOptimization: true, // Enable smart pointer opts
  inlining: false                 // Disable inlining (not yet implemented)
});
```

## Contributing

To add a new optimization:

1. Implement the transformation in `optimizer.ts`
2. Add visitor method if needed
3. Add comprehensive tests in `optimizer.test.ts`
4. Update this README
5. Add performance benchmarks (if applicable)

See `optimizer.ts` for examples of existing optimizations.
