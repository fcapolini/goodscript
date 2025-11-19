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

### 3. No Type Coercion (GS201)

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

### 4. No Function Declarations/Expressions (GS108)

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

### 5. No `arguments` Object (GS103)

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

### 6. No `for-in` Loops (GS104)

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

### 7. No `with` Statement (GS101)

**Restriction:** The `with` statement is forbidden.

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

### 8. No `eval` or `Function` Constructor (GS102)

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

### 9. No `any` Type (GS109)

**Restriction:** The `any` type is forbidden. Must use explicit types or generics.

**Rationale:**
- `any` defeats the entire purpose of static typing
- Disables all type checking for that value
- Hides bugs that TypeScript would otherwise catch
- Makes code unpredictable - value could be anything at runtime
- Prevents IDE autocomplete and refactoring tools
- Cannot transpile to Rust without knowing actual types
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

### 10. No Implicit Truthy/Falsy Checks (GS110)

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
- ✅ Prepares code for Rust transpilation

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
| GS108 | Function declarations/expressions | Use arrow functions or class methods |
| GS109 | `any` type | Use explicit types, generics, or `unknown` |
| GS110 | Implicit truthy/falsy checks | Use explicit comparisons |
| GS201 | Implicit type coercion | Use template literals or explicit conversion |

---

## Compatibility with TypeScript

GoodScript files (`.gs.ts`) are valid TypeScript files with additional restrictions. You can:

- Use GoodScript files in TypeScript projects (they're strict TypeScript)
- Gradually migrate TypeScript to GoodScript
- Use TypeScript's type system and ecosystem

However, TypeScript files may not be valid GoodScript if they use restricted features.
