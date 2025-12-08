# GoodScript Language Specification

**Version:** 0.12.0  
**Status:** Draft

## Overview

GoodScript is a statically analyzable subset of TypeScript designed for efficient compilation to native code (C++) while maintaining full transpilability to JavaScript. It enforces "good parts" restrictions to ensure code is predictable, type-safe, and optimizable.

## Design Goals

1. **Static Analyzability**: All code paths and types must be determinable at compile time
2. **Native Compilation**: Generate efficient C++ code with proper memory management
3. **JavaScript Compatibility**: Transpile to clean, idiomatic JavaScript/TypeScript
4. **Type Safety**: Leverage TypeScript's type system with additional ownership semantics
5. **Developer Experience**: Maintain familiar TypeScript syntax and tooling

## Module System

GoodScript uses **ES modules** for code organization, following TypeScript/JavaScript conventions.

### Imports and Exports

```typescript
// math-gs.ts - Named exports
export function add(a: number, b: number): number {
  return a + b;
}

export const PI = 3.14159;

export class Calculator {
  compute(): number { return 0; }
}

// main-gs.ts - Import specific names
import { add, PI } from './math.js';

// Import with alias
import { Calculator as Calc } from './math.js';

// Import everything
import * as math from './math.js';

// Default export (one per module)
export default class App {
  run(): void { }
}

// Default import
import App from './app.js';

// Dynamic import (lazy loading)
// ✅ String literal only (GS127)
await import('./heavy-module.js');

// ❌ Dynamic path forbidden
const path = './module.js';
await import(path);  // Error GS127
```

### Module Resolution

- **Relative imports**: `./math.js`, `../utils/helper.js`
- **Package imports**: `@goodscript/stdlib/array`, `mylib`
- **File extensions**: Use `.js` in import paths (TypeScript convention)
- **Index files**: `./utils` resolves to `./utils/index-gs.ts`

### Cross-Module Types

Types flow across module boundaries:

```typescript
// types.gs
export interface Point {
  x: number;
  y: number;
}

// graphics.gs
import { Point } from './types.js';

export function distance(p1: Point, p2: Point): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}
```

### Ownership Across Modules

Ownership semantics work across module boundaries:

```typescript
// buffer.gs
export class Buffer {
  data: own<ArrayBuffer>;
  
  // Transfer ownership to caller
  take(): own<ArrayBuffer> {
    return this.data;  // Moves ownership out
  }
}

// main.gs
import { Buffer } from './buffer.js';

const buf = new Buffer();
const data: own<ArrayBuffer> = buf.take();  // ✅ Ownership transferred
```

**Rules**:
- `own<T>` can be transferred between modules (move semantics)
- `share<T>` can be shared freely across modules
- `use<T>` must not outlive the owner (validated within each module)

## Type System

### Primitive Types

GoodScript supports the following primitive types:

- `number` - IEEE 754 double-precision floating point (64-bit)
- `integer` - 32-bit signed integer
- `integer53` - 53-bit signed integer (JavaScript safe integer range: ±9,007,199,254,740,991)
- `string` - Immutable UTF-8 string
- `boolean` - true or false
- `void` - Absence of value
- `never` - Unreachable code marker

**Note**: For arbitrary precision integers beyond `integer53` range, use `BigInt` explicitly.

### Ownership System

GoodScript extends TypeScript with ownership annotations to enable safe memory management:

- **`own<T>`** - Unique ownership, exclusive access
- **`share<T>`** - Shared ownership, reference counted
- **`use<T>`** - Borrowed reference, non-owning pointer

```typescript
let owner: own<Buffer> = new Buffer();      // Owns the buffer
let shared: share<Config> = getConfig();    // Reference counted
let borrowed: use<Data> = owner.getData();  // Non-owning view
```

### Structural Typing

GoodScript uses structural typing (duck typing) rather than nominal typing. Two types with identical structure are compatible:

```typescript
interface Point { x: number; y: number; }
interface Vector2D { x: number; y: number; }

const p: Point = { x: 1, y: 2 };
const v: Vector2D = p;  // ✅ Compatible - same structure
```

Type signatures are canonicalized at compile time for efficient compatibility checking.

### Arrays and Collections

- `Array<T>` - Dynamic array with ownership semantics
- `Map<K, V>` - Hash map for dynamic key-value storage
- `Set<T>` - Unordered collection of unique values

```typescript
const numbers: own<Array<integer>> = [1, 2, 3];
const cache: own<Map<string, Data>> = new Map();
```

### Immutability

GoodScript supports TypeScript's `readonly` modifier for shallow immutability:

```typescript
class Config {
  readonly version: string = "1.0.0";  // Cannot reassign field
  readonly items: string[] = [];       // Cannot reassign array
}

const config = new Config();
config.version = "2.0.0";  // ❌ Error: Cannot assign to readonly property
config.items = [];         // ❌ Error: Cannot assign to readonly property
config.items.push("new");  // ✅ OK: Shallow immutability (array contents mutable)
```

**Deep Immutability**: For truly immutable collections, use TypeScript's readonly utility types:

- `ReadonlyArray<T>` - Immutable array (no push, pop, etc.)
- `ReadonlyMap<K, V>` - Immutable map (no set, delete, etc.)
- `ReadonlySet<T>` - Immutable set (no add, delete, etc.)
- `Readonly<T>` - Makes all properties of T readonly

```typescript
class DeepImmutable {
  readonly items: ReadonlyArray<string>;  // Deep immutability
  readonly config: Readonly<{ port: number }>;
}

const obj = new DeepImmutable();
obj.items.push("new");  // ❌ Error: Property 'push' does not exist on ReadonlyArray
```

**C++ Mapping**:
- `readonly field: T` → `const T field_` (shallow const)
- `ReadonlyArray<T>` → Custom immutable array wrapper (future)
- `ReadonlyMap<K,V>` → Custom immutable map wrapper (future)

## Language Restrictions ("Good Parts")

GoodScript enforces the following restrictions to maintain static analyzability and compilation safety:

### GS101: No `with` Statement

**Rationale**: The `with` statement creates dynamic scope that cannot be statically analyzed.

```typescript
// ❌ Forbidden
with (obj) {
  x = 1;
}

// ✅ Use explicit property access
obj.x = 1;
```

### GS102: No `eval` or `Function` Constructor

**Rationale**: Dynamic code execution prevents static analysis and poses security risks.

```typescript
// ❌ Forbidden
eval('x + y');
new Function('x', 'y', 'return x + y');

// ✅ Use regular functions
function add(x: number, y: number): number {
  return x + y;
}
```

### GS103: No `arguments` Object

**Rationale**: The `arguments` object is array-like but not a true array, causing confusion.

```typescript
// ❌ Forbidden
function sum() {
  return Array.from(arguments).reduce((a, b) => a + b);
}

// ✅ Use rest parameters
function sum(...numbers: number[]): number {
  return numbers.reduce((a, b) => a + b);
}
```

### GS104: No `for-in` Loops

**Rationale**: `for-in` iterates over prototype chain and is error-prone with arrays.

```typescript
// ❌ Forbidden
for (const key in obj) {
  console.log(obj[key]);
}

// ✅ Use for-of, Object.keys, or Object.entries
for (const [key, value] of Object.entries(obj)) {
  console.log(value);
}
```

### GS105: No `var` Keyword

**Rationale**: `var` has function scope and hoisting behavior that causes bugs.

```typescript
// ❌ Forbidden
var x = 1;

// ✅ Use const or let
const x = 1;
let y = 2;
```

### GS106/GS107: Only `===` and `!==` Equality

**Rationale**: `==` and `!=` perform type coercion, causing unexpected behavior.

```typescript
// ❌ Forbidden
if (x == y) { }
if (x != y) { }

// ✅ Use strict equality
if (x === y) { }
if (x !== y) { }
```

### GS108: No `this` in Function Declarations/Expressions

**Rationale**: `this` binding in functions is confusing and error-prone.

```typescript
// ❌ Forbidden
function getX() {
  return this.x;
}

// ✅ Use methods or arrow functions
class Point {
  getX(): number {
    return this.x;  // ✅ OK in methods
  }
}

const handler = {
  onClick: () => {
    // ✅ OK in arrow functions (lexical this)
  }
};
```

### GS109: No `any` Type

**Rationale**: `any` defeats static type checking.

```typescript
// ❌ Forbidden
let x: any = 42;

// ✅ Use specific types or generics
let x: number = 42;
function identity<T>(value: T): T { return value; }
```

### GS110: No Implicit Truthy/Falsy Coercion

**Rationale**: Implicit boolean conversion is a common source of bugs.

```typescript
// ❌ Forbidden
if (value) { }
if (!value) { }
const result = value || defaultValue;

// ✅ Use explicit boolean checks
if (value !== null && value !== undefined) { }
if (value === null || value === undefined) { }
const result = value ?? defaultValue;  // Nullish coalescing OK
```

**Exceptions**: Explicit boolean expressions are allowed:
```typescript
if (x > 0) { }              // ✅ Comparison
if (flag === true) { }      // ✅ Explicit
if (!!value) { }            // ✅ Explicit conversion
```

### GS111: No `delete` Operator

**Rationale**: Object structure must be static; use `Map` for dynamic data.

```typescript
// ❌ Forbidden
delete obj.property;

// ✅ Use Map for dynamic data
const map = new Map<string, Value>();
map.set('key', value);
map.delete('key');

// ✅ Or use optional fields with undefined
interface Config {
  debug?: boolean;
}
const config: Config = { debug: true };
config.debug = undefined;  // Clear the value
```

### GS112: No Comma Operator

**Rationale**: The comma operator can obscure intent and cause bugs.

```typescript
// ❌ Forbidden
let x = (1, 2, 3);  // x = 3

// ✅ Use separate statements
let a = 1;
let b = 2;
let x = 3;
```

### GS113: No Switch Fallthrough

**Rationale**: Fallthrough is a common source of bugs.

```typescript
// ❌ Forbidden
switch (x) {
  case 1:
    doA();
  case 2:  // Falls through!
    doB();
    break;
}

// ✅ Each case must break, return, or throw
switch (x) {
  case 1:
    doA();
    break;
  case 2:
    doB();
    break;
}
```

### GS115: No `void` Operator

**Rationale**: The `void` operator is obscure; use `undefined` directly.

```typescript
// ❌ Forbidden
const x = void 0;

// ✅ Use undefined directly
const x = undefined;
```

### GS116: No Primitive Wrapper Constructors with `new`

**Rationale**: Wrapper objects (`new String()`, etc.) create confusing object types.

```typescript
// ❌ Forbidden
const s = new String("hello");  // typeof s === "object"
const n = new Number(42);
const b = new Boolean(true);

// ✅ Use primitive values or type conversion
const s = "hello";              // typeof s === "string"
const n = 42;
const str = String(42);         // Type conversion: OK
const num = Number("42");       // Type conversion: OK
```

### GS126: No Prototype Manipulation

**Rationale**: Prototype manipulation breaks static analysis and class structure.

```typescript
// ❌ Forbidden
Array.prototype.myMethod = function() { };
obj.__proto__ = other;

// ✅ Use classes with static structure
class MyArray extends Array<number> {
  myMethod(): void { }
}
```

## Best Practices

### Use `const` by Default

Prefer immutability:
```typescript
const x = 42;           // ✅ Immutable
let y = 0;              // ✅ Only when mutation needed
```

### Explicit Types for Public APIs

```typescript
// ✅ Explicit parameter and return types
export function calculate(input: number): Result {
  const temp = process(input);  // ✅ Type inference OK for locals
  return { value: temp };
}
```

### Prefer `Map` for Dynamic Data

```typescript
// ✅ Use Map for dynamic key-value storage
const cache = new Map<string, Data>();
cache.set(key, value);
cache.delete(key);

// ✅ Use objects for static structure
interface Point { x: number; y: number; }
const p: Point = { x: 1, y: 2 };
```

### Explicit Boolean Checks

```typescript
// ✅ Be explicit about what you're checking
if (value !== null && value !== undefined) { }
if (array.length > 0) { }
if (count === 0) { }
```

### Use Nullish Coalescing

```typescript
// ✅ Prefer ?? over || for default values
const x = value ?? defaultValue;

// ✅ Use optional chaining
const name = user?.profile?.name;
```

## Future Considerations

The following features are under consideration for future versions:

- **Integer arithmetic operations**: Explicit `imul()`, `idiv()` for integer math
- **Operator overloading**: Custom operators for value types
- **Pattern matching**: More expressive switch/case alternatives
- **Effect system**: Track side effects and purity at type level

## Migration from TypeScript

Most TypeScript code requires minimal changes:

1. Replace `var` with `const`/`let`
2. Replace `==`/`!=` with `===`/`!==`
3. Replace `for-in` with `for-of` or `Object.entries()`
4. Add explicit boolean checks instead of truthy/falsy
5. Use `Map` for dynamic object properties
6. Remove `any` types with proper type annotations

## Tooling

- **Compiler**: `gsc` - Compile to C++ or transpile to JavaScript
- **Type Checker**: Built on TypeScript compiler API
- **LSP Support**: Full IDE integration through TypeScript language server
- **Testing**: Standard TypeScript/JavaScript testing frameworks

---

**Last Updated**: December 8, 2025
