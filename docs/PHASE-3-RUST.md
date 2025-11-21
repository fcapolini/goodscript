# Phase 3: Rust Code Generation

**Status:** 🚧 In Progress (all core features complete, comprehensive runtime equivalence testing, concrete example testing)

**Test Coverage:** 452 tests total (451 passing, 1 failing, 6 skipped)
- 449 unit/integration tests (all passing)
- 3 concrete example tests (2 passing, 1 failing - n-queens Rust codegen issues being addressed)

## Current Implementation Status

### ✅ Completed Features

- **AST → Rust Translation** - Core transformation pipeline working
- **Rustc Validation** - All generated Rust code compiles with rustc (30 validation tests)
- **Runtime Equivalence Testing** - 207 tests verify JS and Rust produce identical output across all major features
- **Ownership Type Mapping** - `Unique<T>` → `Box<T>`, `Shared<T>` → `Rc<T>`, `Weak<T>` → `Weak<T>`
- **Ownership Constructors** - Automatic wrapping in Box::new(), Rc::new(), Rc::downgrade()
- **Primitive Types** - number→f64, string→String, boolean→bool, void→()
- **Nullable Types** - `T | null | undefined` → `Option<T>`
- **Collections** - Arrays→Vec, array literals→vec! with proper f64 literals
- **Arrow Functions** - Both single-expression and block bodies with correct closure syntax
- **Classes** - Translate to struct + impl blocks with proper self/&mut self, supports generics, #[derive(Clone)]
- **Class Inheritance** - Full support with field duplication and trait-based polymorphism
  - Base class fields duplicated in derived classes
  - Base class methods generate trait for polymorphism
  - Derived classes implement base trait automatically
  - Method overriding supported (trait impl uses overridden version)
  - Multi-level inheritance (grandparent → parent → child)
  - All inherited fields accessible with `self.field`
  - All inherited methods callable with `self.method()`
- **Interfaces** - Translate to structs, supports generics, #[derive(Clone)]
- **This→Self** - Proper translation of `this` references to `self`
- **For-of Loops** - Clean Rust iteration syntax with proper borrowing (&) - prevents ownership consumption
- **For Loops** - Regular for loops (for init; condition; increment) → Rust ranges with step_by and rev()
- **Array Methods** - map(), filter(), forEach(), reduce() → Rust iterator chains with collect()
- **Binary Operators** - Including `===` → `==`, `!==` → `!=`
- **Logical Operators** - &&, ||, ! (same in Rust)
- **Unary Operators** - !, -, +, ++/-- → +=/-=
- **Conditional (Ternary) Expressions** - `a ? b : c` → `if a { b } else { c }`
- **Enums** - TypeScript enums → Rust enums with discriminant values
- **Discriminated Unions** - Type unions → Rust enums with struct variants
- **Switch Statements** - switch/case → match expressions
- **Template Literals** - Backtick strings → format! macro
- **Parenthesized Expressions** - Preserved for clarity
- **Try/Catch/Finally** - Exception handling → Result<T, E> pattern with finally blocks in both Ok/Err branches
- **Throw Statements** - throw → return Err()
- **While Loops** - while condition { } preserved
- **Do-While Loops** - do-while → loop with conditional break
- **Break/Continue** - Preserved, including labeled variants
- **Labeled Statements** - Labels → Rust lifetime syntax ('label) applied directly to loops
- **Element Access** - Array/map indexing with proper type inference
- **All-Result Pattern** - Every function returns Result<T, E> for error propagation
- **Error Propagation** - ? operator on all function calls
- **Root Error Handler** - Uncaught exceptions print message and exit(1)
- **Automatic Imports** - use statements generated as needed (std::rc::{Rc, Weak}, std::collections::HashMap)
- **Async/Await** - async functions → async fn/closures, await expressions → .await, Promise<T> → T in async context, Tokio runtime auto-imported
- **Array Spread** - `[...arr1, ...arr2]` → iterator chains with `.chain()` and `.collect()`
- **Object Spread** - `{ ...obj, field: value }` → Rust struct update syntax `{ field: value, ..obj }`
- **Property Shorthand** - `{ name, age }` → `{ name: name, age: age }`
- **Spread in Function Calls** - `fn(...args)` → `fn(args)` (passing Vec directly)
- **Array join()** - `arr.join(',')` → `arr.iter().map(|x| x.to_string()).collect::<Vec<_>>().join(",")`
- **Template Literals** - `` `${x},${y}` `` → `format!("{},{}", x, y)`
- **Array Destructuring** - `const [a, b, c] = arr` → individual assignments with temp variable and indexing
- **Array Destructuring with Rest** - `const [first, ...rest] = arr` → slice syntax `arr[1..].to_vec()`
- **Array Destructuring with Skipped Elements** - `const [first, , third] = arr` → skip indices
- **Object Destructuring** - `const { x, y } = point` → individual assignments with field access and .clone()
- **Object Destructuring with Renaming** - `const { x: newX } = point` → renamed bindings
- **Nested Object Destructuring** - `const { address: { city } } = person` → recursive temp variables with typed object literals
- **Nested Array Destructuring** - `const [[a, b], [c, d]] = nested` → recursive temp variables and indexing
- **Function Parameter Destructuring (Arrays)** - `([a, b]: number[]) => ...` → temp parameter + destructuring at function start
- **Function Parameter Destructuring (Objects)** - `({ x, y }: Point) => ...` → temp parameter + destructuring with type inference
- **Module Exports** - Named exports with `pub` visibility, default exports for arrow functions
- **Module Imports** - Import statements → Rust `use` declarations:
  - Named imports: `import { add, subtract } from './math'` → `use crate::math::{add, subtract};`
  - Default imports: `import Calculator from './calc'` → `use crate::calc::Calculator;`
  - Namespace imports: `import * as Math from './math'` → `use crate::math as Math;`
  - Path conversion: `./` → `crate::`, `../` → `super::`, `../../` → `super::super::`
  - Export-from: `export { add } from './math'` → `pub use crate::math::add;`
- **Generics** - Generic functions, classes, interfaces with full type parameter support
  - Generic arrow functions: `<T>(value: T): T` → `fn name<T>(value: T) -> Result<T, String>`
  - Generic classes: `class Box<T>` → `struct Box<T>` with `impl<T> Box<T>`
  - Generic interfaces: `interface Result<T>` → `struct Result<T>`
  - Multiple type parameters: `<T, U>`, `<K, V>` etc.
  - Nested generics: `Box<Box<T>>`, `Result<Vec<T>>`
- **Trait Bounds (Generic Constraints)** - TypeScript constraints → Rust trait bounds with runtime validation
  - Constraint syntax: `<T extends Named>` → `<T: NamedTrait>`
  - Dual interface generation: Interfaces create both trait (for constraints) and struct (for concrete types)
  - Trait definition: `trait NamedTrait { fn name(&self) -> String; }`
  - Struct definition: `struct Named { name: String, }`
  - Inherent impl: Methods on struct for field access and method calls
  - Trait impl: Satisfies trait bound requirements
  - Context-aware property access: `item.name` → `item.name()` in generic functions with trait bounds
  - Multiple constraints: `<T extends Named, U extends Valued>` → `<T: NamedTrait, U: ValuedTrait>`
  - Full runtime equivalence: All tests verify JS and Rust produce identical output
- **TypeScript Type Checker Integration** - Object literals infer expected type from context
  - `const p: Point = { x: 5, y: 10 }` → `Point { x: 5.0, y: 10.0 }`
  - Nested object literals: `{ address: { city: "NYC" } }` → `{ address: Address { city: "NYC" } }`
  - Function arguments: `printPoint({ x: 5, y: 10 })` → `printPoint(Point { x: 5.0, y: 10.0 })`
- **Synthetic Types for Structural Typing** - Auto-generate nominal types for object literals (transparent TypeScript structural typing in Rust)
  - Contextual type detection via TypeScript type checker
  - Signature-based deduplication (same structure → same type)
  - Sequential numbering: `AnonymousType1`, `AnonymousType2`, etc.
  - Automatic trait implementation for matching interfaces
  - Filters TypeScript internal symbols (`__object`, `__type`)
  - Deterministic within compilation session
  - Prevents all naming collisions
  - Example: `printName({ name: "Alice" })` → `printName(AnonymousType1 { name: String::from("Alice") })`
- **Multi-File Compilation** - Compile projects with multiple `.gs.ts` files
  - Each file generates corresponding `.rs` file
  - Directory structure preserved in output
  - Imports across files work correctly
- **Cargo.toml Generation** - Automatic Cargo project file creation
  - Package metadata (name, version, edition)
  - Tokio dependency for async runtime
  - Ready for `cargo build` and `cargo run`
- **Concrete Example Testing** - Real-world programs for end-to-end validation
  - Dynamic discovery of example projects in `test/phase3/concrete-examples/`
  - Each example: `example-name/src/main.gs.ts`
  - Compiles to both JavaScript and Rust
  - Executes both versions and compares runtime output
  - Currently testing: N-Queens solver (exposes 10 codegen issues to be fixed)

### 📋 Remaining Work

- **Rust Codegen Improvements** (exposed by concrete examples):
  - String literal syntax (single vs double quotes)
  - Array type mapping (`new Array<T>()` → `Vec<T>::new()`)
  - Function return type inference (void vs value)
  - Number type coercion (f64 vs usize for indexing/ranges)
  - String method polyfills (String.fromCharCode, etc.)
  - Array method mapping (slice, etc.)
  - Closure mutable captures (RefCell pattern)
  - Recursive closures (Box<dyn Fn> pattern)
- Module hierarchy generation (lib.rs, mod.rs files for complex projects)
- Advanced trait features (associated types, default implementations)
- Lifetime annotations for complex borrowing scenarios

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

The test suite includes 30 comprehensive validation tests covering:
- Primitive types (number, string, boolean)
- Arrow functions (single-expression and block bodies)
- Collections (arrays, vec! macros)
- Ownership types (Unique, Shared, Weak)
- Classes (structs, impl blocks, methods)
- Advanced features (for-of loops, this.property, control flow)
- Null/undefined handling
- Try/catch/finally blocks
- Error propagation

**All 452 tests (451 passing, 1 failing, 6 skipped)**, with comprehensive runtime equivalence tests that execute both JavaScript and Rust versions and verify they produce identical output. All new Phase 3 tests (async/await, spread operators, property shorthand, destructuring, module exports, generics) include runtime equivalence validation where possible.

**Concrete Examples (3 tests):**
- 2 passing: JavaScript compilation/execution, Runtime equivalence check
- 1 failing: N-Queens Rust compilation (intentionally exposing codegen issues)
  - See `test/phase3/concrete-examples/n-queens/ISSUES.md` for detailed tracking of 10 identified issues

**Skipped Tests (6):** Tests requiring TypeScript type checker integration or multi-file compilation:
- 2 destructuring tests (nested object destructuring, object destructuring in function parameters) - require proper typing of object literals based on context
- 4 module import tests (named, default, namespace imports, re-exports) - require multi-file compilation infrastructure

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
