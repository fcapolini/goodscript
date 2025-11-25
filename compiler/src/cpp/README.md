# C++ AST-Based Code Generation

## Overview

The C++ code generation has been refactored to use an AST (Abstract Syntax Tree) based approach instead of direct string generation. This provides better:

- **Type Safety**: Catch errors at compile time rather than runtime
- **Composability**: Build complex structures from simple, reusable parts
- **Testability**: Validate AST structure before rendering to strings
- **Transformation**: Optimize or analyze code before rendering
- **Separation of Concerns**: Construction logic is separate from formatting

## Architecture

The C++ code generation is organized into three layers:

```
src/cpp/
├── ast.ts       - AST node type definitions
├── builder.ts   - Fluent API for constructing AST
├── renderer.ts  - Converts AST to formatted C++ source
└── index.ts     - Public API exports
```

### Layer 1: AST Nodes (`ast.ts`)

Defines the structure of C++ code as TypeScript classes:

- **Types**: `CppType` for representing C++ types
- **Declarations**: `Class`, `Function`, `Method`, `Field`, etc.
- **Statements**: `VariableDecl`, `IfStmt`, `WhileStmt`, `ReturnStmt`, etc.
- **Expressions**: `BinaryExpr`, `CallExpr`, `MemberExpr`, `Literal`, etc.

All nodes extend `CppNode` and implement the Visitor pattern for traversal.

### Layer 2: Builder (`builder.ts`)

Provides a fluent API for constructing AST nodes:

```typescript
import { cpp } from './cpp';

// Create types
const intType = cpp.int();
const vecType = cpp.vector(cpp.string());
const ptrType = cpp.sharedPtr(cpp.type('MyClass'));

// Create expressions
const sum = cpp.binary(cpp.id('a'), '+', cpp.id('b'));
const call = cpp.call(cpp.id('func'), [cpp.numberLit(42)]);

// Create statements
const varDecl = cpp.varDecl('x', cpp.int(), cpp.numberLit(0));
const ret = cpp.return_(cpp.id('result'));
```

### Layer 3: Renderer (`renderer.ts`)

Converts AST to formatted C++ source code:

```typescript
import { cpp, render } from './cpp';

const ast = cpp.function(
  'add',
  cpp.int(),
  [cpp.param('a', cpp.int()), cpp.param('b', cpp.int())],
  cpp.block(
    cpp.return_(cpp.binary(cpp.id('a'), '+', cpp.id('b')))
  )
);

const code = render(ast);
// Output:
// int add(int a, int b) {
//   return a + b;
// }
```

## Usage Examples

### Creating a Simple Function

```typescript
const func = cpp.function(
  'factorial',
  cpp.int(),
  [cpp.param('n', cpp.int())],
  cpp.block(
    cpp.if_(
      cpp.binary(cpp.id('n'), '<=', cpp.numberLit(1)),
      cpp.return_(cpp.numberLit(1))
    ),
    cpp.return_(
      cpp.binary(
        cpp.id('n'),
        '*',
        cpp.call(cpp.id('factorial'), [
          cpp.binary(cpp.id('n'), '-', cpp.numberLit(1))
        ])
      )
    )
  )
);

console.log(render(func));
```

Output:
```cpp
int factorial(int n) {
  if (n <= 1.0) {
    return 1.0;
  }
  return n * factorial(n - 1.0);
}
```

### Creating a Class

```typescript
const cls = cpp.class_('Point', {
  fields: [
    cpp.field('x', cpp.double()),
    cpp.field('y', cpp.double())
  ],
  constructors: [
    cpp.constructor_(
      [cpp.param('x', cpp.double()), cpp.param('y', cpp.double())],
      [
        cpp.memberInit('x', cpp.id('x')),
        cpp.memberInit('y', cpp.id('y'))
      ],
      cpp.block()
    )
  ],
  methods: [
    cpp.method(
      'distance',
      cpp.double(),
      [],
      cpp.block(
        cpp.return_(
          cpp.call(cpp.id('std::sqrt'), [
            cpp.binary(
              cpp.binary(
                cpp.member(cpp.id('this'), 'x'),
                '*',
                cpp.member(cpp.id('this'), 'x')
              ),
              '+',
              cpp.binary(
                cpp.member(cpp.id('this'), 'y'),
                '*',
                cpp.member(cpp.id('this'), 'y')
              )
            )
          ])
        )
      ),
      { isConst: true }
    )
  ]
});

console.log(render(cls));
```

### Creating Smart Pointers

```typescript
// std::make_unique<int>(42)
const unique = cpp.makeUnique(cpp.int(), cpp.numberLit(42));

// gs::make_shared<std::string>("hello")
const shared = cpp.makeShared(cpp.string(), cpp.stringLit('hello'));

// std::move(ptr)
const moved = cpp.move(cpp.id('ptr'));
```

### Building Complete Translation Units

```typescript
const tu = cpp.translationUnit(
  // Includes
  [
    cpp.include('gs_runtime.hpp'),
    cpp.include('iostream')
  ],
  // Declarations
  [
    cpp.namespace('gs', [
      cpp.class_('Example', { /* ... */ }),
      cpp.function('helper', /* ... */)
    ])
  ],
  // Main function (optional, outside namespace)
  cpp.function(
    'main',
    cpp.int(),
    [],
    cpp.block(
      cpp.varDecl('ex', cpp.type('gs::Example')),
      cpp.return_(cpp.numberLit(0))
    )
  )
);

const code = render(tu);
```

## Migration Guide

### Before (String-based)

```typescript
private generateFunction(node: ts.FunctionDeclaration): void {
  const name = node.name?.getText() || '';
  const returnType = this.generateType(node.type);
  
  this.emit(`${returnType} ${name}(`);
  // ... complex string manipulation
  this.emit(') {');
  this.indent();
  // ... more string generation
  this.dedent();
  this.emit('}');
}
```

### After (AST-based)

```typescript
private generateFunction(node: ts.FunctionDeclaration): AST.Function {
  const name = node.name?.getText() || '';
  const returnType = this.mapType(node.type);
  const params = node.parameters.map(p => this.generateParameter(p));
  const body = this.generateBlock(node.body);
  
  return cpp.function(name, returnType, params, body);
}
```

## Benefits

### 1. Type Safety

The compiler catches errors before rendering:

```typescript
// ❌ This won't compile - type mismatch
const bad = cpp.varDecl('x', cpp.int(), cpp.stringLit('hello'));

// ✅ This is validated at compile time
const good = cpp.varDecl('x', cpp.int(), cpp.numberLit(42));
```

### 2. Composability

Build complex structures from simple parts:

```typescript
// Helper function to create getter methods
function createGetter(fieldName: string, fieldType: CppType): Method {
  return cpp.method(
    `get${capitalize(fieldName)}`,
    fieldType,
    [],
    cpp.block(
      cpp.return_(cpp.member(cpp.id('this'), fieldName))
    ),
    { isConst: true }
  );
}

// Reuse across multiple classes
const getters = fields.map(f => createGetter(f.name, f.type));
```

### 3. Transformation

Optimize or analyze before rendering:

```typescript
class Optimizer implements CppVisitor<CppNode> {
  visitBinaryExpr(node: BinaryExpr): CppNode {
    // Constant folding
    if (node.left instanceof Literal && node.right instanceof Literal) {
      if (node.operator === '+' && typeof node.left.value === 'number') {
        return cpp.numberLit(node.left.value + (node.right.value as number));
      }
    }
    return node;
  }
  // ... more optimizations
}
```

### 4. Testing

Validate AST structure without string comparisons:

```typescript
it('should generate correct function signature', () => {
  const func = generateFunction(tsNode);
  
  expect(func).toBeInstanceOf(Function);
  expect(func.name).toBe('myFunc');
  expect(func.returnType.name).toBe('int');
  expect(func.params).toHaveLength(2);
});
```

## Best Practices

1. **Use the builder**: Always use `cpp.*` methods rather than constructing AST nodes directly
2. **Separate concerns**: Build AST in one phase, render in another
3. **Test AST structure**: Validate AST correctness before rendering
4. **Create helpers**: Build reusable AST construction helpers for common patterns
5. **Avoid premature optimization**: Build correct AST first, optimize later if needed

## Future Enhancements

Potential improvements to the AST system:

1. **AST Validation**: Add validation pass to catch semantic errors
2. **Source Maps**: Track mapping between TypeScript and C++ AST nodes
3. **Pretty Printing**: Add formatting options (brace style, line width, etc.)
4. **Documentation Generation**: Extract comments and generate Doxygen
5. **Optimization Passes**: Constant folding, dead code elimination, etc.

## See Also

- `test/cpp-ast.test.ts` - Unit tests demonstrating usage
- `src/cpp-codegen.ts` - Current implementation (to be migrated)
- `docs/PHASE-3-CPP.md` - C++ code generation documentation
