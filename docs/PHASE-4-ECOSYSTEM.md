# Phase 4: Ecosystem Integration

**Status:** 📋 Planned (follows Phase 3: Rust Code Generation)

## Overview

Phase 4 focuses on making GoodScript's Rust compilation target **production-ready** and **usable for real-world applications**. While Phase 3 delivers Rust code generation, Phase 4 adds the tooling, integrations, and ecosystem support needed for practical deployment.

**Key Insight:** Rust code generation alone isn't enough. Developers need:
- Build system integration (Cargo)
- Package management and dependency handling
- FFI/interop with existing Rust and C libraries
- Deployment tooling for native binaries and WebAssembly
- Standard library and common utilities
- Documentation and best practices

---

## Phase 4 Objectives

| Objective | Description | Priority |
|-----------|-------------|----------|
| **Cargo Integration** | Generate proper Rust projects with `Cargo.toml` | Critical |
| **Dependency Management** | Handle external Rust crates and npm packages | Critical |
| **Standard Library** | Provide common utilities (collections, I/O, etc.) | High |
| **WebAssembly Target** | Compile to WASM for browser/edge deployment | High |
| **FFI Support** | Interop with Rust crates and C libraries | ✅ Basic (via Result<T,E>) |
| **Build Tooling** | CLI commands for build/run/test workflows | High |
| **npm/Cargo Bridge** | Use npm packages in Rust builds | Medium |
| **Deployment Tools** | Package binaries, create containers, etc. | Medium |
| **Testing Framework** | Unit/integration testing for Rust target | Medium |

---

## 1. Cargo Integration

### Automatic Project Generation

The compiler should generate complete Rust projects, not just `.rs` files:

```bash
gsc build --target=rust src/main.gs.ts
```

**Generates:**
```
dist/rust/
├── Cargo.toml          # Generated manifest
├── src/
│   ├── main.rs         # Entry point
│   ├── lib.rs          # Module declarations
│   └── generated/      # Transpiled GoodScript code
│       ├── mod.rs
│       ├── app.rs
│       └── utils.rs
├── .cargo/
│   └── config.toml     # Optimization settings
└── README.md           # Build instructions
```

### `Cargo.toml` Generation

**Auto-detect dependencies:**
```toml
[package]
name = "my-goodscript-app"
version = "0.1.0"
edition = "2021"

[dependencies]
# Auto-added based on GoodScript imports
serde = { version = "1.0", features = ["derive"] }
tokio = { version = "1.0", features = ["full"] }

[profile.release]
opt-level = 3
lto = true
codegen-units = 1

[[bin]]
name = "my-app"
path = "src/main.rs"
```

### Build Commands

```bash
# Build Rust project
gsc build --target=rust --release

# Run compiled binary
gsc run --target=rust

# Test Rust code
gsc test --target=rust

# Check without building
gsc check --target=rust
```

---

## 2. Dependency Management

### Rust Crate Dependencies

**Import Rust crates in GoodScript:**
```typescript
// External Rust crate declaration
@rustCrate("serde", "1.0", { features: ["derive"] })
declare module "serde" {
  export const serialize: <T>(value: T) => string;
  export const deserialize: <T>(json: string) => T;
}

// Use in GoodScript
import { serialize } from "serde";

const data: Unique<User> = createUser();
const json: Unique<string> = serialize(data);
```

**Compiler generates:**
- Adds dependency to `Cargo.toml`
- Creates FFI bindings in Rust
- Type-checks usage in GoodScript

### npm Package Bridge (Rust Target)

**Challenge:** How to use npm packages when compiling to Rust?

**Solution Options:**

#### Option 1: Rust Reimplementations
Maintain a registry mapping npm packages → Rust crates:

```json
{
  "lodash": "itertools",
  "axios": "reqwest", 
  "date-fns": "chrono",
  "uuid": "uuid"
}
```

#### Option 2: Node.js FFI (N-API)
For packages without Rust equivalents, call Node.js from Rust:

```typescript
// GoodScript code
import { fetchData } from "some-npm-package";

const result = fetchData(); // Calls Node.js via FFI
```

**Tradeoffs:**
- ✅ Full npm compatibility
- ❌ Requires Node.js runtime (not standalone binary)
- ❌ Performance overhead
- Use case: Rapid prototyping, gradual migration

#### Option 3: Polyfills and Stubs
Provide GoodScript implementations for common utilities:

```typescript
// @goodscript/std-rust (built-in)
export const map = <T, U>(arr: T[], fn: (x: T) => U): U[] => {
  // Compiles to efficient Rust
};
```

**Recommended Strategy:** Combination approach
1. **Common utilities** → Built-in GoodScript standard library
2. **Popular npm packages** → Rust crate mappings
3. **Everything else** → Explicit developer choice (FFI or rewrite)

---

## 3. Standard Library

### API Design Philosophy

**Critical Question:** Should GoodScript expose Rust's native APIs or mimic Node/Deno/Bun/Browser APIs?

#### Comparison Table

| Aspect | Rust-Oriented APIs | TS-Oriented APIs | Hybrid Approach ✅ |
|--------|-------------------|------------------|-------------------|
| **Learning Curve** | High (new APIs) | Zero (familiar) | Low (start familiar, learn as needed) |
| **Migration Path** | Rewrite required | Drop-in replacement | Gradual optimization |
| **Performance** | Maximum (zero overhead) | Good (thin wrapper) | Excellent (choose per use case) |
| **TypeScript Dev UX** | Unfamiliar idioms | Natural, ergonomic | Best of both worlds |
| **Maintenance** | Simpler compiler | More abstraction code | Moderate complexity |
| **Code Portability** | Rust-only | Works on JS & Rust | Works on JS & Rust |
| **Documentation** | New docs needed | Reuse existing knowledge | Layered docs (beginner→advanced) |
| **Ecosystem Access** | Direct Rust crates | Familiar npm patterns | Both ecosystems |

**Decision: HYBRID APPROACH** - Provide both, let developers choose based on needs.

#### Option A: Rust-Native APIs (Direct Exposure)

Directly expose Rust's standard library with minimal wrapping:

```typescript
// Directly maps to Rust std
import { Vec, HashMap, File } from "@goodscript/rust/std";

const v: Unique<Vec<number>> = Vec.new();
v.push(42);
const len = v.len(); // Rust idiom
```

**Pros:**
- ✅ Zero abstraction overhead
- ✅ Direct access to Rust ecosystem
- ✅ Simpler compiler implementation
- ✅ Matches Rust documentation/examples

**Cons:**
- ❌ Unfamiliar to TypeScript developers
- ❌ Steeper learning curve
- ❌ Different idioms (`vec.len()` vs `array.length`)
- ❌ Harder migration from existing Node.js code

#### Option B: Web/Node API Compatibility Layer

Provide familiar JavaScript APIs that compile to Rust:

```typescript
// Familiar Node.js/Web APIs
import { readFile, writeFile } from "fs/promises";
import { fetch } from "web";

const data = await readFile("config.json", "utf8");
const response = await fetch("https://api.example.com");
```

**Pros:**
- ✅ **Zero learning curve** for TypeScript developers
- ✅ **Easy migration** from Node/Deno/Bun projects
- ✅ **Familiar patterns** (Promises, async/await, Buffer, etc.)
- ✅ **Code portability** between JS and Rust targets

**Cons:**
- ❌ Abstraction layer adds complexity
- ❌ Some APIs don't map cleanly to Rust
- ❌ May hide Rust's capabilities
- ❌ Maintenance burden for compatibility

#### Option C: Hybrid Approach (RECOMMENDED)

**Provide both API layers, let developers choose:**

```typescript
// TS-oriented APIs (recommended for most cases)
import { readFile } from "@goodscript/node";  // Node.js-compatible
import { fetch } from "@goodscript/web";      // Web-compatible

// Rust-oriented APIs (for performance-critical code)
import { File } from "@goodscript/rust/std";  // Direct Rust access

// Example: Progressive optimization
// Start with familiar API
const data1 = await readFile("data.json", "utf8");

// Optimize hot path with Rust API
const file: Unique<File> = File.open("large.bin")?;
const buffer = file.read_to_end()?;
```

**Benefits:**
1. **Gradual learning** - Start with TS-oriented APIs, progress to Rust-oriented as needed
2. **Best of both worlds** - TypeScript ergonomics + Rust performance control
3. **Clear progression path** - Familiar APIs first → Rust optimization later
4. **Target-specific optimization** - JS target uses real Node.js, Rust target compiles natively

### Recommended Standard Library Structure

```
@goodscript/
├── node/           # TS-oriented: Node.js-compatible APIs
│   ├── fs/
│   ├── path/
│   ├── http/
│   ├── crypto/
│   └── stream/
│
├── web/            # TS-oriented: Web-compatible APIs
│   ├── fetch/
│   ├── crypto/
│   ├── streams/
│   └── url/
│
├── rust/           # Rust-oriented: Direct Rust APIs
│   ├── std/       # std::* modules
│   ├── tokio/     # Async runtime
│   └── serde/     # Serialization
│
└── core/          # Shared utilities (both targets)
    ├── collections/
    ├── error/
    └── result/
```

### Implementation Strategy

**Phase 4.2a: TS-Oriented APIs (Priority 1)**
Focus on most-used Node.js and Web APIs:

```typescript
// @goodscript/node/fs
export const readFile: (path: string, encoding?: string) => Promise<string>;
export const writeFile: (path: string, data: string) => Promise<void>;
export const exists: (path: string) => Promise<boolean>;
export const mkdir: (path: string, options?: { recursive: boolean }) => Promise<void>;

// Maps to:
// - Node.js fs.promises (JS target)
// - tokio::fs (Rust target)
```

```typescript
// @goodscript/node/http
export const createServer: (handler: RequestHandler) => Server;
export interface Server {
  listen(port: number): Promise<void>;
  close(): Promise<void>;
}

// Maps to:
// - Node.js http (JS target)  
// - hyper or actix-web (Rust target)
```

**Phase 4.2b: Web APIs (Priority 2)**

```typescript
// @goodscript/web/fetch
export const fetch: (url: string, options?: RequestInit) => Promise<Response>;

// Maps to:
// - global fetch (JS target: Node 18+, browsers)
// - reqwest (Rust target)
```

**Phase 4.2c: Rust-Oriented APIs (Priority 3)**

```typescript
// @goodscript/rust/std/fs
export class File {
  static open(path: string): Result<Unique<File>, Error>;
  read_to_end(): Result<Unique<Vec<u8>>, Error>;
  write_all(buf: Shared<Vec<u8>>): Result<void, Error>;
}

// Direct Rust mapping - no abstraction
```

### API Examples: Side-by-Side Comparison

#### File I/O

**Node-compatible (recommended for most cases):**
```typescript
import { readFile, writeFile } from "@goodscript/node/fs";

const config = await readFile("config.json", "utf8");
const parsed = JSON.parse(config);
await writeFile("output.json", JSON.stringify(parsed));
```

**Rust-native (for performance-critical code):**
```typescript
import { File, BufReader } from "@goodscript/rust/std";

const file = File.open("large.log")?;
const reader = BufReader.new(file);
const lines = reader.lines().collect()?;
```

#### HTTP Server

**Node-compatible:**
```typescript
import { createServer } from "@goodscript/node/http";

const server = createServer(async (req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Hello World");
});

await server.listen(3000);
```

**Rust-native (Actix/Axum):**
```typescript
import { App, HttpServer } from "@goodscript/rust/actix-web";

const app = App.new()
  .route("/", get(|| async { "Hello World" }));

HttpServer.new(|| app)
  .bind("127.0.0.1:3000")?
  .run()
  .await?;
```

#### HTTP Client

**Web-compatible (works everywhere):**
```typescript
import { fetch } from "@goodscript/web";

const response = await fetch("https://api.example.com/users");
const users = await response.json();
```

**Rust-native (more control):**
```typescript
import { Client } from "@goodscript/rust/reqwest";

const client = Client.new();
const response = client.get("https://api.example.com/users")
  .send()
  .await?;
const body = response.text().await?;
```

### Cross-Target Compatibility

**Key principle:** Same GoodScript code compiles to both targets

```typescript
// config.gs.ts - works on both JS and Rust targets
import { readFile } from "@goodscript/node/fs";

export const loadConfig = async (): Promise<Config> => {
  const json = await readFile("config.json", "utf8");
  return JSON.parse(json);
};

// Compiles to:
// - JS target: uses Node.js fs.promises.readFile
// - Rust target: uses tokio::fs::read_to_string
```

### Performance Guidance

**When to use TS-oriented APIs:**
- ✅ Standard CRUD operations
- ✅ Configuration loading
- ✅ Most web services
- ✅ Prototyping and MVPs
- ✅ Code shared between JS and Rust targets
- ✅ Team members learning GoodScript

**When to use Rust-oriented APIs:**
- ✅ Performance-critical hot paths (identified by profiling)
- ✅ Low-level system programming
- ✅ Custom memory management
- ✅ Direct hardware access
- ✅ Integrating with existing Rust crates
- ✅ Team has Rust experience

### Migration Path

**Step 1: Start with TS-oriented APIs**
```typescript
import { readFile } from "@goodscript/node/fs";
const data = await readFile("data.txt", "utf8");
```

**Step 2: Profile and identify bottlenecks**
```bash
gsc profile --target=rust
# Shows: readFile() is called 10,000 times/sec
```

**Step 3: Optimize hot paths with Rust-oriented APIs**
```typescript
import { File, BufReader } from "@goodscript/rust/std";

const file = File.open("data.txt")?;
const reader = BufReader.new(file);
// 10x faster for large files
```

---

### Built-in JavaScript Types (Enhanced)

GoodScript's built-in types work on both targets:

```typescript
// Arrays - familiar syntax, ownership-aware
const arr: Unique<number[]> = [1, 2, 3];
arr.push(4);                    // Mutation requires ownership
const item = arr[0];            // Indexing returns value copy
const len = arr.length;         // Standard property

// Maps - JavaScript Map API
const map: Unique<Map<string, number>> = new Map();
map.set("a", 1);
const value = map.get("a");     // Returns number | undefined
const has = map.has("a");       // Returns boolean

// Sets - JavaScript Set API  
const set: Unique<Set<string>> = new Set();
set.add("hello");
set.delete("hello");
const size = set.size;

// Compiles to:
// - JS target: Native JavaScript Array/Map/Set
// - Rust target: Vec<T>, HashMap<K,V>, HashSet<T>
```

**Design Principle:** Use JavaScript's built-in collection APIs, not Rust's
- Developers know `array.length`, not `vec.len()`
- Methods like `.push()`, `.map()`, `.filter()` are familiar
- Rust implementation provides these methods on `Vec<T>`

### Advanced Collections (Rust-Native)

For Rust-specific data structures:

```typescript
// @goodscript/rust/std/collections
import { BTreeMap, VecDeque, LinkedList } from "@goodscript/rust/std/collections";

const btree: Unique<BTreeMap<string, number>> = BTreeMap.new();
btree.insert("key", 42);

const deque: Unique<VecDeque<string>> = VecDeque.new();
deque.push_front("first");
deque.push_back("last");
```

These expose Rust's full collection library but are **optional** - most code uses standard JavaScript collections.

### Real-World Example: HTTP API Server

**Using TS-oriented APIs (recommended starting point):**

```typescript
// server.gs.ts - Works on both JS and Rust targets
import { createServer } from "@goodscript/node/http";
import { readFile } from "@goodscript/node/fs";

interface User {
  id: number;
  name: string;
}

const users: Unique<Map<number, User>> = new Map();
users.set(1, { id: 1, name: "Alice" });

const server = createServer(async (req, res) => {
  if (req.url === "/users") {
    const userList = Array.from(users.values());
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(userList));
  } else if (req.url === "/config") {
    const config = await readFile("config.json", "utf8");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(config);
  } else {
    res.writeHead(404);
    res.end("Not Found");
  }
});

await server.listen(3000);
console.log("Server running on http://localhost:3000");

// Compiles to:
// - JS target: Uses Node.js http module (100 lines of familiar code)
// - Rust target: Uses hyper crate (same 100 lines, runs 10x faster)
```

**Optimized with Rust-oriented APIs (advanced):**

```typescript
// server-optimized.gs.ts - Rust target only
import { App, HttpServer } from "@goodscript/rust/actix-web";
import { Json, Path } from "@goodscript/rust/actix-web/extractors";
import { tokio } from "@goodscript/rust";

interface User {
  id: number;
  name: string;
}

// Shared state with Arc<Mutex<T>>
const users = Arc.new(Mutex.new(HashMap.new()));
users.lock().insert(1, { id: 1, name: "Alice" });

const app = App.new()
  .app_data(users.clone())
  .route("/users", get(get_users))
  .route("/users/{id}", get(get_user));

const get_users = async (
  state: Data<Arc<Mutex<HashMap<number, User>>>>
): Promise<Json<User[]>> => {
  const users = state.lock().await;
  const list = users.values().cloned().collect();
  Json(list)
};

const get_user = async (
  path: Path<number>,
  state: Data<Arc<Mutex<HashMap<number, User>>>>
): Promise<Result<Json<User>, NotFound>> => {
  const id = path.into_inner();
  const users = state.lock().await;
  users.get(id)
    .map(|user| Json(user.clone()))
    .ok_or(NotFound)
};

HttpServer.new(|| app)
  .bind("127.0.0.1:3000")?
  .run()
  .await?;

// Uses actix-web directly - full control, maximum performance
// But requires learning Rust patterns
```

**Key Insight:** 
- Start with TS-oriented APIs → Immediate productivity
- Profile and identify bottlenecks → Data-driven optimization
- Rewrite hot paths with Rust-oriented APIs → Targeted performance gains
- Most code stays in familiar TS-oriented APIs → Maintainability

---

## 4. WebAssembly Support

### WASM Compilation Target

```bash
# Compile to WebAssembly
gsc build --target=wasm src/lib.gs.ts

# Output
dist/wasm/
├── lib.wasm           # WebAssembly module
├── lib.d.ts           # TypeScript bindings
├── lib.js             # JavaScript loader
└── package.json       # npm package
```

### JavaScript Interop

**GoodScript → WASM → JavaScript:**

```typescript
// lib.gs.ts
export const processData = (input: Shared<string>): Unique<number> => {
  // Fast Rust computation
  return input.length * 2;
};
```

**Generated JavaScript wrapper:**
```javascript
// lib.js
import init, { processData } from './lib.wasm';

await init();
export { processData };
```

**Usage from browser:**
```html
<script type="module">
  import { processData } from './dist/wasm/lib.js';
  const result = processData("hello"); // Calls WASM
  console.log(result); // 10
</script>
```

### WASM-Specific Optimizations

- **Automatic `wasm-bindgen` generation** for JS interop
- **Memory management** via WASM linear memory
- **Size optimization** with `wasm-opt`
- **Streaming compilation** support

---

## 5. FFI (Foreign Function Interface)

> **🎯 KILLER FEATURE ALREADY AVAILABLE:** Thanks to GoodScript's all-Result error handling pattern (Phase 3), you can **already call any Rust library** and catch errors using familiar try/catch syntax. The Result<T, E> pattern provides seamless interoperability with the entire Rust ecosystem (90,000+ crates). See [ERROR-HANDLING.md](ERROR-HANDLING.md) for comprehensive documentation and examples including file I/O, HTTP requests, databases, JSON parsing, and more.

### Calling Rust from GoodScript

**Declare external Rust functions:**
```typescript
// External Rust library
@rustExtern("my_rust_lib")
declare const computeHash: (data: Shared<string>) => number;

// Use in GoodScript
const hash = computeHash("hello");
```

**Compiler generates:**
```rust
extern crate my_rust_lib;
use my_rust_lib::compute_hash;

let hash = compute_hash("hello");
```

### Calling C Libraries

```typescript
// Bind to C library
@cExtern("libm")
declare const sqrt: (x: number) => number;

const result = sqrt(16.0); // 4.0
```

**Maps to:**
```rust
extern "C" {
    fn sqrt(x: f64) -> f64;
}

unsafe {
    let result = sqrt(16.0);
}
```

### Type Safety Guarantees

- **Ownership checking** across FFI boundaries
- **Null-safety validation** for C pointers
- **Memory safety warnings** for unsafe operations

---

## 6. Build Tooling

### CLI Commands

```bash
# Initialize new project
gsc init my-app --template=rust-cli

# Build for multiple targets
gsc build --target=rust,wasm,js

# Run with arguments
gsc run --target=rust -- --config=prod.toml

# Watch mode
gsc watch --target=rust

# Release build with optimizations
gsc build --target=rust --release --optimize

# Cross-compile for different platforms
gsc build --target=rust --platform=linux-x64
gsc build --target=rust --platform=macos-arm64
gsc build --target=rust --platform=windows-x64
```

### Project Templates

```bash
# CLI application
gsc init my-cli --template=rust-cli

# Web service (Actix/Axum)
gsc init my-api --template=rust-web

# WebAssembly library
gsc init my-lib --template=wasm-lib

# Desktop app (Tauri)
gsc init my-gui --template=rust-tauri
```

### Configuration File

**`goodscript.config.json`:**
```json
{
  "targets": {
    "rust": {
      "edition": "2021",
      "profile": "release",
      "features": ["tokio-runtime"],
      "platform": "linux-x64"
    },
    "wasm": {
      "bindgen": true,
      "optimize": "z",
      "features": ["wasm-bindgen"]
    }
  },
  "dependencies": {
    "rust": {
      "tokio": { "version": "1.0", "features": ["full"] },
      "serde": "1.0"
    }
  },
  "build": {
    "outDir": "dist",
    "sourceMap": true
  }
}
```

---

## 7. npm/Cargo Bridge

### Using npm Packages in Rust Builds

**Declarative imports with fallbacks:**

```typescript
// Prefer Rust crate, fallback to npm
@prefer("rust")
import { fetch } from "reqwest" | "node-fetch";

// Rust build uses reqwest
// JS build uses node-fetch
```

**Package mapping registry:**
```json
{
  "mappings": {
    "lodash": {
      "rust": "itertools",
      "wasm": "itertools",
      "js": "lodash"
    },
    "axios": {
      "rust": "reqwest",
      "wasm": "web-sys",
      "js": "axios"
    }
  }
}
```

### Conditional Compilation

```typescript
// Platform-specific code
if (TARGET === "rust") {
  // Use native Rust implementation
  import { fastCompute } from "./native.rs";
} else {
  // Use JavaScript fallback
  import { fastCompute } from "./fallback.js";
}
```

---

## 8. Deployment Tools

### Binary Packaging

```bash
# Create standalone executable
gsc package --target=rust --standalone

# Output: dist/my-app (includes runtime, no external deps)
```

### Container Images

```bash
# Generate Dockerfile
gsc docker --target=rust

# Build container
gsc docker build --tag=my-app:latest
```

**Generated Dockerfile:**
```dockerfile
FROM rust:1.75 as builder
WORKDIR /app
COPY . .
RUN cargo build --release

FROM debian:bookworm-slim
COPY --from=builder /app/target/release/my-app /usr/local/bin/
CMD ["my-app"]
```

### Cross-Platform Builds

```bash
# Build for multiple platforms
gsc build --target=rust --platforms=linux-x64,macos-arm64,windows-x64

# Output:
dist/
├── my-app-linux-x64
├── my-app-macos-arm64
└── my-app-windows-x64.exe
```

---

## 9. Testing Framework

### Unit Testing for Rust Target

```typescript
// app.test.gs.ts
import { describe, it, expect } from "@goodscript/test";
import { processData } from "./app.gs";

describe("processData", () => {
  it("should process input correctly", () => {
    const input: Unique<string> = "test";
    const result = processData(input);
    expect(result).toBe(4);
  });
});
```

**Runs tests in Rust:**
```bash
gsc test --target=rust

# Uses Rust test framework
# Output:
running 1 test
test processData::should_process_input_correctly ... ok
```

### Integration Testing

```typescript
// integration.test.gs.ts
import { testServer } from "@goodscript/test/http";

it("should handle HTTP requests", async () => {
  const server = testServer();
  const response = await server.get("/api/users");
  expect(response.status).toBe(200);
});
```

### Dual-Target Testing (Phase 3 Validation)

```bash
# Run same tests on both JS and Rust targets
gsc test --targets=js,rust --compare

# Verifies identical behavior
✓ All tests passed on both targets
✓ Outputs match exactly
```

---

## 10. Documentation & Best Practices

### Generated Documentation

```bash
# Generate API docs from GoodScript
gsc docs --target=rust

# Output: docs/
# - API reference (rustdoc-style)
# - Usage examples
# - Type signatures
```

### Migration Guides

**1. JavaScript → GoodScript (Rust):** Porting existing Node.js apps
- Chapter 1: Replace dynamic patterns with static types
- Chapter 2: Add ownership annotations
- Chapter 3: Use `@goodscript/node` for familiar APIs
- Chapter 4: Compile to both targets, compare behavior
- Chapter 5: Profile and optimize hot paths with Rust APIs

**2. TypeScript → GoodScript:** Gradual adoption strategy
- Start with `.gs.ts` files alongside `.ts` files
- Use language level "clean" initially (no ownership)
- Add ownership types when ready for Rust compilation
- Incremental migration - file by file

**3. Ownership Best Practices:** When to use Unique/Shared/Weak
- Unique: Single owner (configs, request/response objects)
- Shared: Multiple readers (cached data, shared config)
- Weak: Back-references (parent pointers, observers)

**4. API Selection Guide:** TS-oriented vs Rust-oriented

**When to use `@goodscript/node` or `@goodscript/web` (TS-oriented):**
- ✅ Initial development and prototyping
- ✅ CRUD applications with moderate scale
- ✅ Code shared between JS and Rust targets
- ✅ Team members unfamiliar with Rust
- ✅ Standard web services, APIs, tools
- ✅ Learning GoodScript

**When to use `@goodscript/rust/*` (Rust-oriented):**
- ✅ Performance-critical hot paths (identified by profiling)
- ✅ Low-level system operations
- ✅ Custom memory management patterns
- ✅ Direct hardware or OS integration
- ✅ Team has Rust experience
- ✅ Need maximum control

**Performance Optimization:** Profiling and tuning Rust output
- Step 1: Build with profiling enabled (`gsc build --target=rust --profile`)
- Step 2: Run performance tests, collect metrics
- Step 3: Identify bottlenecks (use `flamegraph`, `perf`)
- Step 4: Replace hot code paths with Rust-oriented APIs
- Step 5: Measure improvement, iterate

### Learning Path Documentation

**Beginner Track (TS-oriented APIs):**
```
1. Quick Start - Build a CLI app in 10 minutes
   - Uses @goodscript/node/fs
   - Compiles to Rust binary
   - No Rust knowledge required

2. Web Server Tutorial - Build an HTTP API
   - Uses @goodscript/node/http
   - Familiar Express-like patterns
   - Deploy standalone binary

3. Fetching Data - HTTP client basics
   - Uses @goodscript/web/fetch
   - Same API as browsers
   - Works in Rust too
```

**Advanced Track (Rust-oriented APIs):**
```
4. Performance Optimization - When TS-oriented APIs aren't enough
   - Profile to find bottlenecks
   - Replace with @goodscript/rust/std
   - Measure improvements

5. Systems Programming - Low-level control
   - Direct file descriptors
   - Memory-mapped I/O
   - Custom allocators

6. Concurrency Patterns - Rust's fearless concurrency
   - Tokio async runtime
   - Channels and message passing
   - Thread pools and rayon
```

**API Reference Organization:**

```
docs/
├── quick-start/           # Uses TS-oriented APIs only
├── guides/
│   ├── ts-oriented/      # @goodscript/node & web reference
│   │   ├── node-apis.md
│   │   └── web-apis.md
│   └── rust-oriented/    # @goodscript/rust reference
│       ├── std-apis.md
│       └── tokio-apis.md
├── migration/
│   ├── from-nodejs.md
│   ├── from-typescript.md
│   └── optimization-guide.md
└── examples/
    ├── ts-oriented/      # Beginner-friendly examples
    └── rust-oriented/    # Advanced examples
```

### Example Projects

Provide reference implementations showing the API layers in action:

**TS-Oriented Examples (Start Here):**
- **CLI tool** - Uses `@goodscript/node/fs` for file operations
- **REST API** - Uses `@goodscript/node/http` for Express-like server
- **HTTP client** - Uses `@goodscript/web/fetch` for API calls
- **JSON processor** - Standard JSON/Map/Array with ownership

**Rust-Oriented Examples (Advanced):**
- **High-performance server** - Uses `@goodscript/rust/actix-web` 
- **Systems utility** - Direct file descriptors, memory-mapped I/O
- **Data processor** - Custom allocators, SIMD operations
- **Concurrent pipeline** - Tokio async, channels, parallelism

**Hybrid Examples (Both Layers):**
- **Web scraper** - `fetch` for HTTP, Rust regex for parsing hotpath
- **Log analyzer** - Node `fs` API for discovery, Rust I/O for processing
- **API gateway** - Node HTTP for routing, Rust for authentication
- **Database driver** - Familiar connection API, Rust for query execution

### Adoption Strategy Impact

**Without Node/Web APIs (Rust-only):**
```typescript
// Unfamiliar, high friction
import { File } from "std::fs";
const file = File::open("config.json")?;
let mut contents = String::new();
file.read_to_string(&mut contents)?;
// TypeScript developers: "What is this syntax?"
```

**With Node/Web APIs (Hybrid):**
```typescript
// Familiar, zero friction
import { readFile } from "@goodscript/node/fs";
const contents = await readFile("config.json", "utf8");
// TypeScript developers: "I already know this!"
```

**Result:**
- ✅ **Day 1 productivity** - Write GoodScript like TypeScript
- ✅ **Gradual learning** - Adopt Rust patterns when ready
- ✅ **Lower barrier to entry** - Familiar APIs reduce cognitive load
- ✅ **Higher adoption** - Developers can start immediately

---

## Implementation Phases

### Phase 4.1: Cargo Integration (Month 1-2)
- ✅ Generate `Cargo.toml` from GoodScript projects
- ✅ CLI commands: `build`, `run`, `check`
- ✅ Basic project templates
- ✅ Release builds with optimizations

### Phase 4.2: Standard Library (Month 3-4)
- ✅ **TS-oriented API layer** (`@goodscript/node` + `@goodscript/web`)
  - fs/promises, http, path, crypto modules (Node.js-compatible)
  - fetch, streams, crypto Web APIs (Web-compatible)
  - Identical APIs to Node.js 18+ and Web standards
  - Maps to Rust equivalents (tokio::fs, hyper, reqwest)
- ✅ **Core collections with JavaScript APIs**
  - Array, Map, Set with familiar methods
  - `.length`, `.push()`, `.map()` not `.len()`, `.push_back()`
  - Ownership-aware but ergonomic
- ✅ **Rust-oriented API layer** (`@goodscript/rust`)
  - Direct std::* access for advanced use
  - Performance-critical paths only
  - Optional - use when profiling identifies need

### Phase 4.3: WebAssembly Target (Month 5-6)
- ✅ WASM compilation pipeline
- ✅ JavaScript interop (`wasm-bindgen`)
- ✅ npm package generation
- ✅ Browser integration examples

### Phase 4.4: FFI & Interop (Month 7-8)
- ✅ Rust crate dependencies
- ✅ C library bindings
- ✅ Type safety across boundaries
- ✅ npm → Rust crate mapping

### Phase 4.5: Testing & Tooling (Month 9-10)
- ✅ Test framework for Rust target
- ✅ Dual-target validation
- ✅ Cross-platform builds
- ✅ Docker/container support

### Phase 4.6: Polish & Documentation (Month 11-12)
- ✅ Comprehensive docs
- ✅ Migration guides
- ✅ Example projects
- ✅ Performance benchmarks
- ✅ Production readiness checklist

---

## Success Metrics

Phase 4 is complete when:

1. **Developer can build a CLI app** in GoodScript and deploy a standalone binary
2. **WASM library** can be published to npm and used in React apps
3. **Web service** can be built with async I/O and deployed to production
4. **External Rust crates** can be used seamlessly from GoodScript
5. **Test suite** runs identically on JS and Rust targets
6. **Documentation** covers all common use cases
7. **Migration path** exists from TypeScript/JavaScript projects

---

## Future Considerations (Post-Phase 4)

### Advanced Features
- **Async/await optimization** for Rust's tokio runtime
- **SIMD support** for data-parallel operations
- **GPU acceleration** via compute shaders
- **Embedded targets** (microcontrollers, IoT)

### Ecosystem Growth
- **Package registry** for GoodScript libraries
- **IDE plugins** for JetBrains, Neovim
- **CI/CD integrations** (GitHub Actions, GitLab CI)
- **Cloud deployment** templates (AWS Lambda, Cloudflare Workers)

### Community Tools
- **Linter/formatter** for GoodScript code style
- **Benchmarking suite** for performance testing
- **Migration automation** for large codebases
- **Plugin system** for custom transformations

---

## Relationship to Other Phases

| Phase | Focus | Output | Phase 4 Dependency |
|-------|-------|--------|-------------------|
| Phase 1 | Language restrictions | TypeScript | ❌ Independent |
| Phase 2 | Ownership analysis | TypeScript | ❌ Independent |
| Phase 3 | Rust code generation | Rust source | ✅ **Required** |
| **Phase 4** | **Ecosystem integration** | **Production-ready Rust** | — |

**Key Point:** Phase 4 makes Phase 3's Rust code generation **usable in practice**. Without it, you have Rust code but no way to build, test, or deploy applications.

---

## Open Questions

### 1. Standard Library API Surface

**Decision: Hybrid approach with Node/Web compatibility layer**

**Rationale:**
- TypeScript developers expect familiar APIs (`readFile`, `fetch`, `JSON.parse`)
- Migration from Node.js/Deno/Bun should be seamless
- But Rust-oriented APIs should be available for optimization
- Two-layer system: TS-oriented (comfort) + Rust-oriented (performance)

**Implementation:**
```typescript
// TS-oriented: Familiar APIs (80% of use cases)
import { readFile } from "@goodscript/node/fs";

// Rust-oriented: Direct Rust APIs (20% performance-critical)  
import { File } from "@goodscript/rust/std";
```

**Benefits:**
- Zero learning curve for TypeScript developers
- Easy migration path (start with Tier 1, optimize to Tier 2)
- Code portability between JS and Rust targets
- Gradual adoption of Rust concepts

**Documentation strategy:**
- Quick start guide uses TS-oriented APIs exclusively
- Advanced guide introduces Rust-oriented APIs for optimization
- Performance guide shows when/how to progress from TS to Rust APIs

### 2. Package Registry

**Question:** Should GoodScript have its own registry, or use npm + crates.io?
### 2. Package Registry

**Question:** Should GoodScript have its own registry, or use npm + crates.io?

**Recommendation:** Use existing registries
- GoodScript packages published to **npm** (discoverable, familiar)
- Rust dependencies via **crates.io** (declared in `goodscript.config.json`)
- Compiler handles bridging between ecosystems

2. **Rust Edition:** Default to `2021` or wait for `2024`?

**Recommendation:** Use Rust edition 2021 for stability
- Proven stable, widely supported
- Migrate to 2024 when it stabilizes (likely 2026)

3. **Async Runtime:** Mandate tokio, or support multiple runtimes (async-std, smol)?

**Recommendation:** Default to tokio, allow overrides
- `@goodscript/node` and `@goodscript/web` use tokio by default
- Advanced users can use `@goodscript/rust/async-std` directly
- Most developers never think about it

4. **WASM Size:** Acceptable size limit for browser bundles? (Target: < 100KB gzipped?)

**Target:** < 200KB gzipped for typical applications
- Use `wasm-opt -Oz` for size optimization
- Tree-shaking to eliminate unused code
- Stream compilation for faster startup

5. **Breaking Changes:** How to handle Rust std lib API changes across versions?

**Strategy:** Semantic versioning with compatibility shims
- GoodScript standard library version pins Rust version
- Major version bumps when Rust API changes
- Compatibility layer smooths over minor changes

---

## Contributing to Phase 4

Phase 4 is a **large, multi-faceted effort**. Contributions welcome in:

- **Tooling:** Build scripts, CLI commands, project templates
- **Standard Library:** Core utilities, I/O operations
- **WASM Integration:** Browser bindings, npm packaging
- **Documentation:** Guides, examples, best practices
- **Testing:** Dual-target validation, benchmarks

See `CONTRIBUTING.md` for details.

---

## Conclusion

Phase 4 transforms GoodScript from a "compiler experiment" into a **production-ready systems programming language**. By providing Cargo integration, standard library, WASM support, and comprehensive tooling, developers can build real applications with confidence.

The goal: **Make it as easy to deploy a GoodScript Rust binary as it is to deploy a Node.js app.**
