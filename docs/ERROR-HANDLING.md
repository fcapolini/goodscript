# Error Handling in GoodScript

## Overview

GoodScript provides JavaScript-style exception handling (`try/catch/throw`) that compiles to type-safe Rust code using `Result<T, E>`. This document explains the design and implementation.

## Design Goals

1. **Familiar JS semantics** - GoodScript developers write `try/catch/throw` 
2. **Type-safe Rust** - Generated code uses `Result<T, E>` properly
3. **Zero runtime overhead** - Compiles to efficient Rust with no performance penalty
4. **Error propagation** - Errors automatically propagate through function call chains
5. **Unhandled exceptions crash** - Like JavaScript, unhandled errors terminate the program

## The All-Result Pattern

### Core Principle

**Every GoodScript function compiles to a Rust function returning `Result<T, E>`**

This enables:
- ✅ Automatic error propagation with `?` operator
- ✅ Type-safe exception handling
- ✅ Zero-cost abstractions
- ✅ Idiomatic Rust code

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

### Rust Library Functions

Rust libraries return `Result<T, E>` natively. GoodScript can call them with appropriate error mapping:

```typescript
// GoodScript wrapper for Rust library
const parseJSON = (s: string): any => {
  // Compiler generates wrapper that converts Result to throw
  return serde_json::from_str(s);  // Native Rust call
};
```

```rust
// Generated wrapper
let parseJSON = |s: String| -> Result<serde_json::Value, String> {
    serde_json::from_str(&s)
        .map_err(|e| e.to_string())  // Convert library error to String
};
```

### Standard Library

GoodScript provides wrapped standard library functions that follow the all-Result pattern:

```rust
// GoodScript standard library
pub fn console_log(msg: String) -> Result<(), String> {
    println!("{}", msg);
    Ok(())
}

pub fn parse_int(s: String) -> Result<i64, String> {
    s.parse()
        .map_err(|e| format!("Parse error: {}", e))
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

1. **Zero runtime overhead** - Compiled to efficient Rust code
2. **Type safe** - Compiler enforces error handling
3. **Familiar semantics** - JavaScript developers feel at home
4. **Idiomatic Rust** - Uses Result<T, E> pattern properly
5. **Works with Rust ecosystem** - Easy interop with Rust libraries

## Limitations

1. **Error type is String** - No typed error hierarchy (yet)
2. **All functions can "throw"** - Even ones that logically can't error
   - Future optimization: static analysis to detect non-throwing functions
3. **Generated code verbosity** - More verbose than hand-written (but hidden from users)

## Future Enhancements

- [ ] Typed error hierarchies
- [ ] Static analysis to optimize away Result for non-throwing functions
- [ ] Better error messages with stack traces
- [ ] Source maps for debugging generated Rust
- [ ] Custom error types per function
