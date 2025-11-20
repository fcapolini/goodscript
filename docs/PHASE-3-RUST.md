# Phase 3: Rust Code Generation

**Status:** 🚧 In Progress (rustc validation infrastructure complete)

**Test Coverage:** 61 tests passing (39 AST translation tests + 22 rustc validation tests)

## Current Implementation Status

### ✅ Completed Features

- **AST → Rust Translation** - Core transformation pipeline working
- **Rustc Validation** - All generated Rust code compiles with rustc (22 validation tests)
- **Ownership Type Mapping** - `Unique<T>` → `Box<T>`, `Shared<T>` → `Rc<T>`, `Weak<T>` → `Weak<T>`
- **Ownership Constructors** - Automatic wrapping in Box::new(), Rc::new(), Rc::downgrade()
- **Primitive Types** - number→f64, string→String, boolean→bool, void→()
- **Nullable Types** - `T | null | undefined` → `Option<T>`
- **Collections** - Arrays→Vec, array literals→vec! with proper f64 literals
- **Arrow Functions** - Both single-expression and block bodies with correct closure syntax
- **Classes** - Translate to struct + impl blocks with proper self/&mut self
- **Interfaces** - Translate to structs
- **This→Self** - Proper translation of `this` references to `self`
- **For-of Loops** - Clean Rust iteration syntax with proper borrowing (&)
- **Binary Operators** - Including `===` → `==`, `!==` → `!=`
- **Automatic Imports** - use statements generated as needed (std::rc::{Rc, Weak}, std::collections::HashMap)

### 📋 Remaining Work

- Exception → `Result<T, E>` translation
- Async/await → Tokio futures
- Standard library mappings (fs, http, etc.)
- Module system (imports/exports)
- Cargo.toml generation
- Type aliases and enums
- Match expressions for discriminated unions
- Advanced control flow

### Usage

Compile GoodScript to Rust:

```bash
gsc --target rust -o dist/rust src/main.gs.ts
```

This generates `.rs` files in the output directory with proper ownership types and idiomatic Rust code.

### Rustc Validation

All generated Rust code is validated using `rustc` to ensure it compiles successfully:

```typescript
import { validateRustCode, isRustcAvailable } from './test/phase3/rust-validator';

if (isRustcAvailable()) {
  const result = validateRustCode(generatedRustCode);
  if (!result.valid) {
    console.error('Rust compilation errors:', result.errors);
  }
}
```

The test suite includes 22 comprehensive validation tests covering:
- Primitive types (number, string, boolean)
- Arrow functions (single-expression and block bodies)
- Collections (arrays, vec! macros)
- Ownership types (Unique, Shared, Weak)
- Classes (structs, impl blocks, methods)
- Advanced features (for-of loops, this.property, control flow)
- Null/undefined handling

**All 61 Phase 3 tests pass**, with every generated Rust code snippet compiling successfully with rustc.

---

## Overview

Phase 3 implements **Rust code generation** from validated GoodScript code, translating TypeScript syntax and ownership semantics into efficient, idiomatic Rust. This phase transforms the ownership annotations verified in Phase 2 into Rust's native ownership system, delivering native performance and memory safety.

**Philosophy:** The ownership semantics validated at compile time should map directly to Rust's zero-cost abstractions without runtime overhead.

**Output:** Rust source code ready for compilation with `cargo build`

---

## Objectives

| Objective | Description | Priority |
|-----------|-------------|----------|
| **AST → Rust Translation** | Transform TypeScript AST to Rust syntax | Critical |
| **Ownership Mapping** | `Unique<T>` → `Box<T>`, `Shared<T>` → `Rc<T>`, `Weak<T>` → `Weak<T>` | Critical |
| **Type System Translation** | TypeScript types → Rust types | Critical |
| **Standard Library Mapping** | JavaScript APIs → Rust equivalents | High |
| **Async/Await Translation** | Promises → Tokio futures | High |
| **Error Handling** | Exceptions → `Result<T, E>` | High |
| **Module System** | ES modules → Rust modules | Medium |
| **Dual-Target Validation** | Verify JS and Rust outputs match | Critical |

---

## Ownership Translation

### Core Mappings

| GoodScript | Rust | Semantics |
|------------|------|-----------|
| `Unique<T>` | `Box<T>` | Heap allocation, exclusive ownership |
| `Shared<T>` | `Rc<T>` | Reference counting, shared ownership |
| `Weak<T>` | `Weak<T>` | Non-owning, breaks cycles |
| `T \| null \| undefined` | `Option<T>` | Nullable types |

### Translation Examples

#### Example 1: Unique Ownership

**GoodScript:**
```typescript
class Config {
  settings: Unique<Map<string, string>>;
}

const loadConfig = (): Unique<Config> => {
  return {
    settings: new Map([["key", "value"]])
  };
};
```

**Generated Rust:**
```rust
use std::collections::HashMap;

struct Config {
    settings: Box<HashMap<String, String>>,
}

fn load_config() -> Box<Config> {
    Box::new(Config {
        settings: Box::new(HashMap::from([
            (String::from("key"), String::from("value"))
        ])),
    })
}
```

#### Example 2: Shared Ownership

**GoodScript:**
```typescript
class Cache {
  data: Shared<Map<string, number>>;
}

const cache1: Shared<Cache> = createCache();
const cache2 = cache1;  // Clone reference
```

**Generated Rust:**
```rust
use std::rc::Rc;
use std::collections::HashMap;

struct Cache {
    data: Rc<HashMap<String, i64>>,
}

fn create_cache() -> Rc<Cache> {
    Rc::new(Cache {
        data: Rc::new(HashMap::new()),
    })
}

// Usage
let cache1 = create_cache();
let cache2 = Rc::clone(&cache1);  // Reference count increments
```

#### Example 3: Weak References

**GoodScript:**
```typescript
class TreeNode {
  children: Shared<TreeNode>[];
  parent: Weak<TreeNode>;
}

const getParent = (node: TreeNode): TreeNode | null | undefined => {
  if (node.parent !== null && node.parent !== undefined) {
    return node.parent;
  }
  return undefined;
};
```

**Generated Rust:**
```rust
use std::rc::{Rc, Weak};

struct TreeNode {
    children: Vec<Rc<TreeNode>>,
    parent: Weak<TreeNode>,
}

fn get_parent(node: &TreeNode) -> Option<Rc<TreeNode>> {
    node.parent.upgrade()  // upgrade() returns Option<Rc<T>>
}
```

---

## Type System Translation

### Primitive Types

| TypeScript | Rust | Notes |
|------------|------|-------|
| `number` | `f64` | Default floating-point |
| `bigint` | `i64` | 64-bit integer |
| `string` | `String` | Heap-allocated UTF-8 |
| `boolean` | `bool` | True/false |
| `void` | `()` | Unit type |
| `never` | `!` | Never returns |

### Collection Types

| TypeScript | GoodScript | Rust |
|------------|------------|------|
| `T[]` | `Unique<T[]>` | `Vec<T>` |
| `Array<T>` | `Shared<Array<T>>` | `Rc<Vec<T>>` |
| `Map<K, V>` | `Unique<Map<K, V>>` | `HashMap<K, V>` |
| `Set<T>` | `Unique<Set<T>>` | `HashSet<T>` |

### Complex Types

#### Interfaces → Structs

**GoodScript:**
```typescript
interface User {
  id: number;
  name: string;
  email: Weak<string>;
}
```

**Generated Rust:**
```rust
struct User {
    id: i64,
    name: String,
    email: Option<String>,  // Weak<T> → Option<T>
}
```

#### Classes → Structs + Impl

**GoodScript:**
```typescript
class Counter {
  private count: number = 0;
  
  increment(): void {
    this.count += 1;
  }
  
  getCount(): number {
    return this.count;
  }
}
```

**Generated Rust:**
```rust
struct Counter {
    count: i64,
}

impl Counter {
    fn new() -> Self {
        Counter { count: 0 }
    }
    
    fn increment(&mut self) {
        self.count += 1;
    }
    
    fn get_count(&self) -> i64 {
        self.count
    }
}
```

#### Generics → Rust Generics

**GoodScript:**
```typescript
class Container<T> {
  value: T;
  
  get(): T {
    return this.value;
  }
}
```

**Generated Rust:**
```rust
struct Container<T> {
    value: T,
}

impl<T> Container<T> {
    fn get(&self) -> &T {
        &self.value
    }
}
```

---

## Control Flow Translation

### Conditionals

**GoodScript:**
```typescript
const max = (a: number, b: number): number => {
  if (a > b) {
    return a;
  } else {
    return b;
  }
};
```

**Generated Rust:**
```rust
fn max(a: f64, b: f64) -> f64 {
    if a > b {
        a
    } else {
        b
    }
}
```

### Loops

**GoodScript:**
```typescript
const sum = (numbers: number[]): number => {
  let total = 0;
  for (const n of numbers) {
    total += n;
  }
  return total;
};
```

**Generated Rust:**
```rust
fn sum(numbers: &Vec<f64>) -> f64 {
    let mut total = 0.0;
    for n in numbers {
        total += n;
    }
    total
}
```

### Pattern Matching

**GoodScript:**
```typescript
type Result = { type: "success"; value: number } 
            | { type: "error"; message: string };

const process = (result: Result): string => {
  if (result.type === "success") {
    return `Value: ${result.value}`;
  } else {
    return `Error: ${result.message}`;
  }
};
```

**Generated Rust:**
```rust
enum Result {
    Success { value: i64 },
    Error { message: String },
}

fn process(result: Result) -> String {
    match result {
        Result::Success { value } => format!("Value: {}", value),
        Result::Error { message } => format!("Error: {}", message),
    }
}
```

---

## Async/Await Translation

### Promises → Tokio Futures

**GoodScript:**
```typescript
import { readFile } from "@goodscript/node/fs";

const loadConfig = async (): Promise<string> => {
  const data = await readFile("config.json", "utf8");
  return data;
};
```

**Generated Rust:**
```rust
use tokio::fs;

async fn load_config() -> Result<String, std::io::Error> {
    let data = fs::read_to_string("config.json").await?;
    Ok(data)
}
```

### Concurrent Operations

**GoodScript:**
```typescript
const fetchAll = async (urls: string[]): Promise<string[]> => {
  const promises = urls.map(url => fetch(url));
  return Promise.all(promises);
};
```

**Generated Rust:**
```rust
use futures::future::join_all;

async fn fetch_all(urls: Vec<String>) -> Result<Vec<String>, reqwest::Error> {
    let futures = urls.into_iter().map(|url| async move {
        reqwest::get(&url).await?.text().await
    });
    
    join_all(futures).await
        .into_iter()
        .collect::<Result<Vec<_>, _>>()
}
```

---

## Error Handling

### Exceptions → Result<T, E>

**GoodScript:**
```typescript
const parseNumber = (s: string): number => {
  const n = parseFloat(s);
  if (isNaN(n)) {
    throw new Error(`Invalid number: ${s}`);
  }
  return n;
};
```

**Generated Rust:**
```rust
fn parse_number(s: &str) -> Result<f64, String> {
    s.parse::<f64>()
        .map_err(|_| format!("Invalid number: {}", s))
}

// Usage
match parse_number("42") {
    Ok(n) => println!("Number: {}", n),
    Err(e) => eprintln!("Error: {}", e),
}
```

### Try/Catch → Result + ?

**GoodScript:**
```typescript
const processFile = async (path: string): Promise<string> => {
  try {
    const data = await readFile(path, "utf8");
    return data.toUpperCase();
  } catch (err) {
    return `Error: ${err}`;
  }
};
```

**Generated Rust:**
```rust
async fn process_file(path: &str) -> String {
    match tokio::fs::read_to_string(path).await {
        Ok(data) => data.to_uppercase(),
        Err(err) => format!("Error: {}", err),
    }
}
```

---

## Standard Library Mapping

### File I/O

**GoodScript:**
```typescript
import { readFile, writeFile } from "@goodscript/node/fs";

const content = await readFile("input.txt", "utf8");
await writeFile("output.txt", content);
```

**Generated Rust:**
```rust
use tokio::fs;

let content = fs::read_to_string("input.txt").await?;
fs::write("output.txt", content).await?;
```

### HTTP Client

**GoodScript:**
```typescript
import { fetch } from "@goodscript/web";

const response = await fetch("https://api.example.com/users");
const users = await response.json();
```

**Generated Rust:**
```rust
use reqwest;

let response = reqwest::get("https://api.example.com/users").await?;
let users: Vec<User> = response.json().await?;
```

### Collections

**GoodScript:**
```typescript
const map: Unique<Map<string, number>> = new Map();
map.set("key", 42);
const value = map.get("key");
```

**Generated Rust:**
```rust
use std::collections::HashMap;

let mut map = HashMap::new();
map.insert(String::from("key"), 42);
let value = map.get("key");
```

---

## Module System

### ES Modules → Rust Modules

**GoodScript:**
```typescript
// math.gs.ts
export const add = (a: number, b: number): number => a + b;
export const multiply = (a: number, b: number): number => a * b;

// app.gs.ts
import { add, multiply } from "./math";

const result = add(2, multiply(3, 4));
```

**Generated Rust:**
```rust
// math.rs
pub fn add(a: f64, b: f64) -> f64 {
    a + b
}

pub fn multiply(a: f64, b: f64) -> f64 {
    a * b
}

// main.rs or lib.rs
mod math;
use math::{add, multiply};

let result = add(2.0, multiply(3.0, 4.0));
```

---

## Cargo Integration

### Automatic Cargo.toml Generation

**Generated from GoodScript project:**

```toml
[package]
name = "my-goodscript-app"
version = "0.1.0"
edition = "2021"

[dependencies]
# Auto-detected from imports
tokio = { version = "1.0", features = ["full"] }
reqwest = { version = "0.11", features = ["json"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

[profile.release]
opt-level = 3
lto = true
codegen-units = 1
```

### Build Integration

```bash
# GoodScript compiler generates Rust code
gsc build --target=rust src/main.gs.ts

# Output structure:
dist/rust/
├── Cargo.toml
├── src/
│   ├── main.rs
│   ├── lib.rs
│   └── math.rs
└── target/  # Cargo build artifacts

# Compile with Cargo
cd dist/rust && cargo build --release
```

---

## Code Generation Strategies

### Strategy 1: Direct Translation

**Simple 1:1 mapping for straightforward code:**

```typescript
const square = (x: number): number => x * x;
```

```rust
fn square(x: f64) -> f64 {
    x * x
}
```

### Strategy 2: Idiomatic Rust

**Generate idiomatic Rust patterns:**

```typescript
const items: number[] = [1, 2, 3, 4, 5];
const doubled = items.map(x => x * 2);
```

```rust
let items = vec![1, 2, 3, 4, 5];
let doubled: Vec<i64> = items.iter()
    .map(|x| x * 2)
    .collect();
```

### Strategy 3: Optimization

**Leverage Rust's zero-cost abstractions:**

```typescript
const sum = (numbers: number[]): number => {
  return numbers.reduce((acc, n) => acc + n, 0);
};
```

```rust
fn sum(numbers: &[f64]) -> f64 {
    numbers.iter().sum()  // Optimized by LLVM
}
```

---

## Implementation Plan

### Phase 3.1: Core AST Translation (Month 1-2)

**Deliverables:**
- TypeScript AST → Rust AST conversion
- Basic type mapping (primitives, classes, interfaces)
- Function and method translation
- Control flow (if/else, loops)

**Success Criteria:**
- Can compile simple GoodScript programs to Rust
- Generated Rust compiles with `cargo build`
- Basic test suite passes

### Phase 3.2: Ownership Translation (Month 3-4)

**Deliverables:**
- `Unique<T>` → `Box<T>` mapping
- `Shared<T>` → `Rc<T>` mapping
- `Weak<T>` → `Weak<T>` mapping
- Ownership transfer semantics
- Lifetime inference

**Success Criteria:**
- Ownership semantics validated in Phase 2 compile to correct Rust
- No manual lifetime annotations needed (compiler infers)
- Memory safety guaranteed by Rust compiler

### Phase 3.3: Standard Library Mapping (Month 5-6)

**Deliverables:**
- File I/O translation (`fs` → `tokio::fs`)
- HTTP client (`fetch` → `reqwest`)
- Collections (`Array/Map/Set` → `Vec/HashMap/HashSet`)
- Async/await (`Promise` → `Future`)

**Success Criteria:**
- Standard library imports compile to Rust equivalents
- API compatibility with TS-oriented APIs (Phase 4)
- Performance matches or exceeds hand-written Rust

### Phase 3.4: Error Handling & Modules (Month 7-8)

**Deliverables:**
- Exception → `Result<T, E>` translation
- ES modules → Rust modules
- `Cargo.toml` generation
- Dependency resolution

**Success Criteria:**
- Error handling is idiomatic Rust
- Module system works across multiple files
- Cargo integration seamless

### Phase 3.5: Dual-Target Validation (Month 9-10)

**Deliverables:**
- Test framework compiles to both JS and Rust
- Automated output comparison
- Performance benchmarking suite
- Correctness validation

**Success Criteria:**
- Same GoodScript source produces identical behavior in JS and Rust
- Test suite passes on both targets
- Performance improvements documented

### Phase 3.6: Optimization & Polish (Month 11-12)

**Deliverables:**
- Code generation optimization
- Rust idiom improvements
- Error message quality
- Documentation and examples

**Success Criteria:**
- Generated Rust is readable and idiomatic
- Performance competitive with hand-written Rust
- Developer experience smooth
- Ready for Phase 4

---

## Dual-Target Validation

### The Strategy

**Goal:** Prove that GoodScript → Rust compilation is semantically correct.

**Approach:**
1. Compile same `.gs.ts` source to **both** JavaScript and Rust
2. Run **identical test suites** against both outputs
3. **Compare results** - they must match exactly
4. If divergence found → **compiler bug** (fix before release)

### Example

**GoodScript test:**
```typescript
// math.test.gs.ts
import { describe, it, expect } from "@goodscript/test";
import { add, multiply } from "./math";

describe("math", () => {
  it("should add numbers", () => {
    expect(add(2, 3)).toBe(5);
  });
  
  it("should multiply numbers", () => {
    expect(multiply(4, 5)).toBe(20);
  });
});
```

**Run on both targets:**
```bash
# Compile to JS and Rust
gsc build --targets=js,rust src/

# Run tests on both
gsc test --targets=js,rust src/math.test.gs.ts

# Output:
✓ JS target: All 2 tests passed
✓ Rust target: All 2 tests passed
✓ Outputs match exactly
```

### Continuous Validation

**CI/CD Integration:**
```yaml
# .github/workflows/test.yml
name: Dual-Target Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install GoodScript
        run: npm install -g goodscript
      - name: Build both targets
        run: gsc build --targets=js,rust
      - name: Run dual-target tests
        run: gsc test --targets=js,rust --compare
      - name: Upload artifacts
        if: failure()
        uses: actions/upload-artifact@v2
        with:
          name: divergence-report
          path: test-divergence.json
```

---

## Performance Targets

### Compilation Speed

| Code Size | TypeScript Parse | Rust Codegen | Cargo Build | Total |
|-----------|-----------------|--------------|-------------|-------|
| 1K LOC | 50ms | 100ms | 2s | 2.15s |
| 10K LOC | 200ms | 500ms | 8s | 8.7s |
| 100K LOC | 1.2s | 3s | 45s | 49.2s |

### Runtime Performance

**Target:** Rust output should be **5-10x faster** than JavaScript for compute-heavy workloads.

**Benchmarks:**
- Array processing: 8x faster
- Hash map operations: 6x faster  
- String manipulation: 4x faster
- I/O operations: 2x faster (limited by OS)

---

## Challenges & Solutions

### Challenge 1: Borrow Checker

**Problem:** JavaScript has no concept of borrowing.

**Solution:** Infer lifetimes from ownership annotations:
- `Unique<T>` → `Box<T>` (owned, no borrowing needed)
- `Shared<T>` → `Rc<T>` (reference counted, no explicit lifetimes)
- `Weak<T>` → `Weak<T>` (non-owning, upgrade checks validity)

### Challenge 2: Null vs Option

**Problem:** JavaScript has `null` and `undefined`, Rust has `Option<T>`.

**Solution:** Treat `null`/`undefined` as synonyms, map to `Option<T>`:
```typescript
const x: string | null | undefined = getValue();
```
```rust
let x: Option<String> = get_value();
```

### Challenge 3: Exceptions

**Problem:** Rust doesn't have exceptions.

**Solution:** Map to `Result<T, E>`:
```typescript
const parse = (s: string): number => {
  if (isNaN(parseFloat(s))) {
    throw new Error("Invalid");
  }
  return parseFloat(s);
};
```
```rust
fn parse(s: &str) -> Result<f64, String> {
    s.parse().map_err(|_| String::from("Invalid"))
}
```

### Challenge 4: Dynamic Dispatch

**Problem:** TypeScript interfaces allow polymorphism, Rust traits require explicit impl.

**Solution:** Generate trait implementations:
```typescript
interface Drawable {
  draw(): void;
}

class Circle implements Drawable {
  draw(): void { }
}
```
```rust
trait Drawable {
    fn draw(&self);
}

struct Circle;

impl Drawable for Circle {
    fn draw(&self) {}
}
```

---

## Success Metrics

Phase 3 is complete when:

1. ✅ AST translation generates compilable Rust
2. ✅ Ownership types map to `Box<T>`, `Rc<T>`, `Weak<T>`
3. ✅ Standard library imports work (fs, http, collections)
4. ✅ Async/await translates to Tokio futures
5. ✅ Error handling uses `Result<T, E>`
6. ✅ Module system generates Rust modules
7. ✅ `Cargo.toml` auto-generation works
8. ✅ Dual-target validation passes
9. ✅ Performance meets targets
10. ✅ Documentation and examples complete

---

## References

- [Rust Book](https://doc.rust-lang.org/book/) - Ownership and type system
- [Tokio](https://tokio.rs/) - Async runtime
- [Serde](https://serde.rs/) - Serialization
- [Reqwest](https://docs.rs/reqwest/) - HTTP client

---

## Next Steps

**Current:** Phase 3 Planning 📋

**Next:** [Phase 4: Ecosystem Integration](./PHASE-4-ECOSYSTEM.md)

Once Phase 3 generates Rust code, Phase 4 will add the tooling, standard library, and deployment support needed for production use.
