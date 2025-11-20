# Error Handling in GoodScript

## Overview

GoodScript provides JavaScript-style exception handling (`try/catch/throw`) that compiles to type-safe Rust code using `Result<T, E>`. This document explains the design and implementation.

**💡 The Killer Feature:** This design enables GoodScript to seamlessly call **any Rust library** and catch their errors using familiar try/catch syntax. This gives GoodScript developers access to the entire Rust ecosystem (90,000+ crates) with zero-cost, type-safe error handling.

## Design Goals

1. **Familiar JS semantics** - GoodScript developers write `try/catch/throw` 
2. **Type-safe Rust** - Generated code uses `Result<T, E>` properly
3. **Zero runtime overhead** - Compiles to efficient Rust with no performance penalty
4. **Error propagation** - Errors automatically propagate through function call chains
5. **Unhandled exceptions crash** - Like JavaScript, unhandled errors terminate the program
6. **🚀 Rust ecosystem access** - Seamlessly call Rust libraries and catch their errors

## The All-Result Pattern

### Core Principle

**Every GoodScript function compiles to a Rust function returning `Result<T, E>`**

This enables:
- ✅ Automatic error propagation with `?` operator
- ✅ Type-safe exception handling
- ✅ Zero-cost abstractions
- ✅ Idiomatic Rust code
- ✅ **Seamless Rust library interop** - Call any Rust library and catch errors!

### Translation Rules

#### 1. Function Signatures

```typescript
// GoodScript
const myFunc = (): void => { ... };
const getValue = (): number => { ... };
const process = (x: number): string => { ... };
```

```rust
// Generated Rust
let myFunc = || -> Result<(), String> { ... };
let getValue = || -> Result<f64, String> { ... };
let process = |x: f64| -> Result<String, String> { ... };
```

**Rule**: `T` → `Result<T, String>`, where `void` becomes `()`

#### 2. Function Bodies

Every function body:
- Ends with `Ok(value)` or `Ok(())`
- Uses `?` operator on all function calls
- Converts `throw` to `return Err(...)`

```typescript
// GoodScript
const example = (): number => {
  const x = getValue();
  return x + 1;
};
```

```rust
// Generated Rust
let example = || -> Result<f64, String> {
    let x = getValue()?;  // ? propagates errors
    Ok(x + 1.0)           // Wrap return value in Ok
};
```

#### 3. Throw Statements

```typescript
// GoodScript
throw "something went wrong";
throw errorMessage;
```

```rust
// Generated Rust
return Err(String::from("something went wrong"));
return Err(errorMessage.to_string());
```

#### 4. Try/Catch/Finally

```typescript
// GoodScript
try {
  riskyOperation();
  const x = getValue();
} catch (e) {
  console.log(e);
} finally {
  cleanup();
}
```

```rust
// Generated Rust
let result = riskyOperation();
match result {
    Ok(_) => {
        let x = getValue()?;
    }
    Err(e) => {
        console_log(e)?;
    }
}
cleanup()?;  // Finally block runs after match
```

**Note**: Try block is NOT wrapped in a closure - it's a direct match on the first potentially-throwing call.

#### 5. Function Calls

```typescript
// GoodScript
someFunction();
const value = getValue();
```

```rust
// Generated Rust
someFunction()?;           // Void call with error propagation
let value = getValue()?;   // Value call with error propagation
```

**Rule**: Every function call gets `?` appended to propagate errors

#### 6. Root-Level Error Handler

The `main()` function wraps all code in a root-level error handler:

```rust
// Generated main()
pub fn main() {
    let result = (|| -> Result<(), String> {
        // All top-level code here
        __gs_module_init()?;
        Ok(())
    })();
    
    match result {
        Ok(_) => {
            // Normal exit
        }
        Err(e) => {
            // Unhandled exception
            eprintln!("Uncaught exception: {}", e);
            std::process::exit(1);
        }
    }
}
```

This ensures unhandled exceptions behave like JavaScript - they print an error and exit.

## Examples

### Simple Error Propagation

```typescript
// GoodScript
const deepFunction = (): void => {
  throw "error from deep";
};

const middleFunction = (): void => {
  deepFunction();  // Error propagates automatically
};

const topFunction = (): void => {
  try {
    middleFunction();
  } catch (e) {
    console.log("Caught:", e);
  }
};
```

```rust
// Generated Rust
let deepFunction = || -> Result<(), String> {
    Err(String::from("error from deep"))
};

let middleFunction = || -> Result<(), String> {
    deepFunction()?  // ? propagates error up
};

let topFunction = || -> Result<(), String> {
    match middleFunction() {
        Ok(_) => {},
        Err(e) => {
            console_log(format!("Caught: {}", e))?;
        }
    }
    Ok(())
};
```

### Nested Try/Catch

```typescript
// GoodScript
try {
  const outer = 1;
  try {
    const inner = 2;
    throw "inner error";
  } catch (e1) {
    console.log("Inner:", e1);
    throw "re-throw";  // Re-throw from catch block
  }
} catch (e2) {
  console.log("Outer:", e2);
}
```

```rust
// Generated Rust
let result_outer = (|| -> Result<(), String> {
    let outer = 1.0;
    let result_inner = (|| -> Result<(), String> {
        let inner = 2.0;
        Err(String::from("inner error"))
    })();
    match result_inner {
        Ok(_) => {},
        Err(e1) => {
            console_log(format!("Inner: {}", e1))?;
            return Err(String::from("re-throw"));  // Exit outer closure
        }
    }
    Ok(())
})();
match result_outer {
    Ok(_) => {},
    Err(e2) => {
        console_log(format!("Outer: {}", e2))?;
    }
}
```

### Return Values with Errors

```typescript
// GoodScript
const divide = (a: number, b: number): number => {
  if (b === 0) {
    throw "Division by zero";
  }
  return a / b;
};

const safeDivide = (a: number, b: number): number => {
  try {
    return divide(a, b);
  } catch (e) {
    return 0;  // Default value on error
  }
};
```

```rust
// Generated Rust
let divide = |a: f64, b: f64| -> Result<f64, String> {
    if b == 0.0 {
        return Err(String::from("Division by zero"));
    }
    Ok(a / b)
};

let safeDivide = |a: f64, b: f64| -> Result<f64, String> {
    match divide(a, b) {
        Ok(v) => Ok(v),
        Err(e) => Ok(0.0)  // Return default wrapped in Ok
    }
};
```

## Library Interop

### The Killer Feature: Seamless Rust Ecosystem Access 🚀

**This is where the all-Result pattern becomes game-changing.** Because GoodScript functions return `Result<T, String>` and Rust libraries also return `Result<T, E>`, GoodScript can **seamlessly call the entire Rust ecosystem** and "catch" their errors using familiar try/catch syntax!

### How It Works

1. **Rust libraries return `Result<T, E>`** where `E` is their specific error type
2. **GoodScript wrapper uses `.map_err(|e| e.to_string())`** to convert to `Result<T, String>`
3. **The `?` operator propagates** the error through GoodScript code
4. **GoodScript `catch` block receives** the error as a string

### Real-World Example: File I/O

```typescript
// GoodScript code - looks like JavaScript
const loadConfig = (path: string): Config => {
  try {
    const contents = readFile(path);      // Calls Rust std::fs
    const config = parseJSON(contents);   // Calls Rust serde_json
    return config as Config;
  } catch (e) {
    console.log("Failed to load config:", e);  // Catches IO or parse errors!
    return defaultConfig;
  }
};
```

```rust
// Generated wrapper for std::fs::read_to_string
let readFile = |path: String| -> Result<String, String> {
    std::fs::read_to_string(&path)
        .map_err(|e| e.to_string())?  // IO error → String → propagates to catch!
};

// Generated wrapper for serde_json::from_str
let parseJSON = |s: String| -> Result<serde_json::Value, String> {
    serde_json::from_str(&s)
        .map_err(|e| e.to_string())?  // Parse error → String → propagates to catch!
};

// Generated loadConfig - errors propagate through the call chain!
let loadConfig = |path: String| -> Result<Config, String> {
    let result = (|| -> Result<Config, String> {
        let contents = readFile(path)?;      // Rust IO errors propagate!
        let config = parseJSON(contents)?;   // Rust parse errors propagate!
        Ok(config)
    })();
    
    match result {
        Ok(config) => Ok(config),
        Err(e) => {
            console_log(format!("Failed to load config: {}", e))?;
            Ok(defaultConfig)
        }
    }
};
```

### More Examples

#### HTTP Requests (using reqwest)

```typescript
// GoodScript
const fetchUserData = (userId: string): User => {
  try {
    const response = httpGet(`https://api.example.com/users/${userId}`);
    return parseJSON(response.body) as User;
  } catch (e) {
    throw `Failed to fetch user ${userId}: ${e}`;
  }
};
```

```rust
// Wrapper for reqwest
let httpGet = |url: String| -> Result<Response, String> {
    reqwest::blocking::get(&url)
        .map_err(|e| e.to_string())?  // Network errors caught by GoodScript!
};
```

#### Database Queries (using diesel)

```typescript
// GoodScript
const findUser = (id: number): User => {
  try {
    const user = dbQuery("SELECT * FROM users WHERE id = ?", [id]);
    return user as User;
  } catch (e) {
    throw `Database error: ${e}`;
  }
};
```

```rust
// Wrapper for diesel
let dbQuery = |sql: String, params: Vec<serde_json::Value>| -> Result<serde_json::Value, String> {
    diesel::query(&sql)
        .bind(params)
        .get_result()
        .map_err(|e| e.to_string())?  // SQL errors caught by GoodScript!
};
```

#### File System Operations

```typescript
// GoodScript - comprehensive file operations with error handling
const processFiles = (directory: string): void => {
  try {
    const files = listDir(directory);           // std::fs::read_dir
    for (const file of files) {
      if (file.endsWith(".json")) {
        const contents = readFile(file);         // std::fs::read_to_string
        const data = parseJSON(contents);        // serde_json::from_str
        const output = transformData(data);
        writeFile(file.replace(".json", ".out"), output);  // std::fs::write
      }
    }
  } catch (e) {
    console.log("Error processing files:", e);
    // Single catch handles IO errors, parse errors, write errors!
  }
};
```

### Error Type Mapping

Any Rust error type that implements `Display` or `ToString` can be caught:

| Rust Library | Error Type | Example Error Message |
|--------------|------------|----------------------|
| **std::fs** | `std::io::Error` | "No such file or directory" |
| **serde_json** | `serde_json::Error` | "EOF while parsing a value at line 3" |
| **reqwest** | `reqwest::Error` | "error sending request for url" |
| **diesel** | `diesel::result::Error` | "Record not found" |
| **regex** | `regex::Error` | "regex parse error" |
| **zip** | `zip::result::ZipError` | "invalid zip header" |
| **image** | `image::error::ImageError` | "Format error decoding Png" |
| **tokio** | Various async errors | Runtime-specific messages |

### The Impact

This means **GoodScript developers get access to**:
- ✅ File I/O, networking, compression
- ✅ JSON, XML, YAML, TOML parsing
- ✅ HTTP clients and servers
- ✅ Database connectors (PostgreSQL, MySQL, SQLite)
- ✅ Cryptography and hashing
- ✅ Image processing
- ✅ Regular expressions
- ✅ WebAssembly compilation
- ✅ **The entire crates.io ecosystem** (90,000+ libraries!)

All with **familiar JavaScript-style error handling**. No need to learn Rust's error handling patterns - just use try/catch and it works!

### Standard Library

GoodScript will provide a standard library of commonly-used wrappers:

```rust
// GoodScript standard library (Phase 4)
pub mod fs {
    pub fn read_file(path: String) -> Result<String, String> {
        std::fs::read_to_string(&path).map_err(|e| e.to_string())
    }
    
    pub fn write_file(path: String, contents: String) -> Result<(), String> {
        std::fs::write(&path, contents).map_err(|e| e.to_string())
    }
    
    pub fn list_dir(path: String) -> Result<Vec<String>, String> {
        std::fs::read_dir(&path)
            .map_err(|e| e.to_string())?
            .map(|entry| entry.map(|e| e.path().to_string_lossy().to_string()))
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())
    }
}

pub mod json {
    pub fn parse(s: String) -> Result<serde_json::Value, String> {
        serde_json::from_str(&s).map_err(|e| e.to_string())
    }
    
    pub fn stringify(value: serde_json::Value) -> Result<String, String> {
        serde_json::to_string(&value).map_err(|e| e.to_string())
    }
}

pub mod http {
    pub fn get(url: String) -> Result<String, String> {
        reqwest::blocking::get(&url)
            .and_then(|r| r.text())
            .map_err(|e| e.to_string())
    }
    
    pub fn post(url: String, body: String) -> Result<String, String> {
        reqwest::blocking::Client::new()
            .post(&url)
            .body(body)
            .send()
            .and_then(|r| r.text())
            .map_err(|e| e.to_string())
    }
}
```

## Implementation Notes

### Code Generation Changes

To implement this pattern, `rust-codegen.ts` must:

1. **Transform function signatures**
   - Parse return type from TypeScript
   - Wrap in `Result<T, String>`

2. **Add `?` to all function calls**
   - Detect call expressions
   - Append `?` operator

3. **Wrap return statements**
   - `return value` → `return Ok(value)`
   - `return` → `return Ok(())`

4. **Auto-add `Ok(())` at function end**
   - For void functions without explicit return

5. **Simplify try/catch**
   - Remove closure wrapper (no longer needed)
   - Direct match on function call result

6. **Generate root error handler**
   - Wrap entire module in Result-returning closure
   - Add match with error printing and exit

### Error Type

Currently uses `String` for all errors. Future enhancements could:
- Use custom enum for structured errors
- Preserve error types from TypeScript
- Support error hierarchies

## Advantages

1. **🚀 Full Rust Ecosystem Access** - Call any of the 90,000+ crates on crates.io
   - File I/O, networking, databases, HTTP, JSON, image processing, crypto...
   - Use `.map_err(|e| e.to_string())` to convert Rust errors to GoodScript exceptions
   - Single try/catch can handle errors from multiple Rust libraries
   - No need to learn Rust error handling - just use try/catch!

2. **Zero runtime overhead** - Compiled to efficient Rust code
   - `?` operator compiles to zero-cost error checking
   - No exception unwinding, no runtime penalty
   - As fast as hand-written Rust code

3. **Type safe** - Compiler enforces error handling
   - Forgotten error checks cause compile errors
   - Can't ignore Results accidentally
   - Refactoring is safe

4. **Familiar semantics** - JavaScript developers feel at home
   - Write `try/catch/throw` like in JavaScript/TypeScript
   - Errors propagate through call chains automatically
   - No new concepts to learn

5. **Idiomatic Rust** - Generated code follows Rust best practices
   - Uses `Result<T, E>` pattern properly
   - Integrates naturally with Rust libraries
   - Rust developers can read and understand generated code

6. **Composable** - Mix GoodScript and Rust libraries seamlessly
   - GoodScript functions can call Rust functions
   - Rust functions can call GoodScript functions
   - Errors flow bidirectionally with no impedance mismatch

## Limitations

1. **Error type is String** - No typed error hierarchy (yet)
2. **All functions can "throw"** - Even ones that logically can't error
   - Future optimization: static analysis to detect non-throwing functions
3. **Generated code verbosity** - More verbose than hand-written (but hidden from users)

## Creating GoodScript Bindings for Rust Libraries

The all-Result pattern makes it **trivial to expose Rust libraries to GoodScript**. You just need TypeScript declaration files (`.d.ts`) that declare the function signatures:

### Simple Approach

**1. Create `.d.ts` file with function declarations:**

```typescript
// bindings/std-fs.d.ts
declare module '@rust/std/fs' {
  // Maps to std::fs::read_to_string() -> Result<String, std::io::Error>
  export const readToString: (path: string) => string;  // throws on error
  
  // Maps to std::fs::write() -> Result<(), std::io::Error>
  export const write: (path: string, contents: string) => void;  // throws on error
}
```

**2. Import and use in GoodScript:**

```typescript
import { readToString, write } from '@rust/std/fs';

try {
  const content = readToString('/etc/hosts');  // Compiler adds ?
  write('/tmp/copy.txt', content);             // Compiler adds ?
} catch (e) {
  console.log(`File error: ${e}`);
}
```

**3. Compiler generates Rust:**

```rust
use std::fs;

fn main() -> Result<(), String> {
  let content = fs::read_to_string("/etc/hosts")
    .map_err(|e| e.to_string())?;
  
  fs::write("/tmp/copy.txt", &content)
    .map_err(|e| e.to_string())?;
  
  Ok(())
}
```

### Type Mappings

| TypeScript | Rust | Notes |
|------------|------|-------|
| `string` | `String` | Owned string |
| `number` | `f64` | Default numeric type |
| `boolean` | `bool` | Direct mapping |
| `void` | `()` | Unit type |
| `Array<T>` | `Vec<T>` | Owned vector |
| `Unique<T>` | `Box<T>` | Heap allocation |
| `Shared<T>` | `Rc<T>` | Reference counted |
| `Weak<T>` | `Weak<T>` | Non-owning reference |

### Advanced: Explicit Result Types

For APIs where developers may want to handle errors without try/catch:

```typescript
// bindings/std-fs.d.ts
declare module '@rust/std/fs' {
  // Throwing version (for try/catch)
  export const readToString: (path: string) => string;
  
  // Result version (for explicit error handling)
  export const readToStringResult: (path: string) => Result<string, string>;
}
```

Usage:

```typescript
// Option 1: try/catch
try {
  const content = readToString('/etc/hosts');
} catch (e) {
  console.log(e);
}

// Option 2: explicit Result
const result = readToStringResult('/etc/hosts');
if (result.isOk()) {
  const content = result.unwrap();
} else {
  const error = result.unwrapErr();
}
```

### Building a Standard Library

Creating a GoodScript standard library is now straightforward:

1. **Choose popular Rust crates** (serde, tokio, reqwest, etc.)
2. **Write `.d.ts` files** with TypeScript signatures
3. **Map types** according to the table above
4. **Document** usage patterns

**That's it!** The compiler handles:
- ✅ Adding `?` operators to function calls
- ✅ Converting `Result<T, E>` to throwing/catching behavior
- ✅ Error type conversion with `.map_err(|e| e.to_string())`
- ✅ Propagating errors through call chains

This is **dramatically simpler** than traditional FFI systems because:
- No C ABI wrappers needed
- No manual marshaling code
- No unsafe blocks (compiler generates those)
- Just TypeScript type declarations!

### Example: HTTP Client Bindings

```typescript
// bindings/reqwest.d.ts
declare module '@rust/reqwest' {
  export class Client {
    constructor();
    get(url: string): Promise<Response>;
    post(url: string, body: string): Promise<Response>;
  }
  
  export class Response {
    text(): Promise<string>;
    json<T>(): Promise<T>;
    status(): number;
  }
}
```

Now GoodScript developers can use `reqwest` (Rust's popular HTTP client) with familiar async/await syntax, and all errors propagate through the Result pattern automatically!

## Future Enhancements

- [ ] Typed error hierarchies (preserve Rust error types)
- [ ] Static analysis to optimize away Result for non-throwing functions
- [ ] Better error messages with stack traces
- [ ] Source maps for debugging generated Rust
- [ ] Custom error types per function
- [ ] Auto-generate `.d.ts` files from Rust crate documentation
