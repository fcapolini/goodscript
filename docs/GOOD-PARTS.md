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

## Additional Type System Requirements

While not enforced by specific error codes, GoodScript also requires:

### Strict Static Typing

- No `any` type (use specific types or generics)
- No implicit `any` (must annotate function parameters and return types when inference fails)
- All types must be known at compile time

### Explicit Over Implicit

- Function return types should be explicit
- Type annotations preferred when they improve clarity
- No reliance on type inference in public APIs

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
| GS201 | Implicit type coercion | Use template literals or explicit conversion |

---

## Compatibility with TypeScript

GoodScript files (`.gs.ts`) are valid TypeScript files with additional restrictions. You can:

- Use GoodScript files in TypeScript projects (they're strict TypeScript)
- Gradually migrate TypeScript to GoodScript
- Use TypeScript's type system and ecosystem

However, TypeScript files may not be valid GoodScript if they use restricted features.
