# GoodScript

> **Rust performance for the rest of us**

Write clean TypeScript. Get native performance. No borrow checker required.

---

> ⚠️ **ALPHA STAGE**: GoodScript is under active development. Phase 1 (parsing, validation, JS target) is complete. Phase 2 (ownership analysis, DAG validation) is complete with 100% test coverage. Phase 3 (Rust code generation) is in progress with 906 tests passing and comprehensive runtime equivalence coverage. APIs and language features may change.

---

**GoodScript** is two things:

- **A TypeScript variant with the "Good Parts" only**
  - Fully statically typed (no `any` type, no `eval`, no dynamic runtime types)
  - No type coercion, no `var`, no truthiness, no `this` surprises
  - Strict equality operators only (`===`, `!==`)
  - GoodScript sources use the `*.gs.ts` extension (or `*.gs.tsx` for React/JSX)
  - JSX/TSX support for web development (JavaScript output only)

- **A TypeScript to Rust transpiler**
  - Reference counting with ownership tracking (no GC, no borrow checker)
  - Static cycle detection prevents memory leaks
  - Compiles to Rust source code for native performance
  - Leverages Rust's `Rc`/`Weak` types for ownership semantics
  - Targets native executables and WASM via Rust toolchain
  - Rust-level performance with deterministic memory management

The first part gets rid of JS baggage and results in a more robust, cleaner language overall. It can serve as a stricter replacement for TypeScript, offering better maintainability.

> The name GoodScript is a reference to "JavaScript: The Good Parts" by Douglas Crockford, from which this philosophy was taken.

The second part leverages what is now an enterprise level, fully statically typed language to add deterministic and efficient memory handling and making it compilable to self-contained binary executables.

> GoodScript handles compilation using the Rust toolchain, which allows for excellent performance, native binaries, and WASM modules generation.

## Clean TypeScript

> Thanks to TypeScript the world moved on from plain JavaScript. GoodScript lets you get rid of its baggage too.

GoodScript can be **incrementally adopted** in existing TypeScript projects. Use the `.gs.ts` file extension for GoodScript sources (or `.gs.tsx` for React/JSX components) and continue using `.ts` for standard TypeScript files—they work side by side seamlessly.

Simply replace `tsc` with `gsc` in your build process:

```bash
# Instead of: tsc
gsc
```

Because GoodScript is a **strict subset of TypeScript**, you can gradually migrate files one at a time. Import GoodScript modules from TypeScript and vice versa:

```typescript
// node.ts (regular TypeScript)
import { Config } from './config.gs';  // Import from GoodScript

// config.gs.ts (GoodScript - strict rules enforced)
import { Node } from './node.gs';      // Import from GoodScript
import { logger } from './logger';     // Import from TypeScript
```

The `gsc` compiler enforces Phase 1 restrictions (no `var`, no `==`, arrow functions only, etc.) on `.gs.ts` files while treating `.ts` files as standard TypeScript. This allows you to introduce stricter coding standards incrementally without requiring a full codebase rewrite.

## Language Levels

GoodScript supports three language levels, configurable in `tsconfig.json`:

**Level 1: `"clean"` (Default for TypeScript target)**
- Enforces "The Good Parts" - strict TypeScript subset
- No ownership analysis (JavaScript uses GC)
- Fast compilation, immediate value
- Perfect for web development

**Level 2: `"dag"`**
- Level 1 + ownership/DAG validation
- Ensures memory safety guarantees
- Useful for validating designs before Rust compilation
- Optional for TypeScript target

**Level 3: `"rust"`** (Default for Rust target, Phase 3)
- Full validation for Rust code generation
- Ownership + DAG + null-checks
- Required for native compilation

Configure in `tsconfig.json`:
```json
{
  "compilerOptions": { "..." },
  "goodscript": {
    "level": "clean"  // "clean" | "dag" | "rust"
  }
}
```

**Note**: For TypeScript/JavaScript compilation (the default), level defaults to `"clean"` since ownership analysis provides no runtime benefit in garbage-collected environments.

## Rust transpiler

> Clean TypeScript can be an excellent systems programming language too.

In **Phase 3** (now in progress), GoodScript transpiles to **optimized Rust source code**, delivering:

- **Native Performance:** Rust-level speed with minimal overhead
- **Self-Contained Binaries:** No runtime dependencies, no garbage collector
- **WASM Support:** Compile to WebAssembly via Rust's `wasm32` target
- **Memory Safety:** Ownership system maps directly to Rust's `Box<T>`, `Rc<T>`, and `Weak<T>`
- **Deterministic Performance:** No GC pauses, predictable memory usage
- **🎯 Rust Ecosystem Access:** Call any Rust library (90,000+ crates) and catch errors with try/catch (see [ERROR-HANDLING.md](docs/ERROR-HANDLING.md))
- **Full OOP Semantics**: Support for TypeScript `class` and `interface` in generated Rust
- **Automatic Structural Types**: Transparent mapping of TypeScript structural typing to Rust nominal typing

The compiler's **DAG validation** (Phase 2) ensures that generated Rust code is memory-leak-free by preventing reference cycles at compile time. Complex data structures use the [pool pattern](docs/POOL-PATTERN.md) to maintain DAG invariants while supporting natural graph/tree topologies.

```bash
# Compile GoodScript to Rust (Phase 3)
gsc --target rust src/main.gs.ts

# Build native binary via Rust toolchain
cd out/rust
cargo build --release
```

The Rust backend will support both server-side applications and browser WASM modules, making GoodScript suitable for performance-critical full-stack development.

## Language Overview

GoodScript supports three **language levels**:

1. **Level 1 "clean"** - TypeScript without the bad parts (default for TS target)
2. **Level 2 "dag"** - Level 1 + ownership/DAG validation
3. **Level 3 "rust"** - Full validation for native compilation (default for Rust target)

### Ownership System (Levels 2 & 3)

GoodScript combines TypeScript's familiar syntax with Rust's memory safety through a **Three-Tiered Ownership System**:

- **`Unique<T>`** - Exclusive ownership (maps to Rust's `Box<T>`)
- **`Shared<T>`** - Shared ownership with reference counting (maps to `Rc<T>`)  
- **`Weak<T>`** - Non-owning references that break cycles (maps to `Weak<T>`)

**Note**: Ownership types are optional annotations at level "clean". They're only validated at levels "dag" and "rust", where they provide compile-time safety guarantees.

The compiler enforces that `Shared<T>` references form a **Directed Acyclic Graph (DAG)**, preventing memory leaks from reference cycles at compile time (levels 2 & 3 only).

**Avoiding cycles:** For complex data structures like trees, graphs, and linked lists that would naturally create ownership cycles, use the **pool pattern** to centralize ownership. See [docs/POOL-PATTERN.md](docs/POOL-PATTERN.md) for detailed examples.

**Null handling:** GoodScript treats `null` and `undefined` as synonyms. All `Weak<T>` references are implicitly nullable (`T | null | undefined`), and checking for either satisfies null-safety requirements.

### Phase 2: Ownership Rules

When using language level `"dag"` or `"rust"`, GoodScript enforces explicit ownership semantics for heap-allocated types to enable compile-time memory safety.

#### Where Ownership Qualifiers Are Required

**Class and Interface Fields** (GS303)

All heap-allocated type fields must be explicitly qualified:

```typescript
class Node {
  // ❌ Error: Missing ownership annotation
  data: string;
  children: Node[];
  metadata: Map<string, string>;

  // ✅ Correct: Explicit ownership
  data: Unique<string>;
  children: Shared<Node>[];
  metadata: Unique<Map<string, string>>;
  
  // ✅ Primitives don't need qualification
  count: number;
  active: boolean;
}
```

**Heap-Allocated Types:**
- `string` - Always heap-allocated
- `Array<T>` or `T[]` - Collections
- `Map<K, V>`, `Set<T>` - Standard containers
- User-defined classes - Custom types
- Built-in objects: `Date`, `RegExp`, `Promise`, `Error`, etc.

**Value Types** (no qualification needed):
- `number` - All numeric values
- `boolean` - True/false values

#### Where Ownership Qualifiers Are Optional

**Function/Method Parameters**

Unqualified heap-type parameters are treated as **implicitly `Shared<T>`** (shared ownership with reference counting):

```typescript
// ✅ Unqualified parameters are implicitly Shared<T>
put(key: string, value: number): void {
  this.cache.set(key, value);  // Shared reference passed
}

// ✅ Explicit Weak<T> for nullable parameters
find(key: Weak<string>): Data | null {
  // Must check: Weak<T> is implicitly nullable
  if (key === null) return null;
  return this.cache.get(key);
}

// ✅ Explicit Unique<T> for exclusive ownership transfer
store(data: Unique<Data>): void {
  this.items.push(data);  // Takes exclusive ownership
}
```

**Rationale:** Shared ownership is the most flexible default for parameters - functions can use the value, store it, or pass it along without additional conversions. The reference count increments on call and decrements on return.

**Local Variables**

Heap allocations in local variables are implicitly `Unique<T>`:

```typescript
const testCache = (): void => {
  // ✅ Implicitly Unique<LRUCache>
  const cache = new LRUCache(100);
  
  // ✅ Implicitly Unique<string>
  const key = "user_123";
  
  cache.put(key, 42);  // Borrowed reference
};
```

#### Reference Types

**`Unique<T>` - Exclusive Ownership**
- **Default for `new T()` expressions** - newly created objects are implicitly `Unique<T>`
- The element is **automatically deallocated** when the variable goes out of scope
- **Derivation rule**: From `Unique<T>` can only create `Weak<T>` (no `Shared<T>`)
- No ownership transfer - `Unique<T>` cannot be reassigned or moved
- Best for single-owner scenarios with optional weak observers

**`Shared<T>` - Reference Counted Ownership**
- Used for shared ownership with automatic reference counting
- Each derived `Shared<T>` reference to the same element **increases the ref count** at creation
- Ref count **decreases** when the reference goes out of scope
- **Derivation rule**: From `Shared<T>` can create both `Shared<T>` and `Weak<T>`
- Element is deallocated when the last `Shared<T>` reference is dropped
- Best for arena patterns and shared ownership scenarios

**`Weak<T>` - Non-Owning References**
- Can be derived from `Unique<T>` or `Shared<T>` (via conversion API - future feature)
- **Derivation rule**: From `Weak<T>` can only create another `Weak<T>` (no promotion to owning)
- **Does not participate in reference counting**
- Must be **dereferenced conditionally** (checked for `null`/`undefined` before use)
- Does not prevent deallocation - may become `null` if the owned reference is dropped
- Best for observer patterns and non-owning pointers

#### Ownership Derivation Rules (GS305)

The compiler enforces strict rules about how ownership can flow:

1. **`Unique<T>` → `Weak<T>` only** - Cannot convert to `Shared<T>`
2. **`Shared<T>` → `Shared<T>` or `Weak<T>`** - Can share or create weak references
3. **`Weak<T>` → `Weak<T>` only** - Cannot promote to owning reference

These rules apply to:
- Field assignments: `this.field = value`
- Function/method calls: `function(arg)`
- Return statements (future)
- Array/collection operations (future)

#### Example

```typescript
// Create object - implicitly Unique<T> (no annotation needed)
const data = new Data();

// Can explicitly use Unique<T> in type annotations
const item: Unique<Data> = new Data();

// Store in arena with shared ownership
const arena: Shared<Data>[] = [];
arena.push(data);  // Converts to Shared<Data>

// Create weak reference for non-owning pointer
let current: Weak<Data> = data;

// Must check before use
if (current !== null) {
  console.log(current.value);
}
```

**📖 See [docs/LANGUAGE.md](docs/LANGUAGE.md) for complete language specification**

## Implementation Status

GoodScript is being developed in phases, with each phase corresponding to a language level:

| Phase | Language Level | Features | Status |
|-------|----------------|----------|--------|
| **Phase 1** | Level 1 "clean" | Strict TypeScript semantics<br/>(13 restrictions, 244 tests)<br/>[📖 Details](docs/PHASE-1-CLEAN.md) | ✅ **Complete** |
| **Phase 2** | Level 2 "dag" | Ownership analysis & DAG validation<br/>(425 tests, 100% coverage)<br/>[📖 Details](docs/PHASE-2-DAG.md) | ✅ **Complete** |
| **Phase 3** | Level 3 "rust" | Rust code generation<br/>(885 tests, runtime equivalence testing)<br/>**Latest: Class inheritance with trait-based polymorphism**<br/>[📖 Details](docs/PHASE-3-RUST.md) | 🚧 **In Progress** |
| **Phase 4** | — | Ecosystem integration<br/>[📖 Details](docs/PHASE-4-ECOSYSTEM.md) | 📋 Planned |

**Phase 1 Restrictions** (enforced at all levels, see [docs/GOOD-PARTS.md](docs/GOOD-PARTS.md)):
- GS101-GS108: Language features (`with`, `eval`, `arguments`, `for-in`, `var`, `==`, `!=`, function declarations)
- GS109-GS112: Type safety (`any` type, truthy/falsy, `delete`, comma operator)
- GS115: `void` operator
- GS116: Primitive constructors (`String`, `Number`, `Boolean`)
- GS201: Implicit type coercion

**Phase 2** adds ownership tracking and cycle detection (see [docs/DAG-DETECTION.md](docs/DAG-DETECTION.md)):
- GS301: Ownership cycle detection (DAG enforcement)
- GS302: Null-check enforcement for `Weak<T>` references
- GS303: Missing ownership annotation (naked class references)
- GS304: Ownership type mismatch in assignment
- GS305: Invalid ownership derivation (violates reference rules)
- Type alias resolution, inheritance tracking, generic type instantiation
- Nested generic analysis, call argument validation, type inference

**Phase 3** will generate optimized Rust code for native performance

**Phase 4** makes Rust compilation production-ready (see [docs/PHASE-4-ECOSYSTEM.md](docs/PHASE-4-ECOSYSTEM.md)):
- Cargo integration and build tooling
- Standard library (collections, I/O, networking)
- WebAssembly compilation target
- FFI support for Rust crates and C libraries
- Testing framework and dual-target validation
- Deployment tools and cross-platform builds

## Installation

### NPM Package

Install the GoodScript compiler globally or as a dev dependency:

```bash
# Global installation
npm install -g goodscript

# Project-level installation
npm install --save-dev goodscript
```

The package includes:
- `gsc` - TypeScript-compatible compiler with Phase 1 restrictions
- `gs` - Direct runner for GoodScript files
- Full TypeScript type definitions

**NPM**: [`goodscript@0.5.0`](https://www.npmjs.com/package/goodscript)

### VS Code Extension

Install the GoodScript extension for real-time validation and syntax highlighting:

1. Open VS Code
2. Go to Extensions (Cmd+Shift+X / Ctrl+Shift+X)
3. Search for "GoodScript"
4. Click Install

Or install from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/).

The extension provides:
- Real-time Phase 1 restriction validation
- Syntax highlighting for `.gs.ts` and `.gs.tsx` files
- JSX/TSX support for React development
- Configurable validation settings
- Client-side checking (no compiler required for basic validation)

### Vite Plugin

For Vite-based projects (React, Vue, vanilla TypeScript), use the official plugin:

```bash
npm install --save-dev vite-plugin-goodscript
```

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import goodscript from 'vite-plugin-goodscript';

export default defineConfig({
  plugins: [goodscript()],
});
```

The plugin provides:
- Automatic compilation of `.gs.ts` and `.gs.tsx` files
- Hot module replacement (HMR) support
- Error overlay with GoodScript diagnostics
- Works with React, Vue, and vanilla TypeScript projects

**NPM**: [`vite-plugin-goodscript@0.1.2`](https://www.npmjs.com/package/vite-plugin-goodscript)

## JSX/TSX Support

GoodScript supports React and JSX syntax via `.gs.tsx` files:

```tsx
// Button.gs.tsx - GoodScript React component
interface ButtonProps {
  onClick: () => void;
  label: string;
  disabled?: boolean;
}

const Button = (props: ButtonProps) => {
  const isDisabled = props.disabled ?? false;
  
  const handleClick = () => {
    if (isDisabled === false) {  // ✅ Explicit check, strict equality
      props.onClick();
    }
  };
  
  return (
    <button onClick={handleClick} disabled={isDisabled}>
      {props.label}
    </button>
  );
};

export { Button };
```

**Benefits for React development:**
- **Arrow functions only** - Eliminates `this` binding issues entirely
- **Strict equality** (`===`, `!==`) - No accidental type coercion bugs
- **Explicit boolean checks** - No confusing truthy/falsy behavior
- **No `var`** - Block-scoped variables only (`const`, `let`)
- **No `any` type** - Full type safety across your component tree

These restrictions enforce cleaner, more maintainable code that's easier to understand and refactor. Perfect for large React codebases where consistency and readability matter.

This support also removes the burden of mentally switching "language level" mode in full-stack projects using GoodScript for the backend. Level 2 ownership types are also supported in `.gs.tsx` files for consistency in full-stack projects, though they provide no runtime benefit when compiling to JavaScript.

**Key points:**
- Use `.gs.tsx` extension for JSX/React components
- Level "clean" restrictions apply (the good parts only)
- **TypeScript/JavaScript output only** - designed for web development
- Mix freely with regular `.tsx` files for gradual adoption
- See [docs/REACT.md](docs/REACT.md) for integration guide
