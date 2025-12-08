# GoodScript Compiler Architecture

**Version:** 0.12.0

## Overview

The GoodScript compiler is a multi-phase compiler that transforms TypeScript source code into either native C++ code or transpiled JavaScript, with comprehensive static analysis and optimization. It supports ES module syntax for proper code organization and reusability.

## Module System

GoodScript uses **ES modules** for code organization, matching TypeScript/JavaScript conventions:

```typescript
// math.gs - Export declarations
export function add(a: number, b: number): number {
  return a + b;
}

export const PI = 3.14159;

// main.gs - Import and use
import { add, PI } from './math.js';
console.log(add(1, 2));
```

### Module Resolution

- **Relative imports**: `./math.js`, `../utils/helper.js`
- **Package imports**: `@goodscript/stdlib`, `mylib`
- **Extensions**: `.gs` files, resolved like TypeScript (`.js` extension in imports)
- **Index files**: `./utils` resolves to `./utils/index.gs`

### Compilation Strategy

**Per-Module Compilation**:
1. Build dependency graph from imports
2. Analyze each module independently (with type information from dependencies)
3. Compile modules in topological order
4. Generate output files maintaining module structure

**Incremental Builds**:
- Hash each module's source and dependencies
- Skip unchanged modules
- Parallel compilation of independent modules

### Output Format

#### JavaScript/TypeScript Target
```bash
gsc --target js src/
```

Generates one `.js`/`.ts` file per module:
```
src/
  math.gs → dist/math.js
  main.gs → dist/main.js
```

Standard ES modules, works with Node.js, Deno, browsers.

#### C++ Target
```bash
gsc --target cpp src/
```

Generates header/source pairs:
```
src/
  math.gs → build/math.hpp + build/math.cpp
  main.gs → build/main.cpp
```

**Module → Namespace mapping**:
```cpp
// math.gs exports
namespace goodscript::math {
  double add(double a, double b);
  constexpr double PI = 3.14159;
}

// main.gs imports
#include "math.hpp"
using namespace goodscript;

int main() {
  std::cout << math::add(1, 2);
}
```

**Build System Integration**:
The compiler generates a `CMakeLists.txt` or Makefile for linking:
```cmake
add_library(math math.cpp)
add_executable(main main.cpp)
target_link_libraries(main PRIVATE math)
```

### Module IR Structure

```typescript
interface IRProgram {
  modules: IRModule[];  // One per source file
}

interface IRModule {
  path: string;                    // Absolute path to source file
  declarations: IRDeclaration[];   // Top-level declarations
  imports: IRImport[];             // Import statements
  exports: IRExport[];             // Export statements
}

interface IRImport {
  from: string;                          // Module specifier
  names: Array<{                         // Imported names
    name: string;      // Original name
    alias?: string;    // Local alias (import { x as y })
  }>;
  isDefault?: boolean;                   // Default import
}

interface IRExport {
  name: string;              // Exported name
  declaration?: IRDeclaration;  // Inline export
  from?: string;             // Re-export from another module
}
```

### Cross-Module Analysis

**Type Checking**:
- Parse all modules first
- Build symbol table with cross-module references
- Type-check expressions using imported symbols

**Ownership Analysis**:
- Track ownership across module boundaries
- `own<T>` can only be passed between modules via transfer (move semantics)
- `share<T>` can be shared freely
- `use<T>` validated within module scope

**Example**:
```typescript
// buffer.gs
export class Buffer {
  data: own<ArrayBuffer>;
}

// main.gs
import { Buffer } from './buffer.js';

let buf: own<Buffer> = new Buffer();  // OK: own<T> created
let shared: share<Buffer> = buf;      // Error: can't share own<T>
```

## Compilation Pipeline

```
Source Code (TypeScript)
         ↓
    [Parser] ─────────── TypeScript Compiler API
         ↓
   TypeScript AST
         ↓
  [Phase 1: Validator] ─ Enforce "Good Parts" restrictions
         ↓
   Validated AST
         ↓
  [Phase 2a: Ownership] ─ Analyze ownership semantics
         ↓
  [Phase 2b: Null Check] ─ Verify use<T> safety
         ↓
  [Phase 2c: Type Sig] ── Generate structural type signatures
         ↓
  [Phase 3: Lowering] ─── Convert AST → IR
         ↓
   IR (Intermediate Representation)
         ↓
  [Phase 4: Optimizer] ── SSA, constant folding, DCE
         ↓
   Optimized IR
         ↓
  [Phase 5: Codegen] ──┬─ C++ Backend
                       └─ TypeScript Backend
         ↓
   Output Code
```

## Phase Details

### Phase 1: Validation

**Purpose**: Enforce GoodScript language restrictions ("Good Parts")

**Input**: TypeScript AST  
**Output**: Validated AST + diagnostics

**Checks**:
- GS101-GS116, GS126: Language restrictions
- Reports all violations with error codes and messages

**Implementation**: `src/frontend/validator.ts`

**Example**:
```typescript
// Input
var x = 1;  // ❌

// Diagnostic
Error GS105: "var" keyword is forbidden - use "const" or "let"
```

### Phase 2a: Ownership Analysis

**Purpose**: Verify ownership semantics and detect cycles

**Input**: Validated AST  
**Output**: Ownership graph + cycle errors

**Checks**:
- `own<T>` uniqueness violations
- `share<T>` reference cycle detection (DAG requirement)
- `use<T>` lifetime validation

**Implementation**: `src/analysis/ownership.ts` (stub)

**Error Codes**: GS301-GS399

### Phase 2b: Null Safety

**Purpose**: Verify `use<T>` references are always valid

**Input**: Ownership-validated AST  
**Output**: Null-safety diagnostics

**Checks**:
- `use<T>` must point to live `own<T>` or `share<T>`
- No dangling references
- Proper initialization order

**Implementation**: `src/analysis/nullchecker.ts` (stub)

**Error Codes**: GS401-GS499

### Phase 2c: Type Signatures

**Purpose**: Generate canonical structural type signatures

**Input**: Type information  
**Output**: Type signature map

**Features**:
- Structural typing (duck typing)
- Deterministic type hashing
- Interface compatibility checking
- Property/method normalization

**Implementation**: `src/ir/signatures.ts`

**Example**:
```typescript
interface Drawable { draw(): void; }
interface Renderable { draw(): void; }

// Both generate: hash "3a8f2c1d", signature "draw():void"
// → Structurally compatible
```

### Phase 3: IR Lowering

**Purpose**: Convert TypeScript AST to typed IR

**Input**: Validated AST  
**Output**: IR program structure

**Handles**:
- Declarations (functions, classes, interfaces, consts)
- Expressions (literals, binary/unary, calls, members)
- Type annotations (primitives, ownership, generics)
- Control flow (if, while, for, switch, return)
- **Source location tracking**: Preserve file/line/column for debugging

**Source Location Tracking**:

Each IR node includes optional source location information:

```typescript
interface SourceLocation {
  file: string;    // Absolute path to source file
  line: number;    // 1-based line number
  column: number;  // 1-based column number
}

interface IRDeclaration {
  // ... other fields
  source?: SourceLocation;
}

interface IRExpr {
  // ... other fields
  source?: SourceLocation;
}
```

This information is extracted from TypeScript AST and preserved through all compilation phases for source map generation.

**Implementation**: `src/frontend/lowering.ts`

**IR Structure**:
```typescript
IRProgram
├── IRModule[]
    ├── IRDeclaration[] (function, class, interface, const)
    ├── IRImport[]
    └── IRExport[]
```

### Phase 4: Optimization

**Purpose**: Optimize IR for performance and size

**Input**: IR program  
**Output**: Optimized IR

**Passes** (planned):
- Constant folding
- Dead code elimination (DCE)
- Common subexpression elimination (CSE)
- Inline expansion
- SSA optimizations

**Implementation**: `src/optimizer/` (stubs)

### Phase 5: Code Generation

**Purpose**: Generate target code from optimized IR

**Backends**:

#### C++ Backend

**Target**: Modern C++ (C++17/20)

**Memory Management Modes**:

The C++ backend supports two memory management strategies, selected via compiler flag:

##### GC Mode (`--memory=gc`, default)

Uses garbage collection for automatic memory management:

```bash
gsc --target cpp input.gs
# or explicitly: gsc --target cpp --memory gc input.gs
```

**Type Mapping**:
- `own<T>` → `T*` (GC-managed pointer)
- `share<T>` → `T*` (GC-managed pointer, cycles allowed)
- `use<T>` → `T*` (GC-managed pointer)
- All heap objects tracked by collector

**GC Implementation**: Memory Pool System (MPS)
- Vendored in `compiler/vendor/mps/` (version 1.118.0)
- Industrial-strength GC (generational, incremental, precise)
- Proven performance in GoodScript v0.11
- Compiled on-the-fly: `zig cc -O2 -c mps.c -o mps.o` (~1-2 seconds)
- BSD 2-clause license

**Benefits**:
- Allows cyclic `share<T>` references
- Simpler for complex object graphs
- Familiar to JS/TS developers
- Low pause times, excellent throughput

**Trade-offs**:
- GC pause times (minimal with MPS)
- Runtime overhead (~5-10% vs manual memory management)
- Non-deterministic destruction

##### Primitive Type Mapping (Both Modes)

- `number` → `double`
- `integer` → `int32_t`
- `integer53` → `int64_t`
- `string` → `std::string` or `GcString` (GC mode)
- `boolean` → `bool`
- `void` → `void`

##### When Memory Mode Matters

The memory management mode choice happens **only** in Phase 5 (codegen). All previous phases work identically:

1. **Phase 1-3**: IR is identical regardless of target memory mode
2. **Phase 2a**: Ownership analysis enforces DAG requirement for `share<T>`
   - GC mode (default): Cycles allowed (warning issued for documentation)
   - Ownership mode: Strict enforcement (compile error on cycles)
3. **Phase 5**: Code generation diverges based on `--memory` flag

**Recommendation**: Use GC mode (default) for initial development and complex object graphs. Switch to ownership mode for performance-critical code or when you need deterministic resource management.

**Benefits**:
- **Easy migration from TypeScript/JavaScript** (familiar memory model)
- Allows cyclic `share<T>` references
- Simpler for complex object graphs
- No lifetime management burden on developer

**Trade-offs**:
- GC pause times
- Runtime overhead
- Non-deterministic destruction

**GC Implementation**: Memory Pool System (MPS)
- Vendored in `compiler/vendor/mps/`
- Industrial-strength GC (generational, incremental, precise)
- Compiled on-the-fly: `zig cc -O2 -c mps.c -o mps.o` (~1-2 seconds)
- BSD 2-clause license

##### Ownership Mode (`--memory=ownership`)

Uses custom thread-unsafe smart pointers for deterministic memory management:

```bash
gsc --target cpp --memory ownership input.gs
```

**Type Mapping**:
- `own<T>` → `gs::own_ptr<T>` (exclusive ownership, move semantics)
- `share<T>` → `gs::share_ptr<T>` (reference counted, single-threaded)
- `use<T>` → `T*` (raw pointer, non-owning)

**Custom Smart Pointers** (`runtime/gs_ptr.hpp`):
- Thread-unsafe by design (GoodScript is single-threaded per isolate)
- No atomic operations (faster than `std::shared_ptr`)
- Simpler implementation (~200 lines total)
- Initially: thin wrappers around `std::unique_ptr` and `std::shared_ptr`
- Long-term: native implementations optimized for single-threaded use

**Benefits**:
- Clear ownership semantics
- Zero-cost abstractions
- Predictable performance
- Deterministic destruction (RAII)

**Trade-offs**:
- Cannot express `share<T>` cycles (compile error in Phase 2a)
- More complex for highly interconnected object graphs
- Requires understanding of ownership semantics

**Example**:
```typescript
// GoodScript source
class Node {
  data: integer;
  next: share<Node>;  // Potential cycle
}
```

```cpp
// Generated C++ (ownership mode)
#include "runtime/gs_ptr.hpp"

class Node {
  int32_t data;
  gs::share_ptr<Node> next;  // ⚠️ Cycle error in Phase 2a
};

// Generated C++ (GC mode)
class Node {
  int32_t data;
  Node* next;  // ✅ GC handles cycles
};
```

#### Source Maps

Both backends generate source maps for debugging:

##### C++ Source Maps (DWARF Debug Info)

Uses C++ `#line` directives to map generated code back to original GoodScript:

```cpp
// math.cpp (generated)
#include "math.hpp"

namespace goodscript::math {

#line 5 "src/math.gs"
double add(double a, double b) {
#line 6 "src/math.gs"
  return a + b;
}

} // namespace goodscript::math
```

**Compilation with debug info**:
```bash
gsc --target cpp --source-maps src/math.gs
g++ -g build/math.cpp  # -g includes DWARF debug info
```

**Debugging experience**:
```bash
$ gdb ./myapp
(gdb) break src/math.gs:6
Breakpoint 1 at 0x401234: file src/math.gs, line 6.

(gdb) run
Breakpoint 1, goodscript::math::add (a=1, b=2) at src/math.gs:6
6       return a + b;

(gdb) backtrace
#0  goodscript::math::add (a=1, b=2) at src/math.gs:6
#1  main () at src/main.gs:10
```

Debuggers (GDB, LLDB, Visual Studio) show GoodScript file paths and line numbers, not generated C++.

##### JavaScript Source Maps

Generates standard `.js.map` files for browser/Node.js debugging:

```bash
gsc --target js --source-maps src/math.gs
# Generates: build/math.js + build/math.js.map
```

**Source map format** (v3):
```json
{
  "version": 3,
  "sources": ["../../src/math.gs"],
  "sourcesContent": ["export function add(a: number, b: number) { ... }"],
  "mappings": "AAAA,OAAO,SAAS,GAAG,CAAC...",
  "names": ["add", "a", "b"]
}
```

Browser dev tools and Node.js automatically use source maps - stack traces and breakpoints reference original GoodScript code.

**Implementation**:
- Phase 3 (Lowering): Preserve source locations from TypeScript AST
- Phase 5 (Codegen): 
  - C++: Emit `#line` directives
  - JS: Generate `.js.map` using source-map library

#### C++ Compilation with Zig

GoodScript uses **Zig as the C++ compiler** for the final compilation stage. This provides significant advantages:

**Benefits**:
1. **Cross-compilation**: Single toolchain for all targets (Linux, macOS, Windows, WebAssembly)
2. **Zero dependencies**: No need to install platform-specific C++ compilers (GCC, Clang, MSVC)
3. **Better libc**: Zig bundles optimized libc implementations for all platforms
4. **Build caching**: Incremental compilation with automatic cache management
5. **WebAssembly support**: First-class WASM target for browser deployment
6. **Simplified distribution**: Users only need Zig, not entire toolchains

**CLI Integration**:

```bash
# Compile to native binary (uses Zig internally)
gsc --target cpp --compile src/main.gs -o myapp

# Cross-compile to different targets
gsc --target cpp --compile --triple x86_64-linux-gnu src/main.gs
gsc --target cpp --compile --triple aarch64-macos src/main.gs
gsc --target cpp --compile --triple wasm32-wasi src/main.gs

# Generate C++ only (no Zig compilation)
gsc --target cpp src/main.gs
# Outputs: build/main.hpp, build/main.cpp
```

**Build Process**:

The compiler automatically compiles vendored dependencies on-the-fly:

1. **Phase 5 (Codegen)**: Generate `.hpp` and `.cpp` files
2. **Compile vendored dependencies** (once per build, cached):
   - **MPS (GC mode only)**: `zig cc -O2 -c vendor/mps/src/mps.c -o build/mps.o` (~1-2s)
   - **PCRE2 (if RegExp used)**: `zig cc -O2 -DPCRE2_CODE_UNIT_WIDTH=8 -c vendor/pcre2/src/pcre2_all.c -o build/pcre2.o` (~2-3s)
   - **cppcoro**: Header-only + 3 `.cpp` files for sync primitives
3. **Compile GoodScript code**: `zig c++ -std=c++20 -O3 -c build/main.cpp -o build/main.o`
**Vendored Dependencies** (in `compiler/vendor/`):

| Library | Purpose | Version | License | Size |
|---------|---------|---------|---------|------|
| **MPS** | Garbage collection (GC mode) | 1.118.0 | BSD 2-clause | ~300KB |
| **cppcoro** | Async/await via C++20 coroutines | andreasbuhr/cppcoro fork | MIT | Header-only + 3 files |
| **PCRE2** | Regular expressions | 10.47 | BSD 3-clause | ~500KB |

**Custom Runtime Headers** (in `compiler/runtime/`):

| Header | Purpose | Dependencies |
|--------|---------|--------------|
| **gs_ptr.hpp** | Thread-unsafe smart pointers (`own_ptr<T>`, `share_ptr<T>`) | C++17 |
| **gs_worker.hpp** | Worker API and registry | C++20 threads |
| **gs_timer.hpp** | Timer implementation (event queue) | C++20 threads |
| **gs_eventloop.hpp** | Event loop with coroutine integration | cppcoro | ~300KB |
| **cppcoro** | Async/await via C++20 coroutines | andreasbuhr/cppcoro fork | MIT | Header-only + 3 files |
| **PCRE2** | Regular expressions | 10.47 | BSD 3-clause | ~500KB |

**Why Vendored?**
- ✅ Zero system dependencies (`npm i -g goodscript` just works)
- ✅ Cross-platform (Linux, macOS, Windows, WASM)
- ✅ Deterministic builds (pinned versions)
- ✅ Fast compilation (amalgamation files: `mps.c`, `pcre2_all.c`)
- ✅ Follows Go philosophy of self-contained toolchain

**Build Caching**:
- Object files cached in `build/vendor/`
- Recompiled only when source changes
- Typical incremental build: <1 second

**Alternative: build.zig Generation**:

For complex projects, GoodScript can generate a `build.zig` file:

```bash
gsc --target cpp --build-zig src/main.gs
# Generates build.zig with all source files

zig build
# Compiles entire project with Zig's build system
```

**Implementation**: `src/codegen/zig.ts` (future)

#### TypeScript Backend
- Transpiles to clean TypeScript/JavaScript
- Removes ownership annotations
- Preserves all type information
- Output compatible with Node.js and browsers

**Implementation**: `src/codegen/` (stubs)

## Concurrency Model

GoodScript uses a **single-threaded execution model** with **worker-based parallelism**, matching JavaScript/TypeScript semantics exactly.

### Philosophy

**Single-threaded per isolate**:
- No shared memory between workers
- No locks, mutexes, or atomic operations
- No data races by design
- Familiar mental model for JS/TS developers

**Parallelism via Workers**:
- Spawn isolated workers (like Web Workers)
- Communicate via message passing
- Each worker has its own heap and event loop

### Worker API

```typescript
// main.gs - Spawn a worker
const worker = new Worker('./worker.gs');

// Send message (JSON string)
worker.postMessage(JSON.stringify({ type: 'process', data: [1, 2, 3] }));

// Receive message
worker.onmessage = (event: MessageEvent) => {
  const result = JSON.parse(event.data);
  console.log('Result:', result);
};

// worker.gs - Worker implementation
self.onmessage = (event: MessageEvent) => {
  const msg = JSON.parse(event.data);
  
  if (msg.type === 'process') {
    const result = msg.data.map((x: number) => x * 2);
    self.postMessage(JSON.stringify({ result }));
  }
};
```

### Message Passing

**Format**: Plain text strings (typically JSON)

```typescript
// Serialize before sending
const data = { x: 42, y: [1, 2, 3] };
worker.postMessage(JSON.stringify(data));

// Deserialize on receive
worker.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data.x); // 42
};
```

**Rationale**:
- Simple, universal format (works in JS and C++)
- No complex serialization protocol
- Matches common practice in distributed systems
- Easy to debug (inspect message contents)
- Naturally enforces "share nothing" architecture

**What can be sent**:
- Primitives: `number`, `integer`, `integer53`, `string`, `boolean`
- Arrays: `T[]` (serialized recursively)
- Plain objects: `{ key: value }` (no methods, no `own<T>`)
- `null` and `undefined`

**What cannot be sent**:
- ❌ Objects with methods (classes)
- ❌ `own<T>` or `share<T>` (ownership cannot cross isolate boundaries)
- ❌ Functions/closures
- ❌ Circular references (JSON limitation)

### Async Worker Calls

Using `Promise<T>` for request/response pattern:

```typescript
class WorkerPool {
  private worker: Worker;
  private nextId = 0;
  private pending = new Map<integer, (result: string) => void>();
  
  constructor(scriptPath: string) {
    this.worker = new Worker(scriptPath);
    this.worker.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      const callback = this.pending.get(msg.id);
      if (callback) {
        this.pending.delete(msg.id);
        callback(msg.result);
      }
    };
  }
  
  async call(method: string, params: unknown): Promise<string> {
    return new Promise((resolve) => {
      const id = this.nextId++;
      this.pending.set(id, resolve);
      this.worker.postMessage(JSON.stringify({ id, method, params }));
    });
  }
}

// Usage
const pool = new WorkerPool('./worker.gs');
const result = await pool.call('compute', { x: 42 });
console.log(JSON.parse(result));
```

### C++ Implementation

#### Worker Compilation Strategy

**Single Static Binary with Entry Point Registry**:

For C++ targets, all worker source files are compiled into the main executable and linked statically. The compiler automatically detects worker dependencies and generates an entry point registry.

```typescript
// main.gs
const worker = new Worker('./worker.gs');
```

```cpp
// Generated main.cpp
#include "runtime/gs_worker.hpp"
#include "build/worker.hpp"  // Worker code statically linked

int main() {
  // Worker::create looks up entry point in registry
  auto worker = gs::Worker::create("./worker.gs");
  worker->postMessage("{\"data\": 42}");
  
  // Event loop...
}
```

```cpp
// Generated worker.cpp (compiled to worker.o, statically linked)
#include "runtime/gs_worker.hpp"

// Worker entry point function
void worker_gs_entry(gs::WorkerContext* ctx) {
  // GoodScript worker code compiled to C++
  ctx->onmessage = [ctx](std::string data) {
    auto msg = JSON::parse(data);
    
    // Worker logic here (from worker.gs)
    auto result = processData(msg);
    
    ctx->postMessage(JSON::stringify(result));
  };
  
  ctx->runEventLoop();  // Blocks until worker terminates
}

// Auto-register at static initialization time
namespace {
  auto _worker_registration = gs::WorkerRegistry::register_worker(
    "./worker.gs",
    worker_gs_entry
  );
}
```

**Runtime Worker Registry** (`runtime/gs_worker.hpp`):

```cpp
namespace gs {

// Function signature for worker entry points
using WorkerEntryPoint = void(*)(WorkerContext*);

class WorkerRegistry {
  static std::map<std::string, WorkerEntryPoint> registry;
  
public:
  static int register_worker(const std::string& path, WorkerEntryPoint fn) {
    registry[path] = fn;
    return 0;  // For static initialization
  }
  
  static WorkerEntryPoint lookup(const std::string& path) {
    auto it = registry.find(path);
    if (it == registry.end()) {
      throw std::runtime_error("Worker not found: " + path);
    }
    return it->second;
  }
};

class Worker {
public:
  static std::unique_ptr<Worker> create(const std::string& path) {
    auto entryPoint = WorkerRegistry::lookup(path);
    return std::make_unique<Worker>(entryPoint);
  }
  
  // Rest of Worker implementation...
};

} // namespace gs
```

**Build Process**:

```bash
# User command
gsc --target cpp --compile src/main.gs -o myapp

# Compiler internally:
# 1. Analyze main.gs, find: new Worker('./worker.gs')
# 2. Compile worker.gs → build/worker.cpp → build/worker.o
# 3. Compile main.gs → build/main.cpp → build/main.o
# 4. Link all together:
zig c++ -std=c++20 \
  build/main.o \
  build/worker.o \
  build/mps.o \
  build/pcre2.o \
  -o myapp

# Result: Single static binary (~2-5 MB)
```

**Benefits**:
- ✅ Single binary deployment (no external dependencies)
- ✅ All workers bundled automatically
- ✅ Static linking (works on any Linux/macOS/Windows)
- ✅ Fast startup (no dynamic loading)
- ✅ Compiler detects worker dependencies via static analysis
- ✅ No shared library complexity

**Worker Detection**:

The compiler scans IR for `new Worker(path)` expressions:

```typescript
// Phase 5 (Codegen): Detect workers
function detectWorkers(ir: IRModule): string[] {
  const workers: string[] = [];
  
  visit(ir, {
    NewExpr(node) {
      if (node.className === 'Worker' && node.args[0].kind === 'literal') {
        workers.push(node.args[0].value);  // './worker.gs'
      }
    }
  });
  
  return workers;
}

// Compile each detected worker
for (const workerPath of detectWorkers(mainModule)) {
  compileWorkerModule(resolveWorkerPath(workerPath));
}
```

#### GC Mode

Each worker runs in its own OS thread with isolated MPS arena:

```cpp
// Simplified implementation
class Worker {
  std::thread thread;
  mps_arena_t arena;        // Isolated GC heap
  MessageQueue incoming;    // Lock-free queue
  MessageQueue outgoing;
  WorkerEntryPoint entryFn; // Statically registered entry point
  
  Worker(WorkerEntryPoint fn) : entryFn(fn) {
    thread = std::thread([this]() { run(); });
  }
  
  void run() {
    mps_arena_create(&arena, ...);  // Create isolated heap
    
    WorkerContext ctx(this);
    entryFn(&ctx);  // Call registered entry point
    
    mps_arena_destroy(arena);
  }

};
```

**Key points**:
- Each worker = separate MPS arena (no shared heap)
- Message queues for inter-thread communication
- Strings copied between heaps (no shared pointers)
- Worker destruction → arena destruction (clean shutdown)

#### Ownership Mode

Same architecture, but no GC:

```cpp
class Worker {
  std::thread thread;
  MessageQueue incoming;
  MessageQueue outgoing;
  
  // No GC - uses stack allocation + std::string for messages
};
```

### Integration with cppcoro

Workers integrate cleanly with C++20 coroutines via cppcoro:

```cpp
// Async message send
cppcoro::task<std::string> Worker::callAsync(const std::string& msg) {
  incoming.push(msg);
  co_return co_await outgoing.popAsync();  // Suspend until response
}
```

This enables the `async`/`await` syntax in GoodScript to map directly to C++ coroutines.

### TypeScript Backend

For the JavaScript/TypeScript target, workers compile directly to Web Workers or Node.js Worker Threads:

```typescript
// Generated JavaScript (browser)
const worker = new Worker('./worker.js');
worker.postMessage(JSON.stringify(data));

// Generated JavaScript (Node.js)
const { Worker } = require('worker_threads');
const worker = new Worker('./worker.js');
worker.postMessage(JSON.stringify(data));
```

**Perfect compatibility**: GoodScript worker code runs identically in:
- ✅ Browser (Web Workers)
- ✅ Node.js (Worker Threads)
- ✅ Native C++ (OS threads + message queues)

### Future Enhancements

**Structured Clone** (optional, future):
- More efficient serialization (binary format)
- Support for typed arrays, Maps, Sets
- Still no shared memory

**Ownership Transfer** (optional, future):
- Move `own<T>` to another worker (zero-copy)
- Sender loses access, receiver gains ownership
- Requires compiler analysis to ensure safety

**Rationale for starting with JSON strings**:
- Simple to implement and understand
- Works everywhere (JS, C++, debugging tools)
- Sufficient for most use cases (data processing, web servers)
- Can optimize later without breaking API

### Design Principle

**"No surprises"**: GoodScript concurrency works exactly like JavaScript/TypeScript workers. Developers familiar with Web Workers or Node.js Worker Threads can apply their knowledge directly.

## Event Loop & Async Runtime

GoodScript provides a JavaScript-compatible event loop for async operations, powered by C++20 coroutines and an event queue architecture.

### Event Loop Architecture

The runtime maintains a single-threaded event loop similar to JavaScript/Node.js:

```typescript
// GoodScript code
async function main() {
  console.log('Start');
  
  setTimeout(() => {
    console.log('Timer fired');
  }, 1000);
  
  const result = await fetch('https://api.example.com/data');
  console.log('Fetch complete:', result);
}

main();
```

**C++ Implementation** (simplified):

```cpp
// Main event loop (runtime/gs_eventloop.hpp)
void EventLoop::run() {
  while (running || hasPendingWork()) {
    // 1. Process expired timers
    TimerManager::processTimers();
    
    // 2. Process I/O events (network, file system)
    IOManager::processEvents();
    
    // 3. Resume suspended coroutines
    CoroutineScheduler::resumeReady();
    
    // 4. Process microtasks (Promise callbacks)
    MicrotaskQueue::processMicrotasks();
    
    // 5. Sleep until next event (if idle)
    if (!hasPendingWork()) {
      waitForEvents();
    }
  }
}
```

### Timer Support

Implements `setTimeout`, `clearTimeout`, `setInterval`, `clearInterval` using an event queue pattern.

**Key Design**: Timer threads only **enqueue callbacks**, never execute user code directly. This maintains single-threaded execution guarantees.

```typescript
// GoodScript API (matches JavaScript)
const id = setTimeout(() => {
  console.log('Executed on main thread');
}, 1000);

clearTimeout(id);  // Cancel if needed
```

**C++ Implementation** (`runtime/gs_timer.hpp`):

```cpp
class TimerManager {
  // Timer thread: sleep, then enqueue callback
  static int setTimeout(std::function<void()> callback, int ms) {
    int id = nextId++;
    
    // Background thread sleeps, then enqueues
    std::thread([id, callback, ms]() {
      std::this_thread::sleep_for(std::chrono::milliseconds(ms));
      
      // Enqueue callback (thread-safe)
      enqueueCallback([callback]() {
        callback();  // Executes on main thread
      });
    }).detach();
    
    return id;
  }
  
  // Main thread executes callbacks
  static void processTimers() {
    std::vector<std::function<void()>> callbacks;
    
    {
      std::lock_guard<std::mutex> lock(eventQueueMutex);
      while (!eventQueue.empty()) {
        callbacks.push_back(std::move(eventQueue.front()));
        eventQueue.pop();
      }
    }
    
    // Execute callbacks on main thread (outside lock)
    for (auto& callback : callbacks) {
      callback();
    }
  }
};
```

**Thread Safety**:
- ✅ Timer threads: Sleep → enqueue → exit
- ✅ Main thread: Dequeue → execute
- ✅ Mutex-protected event queue
- ✅ No race conditions on user objects

**Example Event Loop Cycle**:

```
Tick 0: setTimeout(() => console.log('A'), 100)
        setTimeout(() => console.log('B'), 50)
        
Tick 1 (50ms): Timer thread for 'B' enqueues callback
               processTimers() executes: console.log('B')
               Output: "B"
               
Tick 2 (100ms): Timer thread for 'A' enqueues callback
                processTimers() executes: console.log('A')
                Output: "A"
```

### Async/Await with cppcoro

GoodScript's `async`/`await` compiles to C++20 coroutines using cppcoro:

```typescript
// GoodScript
async function fetchData(url: string): Promise<string> {
  const response = await fetch(url);
  return response.text();
}
```

```cpp
// Generated C++ (using cppcoro)
cppcoro::task<std::string> fetchData(std::string url) {
  auto response = co_await fetch(url);
  co_return response.text();
}
```

**cppcoro Integration**:
- `Promise<T>` → `cppcoro::task<T>`
- `async function` → coroutine returning `task<T>`
- `await expr` → `co_await expr`
- Coroutines suspend/resume on event loop

**Scheduler Integration**:

```cpp
class CoroutineScheduler {
  static void schedule(cppcoro::task<void> task) {
    task.resume();  // Start coroutine
  }
  
  static void resumeReady() {
    // Resume all coroutines waiting on ready promises
    for (auto& coroutine : readyCoroutines) {
      coroutine.resume();
    }
    readyCoroutines.clear();
  }
};
```

### Platform-Specific Implementations

#### Native C++ (Linux, macOS, Windows)

- **Timers**: OS threads + event queue (`runtime/gs_timer.hpp`)
- **I/O**: epoll (Linux), kqueue (macOS), IOCP (Windows)
- **Event Loop**: Custom implementation with `std::thread`

#### WebAssembly (Browser)

- **Timers**: Emscripten's `emscripten_set_timeout`
- **I/O**: Browser's Fetch API
- **Event Loop**: Browser's event loop (automatic)

**Note**: Threading disabled for `wasm32-wasi` target (no threading support). Timers use stub implementations returning -1.

#### TypeScript/JavaScript Backend

- **Timers**: Native `setTimeout`/`setInterval`
- **I/O**: Node.js APIs or browser APIs
- **Event Loop**: Node.js/browser event loop (automatic)

```typescript
// Generated JavaScript (identical to source)
async function fetchData(url) {
  const response = await fetch(url);
  return response.text();
}
```

### Microtask Queue

Implements Promise resolution semantics (microtasks run before next event loop tick):

```typescript
// GoodScript
Promise.resolve().then(() => console.log('Microtask'));
setTimeout(() => console.log('Timer'), 0);

// Output:
// Microtask  (runs first - microtask queue)
// Timer      (runs second - timer queue)
```

**C++ Implementation**:

```cpp
class MicrotaskQueue {
  static std::queue<std::function<void()>> microtasks;
  
  static void queueMicrotask(std::function<void()> task) {
    microtasks.push(std::move(task));
  }
  
  static void processMicrotasks() {
    while (!microtasks.empty()) {
      auto task = std::move(microtasks.front());
      microtasks.pop();
      task();
      
      // New microtasks may be queued during execution
      // Process those too (before returning to event loop)
    }
  }
};
```

### Performance Characteristics

**Event Loop Overhead**:
- Idle CPU usage: ~0% (blocks on `waitForEvents()`)
- Timer resolution: ~1ms (OS thread scheduler)
- Microtask latency: <1µs (inline execution)

**Coroutine Performance**:
- Suspend/resume: ~10ns (C++20 coroutines are zero-cost)
- Stack usage: ~100 bytes per coroutine (heap-allocated frame)
- No thread creation overhead

### Design Principles

1. **Single-threaded execution**: User code always runs on main thread
2. **Event queue model**: Background threads only enqueue work
3. **JavaScript compatibility**: Same semantics as Node.js/browser
4. **Zero-cost abstractions**: C++20 coroutines compile to state machines
5. **Platform portability**: Works on native, WASM, and JS backends

## IR Type System

### Core Types

```typescript
type IRType = 
  | { kind: 'primitive'; type: PrimitiveType }
  | { kind: 'class'; name: string; ownership: Ownership }
  | { kind: 'array'; element: IRType; ownership: Ownership }
  | { kind: 'map'; key: IRType; value: IRType; ownership: Ownership }
  | { kind: 'function'; params: IRType[]; returnType: IRType }
  | { kind: 'union'; types: IRType[] }
  | { kind: 'nullable'; inner: IRType };

enum PrimitiveType {
  Number, Integer, Integer53, String, Boolean, Void, Never
}

enum Ownership {
  Own,    // Unique ownership
  Share,  // Reference counted
  Use,    // Borrowed reference
  Value   // Stack value
}
```

### IR Expressions

```typescript
type IRExpr =
  | { kind: 'literal'; value: number | string | boolean }
  | { kind: 'binary'; op: BinaryOp; left: IRExpr; right: IRExpr }
  | { kind: 'unary'; op: UnaryOp; operand: IRExpr }
  | { kind: 'var'; name: string }
  | { kind: 'call'; callee: IRExpr; args: IRExpr[] }
  | { kind: 'member'; object: IRExpr; property: string }
  | { kind: 'index'; object: IRExpr; index: IRExpr }
  | { kind: 'new'; className: string; args: IRExpr[] }
  | { kind: 'lambda'; params: IRParam[]; body: IRBlock };
```

## Testing Strategy

### Test Organization

```
compiler/test/
├── infrastructure.test.ts  - IR builder, types, visitor
├── lowering.test.ts       - AST → IR conversion
├── validator.test.ts      - Language restrictions
├── signatures.test.ts     - Type signature system
├── ownership.test.ts      - Ownership analysis (TODO)
├── nullcheck.test.ts      - Null safety (TODO)
└── codegen.test.ts        - Code generation (TODO)
```

### Test Coverage

- ✅ **IR Infrastructure** (11 tests) - Type system, builders, visitors
- ✅ **IR Lowering** (12 tests) - AST to IR conversion
- ✅ **Validator** (42 tests) - All 15 language restrictions
- ✅ **Type Signatures** (11 tests) - Structural typing
- ⏳ **Ownership Analysis** - DAG cycle detection
- ⏳ **Null Checker** - use<T> validation
- ⏳ **Optimizer** - Optimization passes
- ⏳ **C++ Codegen** - Native code generation
- ⏳ **TS Codegen** - JavaScript transpilation

## Build System

**Package Manager**: pnpm (monorepo)

**Structure**:
```
goodscript/
├── compiler/          - Compiler implementation
├── runtime/          - C++ runtime headers
├── stdlib/           - Standard library
└── package.json      - Workspace root
```

**Build Commands**:
```bash
pnpm install          # Install dependencies
pnpm build           # Build all packages
pnpm test            # Run all tests
pnpm --filter @goodscript/compiler build
```

### Configuration: tsconfig.json

GoodScript projects use standard TypeScript configuration with GoodScript-specific extensions:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "node",
    "strict": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.gs"],
  "goodscript": {
    "target": "cpp",
    "memory": "gc",
    "compile": true,
    "triple": "x86_64-linux-gnu",
    "sourceMaps": true,
    "optimize": 3
  }
}
```

**TypeScript Options Honored**:
- `compilerOptions.outDir` - Output directory for generated code
- `compilerOptions.outFile` - Single-file output (if specified)
- `compilerOptions.rootDir` - Source root directory
- `compilerOptions.target` - JavaScript target (for JS backend)
- `compilerOptions.strict` - TypeScript strictness (always enabled for validation)
- `compilerOptions.paths` - Module path mapping
- `include`/`exclude` - Files to compile

**GoodScript-Specific Options** (`goodscript` property):

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `target` | `"cpp"` \| `"js"` \| `"ts"` | `"js"` | Compilation target |
| `memory` | `"gc"` \| `"ownership"` | `"gc"` | Memory management mode (C++ only) |
| `compile` | `boolean` | `false` | Compile to binary (C++ only) |
| `triple` | `string` | Host platform | Target triple (e.g., `"x86_64-linux-gnu"`) |
| `sourceMaps` | `boolean` | `false` | Generate source maps |
| `optimize` | `0` \| `1` \| `2` \| `3` | `0` | Optimization level |
| `outFile` | `string` | - | Output binary name (with `compile: true`) |

**Configuration Priority** (highest to lowest):
1. Command-line arguments (`gsc --target cpp --memory ownership`)
2. `tsconfig.json` `goodscript` property
3. Default values

**Example Configurations**:

```json
// Development (JS backend, fast iteration)
{
  "compilerOptions": {
    "outDir": "./dist",
    "sourceMap": true
  },
  "goodscript": {
    "target": "js",
    "sourceMaps": true
  }
}
```

```json
// Production (C++ binary, optimized)
{
  "compilerOptions": {
    "outDir": "./build"
  },
  "goodscript": {
    "target": "cpp",
    "memory": "gc",
    "compile": true,
    "triple": "x86_64-linux-gnu",
    "optimize": 3,
    "outFile": "./bin/myapp"
  }
}
```

```json
// Cross-compilation (WASM)
{
  "goodscript": {
    "target": "cpp",
    "compile": true,
    "triple": "wasm32-wasi",
    "outFile": "./dist/app.wasm"
  }
}
```

**Usage**:
```bash
# Use tsconfig.json automatically
gsc src/main.gs

# Override specific options
gsc --memory ownership src/main.gs

# Specify custom config file
gsc --project tsconfig.production.json src/main.gs
```

**Implementation**: `src/config/tsconfig.ts` (future)

## Dependencies

- **TypeScript** 5.6.0 - Parser and type checker
- **Vitest** 2.1.0 - Test framework
- **Node.js** >= 18.0.0

## Extension Points

The compiler is designed for extensibility:

1. **Custom Analyzers**: Add new analysis passes between phases
2. **IR Passes**: Implement custom optimization transforms
3. **Backends**: Add new code generation targets
4. **Type System Extensions**: Extend ownership semantics
5. **Diagnostic Formatters**: Custom error reporting

## Performance Considerations

- **Incremental Compilation**: Reuse TypeScript's incremental parser
- **Caching**: Type signatures and ownership graphs cached
- **Parallel Analysis**: Independent modules analyzed in parallel
- **Memory**: IR designed for compact representation

## Future Enhancements

- **Incremental builds** - Only recompile changed modules
- **Watch mode** - Continuous compilation
- **Source maps** - Map compiled code to original
- **LLVM backend** - Alternative to C++ for better optimization
- **WebAssembly target** - Direct WASM generation
- **Hot reload** - Development server with live updates

---

**Last Updated**: December 8, 2025
