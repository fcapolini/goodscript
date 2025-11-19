# GoodScript Future Directions

This document explores potential future evolutions and enhancements to GoodScript beyond the current three-phase roadmap.

## General Principles

### Language Levels vs Implementation Phases

**Language Levels** (user-facing):
- **Level 1 "clean"** - TypeScript "good parts" only (default for TS/JS target)
- **Level 2 "dag"** - Level 1 + ownership/DAG validation
- **Level 3 "rust"** - Full validation for native compilation (default for Rust target)

**Implementation Phases** (internal development):
- **Phase 1** - Implements level "clean"
- **Phase 2** - Implements level "dag"  
- **Phase 3** - Implements level "rust"

### Dual-Target Validation Strategy (Phase 3)

When implementing the Rust code generator (Phase 3), a critical quality assurance strategy will be **dual-target validation**: compiling the same GoodScript source to both JavaScript and Rust, then executing both versions in parallel to verify they produce identical behavior.

**Testing Approach:**
1. **Compile once, run twice** - Same `.gs.ts` source → both JS and Rust executables
2. **Parallel execution** - Run identical test suites against both targets
3. **Output comparison** - Verify both targets produce identical results
4. **Performance benchmarking** - Measure Rust's performance gains vs JS baseline

**Benefits:**
- **Correctness validation** - JS target serves as reference implementation
- **Regression detection** - Catch Rust codegen bugs immediately  
- **Continuous verification** - Run on every compiler change in CI/CD
- **Confidence** - Prove the Rust output is semantically equivalent to JS

**Implementation:**
- Shared test suite runs against both compiled outputs
- Deterministic test cases (no randomness, fixed inputs)
- Compare stdout, file outputs, and return codes
- Flag any divergence as a compiler bug

This strategy leverages the fact that we already have a working JavaScript target - it becomes the "golden reference" for validating Rust code generation correctness.

### Compilation Targets and Language Levels

**TypeScript/JavaScript Target**: 
- **Default level**: `"clean"`
- **Why**: JavaScript uses garbage collection - ownership semantics provide no runtime benefit
- Ownership types are purely documentation at level "clean"
- Level "clean" provides immediate value: strict coding standards, no bad parts
- Faster compilation (no ownership analysis)

**Optional level "dag"** for TypeScript target:
- Validates ownership semantics even though JS uses GC
- Useful for validating designs before Rust compilation
- Can catch logical errors in ownership structure

**Rust Target**: 
- **Default level**: `"rust"` (required)
- Ownership analysis is **essential**:
  - Maps directly to Rust's memory model (`Box<T>`, `Rc<T>`, `Weak<T>`)
  - DAG validation prevents memory leaks at compile time
  - Null-check analysis ensures safety
- Provides the performance and determinism benefits

**Configuration**:
```json
{
  "compilerOptions": { "..." },
  "goodscript": {
    "level": "clean"  // "clean" | "dag" | "rust"
  }
}
```

---

## Table of Contents
- [JSX/TSX Support](#jsxtsx-support)
- [Standard Library & Utilities](#standard-library--utilities)
- [Additional Language Features](#additional-language-features)
- [Tooling & Ecosystem](#tooling--ecosystem)
- [Performance Optimizations](#performance-optimizations)
- [Community & Adoption](#community--adoption)

---

## JSX/TSX Support

### Overview
Integrate JSX syntax support for React and similar frameworks, enabling GoodScript to be used for modern web application development.

**Important**: JSX/TSX support would be **TypeScript-output only**. It doesn't make sense for the Rust compilation target (even WebAssembly). This is a language level "clean" feature for web development workflows.

**Design Decision**: JSX/TSX files use language level "clean" by default (no ownership analysis). This is because:
- React development targets JavaScript (garbage collected)
- Level "clean" restrictions still provide value (no `var`, no `==`, etc.)
- Ownership type annotations are optional documentation
- Simpler, faster compilation for web development

### Technical Approach

**File Extensions:**
- `.gs.tsx` - GoodScript with JSX support
- `.gs.ts` - GoodScript without JSX (current)
- `.tsx` / `.ts` - Regular TypeScript (no Phase 1 restrictions, current)

**Compiler Changes:**
1. Enable JSX parsing in TypeScript compiler options for `.gs.tsx` files
2. Update language level validator to walk JSX nodes (should mostly work out of the box)
3. Modify code generator to preserve JSX syntax in output
4. Update file detection logic to recognize `.gs.tsx` extension

**Ownership Semantics in JSX:**
```typescript
// Component props with ownership types
const UserCard = (props: { user: unique<User> }) => {
  return <div className="card">{props.user.name}</div>
}

// Weak references for optional children
const Container = (props: { children: weak<ReactNode> }) => {
  return (
    <div className="container">
      {props.children ?? <EmptyState />}
    </div>
  )
}

// Shared ownership for context values
const ThemeContext = createContext<shared<Theme>>(defaultTheme)

// Component ownership transfer
const App = () => {
  const user: unique<User> = loadUser()
  return <UserCard user={user} /> // ownership transfers to UserCard
}
```

### Benefits
- **Market alignment**: React dominates web development
- **Natural fit**: React's component model implies ownership
- **Type safety**: Ownership types could catch prop mutation bugs
- **Best practices**: Level "clean" restrictions align with React conventions
- **Incremental adoption**: Use `.gs.tsx` for new components in existing apps
- **Clear separation**: JSX for web (level "clean"), ownership semantics for systems programming (levels "dag"/"rust")

### Challenges
- React's `ref` system and hooks need special ownership handling
- Event handlers involve complex shared ownership patterns
- Need to define JSX element ownership semantics (likely `unique<ReactElement>`)
- Component lifecycle and state management with ownership semantics
- Integration with React's virtual DOM and reconciliation
- Ensuring ownership analysis works correctly but doesn't interfere with React's runtime behavior

### Implementation Effort
- **Basic JSX Support**: JSX parsing and passthrough - LOW effort (✅ Complete)
  - Enable JSX in compiler options for `.gs.tsx` files
  - Update file detection to recognize `.gs.tsx`
  - Preserve JSX in TypeScript codegen (skip for Rust codegen)
  - Test level "clean" restrictions work with JSX syntax
  - Note: `.gs.tsx` files would simply not be eligible for Rust compilation
  - **Language level "clean" by default** (no ownership analysis)

- **Optional Level "dag" Support**: Ownership semantics in JSX expressions - OPTIONAL
  - Only relevant if users want to validate ownership even in JS target
  - Could help catch logical errors in component design
  - Validate ownership in props
  - Track ownership transfer through components
  - Handle children and composition patterns

- **Advanced React Integration**: Full React-aware validation - OPTIONAL/FUTURE
  - Special handling for hooks (useState, useRef, etc.)
  - Context API ownership semantics
  - Event handler callback ownership
  - Analyze React patterns without breaking runtime behavior
  - Note: Purely for developer ergonomics, no runtime benefit at level "clean"

### Proof of Concept
To validate feasibility:
1. Create a test fixture with JSX (rename to `.gs.tsx`)
2. Update compiler options to enable JSX
3. Test Phase 1 validation on JSX nodes
4. Verify TypeScript code generation preserves JSX
5. Check TypeScript compilation of output
6. Confirm Rust codegen gracefully skips/rejects `.gs.tsx` files

### Compilation Targets
```
.gs.ts  → TypeScript output ✓
        → Rust output ✓

.gs.tsx → TypeScript output ✓
        → Rust output ✗ (not supported, web-only)
```

---

## Standard Library & Utilities

### Pool Pattern Utilities

**Package**: `@goodscript/pools` or built into `goodscript` runtime library

**Purpose**: Provide ready-to-use pool/arena implementations so developers don't have to implement the pattern from scratch every time.

**Core Components**:

```typescript
// Generic pool with free list management
class Pool<T> {
  alloc(value: T): number;
  free(index: number): void;
  get(index: number): weak<T>;
  has(index: number): boolean;
}

// Arena variant for bulk deallocation
class Arena<T> {
  alloc(value: T): number;
  get(index: number): weak<T>;
  clear(): void;  // Free all nodes at once
}

// Generational indices for detecting stale references
class GenerationalPool<T> {
  alloc(value: T): GenerationalIndex;
  free(index: GenerationalIndex): void;
  get(index: GenerationalIndex): weak<T> | null;
}

// Pre-built data structures using pools
class PooledLinkedList<T> {
  push(value: T): number;
  pop(): T | null;
  get(index: number): weak<T>;
  iterate(): IterableIterator<T>;
}

class PooledTree<T> {
  createRoot(value: T): number;
  addChild(parent: number, value: T): number;
  get(index: number): weak<T>;
  traverse(): IterableIterator<T>;
}

class PooledGraph<T> {
  addNode(value: T): number;
  addEdge(from: number, to: number): void;
  bfs(start: number): IterableIterator<T>;
  dfs(start: number): IterableIterator<T>;
}
```

**Benefits**:
- **Lower barrier to entry** - Developers can use pools without deep understanding
- **Best practices built-in** - Free list optimization, generation tracking, etc.
- **Consistent API** - Standard patterns across the ecosystem
- **Performance-tested** - Optimized implementations
- **Documentation by example** - Real-world usage patterns

**Implementation Priority**: MEDIUM - Needed for Phase 2/3 adoption, but developers can implement manually

**Rust Translation**: Maps to existing Rust crates like `typed-arena`, `generational-arena`, `slotmap`

---

## Additional Language Features

### Async/Await with Ownership
How should ownership work with Promises and async functions?
```typescript
// Does this transfer ownership?
const user: unique<User> = await fetchUser()

// What about Promise chains?
const promise: Promise<unique<User>> = fetchUser()
```

### Pattern Matching
Could Rust-style pattern matching improve null safety and ownership ergonomics?
```typescript
match user {
  Some(u) => console.log(u.name),
  None => console.log("No user")
}
```

### Iterator Ownership
How should iterators interact with ownership? Can we prevent iteration over moved values?

### Destructuring with Ownership
```typescript
const { name, email }: unique<User> = user // Does this move or clone?
const [first, ...rest]: unique<Array<T>> = items // Partial moves?
```

---

## Tooling & Ecosystem

### Build Tool Plugins

**Critical for React/web development adoption.** Without build tool integration, the developer experience is poor (manual pre-compilation, no HMR).

#### Vite Plugin ✅ PUBLISHED

**Package**: `vite-plugin-goodscript` (published on npm)

**Installation**:
```bash
npm install --save-dev vite-plugin-goodscript goodscript
```

**Usage**:
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import goodscript from 'vite-plugin-goodscript';

export default defineConfig({
  plugins: [
    goodscript({
      level: 'clean',
      include: ['**/*.gs.ts', '**/*.gs.tsx'],
      exclude: ['node_modules/**']
    }),
    react()
  ]
});
```

**Implementation**:
```typescript
// vite-plugin-goodscript/src/index.ts
import { Plugin } from 'vite';
import { Compiler } from 'goodscript';
import { TypeScriptCodegen } from 'goodscript/dist/ts-codegen';

export interface GoodScriptPluginOptions {
  level?: 'clean' | 'dag' | 'rust';
  include?: string[];
  exclude?: string[];
}

export default function goodscriptPlugin(options: GoodScriptPluginOptions = {}): Plugin {
  const compiler = new Compiler();
  const codegen = new TypeScriptCodegen();
  
  return {
    name: 'vite-plugin-goodscript',
    
    enforce: 'pre',  // Run before other plugins
    
    // Resolve .gs.ts and .gs.tsx imports
    resolveId(source, importer) {
      if (source.endsWith('.gs') && !source.includes('.gs.')) {
        // Handle imports like: import { X } from './file.gs'
        return source + '.ts';
      }
      return null;
    },
    
    // Transform .gs.ts and .gs.tsx files
    transform(code, id) {
      if (!id.match(/\.gs\.tsx?$/)) {
        return null;
      }
      
      try {
        // Parse and validate
        const result = compiler.compile({
          files: [id],
          target: 'typescript',
          // level is set via goodscript config in tsconfig.json
        });
        
        if (!result.success) {
          // Format errors for Vite
          const errors = result.diagnostics
            .filter(d => d.severity === 'error')
            .map(d => `${d.location.fileName}:${d.location.line}:${d.location.column}\n  ${d.message}`)
            .join('\n\n');
          
          this.error(errors);
          return null;
        }
        
        // Generate TypeScript
        const program = compiler.getParser().getProgram();
        const sourceFile = program.getSourceFile(id);
        const output = codegen.generate(sourceFile);
        
        return {
          code: output,
          map: null  // TODO: Source maps
        };
      } catch (error) {
        this.error(error.message);
        return null;
      }
    },
    
    // Handle HMR
    handleHotUpdate({ file, server }) {
      if (file.match(/\.gs\.tsx?$/)) {
        // Trigger full reload for now
        // TODO: More granular HMR
        server.ws.send({
          type: 'full-reload'
        });
      }
    }
  };
}
```

**Features**:
- ✅ Real-time compilation during dev (IMPLEMENTED)
- ✅ Full HMR support (IMPLEMENTED)
- ✅ Proper error reporting in Vite overlay (IMPLEMENTED)
- ✅ File caching based on modification time (IMPLEMENTED)
- ✅ Framework-agnostic (React, Vue, Svelte, vanilla TS) (IMPLEMENTED)
- ⚠️ Source maps (TODO)

**Status**: ✅ Published as `vite-plugin-goodscript@0.1.1`

**Links**:
- npm: https://www.npmjs.com/package/vite-plugin-goodscript
- Source: https://github.com/fcapolini/goodscript/tree/main/vite-plugin

#### Webpack Loader (Medium Priority)

**Package**: `goodscript-loader`

**Usage**:
```javascript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.gs\.tsx?$/,
        use: [
          'babel-loader',  // Or ts-loader
          {
            loader: 'goodscript-loader',
            options: {
              level: 'clean'
            }
          }
        ],
        exclude: /node_modules/
      }
    ]
  }
};
```

**Implementation sketch**:
```typescript
// goodscript-loader/src/index.ts
import { Compiler } from 'goodscript';
import { LoaderContext } from 'webpack';

export default function goodscriptLoader(
  this: LoaderContext<{ level?: string }>,
  source: string
) {
  const options = this.getOptions();
  const compiler = new Compiler();
  
  // Write source to temp file (webpack provides file path)
  const filePath = this.resourcePath;
  
  const result = compiler.compile({
    files: [filePath],
    target: 'typescript'
  });
  
  if (!result.success) {
    const errors = result.diagnostics.filter(d => d.severity === 'error');
    errors.forEach(error => this.emitError(new Error(error.message)));
    return source;  // Return original on error
  }
  
  // Generate TypeScript
  const output = /* ... generate code ... */;
  
  return output;
}
```

**Complexity**: MEDIUM - Webpack loaders are more complex than Vite plugins

#### Next.js Plugin (Medium Priority)

**Package**: `@goodscript/next`

**Usage**:
```javascript
// next.config.js
const withGoodScript = require('@goodscript/next');

module.exports = withGoodScript({
  goodscript: {
    level: 'clean'
  },
  // ... other Next.js config
});
```

**Implementation**: Wraps webpack configuration under the hood

**Complexity**: MEDIUM - Needs to integrate with Next.js build system

### IDE Support
- **LSP Server**: Dedicated language server for better IDE integration
- **Error messages**: More helpful diagnostics with suggested fixes
- **Refactoring tools**: Automated conversions (TypeScript → GoodScript)
- **Inline hints**: Show ownership types and lifetimes visually

### Build Tools
- **Webpack plugin**: First-class webpack integration
- **Vite plugin**: Fast development with Vite
- **ESBuild plugin**: Ultra-fast builds
- **Bundler optimization**: Tree-shaking aware of ownership semantics

### Testing
- **Test framework**: GoodScript-aware test utilities
- **Ownership mocking**: Mock shared/unique references in tests
- **Coverage tools**: Coverage analysis for ownership paths

### Package Manager Integration
- **Type definitions**: Standard library of GoodScript type definitions
- **npm packages**: Publishing GoodScript modules
- **Interop declarations**: Annotate existing JS/TS libraries with ownership types

---

## Performance Optimizations

### Compiler Optimizations
- **Incremental compilation**: Only recompile changed files
- **Parallel processing**: Multi-threaded compilation for large projects
- **Caching**: Cache validation and analysis results
- **Watch mode**: Fast rebuilds during development

### Runtime Optimizations (Rust target)
- **Zero-cost abstractions**: Ownership types compile to zero overhead
- **Inline optimization**: Aggressive inlining of ownership operations
- **Escape analysis**: Optimize unique references that don't escape
- **Reference counting optimization**: Optimize shared reference counting

### Memory Optimizations
- **Automatic pooling**: Detect pooling patterns (see POOL-PATTERN.md)
- **Arena allocation**: Support for arena-based memory management
- **Stack allocation**: Promote unique references to stack when possible

---

## Community & Adoption

### Migration Path
- **TypeScript converter**: Automated tool to convert TS → GoodScript
- **Gradual adoption**: Mixed `.ts` and `.gs.ts` projects (already supported!)
- **Learning resources**: Tutorials, examples, best practices
- **Migration guide**: Step-by-step guide for existing projects

### Ecosystem Growth
- **Standard library**: Common utilities with ownership types
- **Framework adapters**: Express, NestJS, Next.js adapters
- **Type definitions**: Annotate popular npm packages
- **Community packages**: Encourage GoodScript-first libraries

### Developer Experience
- **Playground**: Online REPL for experimentation
- **Documentation**: Comprehensive guides and API docs
- **Examples**: Real-world example applications
- **Video tutorials**: Screencasts and courses

### Language Evolution
- **RFC process**: Community-driven feature proposals
- **Breaking changes**: Semantic versioning and migration tools
- **Stabilization**: Path from experimental to stable features
- **Backwards compatibility**: Maintain compatibility with TypeScript ecosystem

---

## Open Questions

### Language Design
- Should GoodScript support decorators?
- How do namespaces interact with ownership?
- Should there be a `static` ownership mode for global singletons?
- What about `const` assertions and `as const`?

### Interop
- How to annotate third-party libraries without forking?
- Should there be an "unsafe" mode for legacy interop?
- Can we auto-infer ownership for unannotated dependencies?

### Rust Target
- How to map JavaScript classes to Rust structs?
- What about prototypes and dynamic dispatch?
- How to handle JavaScript's numeric coercion in Rust?
- WebAssembly as intermediate compilation target?

### Tooling
- Should there be a `goodscript init` scaffolding tool?
- Automated migration tools for large codebases?
- Integration with existing JS bundlers?
- Source maps for debugging?

---

## Timeline & Priorities

*This section will be updated as the project evolves.*

**Near-term (2024-2025):**
- Complete Phase 2 (Ownership analysis)
- Complete Phase 3 (Rust codegen)
- Improve error messages and developer experience
- Build core tooling (LSP, build plugins)

**Mid-term (2025-2026):**
- JSX/TSX support (if community demand exists)
- Standard library development
- Framework integrations
- Migration tooling

**Long-term (2026+):**
- Advanced language features (pattern matching, etc.)
- Performance optimizations
- Ecosystem growth
- Community-driven evolution

---

## Contributing Ideas

Have an idea for GoodScript's future? We'd love to hear it!

1. **Open an issue** describing the feature or direction
2. **Start a discussion** in GitHub Discussions
3. **Prototype it** and share your experiments
4. **Write an RFC** for substantial changes

Remember: GoodScript aims to be *the good parts* of JavaScript with ownership semantics. Features should serve that mission.
