# GoodScript - Market Positioning

**Version:** 0.12.0  
**Last Updated:** December 8, 2025

## Executive Summary

**GoodScript is TypeScript for full-stack development across any platform.**

Write clean, type-safe TypeScript once and deploy to native (C++/WASM), web (JavaScript), JVM, .NET, Python, PHP, and more. Share code between frontend and backend with guaranteed type safety and consistent behavior across all targets.

## Core Value Proposition

### Primary Message

**"Write TypeScript, deploy anywhere - frontend, backend, native"**

One codebase, any stack. No polyglot complexity, no type system impedance, no duplicate validation logic.

### Key Differentiators

1. **True Full-Stack TypeScript**: Share models, validation, and business logic between client and server
2. **Universal Platform Support**: 10+ compilation targets via C++ and Haxe backends
3. **Performance When Needed**: Optional ownership mode for Rust-level performance
4. **Familiar Syntax**: Pure TypeScript (the good parts) - no new language to learn
5. **Progressive Enhancement**: Start with GC mode, optimize with ownership when needed

## The Full-Stack Story

### Problem We Solve

Modern applications require maintaining separate codebases for frontend and backend:

```typescript
// ❌ Traditional: Duplicate code, different languages
// frontend/validation.ts (TypeScript)
function validateEmail(email: string): boolean { ... }

// backend/validation.php (PHP)
function validate_email($email) { ... }
// Different implementations, bugs diverge, types don't match
```

```typescript
// ✅ GoodScript: Write once, deploy everywhere
// shared/validation.gs
export function validateEmail(email: string): boolean { ... }

// Compile to any backend + frontend combination
gsc --target php backend/      // PHP backend
gsc --target js frontend/      // JavaScript frontend
// Same validation logic, guaranteed consistency
```

### Real-World Use Cases

#### 1. **WordPress/PHP Hosting (Commodity Hosting)**

**Scenario**: Indie developer or small business with $5/month shared hosting

```bash
# Write everything in TypeScript
gsc --target php backend/api/
gsc --target js frontend/

# Deploy to cheap PHP hosting
# Get type safety, modern tooling, shared validation
# No Node.js required, works with existing WordPress infrastructure
```

**Impact**: TypeScript developers can now target the massive PHP hosting market without learning PHP.

#### 2. **Enterprise Migration**

**Scenario**: Legacy Java/C# codebase with React frontend

```bash
# Gradually migrate backend to TypeScript
gsc --target jvm backend/     # Compiles to JVM bytecode
# OR
gsc --target csharp backend/  # Compiles to C#

# Share types with existing TypeScript frontend
import { User } from '@shared/models';  // Works in both!
```

**Impact**: Reduce polyglot complexity, unify type systems, share code between teams.

#### 3. **High-Performance Services**

**Scenario**: API gateway, database, or compute-heavy service

```bash
# Use ownership mode for zero-cost abstractions
gsc --target cpp --memory ownership backend/service/
gsc --compile -o service

# Native binary with Rust-level performance
# But written in familiar TypeScript syntax
```

**Impact**: Go/Rust performance without the learning curve.

#### 4. **Full-Stack Flexibility**

**Scenario**: Startup that needs to adapt as it grows

```typescript
// One codebase: shared/models/user.gs
export interface User {
  id: integer;
  name: string;
  email: string;
}

export function validateUser(user: User): boolean { ... }
```

**Deployment evolution**:
```bash
# Stage 1: MVP on cheap hosting
gsc --target php backend/
gsc --target js frontend/

# Stage 2: Scale to cloud
gsc --target cpp backend/ --compile  # Native binary
gsc --target js frontend/

# Stage 3: Mobile app
gsc --target csharp backend/  # Unity backend
gsc --target js frontend/     # React Native

# Same validation, types, business logic throughout
```

**Impact**: No rewrites as you scale. Pay for performance when you need it.

#### 5. **Polyglot Organizations**

**Scenario**: Company with mixed technology stacks (JVM, .NET, Python, Node.js)

```bash
# Write shared libraries in GoodScript
# Compile to each platform's native format
gsc --target jvm libs/validation/     # Use from Java/Kotlin
gsc --target csharp libs/validation/  # Use from C#/F#
gsc --target python libs/validation/  # Use from Python
gsc --target js libs/validation/      # Use from Node.js/Deno

# One source of truth, works everywhere
```

**Impact**: Reduce duplicate implementations, ensure consistency, centralize business logic.

## Competitive Landscape

### Primary Competitors: Go and Rust

GoodScript positions against systems languages while offering unique advantages:

#### vs. **Go**

| Aspect | Go | GoodScript |
|--------|----|-----------| 
| **Syntax** | Go-specific | TypeScript (familiar to millions) |
| **Learning Curve** | New language | Leverage existing TS knowledge |
| **Platforms** | Native binaries only | Native + JVM + .NET + Python + PHP + more |
| **Type System** | Simple, limited generics | Rich, structural typing + ownership |
| **Ecosystem** | Go packages | npm ecosystem (largest in the world) |
| **Use Case** | Backend services | Full-stack (frontend + backend + native) |

**Message**: *"Like Go, but with TypeScript syntax and 10x more deployment targets"*

#### vs. **Rust**

| Aspect | Rust | GoodScript |
|--------|------|-----------| 
| **Learning Curve** | Steep (borrow checker) | Gradual (start GC, add ownership later) |
| **Memory Safety** | Always required | Optional (ownership mode) |
| **Platforms** | Native + WASM | Native + WASM + JVM + .NET + more |
| **Productivity** | Fighting borrow checker | TypeScript familiarity |
| **Performance** | Maximum | Equal in ownership mode, easier in GC mode |
| **Full-Stack** | Limited | Native + any backend + any frontend |

**Message**: *"Rust-level safety when you need it, TypeScript simplicity when you don't, plus platforms Rust can't reach"*

### Secondary Competitors

#### vs. **TypeScript/Node.js**

**GoodScript adds**: Native compilation, ownership mode, true multi-platform backends (not just Node.js)

**Message**: *"All of TypeScript's benefits, plus compile to native and any platform"*

#### vs. **Haxe**

**GoodScript improves**: Better syntax (TypeScript vs Haxe), stronger type system (ownership), larger ecosystem (npm vs Haxelib)

**Message**: *"Haxe's cross-platform power with TypeScript syntax and ownership semantics"*

#### vs. **Kotlin Multiplatform**

**GoodScript adds**: TypeScript syntax (larger community), broader platform support (PHP, Python), frontend JavaScript compatibility

**Message**: *"True cross-platform TypeScript, not just JVM languages"*

#### vs. **Dart/Flutter**

**GoodScript adds**: TypeScript syntax, backend compilation (not just mobile), ownership mode, broader platform support

**Message**: *"Full-stack TypeScript for any platform, not just mobile"*

## Target Audiences

### 1. **TypeScript Developers** (Primary)

**Pain Point**: "I love TypeScript but need to deploy to [native/JVM/PHP/etc.]"

**Value**: Use existing skills, access new platforms, no new language to learn.

**Entry Point**: Start with JS target (familiar), expand to native/other platforms.

### 2. **Full-Stack Developers** (Primary)

**Pain Point**: "Maintaining separate frontend/backend codebases is error-prone and slow"

**Value**: Write once, type-safe end-to-end, shared validation/models/logic.

**Entry Point**: PHP backend + JS frontend (immediate productivity).

### 3. **Enterprise Teams** (Secondary)

**Pain Point**: "Polyglot codebases are expensive to maintain and hard to hire for"

**Value**: Unify around TypeScript, reduce tooling complexity, share code across platforms.

**Entry Point**: Gradual migration from Java/C# to GoodScript (compiles to same targets).

### 4. **Systems Programmers** (Secondary)

**Pain Point**: "Go/Rust are powerful but have steep learning curves or limited expressiveness"

**Value**: TypeScript syntax, optional ownership mode, competitive performance.

**Entry Point**: C++ backend with ownership mode (Rust alternative).

### 5. **Indie Developers / Startups** (Tertiary)

**Pain Point**: "Need to move fast, deploy cheaply, scale later"

**Value**: Start on commodity hosting (PHP), scale to native when needed, same codebase.

**Entry Point**: PHP backend for cheap hosting, migrate to C++ as you grow.

## Key Messages by Audience

### For TypeScript Developers
> "Take your TypeScript skills to native, mobile, backend - any platform you need"

### For Full-Stack Teams
> "Stop duplicating validation logic. Write TypeScript once, deploy to any stack"

### For Enterprise
> "Unify your polyglot codebase around TypeScript. Compile to JVM, .NET, native, or web"

### For Systems Programmers
> "TypeScript syntax, Rust-level performance, more platforms than Go or Rust"

### For PHP Developers
> "Modernize your codebase with TypeScript. Deploy to existing PHP infrastructure"

## What NOT to Say

❌ **"We're better than Go/Rust at everything"** (sounds arrogant, not credible)

❌ **"We compile to everything!"** (sounds scattered, no focus)

❌ **"Just another transpiler"** (undersells the value)

❌ **"TypeScript with restrictions"** (negative framing, focus on "good parts" benefits instead)

## What TO Say

✅ **"Write TypeScript, deploy anywhere - frontend, backend, native"**

✅ **"Full-stack TypeScript with true cross-platform compilation"**

✅ **"The cross-platform systems language with TypeScript syntax"**

✅ **"From web to native to JVM - one codebase, any target"**

✅ **"Share validation, models, and logic across your entire stack"**

## Strategic Architecture

### Three-Tier Platform Strategy

```
┌─────────────────────────────────────────────────────┐
│     GoodScript Source (-gs.ts / -gs.tsx)            │
│         (Clean TypeScript Subset)                    │
└─────────────────────────────────────────────────────┘
                      ↓
            ┌─────────┴─────────┐
            ↓                   ↓
   ┌────────────────┐   ┌──────────────────┐
   │  C++ Backend   │   │  Haxe Backend    │
   │                │   │ (Multi-Target)   │
   ├────────────────┤   ├──────────────────┤
   │ • Native       │   │ • JVM            │
   │ • WASM         │   │ • C#/.NET        │
   │ • Ownership    │   │ • Python         │
   │ • Max Perf     │   │ • PHP            │
   │                │   │ • Lua            │
   │                │   │ • HashLink       │
   │                │   │ • JavaScript     │
   │                │   │ • (10+ targets)  │
   └────────────────┘   └──────────────────┘
```

**Message**: Two backends, unlimited reach. C++ for performance, Haxe for breadth.

### Backend Selection Guide

| Need | Backend | Output | Mode |
|------|---------|--------|------|
| **Maximum performance** | C++ | Native binary | Ownership |
| **Easy deployment** | C++ | Native binary | GC |
| **Web frontend** | Haxe | JavaScript | GC |
| **Web backend** | Haxe | PHP/Node.js | GC |
| **Enterprise JVM** | Haxe | JVM bytecode | GC |
| **Enterprise .NET** | Haxe | C#/IL | GC |
| **Data pipelines** | Haxe | Python | GC |
| **Game development** | Haxe | C#/Lua/HashLink | GC |
| **Mobile (Unity)** | Haxe | C# | GC |
| **Browser (WASM)** | C++ | WebAssembly | GC |

## Why This Isn't Feature Dilution

**Concern**: "Supporting 10+ platforms dilutes focus"

**Reality**: Strategic flanking against Go/Rust

- **Go/Rust strength**: Native performance
- **Go/Rust limitation**: Limited cross-platform reach
- **GoodScript position**: Native performance (via C++) + universal deployment (via Haxe)

This is **differentiation**, not dilution. We're not trying to be better than Go/Rust at native performance - we're matching them there while offering something they can't: true full-stack, multi-platform TypeScript.

### The Platform Matrix

|  | Native | JVM | .NET | Python | PHP | Web |
|--|--------|-----|------|--------|-----|-----|
| **Go** | ✅ | ❌ | ❌ | ❌ | ❌ | ⚠️ (WASM only) |
| **Rust** | ✅ | ❌ | ❌ | ❌ | ❌ | ⚠️ (WASM only) |
| **TypeScript** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Haxe** | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **GoodScript** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

GoodScript is the only option that covers all platforms with TypeScript syntax.

## The Haxe Backend: Implementation Detail, Not Brand

**User-facing**: "GoodScript compiles to JVM"

**Internal**: "via Haxe backend"

Users don't need to know or care about Haxe. They see:

```bash
gsc --target jvm myapp.gs      # JVM output
gsc --target csharp myapp.gs   # C# output  
gsc --target python myapp.gs   # Python output
```

Haxe is **strategic infrastructure** that enables our "deploy anywhere" promise without building 10+ separate backends.

### Benefits of Haxe-as-Infrastructure

1. **Leverage 15+ years** of cross-platform battle-testing
2. **Standard library foundation**: Proven abstractions for file I/O, networking, etc.
3. **Reduced maintenance**: One backend → many targets
4. **Faster time-to-market**: Don't need to become JVM/CLR/CPython experts
5. **Community resources**: Access to Haxelib ecosystem
6. **Type safety alignment**: Haxe's strict mode (`-D nullSafety`, `-D no-dynamic`) perfectly matches GoodScript's restrictions
7. **Performance on typed targets**: No dynamic type overhead on JVM/C#/etc.

### Strict Compilation Mode

The Haxe backend always compiles with strict flags for maximum safety and performance:

**Compilation flags**:
- **`-D nullSafety`**: Strict null checking (enforces `Null<T>` annotations)
- **`-D no-dynamic`**: Disallows `Dynamic` type, ensuring full static typing

**Why this matters**:

| GoodScript Restriction | Haxe Strict Mode | Benefit |
|------------------------|------------------|---------|
| No `any` type (GS109) | `-D no-dynamic` | Forces static typing, enables JVM/C# optimization |
| Explicit null handling | `-D nullSafety` | Compile-time null safety, prevents NPEs |
| Strong typing throughout | Both flags combined | Zero dynamic dispatch overhead |

**Performance impact**: Statically-typed targets (JVM, C#, native) can fully optimize without boxing/unboxing or runtime type checks. Code runs as fast as hand-written Java/C# with GoodScript's safety guarantees.

## Standard Library Strategy

### Haxe-Based Foundation

Instead of building cross-platform APIs from scratch, align GoodScript's standard library with Haxe's design:

```typescript
// @goodscript/io (wraps Haxe sys.io.File)
export class File {
  static readText(path: string): string { ... }
  static writeText(path: string, content: string): void { ... }
}

// Compiles to:
// - C++: Custom implementation (performance-critical)
// - JVM/C#/Python/PHP: sys.io.File.getContent() (Haxe stdlib)
```

**Benefits**:
- One stdlib implementation → works on all Haxe targets
- Only write custom implementations for C++ (when performance matters)
- Proven APIs that work everywhere
- Maintained by Haxe team, not us

### Error Handling: Dual API Pattern

GoodScript stdlib uses a **dual API pattern** for consistent, user-friendly error handling:

**Pattern**: Every fallible operation provides two variants:

1. **Throwing variant** (default, ergonomic):
   ```typescript
   // Throws exception on error
   const content = File.readText('data.txt');
   const data = Http.request('https://api.example.com');
   const item = array.at(5);
   ```

2. **Non-throwing variant** (`try*` prefix):
   ```typescript
   // Returns null on error
   const content = File.tryReadText('data.txt');
   if (content !== null) {
     process(content);
   }
   
   const data = Http.tryRequest('https://api.example.com');
   const item = array.tryAt(5);
   ```

**Naming convention**:
- **Default**: `operation()` - throws on error
- **Opt-in**: `tryOperation()` - returns `T | null`

**Implementation strategy**:

```typescript
// Public API (backend-agnostic)
export class File {
  // Throwing variant (wraps tryReadText)
  static readText(path: string): string {
    const result = this.tryReadText(path);
    if (result === null) {
      throw new Error(`Failed to read file: ${path}`);
    }
    return result;
  }
  
  // Non-throwing variant (backend-specific implementation)
  static tryReadText(path: string): string | null {
    // Haxe backend: maps to sys.io.File.getContent() (returns Null<String>)
    // C++ backend: custom implementation
  }
}
```

**Rationale**:
- **User choice**: Simple cases use throwing API, expected errors use `try*`
- **Backend alignment**: Haxe's nullable APIs map directly to `tryX()` methods
- **Performance**: C++ backend can optimize `tryX()` without exception overhead
- **Familiar**: Matches TypeScript conventions (`parseInt()` throws, `Number()` returns NaN)
- **Extensible**: Can add Result types later without breaking changes

**Examples across stdlib**:

| Module | Throwing API | Non-Throwing API |
|--------|--------------|------------------|
| `@goodscript/io` | `File.readText()` | `File.tryReadText()` |
| `@goodscript/http` | `Http.request()` | `Http.tryRequest()` |
| `@goodscript/core` | `Array.at(i)` | `Array.tryAt(i)` |
| `@goodscript/json` | `JSON.parse()` | `JSON.tryParse()` |
| `@goodscript/process` | `Process.execute()` | `Process.tryExecute()` |

This pattern provides **consistent error handling** across all stdlib modules while preserving flexibility and performance.

## Go-to-Market Strategy

### Phase 1: Foundation (Current)
- ✅ Core compiler (validator, IR, optimizer)
- ✅ C++ backend with GC and ownership modes
- ✅ Zig compiler integration
- 🚧 CLI tool
- 🚧 Runtime library

### Phase 2: Multi-Platform Enablement
- 🎯 Haxe backend implementation
- 🎯 Haxe-based standard library
- 🎯 Full-stack examples (PHP + JS, JVM + JS, etc.)

### Phase 3: Developer Experience
- 🎯 IDE support (LSP server)
- 🎯 Debugging tools
- 🎯 Package manager integration

### Phase 4: Community & Ecosystem
- 🎯 Documentation and tutorials
- 🎯 Full-stack framework templates
- 🎯 Plugin ecosystem

## Success Metrics

### Early Adoption Indicators
- Developers coming from **TypeScript** (seeking multi-platform)
- Developers coming from **PHP** (seeking type safety + modern tooling)
- Full-stack projects using shared GoodScript code

### Platform Distribution Goals
- **50%**: C++ backend (performance use cases)
- **30%**: Haxe/PHP (commodity hosting, full-stack)
- **10%**: Haxe/JVM or Haxe/C# (enterprise)
- **10%**: Other Haxe targets (Python, Lua, etc.)

### Community Growth
- npm weekly downloads
- GitHub stars/forks
- Full-stack templates created
- Third-party libraries published

## Risks & Mitigations

### Risk: "Too many platforms to support"

**Mitigation**: Haxe handles platform-specific details. We maintain two backends (C++, Haxe), not 10+.

### Risk: "Haxe has smaller community than TypeScript"

**Mitigation**: Haxe is infrastructure, not user-facing. Users see "TypeScript → JVM", not "Haxe".

### Risk: "Performance perception vs Go/Rust"

**Mitigation**: Benchmarks showing C++ backend with ownership mode matches Rust. Position as "performance when you need it, ease when you don't".

### Risk: "TypeScript developers don't care about native"

**Mitigation**: Lead with full-stack story (PHP backend + JS frontend), not C++ performance.

## Tagline Candidates

1. **"Write TypeScript, deploy anywhere"** (simple, clear)
2. **"Full-stack TypeScript for every platform"** (emphasizes full-stack)
3. **"TypeScript that compiles to everything"** (bold, memorable)
4. **"One TypeScript codebase, any stack"** (practical benefit)
5. **"The universal TypeScript compiler"** (authoritative)

**Recommendation**: #1 or #4 - clear, benefit-focused, not overselling.

## Elevator Pitch

**30 seconds:**
> "GoodScript lets you write TypeScript once and deploy it anywhere - native binaries, web, mobile, JVM, .NET, PHP, Python, and more. Share validation logic, models, and business rules between frontend and backend with guaranteed type safety. Start with our GC mode for easy development, switch to ownership mode when you need Rust-level performance. It's TypeScript for full-stack development across any platform."

**10 seconds:**
> "Write TypeScript, deploy to native, web, JVM, .NET, PHP - one codebase, any stack."

---

**Document Status**: Living document, updated as positioning evolves  
**Next Review**: After Haxe backend implementation  
**Feedback**: Open issues on GitHub or discuss in community forums
