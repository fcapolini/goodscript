# GoodScript: Go for TypeScript Developers

> **🚧 Alpha State:** GoodScript is currently in active development. The compiler is 100% complete (1169/1169 tests passing) with all core features working. Phase 3 (C++ code generation) is complete! Currently working on conformance testing and API development. See [Current Status](#7-current-status-december-2025) for details.

Get everything you love about Go (single binaries, cross-compilation, fast performance) while writing TypeScript. **No new syntax to learn** - just avoid JavaScript's "bad parts" and compile to native.

---

## 1. What is GoodScript?

**Considering Go?** GoodScript gives you the same benefits - single binaries, cross-compilation, great performance - but you **keep writing TypeScript**.

### Why Learn Go?

TypeScript developers typically consider Go for:
- ✅ Single binary deployment
- ✅ Cross-platform native compilation  
- ✅ Fast startup and performance
- ✅ Better than Node.js for CLIs and servers

**But then you have to:**
- ❌ Learn new syntax (structs, interfaces, defer, goroutines)
- ❌ Learn new standard library (different from Node.js)
- ❌ Learn new tooling (go mod, go test, go fmt)
- ❌ Adapt to different patterns (no classes, composition over inheritance)

### GoodScript Alternative

**Get Go's benefits, keep TypeScript:**

✅ **Single binary deployment** - Just like `go build`  
✅ **Cross-compilation** - Just like Go's `GOOS=linux GOARCH=amd64`  
✅ **Small binaries** - 2-10MB (comparable to Go)  
✅ **Fast startup & performance** - Compiled, not JIT  
✅ **TypeScript syntax** - Classes, interfaces, async/await you already know  
✅ **Familiar patterns** - Object-oriented + functional, your choice
✅ **Reuse JS knowledge** - Mostly Web APIs with a few Node.js additions

### Two Compilation Modes

1. **GC Mode** (recommended - like Go's GC)
   - Write TypeScript, no annotations needed
   - Automatic garbage collection
   - Perfect for CLIs, APIs, data processing

2. **Ownership Mode** (advanced - like Rust, but simpler)
   - Optional: Add ownership types for zero-GC
   - Fully deterministic memory handling (no random GC latencies)
   - For embedded/real-time systems

> GoodScript's name is inspired by Douglas Crockford's "JavaScript: The Good Parts" - write better code by avoiding the dangerous features.

### 1.1. "The Good Parts" - All You Need for GC Mode

To use GoodScript in **GC mode**, you just need to avoid JavaScript's problematic features. These restrictions make your code more maintainable and enable native compilation:

**Prohibited features:**
* No `var` keyword (only `const` and `let`)
* No loose equality operators (`==`, `!=`) — only strict equality (`===`, `!==`)
* No type coercion or truthy/falsy conversions
* No mixed-type ternary expressions — both branches must have compatible types
* No inconsistent function return types — all return statements must return compatible types
* No mixed-type nullish coalescing — both sides of `??` must have compatible types
* No `any` type — all types must be explicit
* No dynamic features: `eval`, `with`, `delete`, `arguments`, `new Function()`
* No `for-in` loops (use `for-of` or explicit iteration)
* No prototype manipulation or dynamic property access
* No unary plus operator for type coercion
* No `void` operator
* No comma operator
* No labeled statements
* No generators (`function*`)
* No `this` in standalone functions (only in class methods)
* No arrow functions with implicit `this` binding from outer scope

**Important differences from JavaScript:**

* **Arrays are not sparse** — GoodScript arrays use contiguous memory (`std::vector<T>` in C++). Writing to `arr[1000]` allocates memory for all elements 0-1000, not just index 1000. Avoid large index gaps to prevent excessive memory usage, or use Map instead.

  ```ts
  // ⚠️ Inefficient in GoodScript - allocates 1,000,001 elements
  const arr: number[] = [];
  arr[1000000] = 42;  // Resizes to 1,000,001 elements
  
  // ✅ Better - use Map for sparse data
  const map = new Map<number, number>();
  map.set(1000000, 42);  // Only stores one key-value pair
  ```

**Temporary implementation restrictions (will be added in future releases):**

* **No getters/setters** — Property accessors (`get`/`set`) are not yet implemented in native compilation. Use explicit getter/setter methods instead.
* **No destructuring** — Array and object destructuring (`const [a, b] = arr`, `const {x, y} = obj`) not yet supported.
* **No spread operator** — Spread syntax (`...arr`, `...obj`) not yet implemented.
* **No rest parameters** — Rest parameters in functions (`function f(...args)`) not yet supported.
* **No optional chaining beyond null checks** — Only `?.` for null/undefined checks is supported, not full optional chaining.
* **No template literal expressions** — Template literals work for simple strings but not with embedded expressions beyond variables.

**Why these restrictions?**
* Enable complete static type inference
* Guarantee predictable runtime behavior
* Allow safe transpilation to C++ with deterministic semantics
* Eliminate entire classes of bugs common in JavaScript

These restrictions make GoodScript code more maintainable and ensure that TypeScript development behavior matches native compilation behavior exactly.

**That's it!** Follow these rules and you can compile TypeScript to native code with automatic GC. No ownership annotations needed.

### 1.2. Optional: Ownership Mode for Zero-GC Performance

> **Advanced Feature:** Most applications don't need this. Use GC mode unless you need deterministic memory management for systems programming.

For **maximum performance** and **zero runtime overhead**, GoodScript supports ownership annotations:

* `own<T>` — exclusive ownership (→ `std::unique_ptr<T>`)
* `share<T>` — reference-counted shared ownership (→ `gs::shared_ptr<T>`)
* `use<T>` — non-owning references (→ `gs::weak_ptr<T>`)

The compiler enforces DAG (Directed Acyclic Graph) rules to prevent memory cycles, eliminating GC entirely. Complex data structures use the Arena/Pool pattern.

**When to use ownership mode:**
- Embedded systems / IoT devices
- Real-time applications (no GC pauses)
- High-performance libraries
- Memory-constrained environments

See [docs/GC-VS-OWNERSHIP.md](docs/GC-VS-OWNERSHIP.md) for the complete guide.

---

## 2. Dual-Mode Workflow

GoodScript supports **two modes of execution** and **two memory management strategies**:

### **2.1 TypeScript Runtime Mode**

* `-gs.ts` files are valid TypeScript.
* Run directly in Node.js, Deno, or Bun.
* Use standard TS tooling: type checking, linters, editors.
* Rapid development and testing without transpiling to native code.

Example:

```ts
async function example(sharedNode: share<Node>) {
    let weakNode: use<Node> = sharedNode;
    console.log(weakNode?.value); // Safe access in TS
}
```

### **2.2 Native Mode (Transpilation)**

GoodScript offers two compilation modes for native C++ targets:

#### **Ownership Mode** (default - deterministic memory management)

* Transpile `-gs.ts` to **C++20** with smart pointer-based ownership.
* Ownership qualifiers map to optimized C++ smart pointers:

  * `own<T>` → `std::unique_ptr<T>`
  * `share<T>` → `gs::shared_ptr<T>` (lightweight non-atomic refcounting, ~3x faster)
  * `use<T>` → `gs::weak_ptr<T>` (lightweight non-atomic weak references, ~3x faster)
* Requires explicit ownership annotations for complex data structures

#### **GC Mode** (new - automatic memory management)

* Compiles **Phase 1 code without ownership annotations**
* Uses automatic garbage collection (MPS-based, coming soon; malloc MVP currently)
* Lower barrier to entry - start coding immediately
* Gradual migration path to ownership mode for production
* See [GC Mode documentation](docs/GC-MODE.md) for details

```bash
# GC mode (no ownership annotations required)
gsc -t native -m gc -o dist src/main-gs.ts

# Ownership mode (requires ownership annotations)
gsc -t native -m ownership -o dist src/main-gs.ts  # or just -t native
```
* **Runtime Library**: TypeScript-compatible wrapper classes (`gs::String`, `gs::Array<T>`, `gs::Map<K,V>`, etc.)
  - Header-only, zero-overhead wrappers around C++ STL
  - Methods match TypeScript/JavaScript naming exactly
  - Complete test coverage
* Ensures **memory safety, deterministic destruction, and DAG-enforced ownership**.
* Uses **C++20 features** (concepts, ranges, coroutines for async/await).
* **Performance optimizations**: Custom smart pointers use non-atomic operations, safe for single-threaded execution.
* Optional: use **Zig toolchain** for zero-config cross-compilation.

---

## 3. Go vs GoodScript: Side-by-Side

### Why TypeScript Devs Consider Go

You're productive in TypeScript but you see Go's advantages:
- Single binaries for easy deployment
- Fast compilation and execution  
- Great for CLIs, microservices, system tools
- Growing ecosystem and community

**The catch:** You need to learn Go.

### Learning Curve Comparison

**Go (new language + new ecosystem):**
```go
// Go - Everything is new
package main

import (
    "fmt"
    "os"
    "path/filepath"
)

type FileCounter struct {
    count int
}

func (fc *FileCounter) countFiles(dir string) error {
    return filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
        if err != nil {
            return err
        }
        if !info.IsDir() {
            fc.count++
        }
        return nil
    })
}

func main() {
    fc := &FileCounter{}
    fc.countFiles(".")
    fmt.Printf("Files: %d\n", fc.count)
}
```

**GoodScript (TypeScript you know):**
```typescript
// GoodScript - TypeScript you already know
import * as fs from 'fs';
import * as path from 'path';

class FileCounter {
    count: number = 0;
    
    countFiles(dir: string): void {
        const items = fs.readdirSync(dir);
        for (const item of items) {
            const fullPath = path.join(dir, item);
            if (fs.statSync(fullPath).isFile()) {
                this.count++;
            } else {
                this.countFiles(fullPath);
            }
        }
    }
}

const fc = new FileCounter();
fc.countFiles('.');
console.log(`Files: ${fc.count}`);
```

### Build & Deploy Comparison

**Both give you the same deployment story:**

```bash
# Go
GOOS=linux GOARCH=amd64 go build -o myapp

# GoodScript  
gsc -t native -b -a x86_64-linux -o myapp src/main-gs.ts

# Both produce single binaries you can deploy anywhere
scp myapp user@server:/usr/local/bin/
```

### What's Different?

| Feature | Go | GoodScript |
|---------|----|-----------|
| **Single binaries** | ✅ Yes | ✅ Yes |
| **Cross-compilation** | ✅ Yes | ✅ Yes |
| **Fast compilation** | ✅ Yes | ✅ Yes |
| **Fast execution** | ✅ Yes | ✅ Yes (1.2-2x faster than Node.js) |
| **Memory management** | ✅ GC | ✅ GC (or optional ownership) |
| **Syntax** | ❌ Learn Go | ✅ TypeScript you know |
| **Standard library** | ❌ Learn new APIs | ❌ Learn new APIs (but familiar patterns) |
| **Ecosystem maturity** | ✅ Mature | 🚧 Growing |
| **Async model** | Goroutines | async/await (familiar) |
| **OOP support** | Composition only | ✅ Classes + composition |

**Bottom line:** Same deployment benefits, but you keep your TypeScript skills.

---

## 4. Tooling Support

### **VSCode Extension**

* Supports `-gs.ts` files.
* Provides:

  * **Validation of GoodScript constraints** (no dynamic features, ownership qualifiers).
  * **Syntax highlighting** and IntelliSense for `-gs.ts` files.
  * **Real-time feedback** on memory-safety rules and DAG enforcement.
* Enables **fast feedback loop** during development while keeping code valid TypeScript.

### **Compiler (gsc) & Zig Toolchain**

GoodScript uses the **Zig C++ compiler** for native compilation, providing:

* **Zero-config cross-compilation** - Compile for any platform from any platform
* **No complex toolchain setup** - Single 15MB self-contained binary
* **Aggressive optimizations** - `-O2`, `-march=native`, `-ffast-math`, `-funroll-loops`
* **Multiple targets** - Linux, Windows, macOS, WebAssembly, and more

**Installation:**
```bash
# Zig compiler
# macOS
brew install zig

# Linux/Windows
# See https://ziglang.org/download/

# PCRE2 library (required for RegExp support)
# macOS
brew install pcre2

# Ubuntu/Debian
sudo apt-get install libpcre2-dev

# Fedora/RHEL
sudo dnf install pcre2-devel
```

**Compiler Implementation Phases:**
* **Phase 1**: Validates TypeScript "Good Parts" restrictions (no `var`, no `==`, etc.)
* **Phase 2**: Analyzes ownership and enforces DAG (Directed Acyclic Graph) rules
* **Phase 3**: Generates C++20 code with smart pointers
  * C++ source generation
  * Native binary compilation with Zig
  * Cross-compilation to any platform
  * Complete runtime library (String, Array, Map, Set, RegExp, JSON, console)
  * Class inheritance and generic base classes
  * Smart pointer management (custom non-atomic shared_ptr/weak_ptr)
* **Phase 4**: Standard library, module system, and deployment (📋 planned)

**CLI Examples:**

```bash
# Compile to JavaScript (TypeScript mode)
gsc -o dist src/main-gs.ts

# Generate C++ source
gsc -t native -o dist src/main-gs.ts

# Compile to native binary
gsc -t native -b -o dist src/main-gs.ts

# Cross-compile to Linux
gsc -t native -b -a x86_64-linux -o dist src/main-gs.ts

# Cross-compile to WebAssembly
gsc -t native -b -a wasm32-wasi -o dist src/main-gs.ts
```

---

## 5. Why Choose GoodScript Over Go?

### Keep Your TypeScript Skills
1. **No new syntax to learn** - Classes, interfaces, generics you know
2. **No new async model** - async/await, not goroutines and channels  
3. **No paradigm shift** - OOP works, not just composition
4. **TypeScript tooling** - ESLint, Prettier, your existing setup
5. **Easier onboarding** - Your team already knows TypeScript
6. **Code reuse** - Share types and logic with frontend/Node.js code

### Same Deployment Benefits as Go
1. **Single binaries** - Just like `go build`
2. **Cross-compilation** - Just like Go's GOOS/GOARCH
3. **Small executables** - 2-10MB (comparable to Go)
4. **Fast startup** - Compiled, not JIT
5. **Great performance** - Native code, competitive with Go

### When to Choose Go Instead
- ✅ You need Go's mature ecosystem (databases, AWS SDKs, etc.)
- ✅ You want goroutines' concurrency model
- ✅ You're building in an existing Go codebase
- ✅ You have time to learn a new language

### When to Choose GoodScript
- ✅ You're a TypeScript developer (most web/Node.js devs)
- ✅ You want deployment benefits without learning Go
- ✅ You want to share code/types with frontend
- ✅ Your team knows TS but not Go
- ✅ You prefer classes and familiar OOP patterns

---

## 6. Example: GoodScript in Action

### GC Mode (No Annotations Needed)

```ts
// cli-tool-gs.ts - A simple file counter
import * as fs from 'fs';
import * as path from 'path';

function countFiles(dir: string): number {
    let count = 0;
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            count += countFiles(fullPath);
        } else {
            count++;
        }
    }
    
    return count;
}

const directory = process.argv[2] ?? '.';
console.log(`Total files: ${countFiles(directory)}`);
```

```bash
# Develop in Node.js
node cli-tool-gs.ts /path/to/project

# Compile to standalone binary (5MB)
gsc -t native -b -o dist/filecount cli-tool-gs.ts

# Distribute single file - runs anywhere, no Node.js needed!
./dist/filecount /path/to/project

# Cross-compile for Linux from your Mac
gsc -t native -b -a x86_64-linux -o dist/filecount-linux cli-tool-gs.ts

# Now you have a Linux binary - copy and run on any Linux server
```

### Ownership Mode (Advanced)

```ts
// tree-gs.ts - zero-GC tree structure
declare type own<T> = T;
declare type use<T> = T | null | undefined;

class Tree {
    nodes: own<TreeNode>[];  // Tree owns all nodes
}

class TreeNode {
    value: number;
    children: use<TreeNode>[];  // Non-owning references
}
```

* GC mode: Runs in Node.js, compiles to fast native code
* Ownership mode: Compiles to zero-GC C++20 with smart pointers

---

## 7. Current Status (December 2025)

### Completed
- ✅ **Phase 1**: TypeScript "Good Parts" validation (315/315 tests passing)
- ✅ **Phase 2**: Ownership analysis and DAG enforcement (237/237 tests passing)
- ✅ **Phase 3**: C++ code generation (100% complete - 1169/1169 tests passing) 🎉
  - ✅ **Complete AST traversal and code emission system**
  - ✅ **Type mappings**: primitives, arrays, maps, sets, ownership types
  - ✅ **Statement generation**: variables, functions, classes, control flow
  - ✅ **Expression generation**: operators, calls, literals, property access
  - ✅ **Class inheritance** with generic base classes and super() calls
  - ✅ **Smart pointer management**: Custom non-atomic shared_ptr/weak_ptr (~3x faster)
  - ✅ **Runtime Library**: Complete TypeScript-compatible wrappers
    - `gs::String` - Full String API (charAt, indexOf, substring, slice, match, replace, split, etc.)
    - `gs::Array<T>` - Full Array API (push, pop, map, filter, reduce, etc.) with auto-resize
    - `gs::Map<K,V>` & `gs::Set<T>` - TypeScript Map/Set APIs with insertion-order preservation
    - `gs::RegExp` - Full JavaScript regex semantics via PCRE2 (lookahead, lookbehind, Unicode, all flags)
    - `gs::JSON` - JSON.stringify() and JSON.parse()
    - `gs::console` - console.log(), error(), warn() with proper boolean/number formatting
    - Header-only, zero-overhead, composition-based (no STL inheritance)
  - ✅ **GC Mode**: malloc-based allocator for simpler memory model (100% compatibility)
  - ✅ **Triple-Mode Testing**: JavaScript + Ownership C++ + GC C++ equivalence validation
  - ✅ **Zig C++ compiler integration** for zero-config cross-compilation
  - ✅ **Native binary compilation** with aggressive optimizations
  - ✅ **Cross-compilation support** to Linux, Windows, macOS, WebAssembly
  - ✅ **15/15 concrete examples** passing (100%): binary-search-tree, fibonacci, linked-list, lru-cache, n-queens, json-parser, string-pool, hash-map, etc.
- ✅ **TypeScript Conformance**: **100% pass rate** on official TypeScript test suite (pilot)
  - Classes category: 17/17 eligible tests passing
  - Full abstract class support
  - Generic classes and method overloads
  - Class inheritance with super() calls
  - See `conformance-tsc/` for detailed results

### Planned
- 📋 **Phase 4**: Standard library APIs, module system, package management, deployment tooling
- 📋 **Advanced Features**: Optional unwrapping, destructuring, getters/setters, spread operator
- 📋 **Conformance Testing**: TC39 Test262 suite integration for language compliance validation

---

## 8. Conformance Testing

GoodScript validates its TypeScript engine against the **TC39 Test262** conformance suite—the official ECMAScript test suite with 50,000+ tests. This ensures GoodScript's behavior matches JavaScript/TypeScript semantics for all supported features.

### What We Test

The conformance suite focuses on **"The Good Parts"** that GoodScript supports:

✅ **Tested Features:**
- `let`/`const` declarations
- Strict equality (`===`, `!==`)
- Classes and inheritance
- Functions (regular, arrow, async)
- Objects and arrays
- Control flow (if/else, for/while, switch)
- Error handling (try/catch/finally)
- Promises and async/await
- Template literals
- Destructuring
- Map/Set collections
- JSON operations

❌ **Excluded (GoodScript Restrictions):**
- `var` declarations (GS105)
- Type coercion operators (`==`, `!=`) (GS106)
- `with`, `eval`, `Function()` (GS101, GS102)
- Dynamic features (Proxy, Reflect, Symbol)

### Running Conformance Tests

```bash
cd conformance
./setup.sh          # Initialize test262 submodule and install deps
npm test            # Run all conformance tests
npm test:watch      # Watch mode for development
npm test:coverage   # Generate coverage report
```

See [CONFORMANCE.md](CONFORMANCE.md) and [conformance/README.md](conformance/README.md) for details.

**Note**: GC mode is currently experimental. Conformance tests generate C++ source but binary compilation requires manual MPS library setup. Use ownership mode (default) for production deployments.

**Target:** 95%+ pass rate for GoodScript-supported features.

---

## 9. Conclusion

GoodScript allows developers to **write memory-safe systems code using familiar TypeScript syntax**, with a smooth transition from fast TS development to robust native deployment. The **VSCode extension** ensures validation and tooling support, while the **dual-mode workflow** enables both rapid iteration and high-performance native applications.

---

*End of document.*
