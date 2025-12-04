# GoodScript: The Good Parts

**Phase 1: TypeScript Language Restrictions and Rationale**

GoodScript removes JavaScript/TypeScript's "bad parts" - features that lead to bugs, confusion, or unpredictable behavior. This document explains each restriction and why it exists.

> The name "GoodScript" is inspired by Douglas Crockford's "JavaScript: The Good Parts", which advocated using only the reliable, well-designed subset of JavaScript.

---

## Overview

Phase 1 of GoodScript focuses on **strict static typing** and **predictable behavior**. All restrictions are enforced at compile time through the GoodScript validator.

**Philosophy:** If a feature can surprise experienced developers or behave differently than they expect, it's eliminated. Explicitness and predictability over convenience.

---

## Restrictions

### 1. No `var` Keyword (GS105)

**Restriction:** Must use `let` or `const` instead of `var`.

**Rationale:**
- `var` has function scope, not block scope, leading to surprising behavior
- `var` declarations are hoisted, making code order-dependent
- `let` and `const` have intuitive block scope
- `const` provides immutability guarantees at compile time

**Example:**
```typescript
// ❌ Not allowed
var x = 42;

// ✅ Correct
const x = 42;
let y = 10;
```

**Why this matters:** Function-scoped variables are a common source of bugs. Block scope matches developer intuition and makes code more maintainable.

---

### 2. Strict Equality Only (GS106, GS107)

**Restriction:** Must use `===` and `!==` instead of `==` and `!=`.

**Rationale:**
- `==` performs implicit type coercion with complex, unintuitive rules
- `===` checks both type and value, matching developer expectations
- Type coercion is a major source of bugs in JavaScript
- Explicit is better than implicit

**Example:**
```typescript
// ❌ Not allowed
if (x == 42) { }
if (x != null) { }

// ✅ Correct
if (x === 42) { }
if (x !== null) { }
```

**JavaScript quirks eliminated:**
```javascript
// These are all true in JavaScript with ==
0 == false
'' == false
null == undefined
'0' == 0
'\t\r\n' == 0
```

**Note:** GoodScript treats `null` and `undefined` as synonyms, so checking for either is sufficient. But you must use strict equality operators.

---

### 3. Ternary Type Consistency (GS117)

**Restriction:** Both branches of a ternary expression must have compatible types (same base type, ignoring null/undefined).

**Rationale:**
- Prevents type system exploitation where ternary expressions mix incompatible types
- Ensures type safety when transpiling to statically-typed languages like C++
- Forces explicit type conversion, making code intent clear
- Prevents subtle bugs from implicit type assumptions

**Example:**
```typescript
// ❌ Not allowed - mixing string and number
const result = condition ? 'null' : 42;
const message = value === null ? 'null' : value;  // if value is number | null

// ✅ Correct - use compatible types
const result = condition ? 'null' : '42';  // both strings
const message = value === null ? null : value;  // both number | null
const message2 = value === null ? 'null' : String(value);  // both strings
```

**Why this matters:** In dynamically-typed JavaScript, mixing types in ternaries works because of implicit coercion. But in statically-typed compilation targets, this creates ambiguity and potential runtime errors. Requiring compatible types ensures code behaves consistently across TypeScript and native execution.

---

### 4. Function Return Type Consistency (GS118)

**Restriction:** All return statements in a function must return compatible types (same base type, ignoring null/undefined).

**Rationale:**
- Prevents functions from returning incompatible types across different code paths
- Ensures type safety when transpiling to statically-typed languages like C++
- Forces explicit return type declarations, making function contracts clear
- Prevents subtle bugs from implicit type assumptions in different branches

**Example:**
```typescript
// ❌ Not allowed - mixing string and number returns
const getValue = (condition: boolean): string | number => {
  if (condition) {
    return "success";  // string
  } else {
    return 42;         // number
  }
};

// ✅ Correct - consistent return types
const getValue = (condition: boolean): string => {
  if (condition) {
    return "success";
  } else {
    return "42";  // converted to string
  }
};

// ✅ Correct - nullable return type is allowed
const findValue = (arr: number[], target: number): number | null => {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === target) {
      return arr[i];  // number
    }
  }
  return null;  // null is compatible with number | null
};
```

**Why this matters:** TypeScript allows union return types like `string | number`, but C++ requires a single concrete return type. This restriction forces developers to choose a consistent return type, making functions easier to understand and ensuring seamless native compilation.

---

### 5. Nullish Coalescing Type Consistency (GS119)

**Rule**: Both operands of the nullish coalescing operator (`??`) must have compatible types.

**Rationale**: The `??` operator provides default values for `null`/`undefined`. Unlike JavaScript's type coercion, C++ requires both sides to have compatible types. This prevents mixing primitives (e.g., `number ?? string`) which would require complex type coercion at runtime.

**Examples**:

```typescript
// ❌ Rejected - mixing number and string
function getDefault(value: number | null): number | string {
  return value ?? "default";  // Error: number and string are incompatible
}

// ✅ Accepted - both sides are number
function getDefault(value: number | null): number {
  return value ?? 0;
}

// ✅ Accepted - both sides are string
function getName(name: string | null): string {
  return name ?? "Anonymous";
}

// ✅ Accepted - with optional chaining
interface User {
  name?: string;
}

function getUserName(user: User | null): string {
  return user?.name ?? "Anonymous";  // Both sides resolve to string | undefined
}

// ✅ Accepted - same object type
class Config {
  value: number = 0;
}

function getConfig(cfg: Config | null, fallback: Config): Config {
  return cfg ?? fallback;
}

// ✅ Accepted - discriminated unions (different object types in union)
type Result<T> = { success: true; value: T } | { success: false; error: string };

function getResult(result: Result<number> | null, fallback: Result<number>): Result<number> {
  return result ?? fallback;
}
```

**Implementation notes**: 
- The validator uses declared types (from type annotations) rather than flow-sensitive narrowed types
- String, number, and boolean literals are normalized to their base types (`'hello'` → `string`, `42` → `number`, `false` → `boolean`)
- Discriminated unions with different object types are allowed (same as ternary and function return validation)

---

### 10. No Type Coercion (GS201)

**Restriction:** Cannot mix string and number types in operations.

**Rationale:**
- `+` operator behavior changes based on operand types (addition vs concatenation)
- Implicit conversion of numbers to strings (and vice versa) hides programmer intent
- Forces developers to be explicit about conversions
- Prevents subtle bugs from unexpected type conversion

**Example:**
```typescript
// ❌ Not allowed
const result = "sum: " + 1 + 2;  // "sum: 12" - probably not what you wanted

// ✅ Correct - explicit conversion
const result1 = `sum: ${1 + 2}`;  // "sum: 3"
const result2 = "sum: " + (1 + 2).toString();  // "sum: 3"
```

---

### 6. No Function Declarations/Expressions (GS108)

**Restriction:** Must use arrow functions instead of `function` keyword (except for class methods).

**Rationale:**
- Arrow functions have lexical `this` binding - predictable and intuitive
- Function declarations/expressions have dynamic `this` - changes based on call site
- Dynamic `this` is one of JavaScript's most confusing features
- Arrow functions cannot be used as constructors, preventing another class of errors
- Consistent syntax throughout codebase

**Example:**
```typescript
// ❌ Not allowed
function greet(name: string) {
  console.log(this.prefix + name);  // What is 'this'? Depends on how it's called!
}

// ✅ Correct
const greet = (name: string): void => {
  console.log(name);  // No 'this' confusion
};

// ✅ Class methods are allowed (they have well-defined 'this')
class Greeter {
  prefix: string = "Hello, ";
  
  greet(name: string): void {
    console.log(this.prefix + name);  // 'this' is always the class instance
  }
}
```

**Why this matters:** The `this` keyword in JavaScript is notoriously confusing. Its value changes based on:
- How the function is called (`obj.fn()` vs `fn()`)
- Whether `.bind()`, `.call()`, or `.apply()` was used
- Whether it's called as a constructor with `new`
- Whether it's in strict mode

Arrow functions eliminate all this confusion.

---

### 7. No `arguments` Object (GS103)

**Restriction:** Cannot use the `arguments` pseudo-array. Must use rest parameters.

**Rationale:**
- `arguments` is not a real array - missing array methods
- `arguments` doesn't work with arrow functions
- Rest parameters are more explicit and type-safe
- Rest parameters work with all modern array operations

**Example:**
```typescript
// ❌ Not allowed
function sum() {
  let total = 0;
  for (let i = 0; i < arguments.length; i++) {
    total += arguments[i];
  }
  return total;
}

// ✅ Correct
const sum = (...numbers: number[]): number => {
  return numbers.reduce((a, b) => a + b, 0);
};
```

---

### 8. No `for-in` Loops (GS104)

**Restriction:** Use `for-of` or explicit iteration instead of `for-in`.

**Rationale:**
- `for-in` iterates over object properties, including inherited ones
- Order of iteration is not guaranteed in `for-in`
- Often used incorrectly with arrays
- `for-of` iterates over values, which is usually what you want
- More explicit alternatives exist for object property iteration

**Example:**
```typescript
// ❌ Not allowed
for (const key in obj) {
  console.log(obj[key]);
}

// ✅ Correct - for arrays
const arr = [1, 2, 3];
for (const item of arr) {
  console.log(item);
}

// ✅ Correct - for object keys
const obj = { a: 1, b: 2 };
for (const key of Object.keys(obj)) {
  console.log(obj[key]);
}

// ✅ Correct - for object entries
for (const [key, value] of Object.entries(obj)) {
  console.log(key, value);
}
```

---

### 8. No `with` Statement (GS101)

**Restriction:** The `with` statement is prohibited.

**Rationale:**
- Makes code impossible to understand - scope is determined at runtime
- Severe performance penalties in JavaScript engines
- Deprecated in strict mode JavaScript
- Makes code optimization impossible
- No legitimate use cases in modern JavaScript

**Example:**
```typescript
// ❌ Not allowed
with (obj) {
  console.log(property);  // Which property? obj's or a global?
}

// ✅ Correct
console.log(obj.property);  // Explicit and clear
```

**Historical note:** The `with` statement was intended to reduce typing but created more problems than it solved. It's been deprecated for over a decade.

---

### 10. No `eval` or `Function` Constructor (GS102)

**Restriction:** The `eval` function and `Function` constructor are forbidden.

**Rationale:**
- Execute arbitrary code at runtime - security risk
- Prevent compiler optimizations
- Make static analysis impossible
- Can modify local scope in unpredictable ways
- Violate the principle of knowing all code at compile time
- `Function` constructor is essentially `eval` in disguise

**Example:**
```typescript
// ❌ Not allowed
const code = "x + y";
const result = eval(code);

// ❌ Also not allowed
const fn = new Function('x', 'y', 'return x + y');
const result2 = fn(1, 2);

// ✅ Correct - use proper function calls or data structures
const operations = {
  add: (x: number, y: number) => x + y,
  multiply: (x: number, y: number) => x * y,
};
const result = operations.add(x, y);
```

---

### 11. No `any` Type (GS109)

**Restriction:** The `any` type is forbidden. Must use explicit types or generics.

**Rationale:**
- `any` defeats the entire purpose of static typing
- Disables all type checking for that value
- Hides bugs that TypeScript would otherwise catch
- Makes code unpredictable - value could be anything at runtime
- Prevents IDE autocomplete and refactoring tools
- Cannot transpile to native without knowing actual types
- `unknown` type is a safer alternative when type is truly unknown

**Example:**
```typescript
// ❌ Not allowed
const data: any = fetchData();
const process = (input: any): any => {
  return input.someMethod();  // No type checking!
};

// ✅ Correct - use explicit types
interface Data {
  id: number;
  name: string;
}
const data: Data = fetchData();

// ✅ Correct - use generics for flexibility
const identity = <T>(x: T): T => x;

// ✅ Correct - use unknown for truly unknown types
const data: unknown = fetchData();
if (typeof data === 'object' && data !== null) {
  // Type narrowing required
}
```

**Why this matters:** If you don't know the type, the compiler can't help you. Using `any` is like turning off TypeScript's safety features. It's the biggest escape hatch in TypeScript and has no place in enterprise code.

---

### 12. No Implicit Truthy/Falsy Checks (GS110)

**Restriction:** All conditions must be explicit boolean expressions. No relying on truthy/falsy coercion.

**Rationale:**
- JavaScript's truthy/falsy rules are confusing and error-prone
- `0`, `""`, `false`, `null`, `undefined`, `NaN` are all falsy
- Easy to confuse "no value" with "value is zero" or "value is empty string"
- Explicit comparisons make intent clear
- Prevents bugs from unexpected falsy values
- Aligns with "no implicit coercion" philosophy

**Example:**
```typescript
// ❌ Not allowed
const count = 0;
if (count) {  // 0 is falsy!
  console.log('has items');
}

const name = '';
if (!name) {  // Empty string is falsy
  console.log('no name');
}

// ✅ Correct - explicit null check
const user: User | null = getUser();
if (user !== null) {
  console.log(user.name);
}

// ✅ Correct - explicit comparison
if (count > 0) {
  console.log('has items');
}

// ✅ Correct - explicit length check
const items: number[] = [];
if (items.length > 0) {
  console.log('not empty');
}

// ✅ Correct - explicit string check
if (name !== '') {
  console.log(name);
}
```

**JavaScript falsy values eliminated:**
```javascript
// All of these are falsy in JavaScript:
if (0) { }          // false
if ('') { }         // false  
if (null) { }       // false
if (undefined) { } // false
if (NaN) { }        // false
if (false) { }      // false (only legitimate one)
```

**Why this matters:** A common bug is `if (value)` when `value` could legitimately be `0` or `""`. Explicit checks eliminate this entire class of errors.

---

### 13. No `delete` Operator (GS111)

**Restriction:** The `delete` operator is prohibited.

**Rationale:**
- Changes object shape at runtime, violating type contracts
- Defeats V8's hidden class optimization - severe performance penalty
- Property exists in TypeScript type but might not exist at runtime
- Makes objects unpredictable and hard to reason about
- Modern alternatives (destructuring, new objects) are clearer

**Example:**
```typescript
// ❌ Not allowed
const obj = { a: 1, b: 2, c: 3 };
delete obj.b;  // Runtime shape change!

// ✅ Correct - use optional properties
interface Config {
  a: number;
  b?: number;  // Optional
  c: number;
}

// ✅ Correct - create new object without property
const obj = { a: 1, b: 2, c: 3 };
const { b, ...newObj } = obj;  // newObj is { a: 1, c: 3 }

// ✅ Correct - destructuring to omit properties
const filtered = { a: obj.a, c: obj.c };
```

**Why this matters:** JavaScript engines optimize objects based on their shape. Using `delete` forces the engine to de-optimize, making code potentially 10-100x slower. It also breaks the contract between TypeScript types and runtime reality.

---

### 15. No Comma Operator (GS112)

**Restriction:** The comma operator is forbidden in expressions. Comma in arrays, parameters, declarations is allowed.

**Rationale:**
- Confusing - evaluates all expressions but returns only the last
- Easily confused with comma in function parameters or arrays
- Makes code hard to read and understand
- Usually indicates code that should be multiple statements
- No legitimate use case in modern JavaScript

**Example:**
```typescript
// ❌ Not allowed
let x = 0, y = 0;
x = (y = 1, y + 1);  // Returns 2, but why?

let a = 1, b = 2;
const result = (a++, b++, a + b);  // What is result?

// ✅ Correct - use separate statements
let x = 0;
let y = 0;
y = 1;
x = y + 1;

// ✅ Allowed - comma in arrays
const arr = [1, 2, 3];

// ✅ Allowed - comma in parameters
const add = (a: number, b: number): number => a + b;

// ✅ Allowed - comma in declarations
let a = 1, b = 2, c = 3;
```

**Why this matters:** The comma operator is almost never used intentionally in modern code. When it appears, it's usually a mistake (missing semicolon) or obfuscated code. Separate statements are always clearer.

---

### 15. No Switch Fall-Through (GS113)

**Restriction:** Switch cases must end with `break`, `return`, `throw`, or `continue`. Empty cases (intentional fall-through to next case) are allowed.

**Rationale:**
- Fall-through is one of JavaScript's most error-prone features
- Easy to forget `break` and create subtle bugs
- Makes code harder to understand - is it intentional or a bug?
- Most fall-through cases are mistakes, not intentional
- ESLint has a rule for this (`no-fallthrough`) - we make it mandatory

**Example:**
```typescript
// ❌ Not allowed - missing break causes fall-through
const describe = (x: number): string => {
  switch (x) {
    case 1:
      console.log("one");
      // OOPS! Falls through to case 2
    case 2:
      console.log("two");
      return "small";
    default:
      return "other";
  }
};

// ✅ Correct - explicit break
const describe = (x: number): string => {
  switch (x) {
    case 1:
      console.log("one");
      break;  // Prevents fall-through
    case 2:
      console.log("two");
      return "small";
    default:
      return "other";
  }
};

// ✅ Correct - return instead of break
const describe = (x: number): string => {
  switch (x) {
    case 1:
      return "one";
    case 2:
      return "two";
    default:
      return "other";
  }
};

// ✅ Allowed - empty cases for grouped handling
const describe = (x: number): string => {
  switch (x) {
    case 1:
    case 2:
    case 3:
      return "small";  // 1, 2, and 3 all handled together
    case 4:
    case 5:
      return "medium";
    default:
      return "large";
  }
};

// ✅ Allowed - conditional break
const process = (x: number, verbose: boolean): void => {
  switch (x) {
    case 1:
      console.log("processing one");
      if (verbose === false) {
        break;  // Early exit
      }
      console.log("verbose mode");
      break;  // Must also have trailing break
    default:
      console.log("other");
  }
};
```

**Why this matters:** Studies show that 97% of switch fall-through cases in production code are bugs, not intentional. C# and other modern languages require explicit fall-through markers for this reason. GoodScript prevents the problem entirely.

---

### 17. No `void` Operator (GS116)

**Restriction:** The `void` operator is forbidden. The `void` type annotation is allowed.

**Rationale:**
- Archaic JavaScript feature from pre-ES5 era
- Originally used as `void 0` to get `undefined` (before it was a keyword)
- Confusing - looks like the `void` type but is actually an operator
- Modern code doesn't need it - just use `undefined`
- One less JavaScript quirk to remember

**Example:**
```typescript
// ❌ Not allowed
const x = void 0;  // Old way to get undefined
const y = void (1 + 2);  // Always returns undefined

// ✅ Correct - use undefined directly
const x: number | undefined = undefined;

// ✅ Allowed - void as a type annotation
const log = (message: string): void => {
  console.log(message);
};

// ✅ Correct - explicit return
const getValue = (): undefined => {
  return undefined;
};
```

**Historical note:** Before ES5, `undefined` was not a reserved keyword and could be reassigned. `void 0` was a guaranteed way to get the undefined value. This hasn't been relevant since 2009.

---

### 17. No Primitive Constructors (GS116)

**Restriction:** Cannot use `String()`, `Number()`, or `Boolean()` as constructors with `new`.

**Rationale:**
- Confusing dual behavior: `String(x)` returns primitive, `new String(x)` returns object wrapper
- Object wrappers (`new String()`, etc.) behave differently from primitives in equality checks
- Implicit type coercion - hides programmer intent
- Inconsistent with GS201 (no implicit type coercion)
- Better alternatives exist for every use case

**Example:**
```typescript
// ❌ Not allowed
const str = String(42);           // Function call
const num = Number("123");        // Type coercion
const bool = Boolean(value);      // Truthy/falsy conversion
const obj = new String("hello");  // Object wrapper

// ✅ Correct alternatives
const str = (42).toString();              // Explicit conversion
const str2 = `${42}`;                     // Template literal
const num = parseInt("123", 10);          // Explicit parsing
const num2 = parseFloat("3.14");          // Explicit parsing
const num3 = +"123";                      // Unary plus operator
const bool = value !== null && value !== undefined;  // Explicit check
const bool2 = array.length > 0;           // Explicit comparison
```

**Why this matters:**
- `typeof String("x")` → `"string"` but `typeof new String("x")` → `"object"`
- `String("x") === "x"` is true, but `new String("x") === "x"` is false
- `Number("123")` looks like a constructor call but performs type coercion
- Forces developers to be explicit about their intent

**Alternatives by use case:**
- **Number to string:** Use `.toString()` or template literals
- **String to number:** Use `parseInt(str, 10)` or `parseFloat(str)` or `+str`
- **Boolean conversion:** Use explicit comparisons (`!== null`, `> 0`, etc.)

---

### 18. Implementation Limitations (Not "Bad Parts")

The following restrictions exist due to current implementation complexity, **not** because these TypeScript features are poorly designed. They may be lifted in future versions.

#### GS120: No `as const` Assertions

**Restriction:** The `as const` assertion is not supported in the current implementation.

**Example:**
```typescript
// ❌ Not supported
const colors = ['red', 'green', 'blue'] as const;
const config = { x: 10, y: 20 } as const;

// ✅ Use regular values for now
const colors = ['red', 'green', 'blue'];
const config = { x: 10, y: 20 };
```

**Why:** `as const` creates deeply readonly types with literal type inference, requiring complex const-correctness tracking in C++ codegen.

#### GS121: No `readonly` Modifier

**Restriction:** The `readonly` modifier is not supported on array types, class properties, or interface properties.

**Example:**
```typescript
// ❌ Not supported
function sum(items: readonly number[]): number { ... }

class Point {
  readonly x: number;  // Not supported
  readonly y: number;  // Not supported
}

interface Config {
  readonly host: string;  // Not supported
}

// ✅ Use regular types for now
function sum(items: number[]): number { ... }

class Point {
  x: number;
  y: number;
}

interface Config {
  host: string;
}
```

**Why:** 
- Readonly parameters require const references in C++
- Readonly properties require constructor initializer lists (incompatible with current codegen)
- Would require significant refactoring of parameter and constructor generation

#### GS122: No `ReadonlyArray<T>`, `Readonly<T>`, `ReadonlyMap<K,V>`, or `ReadonlySet<T>` Types

**Restriction:** Readonly utility types are not supported.

**Example:**
```typescript
// ❌ Not supported
function process(items: ReadonlyArray<number>): void { ... }
type ReadonlyPoint = Readonly<{ x: number; y: number }>;
function lookup(map: ReadonlyMap<string, number>): void { ... }
function check(set: ReadonlySet<string>): void { ... }

// ✅ Use regular types
function process(items: number[]): void { ... }
type Point = { x: number; y: number };
function lookup(map: Map<string, number>): void { ... }
function check(set: Set<string>): void { ... }
```

**Why:** These are TypeScript utility types that depend on readonly modifier support.

#### GS123: No `Object.freeze()`, `Object.seal()`, or `Object.preventExtensions()`

**Restriction:** Runtime immutability methods are not supported.

**Example:**
```typescript
// ❌ Not supported
const obj = { x: 10 };
Object.freeze(obj);
Object.seal(obj);
Object.preventExtensions(obj);

// ✅ Use regular objects
const obj = { x: 10 };
// Just don't modify it, or use ownership types for safety
```

**Why:** 
- These runtime methods provide immutability guarantees that would need C++ equivalents
- Would require tracking frozen/sealed state across the C++ boundary
- GoodScript's ownership system provides memory safety without runtime immutability
- Type-level immutability (readonly) is a better fit but not yet implemented

#### GS124: No Unsupported Object Methods

**Restriction:** Object methods that depend on JavaScript's reflection or prototype semantics are not supported.

**Not supported:**
- `Object.defineProperty()` / `Object.defineProperties()` - property descriptors
- `Object.create()` - prototype-based object creation
- `Object.getPrototypeOf()` / `Object.setPrototypeOf()` - prototype chain
- `Object.getOwnPropertyNames()` / `Object.getOwnPropertySymbols()` - reflection
- `Object.getOwnPropertyDescriptor()` / `Object.getOwnPropertyDescriptors()` - descriptors
- `Object.preventExtensions()` / `Object.isExtensible()` - extensibility
- `Object.isFrozen()` / `Object.isSealed()` - immutability state

**Supported Object methods:**
- `Object.keys(map)` - get array of map keys
- `Object.values(map)` - get array of map values
- `Object.entries(map)` - get array of [key, value] pairs
- `Object.assign(target, ...sources)` - merge maps
- `Object.is(a, b)` - SameValue comparison (handles NaN and -0/+0)

**Example:**
```typescript
// ❌ Not supported - property descriptors
Object.defineProperty(obj, 'x', { value: 42, writable: false });

// ❌ Not supported - prototype chain
const obj = Object.create(proto);
const proto = Object.getPrototypeOf(obj);

// ❌ Not supported - reflection
const props = Object.getOwnPropertyNames(obj);
const desc = Object.getOwnPropertyDescriptor(obj, 'x');

// ✅ Supported - map operations
const map = new Map([['a', 1], ['b', 2]]);
const keys = Object.keys(map);      // ['a', 'b']
const values = Object.values(map);  // [1, 2]
const entries = Object.entries(map); // [['a', 1], ['b', 2]]

const merged = Object.assign(new Map(), map1, map2);

// ✅ Supported - SameValue comparison
Object.is(NaN, NaN);  // true (unlike ===)
Object.is(-0, +0);    // false (unlike ===)
```

**Why:**
- C++ lacks JavaScript's dynamic property descriptor system
- Prototype chains don't map to C++ class hierarchies
- Object reflection requires runtime type information (RTTI) which GoodScript avoids
- The supported methods (keys/values/entries/assign/is) have clear C++ equivalents
- These work with `Map<K,V>` types which map directly to `std::unordered_map`

### GS125: No Symbol (Implementation Limitation)

**Error:** `Symbol is not supported - lacks clear C++ equivalent`

**Rejected:**
```typescript
// Symbol type
const sym: Symbol = Symbol('test');

// Symbol constructor
const unique = Symbol('unique');

// Well-known symbols
const iter = Symbol.iterator;
const toStr = Symbol.toStringTag;

// Symbol registry
const global = Symbol.for('app.id');
const key = Symbol.keyFor(global);

// Symbol-keyed properties
const obj = {
  [Symbol.iterator]() { return this; }
};
```

**Why:**
- Symbols are JavaScript-specific runtime-unique identifiers
- C++ has no equivalent concept (unlike strings/numbers which map directly)
- Symbol-keyed properties can't be represented in C++ structs/classes
- Well-known symbols (Symbol.iterator, etc.) rely on runtime duck-typing
- Symbol registry (Symbol.for/keyFor) requires global runtime state
- Implementing symbols would require significant runtime overhead for rarely-used feature

**Alternatives:**
```typescript
// Instead of Symbol for unique keys
const uniqueId = Math.random().toString(36);

// Instead of Symbol.iterator
class MyIterable {
  // Implement standard iteration pattern
  [Symbol.iterator]() { ... }  // ❌ Rejected
  
  // Use named methods instead
  getIterator() { ... }  // ✅ Accepted
}

// Instead of Symbol-keyed private properties
class MyClass {
  #private = 42;  // Use actual private fields
}
```

### GS126: No Prototype Manipulation (Implementation Limitation)

**Error:** `Prototype manipulation is not supported - C++ uses static class definitions`

**Rejected:**
```typescript
// Prototype property access
function MyClass() {}
MyClass.prototype.method = function() {};

// Prototype assignment
class MyClass {}
MyClass.prototype = { x: 1 };

// Object.prototype access
const proto = Object.prototype;

// Constructor.prototype access
class MyClass {
  method() {
    const p = this.constructor.prototype;
  }
}

// __proto__ access (deprecated even in JavaScript)
const obj = {};
const proto = obj.__proto__;
```

**Why:**
- JavaScript prototypes are runtime-dynamic inheritance chains
- C++ uses static class definitions with compile-time inheritance
- Prototype manipulation requires runtime class modification
- `__proto__` is deprecated in JavaScript (use `Object.getPrototypeOf`)
- No equivalent to dynamically adding methods to existing classes in C++
- Would require runtime reflection and dynamic dispatch beyond vtables

**Alternatives:**
```typescript
// Instead of prototype manipulation
function MyClass() {}
MyClass.prototype.method = function() {};  // ❌ Rejected

// Use classes with static structure
class MyClass {  // ✅ Accepted
  method() { ... }
}

// Instead of modifying built-in prototypes
Array.prototype.myMethod = function() {};  // ❌ Rejected

// Use helper functions or extend classes
class MyArray<T> extends Array<T> {  // ✅ Accepted
  myMethod() { ... }
}

// Or use composition
function myArrayHelper<T>(arr: T[]) { ... }  // ✅ Accepted
```

### GS128: No Getter/Setter Accessors (Temporary Implementation Limitation)

**Status**: Planned for future implementation

**Rejected patterns**:
```typescript
class Person {
  private _name: string = "";
  
  get name(): string {  // ❌ Rejected
    return this._name;
  }
  
  set name(value: string) {  // ❌ Rejected
    this._name = value;
  }
}
```

**Why restricted**:
- Property access syntax (`obj.name = value`) needs special codegen to detect getters/setters
- Requires type information at property access sites to distinguish fields from accessors
- Adds complexity to the code generator for a feature that has explicit alternatives
- Will be supported in a future release once property access transformation is implemented

**Current workaround**:
```typescript
class Person {  // ✅ Accepted
  private _name: string = "";
  
  getName(): string {
    return this._name;
  }
  
  setName(value: string): void {
    this._name = value;
  }
}

const p = new Person();
p.setName("Alice");
console.log(p.getName());
```

**Future support**:
- Getters will map to `const` methods in C++: `string name() const`
- Setters will map to non-const methods: `void name(const string& value)`
- Property access will be transformed to method calls automatically
- Read-only properties (getter without setter) provide encapsulation
- Write-only properties (setter without getter) allow validation

---

### GS127: No Proxy or Reflect API (Implementation Limitation)

**Error:** `Proxy is not supported - lacks C++ equivalent for runtime interception`  
**Error:** `Reflect API is not supported - lacks C++ equivalent for runtime interception`

**Rejected:**
```typescript
// Proxy for interception
const handler = {
  get(target: any, prop: string) {
    console.log(`Getting ${prop}`);
    return target[prop];
  }
};
const proxy = new Proxy({}, handler);

// Proxy.revocable
const { proxy, revoke } = Proxy.revocable({}, {});

// Reflect API
const obj = { x: 1 };
const value = Reflect.get(obj, 'x');
Reflect.set(obj, 'y', 2);
const hasX = Reflect.has(obj, 'x');
Reflect.deleteProperty(obj, 'x');
Reflect.apply(func, thisArg, args);
```

**Why:**
- Proxy enables runtime interception of object operations (get, set, has, delete, etc.)
- C++ doesn't support runtime interception of member access without extensive infrastructure
- Would require generating proxy wrapper classes with forwarding for every operation
- Reflect API is designed to complement Proxy with programmatic object operations
- No equivalent to Proxy traps in C++ (would need operator overloading per-instance)
- Performance overhead would be significant for a rarely-used feature
- Proxy semantics fundamentally rely on JavaScript's dynamic nature

**Alternatives:**
```typescript
// Instead of Proxy for validation
const handler = {
  set(target: any, prop: string, value: any) {
    if (typeof value !== 'number') throw new Error('Must be number');
    target[prop] = value;
    return true;
  }
};
const proxy = new Proxy({}, handler);  // ❌ Rejected

// Use a class with explicit validation
class ValidatedObject {  // ✅ Accepted
  private data = new Map<string, number>();
  
  set(key: string, value: number): void {
    if (typeof value !== 'number') throw new Error('Must be number');
    this.data.set(key, value);
  }
  
  get(key: string): number | undefined {
    return this.data.get(key);
  }
}

// Instead of Proxy for logging
const proxy = new Proxy(obj, {  // ❌ Rejected
  get(target, prop) {
    console.log(`Accessed ${String(prop)}`);
    return target[prop];
  }
});

// Use explicit logging methods
class LoggingWrapper<T> {  // ✅ Accepted
  constructor(private obj: T) {}
  
  get<K extends keyof T>(key: K): T[K] {
    console.log(`Accessed ${String(key)}`);
    return this.obj[key];
  }
}

// Instead of Reflect for dynamic access
const value = Reflect.get(obj, 'x');  // ❌ Rejected

// Use direct property access or Map
const value = obj.x;  // ✅ Accepted
// Or for truly dynamic keys:
const map = new Map<string, any>();  // ✅ Accepted
const value = map.get('x');
```

**Future consideration:**
All these restrictions may be lifted in future versions once the code generator supports:
- Const-correctness tracking for parameters
- Constructor initializer list generation
- Deep readonly type analysis

---

## Additional Type System Requirements

GoodScript enforces strict static typing through the restrictions above. Additional best practices include:

### Explicit Return Types

- Function return types should be explicit in public APIs
- Type annotations preferred when they improve clarity
- Generic types should be used instead of `any` or `unknown` when possible

### No Implicit Any

- TypeScript's `noImplicitAny` must be enabled
- All function parameters must have type annotations
- Variables should have types when inference is unclear

---

## Summary

All Phase 1 restrictions serve a common goal: **eliminate surprises and make code behavior predictable at compile time**.

These restrictions transform TypeScript from a gradually-typed superset of JavaScript into a strictly-typed language with predictable semantics - a solid foundation for the ownership system in Phase 2.

**Benefits:**
- ✅ Easier to reason about code
- ✅ Fewer runtime surprises
- ✅ Better IDE support and tooling
- ✅ Catches more bugs at compile time
- ✅ More maintainable codebases
- ✅ Prepares code for native compilation

**Philosophy:** If experienced developers can be surprised by a language feature, that feature doesn't belong in GoodScript.

---

## Error Code Reference

| Code | Restriction | Solution |
|------|-------------|----------|
| GS101 | `with` statement | Remove it - use explicit property access |
| GS102 | `eval` function or `Function` constructor | Use functions, objects, or proper parsing |
| GS103 | `arguments` object | Use rest parameters (`...args`) |
| GS104 | `for-in` loops | Use `for-of`, `Object.keys()`, or `Object.entries()` |
| GS105 | `var` keyword | Use `let` or `const` |
| GS106 | `==` operator | Use `===` |
| GS107 | `!=` operator | Use `!==` |
| GS117 | Mixed-type ternary | Both branches must have compatible types |
| GS118 | Inconsistent return types | All returns must have compatible types |
| GS119 | Mixed-type nullish coalescing | Both sides of `??` must have compatible types |
| GS108 | Function declarations/expressions | Use arrow functions or class methods |
| GS109 | `any` type | Use explicit types, generics, or `unknown` |
| GS110 | Implicit truthy/falsy checks | Use explicit comparisons |
| GS111 | `delete` operator | Use optional properties or destructuring |
| GS112 | Comma operator | Use separate statements |
| GS113 | Switch fall-through | End each case with `break`, `return`, `throw`, or `continue` |
| GS115 | `void` operator | Use `undefined` directly |
| GS116 | Primitive constructors | Use `.toString()`, template literals, `parseInt/parseFloat`, or explicit comparisons |
| GS120 | `as const` assertion | Not supported - implementation limitation |
| GS121 | `readonly` modifier | Not supported - implementation limitation |
| GS122 | Readonly utility types (`ReadonlyArray`, `Readonly`, `ReadonlyMap`, `ReadonlySet`) | Not supported - implementation limitation |
| GS123 | `Object.freeze/seal/preventExtensions` | Not supported - implementation limitation |
| GS124 | Unsupported Object methods (defineProperty, create, getPrototypeOf, etc.) | Use supported Object methods: keys, values, entries, assign, is |
| GS125 | Symbol type and Symbol() constructor | Not supported - implementation limitation |
| GS126 | Prototype manipulation (prototype, __proto__) | Use classes with static structure |
| GS127 | Proxy and Reflect API | Use explicit wrapper classes for validation/logging |
| GS201 | Implicit type coercion | Use template literals or explicit conversion |

---

## Compatibility with TypeScript

GoodScript files (`-gs.ts`) are valid TypeScript files with additional restrictions. You can:

- Use GoodScript files in TypeScript projects (they're strict TypeScript)
- Gradually migrate TypeScript to GoodScript
- Use TypeScript's type system and ecosystem

However, TypeScript files may not be valid GoodScript if they use restricted features.
