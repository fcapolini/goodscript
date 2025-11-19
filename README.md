# GoodScript

> **Rust performance for the rest of us**

Write clean TypeScript. Get native performance. No borrow checker required.

---

> ⚠️ **BETA STAGE**: GoodScript is under active development. Phase 1 (parsing, validation, JS target) is complete. Phase 2 (ownership analysis, implicit nullability) is underway. Phase 3 (Rust code generation) will follow. APIs and language features may change.

---

**GoodScript** is two things:

- **A TypeScript variant with the "Good Parts" only**
  - Fully statically typed (no `any` type, no `eval`, no dynamic runtime types)
  - No type coercion, no `var`, no truthiness, no `this` surprises
  - Strict equality operators only (`===`, `!==`)
  - GoodScript sources use the `*.gs.ts` extension (or `*.gs.tsx` for React/JSX)
  - JSX/TSX support for web development (TypeScript output only)

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

In **Phase 3**, GoodScript will transpile to **optimized Rust source code**, delivering:

- **Native Performance:** Rust-level speed with minimal overhead
- **Self-Contained Binaries:** No runtime dependencies, no garbage collector
- **WASM Support:** Compile to WebAssembly via Rust's `wasm32` target
- **Memory Safety:** Ownership system maps directly to Rust's `Box<T>`, `Rc<T>`, and `Weak<T>`
- **Deterministic Performance:** No GC pauses, predictable memory usage

The compiler's **DAG validation** (Phase 2) ensures that generated Rust code is memory-leak-free by preventing reference cycles at compile time. Complex data structures use the [pool pattern](docs/POOL-PATTERN.md) to maintain DAG invariants while supporting natural graph/tree topologies.

```bash
# Compile GoodScript to Rust (Phase 3)
gsc --target rust src/main.gs.ts

# Build native binary via Rust toolchain
cd out/rust
cargo build --release
```

The Rust backend will support both server-side applications and browser WASM modules, making GoodScript suitable for performance-critical full-stack development.

### Development Workflow: Validate with JavaScript, Deploy with Rust

A powerful GoodScript workflow is to **develop and test with the TypeScript/JavaScript target**, then **compile to Rust for production deployment**:

1. **Rapid Development** - Use the JS target for fast iteration cycles
   - Instant compilation and hot reload
   - Familiar debugging tools (Chrome DevTools, VS Code debugger)
   - Access to the entire npm ecosystem for testing and development tools

2. **Validate Correctness** - Prove your application logic works in JavaScript
   - Run comprehensive test suites with Jest, Vitest, or Mocha
   - Use level "dag" to validate ownership semantics compile-time
   - Catch logic errors before dealing with Rust compilation

3. **Deploy to Rust** - Compile the validated codebase for production
   - Same source code, two targets (no platform-specific code needed)
   - Native performance with deterministic memory management
   - Self-contained binaries with no runtime dependencies

This dual-target strategy combines JavaScript's developer ergonomics with Rust's production performance, enabling teams to move fast during development while delivering optimized native applications to users.

## Language Overview

GoodScript supports three **language levels**:

1. **Level 1 "clean"** - TypeScript without the bad parts (default for TS target)
2. **Level 2 "dag"** - Level 1 + ownership/DAG validation
3. **Level 3 "rust"** - Full validation for native compilation (default for Rust target)

### Ownership System (Levels 2 & 3)

GoodScript combines TypeScript's familiar syntax with Rust's memory safety through a **Three-Tiered Ownership System**:

- **`unique<T>`** - Exclusive ownership (maps to Rust's `Box<T>`)
- **`shared<T>`** - Shared ownership with reference counting (maps to `Rc<T>`)  
- **`weak<T>`** - Non-owning references that break cycles (maps to `Weak<T>`)

**Note**: Ownership types are optional annotations at level "clean". They're only validated at levels "dag" and "rust", where they provide compile-time safety guarantees.

The compiler enforces that `shared<T>` references form a **Directed Acyclic Graph (DAG)**, preventing memory leaks from reference cycles at compile time (levels 2 & 3 only).

**Avoiding cycles:** For complex data structures like trees, graphs, and linked lists that would naturally create ownership cycles, use the **pool pattern** to centralize ownership. See [docs/POOL-PATTERN.md](docs/POOL-PATTERN.md) for detailed examples.

**Null handling:** GoodScript treats `null` and `undefined` as synonyms. All `weak<T>` references are implicitly nullable (`T | null | undefined`), and checking for either satisfies null-safety requirements.

**📖 See [docs/LANGUAGE.md](docs/LANGUAGE.md) for complete language specification**

## Implementation Status

GoodScript is being developed in phases, with each phase corresponding to a language level:

| Phase | Language Level | Features | Status |
|-------|----------------|----------|--------|
| **Phase 1** | Level 1 "clean" | Strict TypeScript semantics<br/>(13 restrictions, 244 tests) | ✅ **Complete** |
| **Phase 2** | Level 2 "dag" | Ownership analysis & DAG validation | 🚧 In Progress |
| **Phase 3** | Level 3 "rust" | Rust code generation | 📋 Planned |

**Phase 1 Restrictions** (enforced at all levels, see [docs/GOOD-PARTS.md](docs/GOOD-PARTS.md)):
- GS101-GS108: Language features (`with`, `eval`, `arguments`, `for-in`, `var`, `==`, `!=`, function declarations)
- GS109-GS112: Type safety (`any` type, truthy/falsy, `delete`, comma operator)
- GS115: `void` operator
- GS201: Implicit type coercion

**Phase 2** adds ownership tracking and cycle detection (see [docs/DAG-DETECTION.md](docs/DAG-DETECTION.md))

**Phase 3** will generate optimized Rust code for native performance

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

These restrictions enforce cleaner, more maintainable code that's easier to understand and refactor. Perfect for large React codebases where consistency and readability matter. This support also removes the burden of mentally switching "language level" mode in full-stack projects using GoodScript for the backend. Level 2 ownership types are also supported in `.gs.tsx` files for consistency in full-stack projects, though they provide no runtime benefit when compiling to JavaScript.

**Key points:**
- Use `.gs.tsx` extension for JSX/React components
- Level "clean" restrictions apply (the good parts only)
- **TypeScript/JavaScript output only** - designed for web development
- Mix freely with regular `.tsx` files for gradual adoption
- See [docs/REACT.md](docs/REACT.md) for integration guide
