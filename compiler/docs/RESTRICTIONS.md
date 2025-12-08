# GoodScript Language Restrictions

This document details all language restrictions enforced by the GoodScript compiler to ensure static analyzability and safe compilation to native code.

## Summary of Restrictions

| Code | Restriction | Rationale |
|------|-------------|-----------|
| GS101 | No `with` statement | Dynamic scope prevents static analysis |
| GS102 | No `eval` or `Function` constructor | Dynamic code execution |
| GS103 | No `arguments` object | Use rest parameters instead |
| GS104 | No `for-in` loops | Use `for-of` or `Object.entries()` |
| GS105 | No `var` keyword | Use `const` or `let` for block scoping |
| GS106 | No `==` operator | Use `===` for strict equality |
| GS107 | No `!=` operator | Use `!==` for strict inequality |
| GS108 | No `this` in function declarations | Use methods or arrow functions |
| GS109 | No `any` type | Use specific types or generics |
| GS110 | No implicit truthy/falsy | Explicit boolean checks required |
| GS111 | No `delete` operator | Use `Map` for dynamic data |
| GS112 | No comma operator | Use separate statements |
| GS113 | No switch fallthrough | Each case must break/return/throw |
| GS115 | No `void` operator | Use `undefined` directly |
| GS116 | No `new` with primitive constructors | Wrapper objects forbidden |
| GS126 | No prototype manipulation | Use classes with static structure |
| GS127 | No dynamic import paths | Only string literal paths allowed |

## Detailed Restrictions

### GS101: No `with` Statement

**Error Message**: `"with" statement is forbidden - use explicit property access`

**Forbidden**:
```typescript
with (obj) {
  x = 1;
}
```

**Allowed**:
```typescript
obj.x = 1;
```

**Why**: The `with` statement creates a dynamic scope that cannot be statically analyzed. It's also deprecated in strict mode and considered harmful.

---

### GS102: No `eval` or `Function` Constructor

**Error Messages**:
- `eval() is forbidden - use functions, objects, or proper parsing`
- `Function() constructor is forbidden - use regular function declarations`

**Forbidden**:
```typescript
eval('x + y');
const fn = new Function('x', 'y', 'return x + y');
```

**Allowed**:
```typescript
function add(x: number, y: number): number {
  return x + y;
}
```

**Why**: Dynamic code execution prevents static analysis, poses security risks, and breaks compilation to native code.

---

### GS103: No `arguments` Object

**Error Message**: `"arguments" object is forbidden - use rest parameters (...args)`

**Forbidden**:
```typescript
function sum() {
  return Array.from(arguments).reduce((a, b) => a + b);
}
```

**Allowed**:
```typescript
function sum(...numbers: number[]): number {
  return numbers.reduce((a, b) => a + b);
}
```

**Why**: The `arguments` object is array-like but not a true array. Rest parameters are clearer and more type-safe.

---

### GS104: No `for-in` Loops

**Error Message**: `"for-in" loops are forbidden - use for-of, Object.keys(), or Object.entries()`

**Forbidden**:
```typescript
for (const key in obj) {
  console.log(obj[key]);
}
```

**Allowed**:
```typescript
// For arrays
for (const item of array) {
  console.log(item);
}

// For object properties
for (const key of Object.keys(obj)) {
  console.log(obj[key]);
}

// For key-value pairs
for (const [key, value] of Object.entries(obj)) {
  console.log(key, value);
}
```

**Why**: `for-in` iterates over the prototype chain and is error-prone with arrays. Modern alternatives are clearer and safer.

---

### GS105: No `var` Keyword

**Error Message**: `"var" keyword is forbidden - use "const" or "let"`

**Forbidden**:
```typescript
var x = 1;
```

**Allowed**:
```typescript
const x = 1;    // Immutable
let y = 2;      // Mutable
```

**Why**: `var` has function scope and hoisting behavior that causes bugs. `const` and `let` provide block scoping.

---

### GS106/GS107: Only `===` and `!==` Equality

**Error Messages**:
- `"==" operator is forbidden - use "==="`
- `"!=" operator is forbidden - use "!=="`

**Forbidden**:
```typescript
if (x == y) { }
if (x != y) { }
```

**Allowed**:
```typescript
if (x === y) { }
if (x !== y) { }
```

**Why**: `==` and `!=` perform type coercion, causing unexpected behavior (`0 == ""`, `null == undefined`, etc.).

---

### GS108: No `this` in Function Declarations/Expressions

**Error Message**: `"this" in function declarations is forbidden - use methods or arrow functions`

**Forbidden**:
```typescript
function getX() {
  return this.x;  // ❌
}

const handler = {
  onClick: function() {
    return this.x;  // ❌
  }
};
```

**Allowed**:
```typescript
// ✅ In class methods
class Point {
  x: number;
  getX(): number {
    return this.x;
  }
}

// ✅ In arrow functions (lexical this)
const handler = {
  onClick: () => {
    return this.x;  // Captures enclosing this
  }
};
```

**Why**: `this` binding in regular functions is confusing and depends on call context. Methods and arrow functions provide predictable behavior.

---

### GS109: No `any` Type

**Error Message**: `"any" type is forbidden - use specific types or generics`

**Forbidden**:
```typescript
let x: any = 42;
function process(data: any): any { }
```

**Allowed**:
```typescript
let x: number = 42;
function process<T>(data: T): T { }
function handle(data: unknown): void {
  if (typeof data === 'string') {
    // Type narrowing
  }
}
```

**Why**: `any` defeats the entire purpose of static type checking.

---

### GS110: No Implicit Truthy/Falsy Coercion

**Error Message**: `Implicit truthy/falsy check is forbidden - use explicit boolean expressions`

**Forbidden**:
```typescript
if (value) { }
if (!value) { }
const result = value || defaultValue;
while (count) { }
```

**Allowed**:
```typescript
// Explicit null/undefined checks
if (value !== null && value !== undefined) { }
if (value === null || value === undefined) { }

// Nullish coalescing
const result = value ?? defaultValue;

// Explicit comparisons
if (count > 0) { }
if (str.length > 0) { }
if (flag === true) { }

// Boolean conversions
if (x > 0) { }              // Comparison
if (!!value) { }            // Explicit conversion
if (Boolean(value)) { }     // Explicit conversion
```

**Why**: Implicit boolean conversion leads to bugs (`0`, `""`, `NaN` are falsy but may be valid values). Be explicit about what you're checking.

---

### GS111: No `delete` Operator

**Error Message**: `"delete" operator is forbidden - use Map for dynamic data or set to undefined`

**Forbidden**:
```typescript
delete obj.property;
```

**Allowed**:
```typescript
// For dynamic data, use Map
const map = new Map<string, Value>();
map.set('key', value);
map.delete('key');

// For optional fields, use undefined
interface Config {
  debug?: boolean;
}
const config: Config = { debug: true };
config.debug = undefined;

// For creating new object without property
const { unwanted, ...rest } = obj;
```

**Why**: Object structure must be statically known. Use `Map` for truly dynamic data.

---

### GS112: No Comma Operator

**Error Message**: `Comma operator is forbidden - use separate statements or array literals`

**Forbidden**:
```typescript
let x = (1, 2, 3);      // x = 3
for (i = 0, j = 10; i < j; i++, j--) { }
```

**Allowed**:
```typescript
let x = 3;
for (let i = 0; i < 10; i++) { }

// For multiple values, use array/tuple
const values = [1, 2, 3];
```

**Why**: The comma operator can obscure intent and makes code harder to understand.

---

### GS113: No Switch Fallthrough

**Error Message**: `Switch case must end with break, return, or throw - fallthrough is forbidden`

**Forbidden**:
```typescript
switch (x) {
  case 1:
    doA();
  case 2:  // Falls through!
    doB();
    break;
}
```

**Allowed**:
```typescript
switch (x) {
  case 1:
    doA();
    break;
  case 2:
    doB();
    break;
  default:
    doC();
}

// Empty cases can fall through
switch (x) {
  case 1:
  case 2:
    doBoth();
    break;
}
```

**Why**: Fallthrough is a common source of bugs. Make it explicit when intentional (empty case).

---

### GS115: No `void` Operator

**Error Message**: `"void" operator is forbidden - use undefined directly`

**Forbidden**:
```typescript
const x = void 0;
void doSomething();
```

**Allowed**:
```typescript
const x = undefined;
doSomething();
```

**Why**: The `void` operator is obscure and unnecessary. Use `undefined` directly.

---

### GS116: No `new` with Primitive Constructors

**Error Message**: `new String() creates wrapper objects - use String() for type conversion instead`

**Forbidden**:
```typescript
const s = new String("hello");  // typeof s === "object"
const n = new Number(42);
const b = new Boolean(true);
```

**Allowed**:
```typescript
// Primitive values
const s = "hello";              // typeof s === "string"
const n = 42;

// Type conversion (without 'new')
const str = String(42);         // ✅ "42"
const num = Number("42");       // ✅ 42
const bool = Boolean(1);        // ✅ true
```

**Why**: Wrapper objects created with `new` are confusing (`typeof new String("x") === "object"`) and should never be used. Type conversion functions without `new` are perfectly fine.

---

### GS126: No Prototype Manipulation

**Error Message**: `Prototype manipulation is not supported - use classes with static structure`

**Forbidden**:
```typescript
Array.prototype.myMethod = function() { };
Object.prototype.toString = function() { };
obj.__proto__ = other;
obj.prototype = something;
```

**Allowed**:
```typescript
// Extend with classes
class MyArray extends Array<number> {
  myMethod(): void { }
}

// Composition
class MyClass {
  private base: BaseClass;
  
  method(): void {
    this.base.method();
  }
}
```

**Why**: Prototype manipulation breaks static analysis and prevents safe compilation. Use classes with static structure.

---

### GS127: No Dynamic Import Paths

**Error Message**: `Dynamic import requires a string literal path - computed paths are forbidden`

**Forbidden**:
```typescript
// Variable path
const path = './utils.js';
await import(path);

// Computed path
await import('./utils' + '.js');

// Runtime-determined path
await import(getUserChoice());
```

**Allowed**:
```typescript
// String literal (lazy loading, but statically analyzable)
const mod = await import('./utils.js');

// Static conditional
import * as utilsA from './utils-a.js';
import * as utilsB from './utils-b.js';
const utils = condition ? utilsA : utilsB;
```

**Why**: Dynamic import paths break static analysis - the compiler cannot determine:
- What modules are needed
- What types are imported
- What functions/classes exist

For C++ compilation, all dependencies must be known at compile time. String literal paths allow lazy loading in JavaScript while keeping the dependency graph static.

**Note**: This enables lazy loading optimization in JavaScript while maintaining static analyzability for C++ compilation.

---

## Error Code Reference

All GoodScript restrictions produce errors with codes `GS101` through `GS127`. These codes help identify and fix issues quickly.

**Example error**:
```
Error GS106: "==" operator is forbidden - use "==="
  at example.gs:5:7
```

## Migration Guide

Common patterns and their GoodScript equivalents:

```typescript
// TypeScript           →  GoodScript
var x = 1;             →  const x = 1;
x == y                 →  x === y
if (value)             →  if (value !== null && value !== undefined)
value || default       →  value ?? default
for (k in obj)         →  for (const [k, v] of Object.entries(obj))
delete obj.key         →  map.delete(key) or obj.key = undefined
function() { this }    →  method() or arrow function
let x: any             →  let x: unknown or specific type
await import(path)     →  await import('./module.js') with literal
```

---

**Last Updated**: December 8, 2025
