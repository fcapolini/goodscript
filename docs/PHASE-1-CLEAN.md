# Phase 1: Language Level "clean"

**Status:** ✅ Complete (244 tests passing)

## Overview

Phase 1 establishes GoodScript's foundation by removing JavaScript's "bad parts" - features that lead to bugs, unpredictable behavior, or make code harder to maintain. This phase enforces **strict TypeScript semantics** while maintaining full compatibility with TypeScript tooling.

**Philosophy:** If a feature can surprise experienced developers or behave differently than expected, it's eliminated. Explicitness and predictability over convenience.

**Output:** Standard JavaScript/TypeScript (works with any JS runtime)

---

## Objectives

| Objective | Description | Status |
|-----------|-------------|--------|
| **Type Safety** | Eliminate dynamic typing and implicit coercion | ✅ Complete |
| **Predictable Scope** | Block scope only, no hoisting surprises | ✅ Complete |
| **Explicit Comparisons** | Strict equality, no type coercion | ✅ Complete |
| **Modern Syntax** | Arrow functions, const/let, for-of loops | ✅ Complete |
| **IDE Compatibility** | Full TypeScript tooling support | ✅ Complete |

---

## Language Restrictions

Phase 1 enforces **13 compile-time restrictions** across three categories:

### Category 1: Dangerous Language Features (GS101-GS108)

These features have fundamental design flaws that make code unpredictable or unsafe.

| Code | Restriction | Replacement | Rationale |
|------|-------------|-------------|-----------|
| **GS101** | No `with` statement | Object destructuring | Unpredictable scope resolution |
| **GS102** | No `eval()` or `Function()` constructor | Direct code | Security risk, prevents optimization |
| **GS103** | No `arguments` object | Rest parameters `...args` | Not array, breaks in arrow functions |
| **GS104** | No `for-in` loops | `for-of` or `Object.keys()` | Iterates prototype chain |
| **GS105** | No `var` keyword | `let` or `const` | Function scope causes hoisting bugs |
| **GS106** | No `==` operator | `===` | Implicit type coercion |
| **GS107** | No `!=` operator | `!==` | Implicit type coercion |
| **GS108** | No function declarations/expressions | Arrow functions `() => {}` | Lexical `this` binding |

### Category 2: Type System Safety (GS109-GS112, GS115)

These restrictions enforce strict static typing and prevent runtime type confusion.

| Code | Restriction | Replacement | Rationale |
|------|-------------|-------------|-----------|
| **GS109** | No `any` type | Explicit types or `unknown` | Defeats type checking |
| **GS110** | No truthy/falsy in conditionals | Explicit comparisons | Implicit boolean conversion |
| **GS111** | No `delete` operator | Object destructuring | Runtime property removal |
| **GS112** | No comma operator | Separate statements | Obscures control flow |
| **GS115** | No `void` operator | Direct function calls | No valid use case |

### Category 3: Implicit Coercion (GS201)

| Code | Restriction | Replacement | Rationale |
|------|-------------|-------------|-----------|
| **GS201** | No implicit string/number coercion | Explicit `.toString()` or template literals | Prevents `"sum: " + 1 + 2` bugs |

**See [GOOD-PARTS.md](./GOOD-PARTS.md) for detailed examples and rationale.**

---

## Key Design Decisions

### 1. Arrow Functions Only

**Decision:** Only arrow functions `() => {}`, no function declarations or expressions.

**Rationale:**
- **Lexical `this`** - Arrow functions capture `this` from enclosing scope
- **No `this` confusion** - Eliminates entire class of bugs
- **Consistent behavior** - Always predictable binding
- **Modern standard** - Industry best practice

**Example:**
```typescript
// ❌ Not allowed - function declaration
function greet(name: string) {
  return `Hello, ${name}`;
}

// ❌ Not allowed - function expression
const greet = function(name: string) {
  return `Hello, ${name}`;
};

// ✅ Correct - arrow function
const greet = (name: string): string => {
  return `Hello, ${name}`;
};

// ✅ Concise syntax
const greet = (name: string): string => `Hello, ${name}`;
```

### 2. Strict Equality Only

**Decision:** Only `===` and `!==`, never `==` or `!=`.

**Rationale:**
- JavaScript's `==` has [unintuitive coercion rules](https://dorey.github.io/JavaScript-Equality-Table/)
- `===` checks type and value (expected behavior)
- Eliminates entire category of bugs

**JavaScript quirks eliminated:**
```javascript
0 == false          // true (WAT?!)
'' == false         // true
null == undefined   // true
'0' == 0           // true
'\t\r\n' == 0      // true (seriously?!)
```

### 3. Explicit Type Conversions

**Decision:** No implicit string/number coercion in operations.

**Rationale:**
- The `+` operator is ambiguous (addition vs concatenation)
- Forces explicit intent
- Prevents order-dependent bugs

**Example:**
```typescript
// ❌ Not allowed
const result = "sum: " + 1 + 2;  // "sum: 12" - WAT?!

// ✅ Correct - explicit intent
const result1 = `sum: ${1 + 2}`;              // "sum: 3"
const result2 = "sum: " + (1 + 2).toString(); // "sum: 3"
const result3 = "count: " + String(items.length);
```

### 4. Block Scope Only

**Decision:** Only `let` and `const`, no `var`.

**Rationale:**
- `var` has function scope (counter-intuitive)
- `var` is hoisted (order-dependent)
- Block scope matches developer expectations

**Example:**
```typescript
// ❌ var hoisting causes bugs
for (var i = 0; i < 5; i++) {
  setTimeout(() => console.log(i), 100);
}
// Prints: 5, 5, 5, 5, 5 (WAT?!)

// ✅ let has block scope
for (let i = 0; i < 5; i++) {
  setTimeout(() => console.log(i), 100);
}
// Prints: 0, 1, 2, 3, 4 (as expected)
```

### 5. No Truthy/Falsy Magic

**Decision:** Explicit comparisons in conditionals.

**Rationale:**
- JavaScript's truthiness rules are arbitrary
- Empty string `""`, `0`, `NaN`, `null`, `undefined` are all falsy
- Forces clarity about what's being checked

**Example:**
```typescript
// ❌ Not allowed - implicit boolean conversion
if (user.name) { }
if (items.length) { }

// ✅ Correct - explicit intent
if (user.name !== null && user.name !== undefined) { }
if (user.name !== "") { }
if (items.length > 0) { }
```

**Note:** GoodScript treats `null` and `undefined` as synonyms, so checking for either is sufficient.

---

## File Extensions and Compilation

### Supported Files

- **`.gs.ts`** - GoodScript with TypeScript IDE support (recommended)
- **`.gs.tsx`** - GoodScript with JSX/TSX support (future)
- **`.ts`** - Regular TypeScript (no Phase 1 restrictions)

### Compilation Behavior

```typescript
// config.ts - Regular TypeScript, no restrictions
var x = 10;  // ✅ Allowed in .ts files
if (x) { }   // ✅ Allowed in .ts files

// app.gs.ts - GoodScript, full validation
var y = 10;  // ❌ GS105: Use 'let' or 'const'
if (y) { }   // ❌ GS110: Use explicit comparison
```

**Mixed Projects:** GoodScript files (`.gs.ts`) can coexist with regular TypeScript files (`.ts`) in the same project.

---

## Implementation Details

### Compiler Architecture

```
Source Code (.gs.ts)
    ↓
TypeScript Parser
    ↓
AST (Abstract Syntax Tree)
    ↓
Phase 1 Validator ← YOU ARE HERE
    ↓
TypeScript Code Generator
    ↓
Output (.js or .ts)
```

### Validation Process

1. **Parse** `.gs.ts` file using TypeScript compiler API
2. **Walk AST** visiting every node
3. **Check each node** against 13 restriction rules
4. **Collect diagnostics** with GS error codes
5. **Report errors** in IDE-compatible format

### Key Files

| File | Purpose | Lines |
|------|---------|-------|
| `validator.ts` | Enforces all 13 restrictions | ~500 |
| `compiler.ts` | Orchestrates validation pipeline | ~300 |
| `ts-codegen.ts` | Generates clean TypeScript output | ~200 |

### Test Coverage

| Test Suite | Tests | Coverage |
|------------|-------|----------|
| **Restriction Tests** | 142 | Each restriction has positive/negative tests |
| **Fixture Tests** | 82 | Real-world compliant code examples |
| **CLI Tests** | 20 | Command-line interface compatibility |
| **Total** | **244** | **100% coverage** |

**Test Files:**
- `test/phase1/arrow-functions.test.ts`
- `test/phase1/var-keyword.test.ts`
- `test/phase1/equality-operators.test.ts`
- `test/phase1/type-coercion.test.ts`
- And 10+ more...

---

## Usage Examples

### CLI Usage

```bash
# Compile GoodScript to JavaScript
gsc build src/app.gs.ts

# Check for errors without compiling
gsc check src/app.gs.ts

# Watch mode
gsc watch src/

# Specify output directory
gsc build src/ --out-dir dist/
```

### Programmatic API

```typescript
import { compile } from 'goodscript';

const result = compile({
  files: ['src/app.gs.ts'],
  level: 'clean',  // Phase 1 validation only
  outDir: 'dist/'
});

if (result.diagnostics.length > 0) {
  console.error('Validation errors:', result.diagnostics);
}
```

---

## Migration Guide

### From JavaScript to GoodScript

**Step 1: Rename files**
```bash
mv app.js app.gs.ts
```

**Step 2: Fix each error category**

```typescript
// Before (JavaScript)
var user = getUser();
if (user) {
  console.log("User: " + user.name);
}

// After (GoodScript)
const user = getUser();
if (user !== null && user !== undefined) {
  console.log(`User: ${user.name}`);
}
```

**Step 3: Replace patterns**

| Old Pattern | New Pattern |
|-------------|-------------|
| `var x = 10` | `const x = 10` or `let x = 10` |
| `if (x)` | `if (x !== null && x !== undefined)` |
| `x == y` | `x === y` |
| `function f() {}` | `const f = () => {}` |
| `for (k in obj)` | `for (const k of Object.keys(obj))` |
| `"sum: " + x` | `` `sum: ${x}` `` |

### From TypeScript to GoodScript

TypeScript is already much closer to GoodScript:

```typescript
// Most TypeScript code is already compliant
const greet = (name: string): string => {
  return `Hello, ${name}`;
};

// Main changes needed:
// 1. Replace function declarations with arrow functions
// 2. Use explicit comparisons instead of truthy/falsy
// 3. No 'any' type
```

---

## Benefits

### Immediate Value (Without Phases 2-4)

Even compiling to JavaScript, Phase 1 provides:

1. **Fewer bugs** - Eliminates entire categories of JS footguns
2. **Easier maintenance** - Consistent, predictable code patterns
3. **Better refactoring** - Explicit types catch errors during changes
4. **Safer teams** - Junior developers can't use dangerous features
5. **Code reviews** - No debates about `==` vs `===`, `var` vs `let`

### Foundation for Later Phases

Phase 1 restrictions are **essential** for Phase 2/3:

- **Strict typing** enables ownership analysis
- **Arrow functions** have predictable lifetimes
- **No dynamic features** allows static analysis
- **Explicit code** compiles cleanly to Rust

---

## Performance

### Compilation Speed

- **Parsing:** ~50ms for 1000 LOC (TypeScript parser)
- **Validation:** ~10ms for 1000 LOC (AST walk)
- **Codegen:** ~5ms for 1000 LOC (simple transforms)
- **Total:** ~65ms for 1000 LOC

### Runtime Performance

**No overhead!** Phase 1 generates standard JavaScript:

- Same performance as hand-written TypeScript
- JIT optimizations apply normally
- No runtime library required
- Zero abstraction cost

---

## Common Patterns

### Iteration

```typescript
// ❌ for-in (not allowed)
for (const key in object) { }

// ✅ Object.keys
for (const key of Object.keys(object)) {
  const value = object[key];
}

// ✅ Object.entries
for (const [key, value] of Object.entries(object)) {
  console.log(key, value);
}

// ✅ Array iteration
for (const item of items) {
  process(item);
}
```

### Null Checking

```typescript
// ❌ Truthy check
if (user) { }

// ✅ Explicit null check (recommended)
if (user !== null && user !== undefined) { }

// ✅ Optional chaining
const name = user?.name;

// ✅ Nullish coalescing
const displayName = user?.name ?? "Guest";
```

### Function Declarations

```typescript
// ❌ Function declaration
function add(a: number, b: number): number {
  return a + b;
}

// ✅ Arrow function
const add = (a: number, b: number): number => {
  return a + b;
};

// ✅ Concise when single expression
const add = (a: number, b: number): number => a + b;

// ✅ Named for stack traces
const add = (a: number, b: number): number => {
  return a + b;
}; // 'add' appears in debugger
```

### String Concatenation

```typescript
// ❌ String + number
const msg = "Count: " + count;

// ✅ Template literal (recommended)
const msg = `Count: ${count}`;

// ✅ Explicit toString
const msg = "Count: " + count.toString();

// ✅ String constructor
const msg = "Count: " + String(count);
```

---

## Configuration

### tsconfig.json

GoodScript requires strict TypeScript settings:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitThis": true,
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"]
  },
  "goodscript": {
    "level": "clean"  // Phase 1 validation
  }
}
```

### Incremental Adoption

```json
{
  "include": [
    "src/**/*.ts",      // Regular TypeScript
    "src/**/*.gs.ts"    // GoodScript with validation
  ],
  "goodscript": {
    "level": "clean"
  }
}
```

---

## Error Messages

Phase 1 provides clear, actionable error messages:

```
app.gs.ts:5:3 - error GS105: The 'var' keyword is not allowed in GoodScript. Use 'let' or 'const' instead.

5   var count = 0;
    ~~~

app.gs.ts:8:7 - error GS106: The '==' operator is not allowed. Use '===' for strict equality.

8   if (x == 42) {
          ~~

app.gs.ts:12:15 - error GS201: Implicit type coercion between string and number is not allowed.

12  const msg = "Count: " + count;
                  ~~~~~~~~~~~~~~~~~
```

---

## Future Evolution

Phase 1 is **stable** - no breaking changes planned. Future enhancements:

### Potential Additions

- **GS116:** No `instanceof` (use type guards)
- **GS117:** No `typeof` in expressions (use type guards)
- **GS118:** No prototype manipulation
- **GS119:** No `Object.defineProperty` (use classes)

### Not Planned

- Allow function expressions with explicit typing
- Relax truthy/falsy rules (defeats the purpose)
- Optional GS201 (type coercion is always bad)

---

## Success Metrics

Phase 1 is complete when:

1. ✅ All 13 restrictions are enforced
2. ✅ Comprehensive test coverage (244 tests)
3. ✅ Clear error messages for each restriction
4. ✅ Documentation with examples and rationale
5. ✅ CLI compatibility with `tsc`
6. ✅ Mixed `.ts` and `.gs.ts` projects work
7. ✅ VS Code extension provides real-time feedback

**Status: ALL ACHIEVED** ✅

---

## References

- [GOOD-PARTS.md](./GOOD-PARTS.md) - Detailed restriction explanations
- [LANGUAGE.md](./LANGUAGE.md) - Complete language specification
- [JavaScript: The Good Parts](https://www.oreilly.com/library/view/javascript-the-good/9780596517748/) - Original inspiration
- [TypeScript Strict Mode](https://www.typescriptlang.org/tsconfig#strict) - Foundation for type safety

---

## Contributing

Found a JavaScript footgun we missed? Suggest a new restriction:

1. Open an issue describing the problematic pattern
2. Show real-world bug examples
3. Propose the restriction and error code
4. Provide before/after code examples

**Criteria for new restrictions:**
- Must prevent actual bugs (not style preferences)
- Must have clear, unambiguous alternative
- Must not break common, safe patterns
- Must be statically analyzable

---

## Conclusion

Phase 1 transforms TypeScript from a "typed JavaScript" into a **predictable, safe language** by eliminating features that cause bugs. It provides immediate value even before Phases 2-4, making codebases more maintainable and reliable.

The restrictions may seem strict, but they **eliminate entire categories of bugs** that plague JavaScript projects. Every restriction is backed by real-world experience and has caught actual bugs in testing.

**Next:** [Phase 2: Ownership Analysis](./PHASE-2-DAG.md)
