# GoodScript Examples

This directory contains a collection of examples demonstrating GoodScript's features and capabilities. Each example is a self-contained project that can be compiled and run independently.

## Prerequisites

Make sure you have the GoodScript compiler installed:

```bash
npm install -g goodscript
```

Or if you're working from the source repository:

```bash
cd compiler
pnpm install
pnpm build
```

## Running Examples

Each example can be compiled and run using the GoodScript CLI:

```bash
# Navigate to an example directory
cd 01-hello-world

# Compile to C++ and generate native binary
gsc --target cpp --compile src/main-gs.ts

# Run the compiled binary
./dist/hello-world
```

Alternatively, you can use the tsconfig.json configuration:

```bash
# Compile using tsconfig.json settings
gsc

# Run the output file specified in tsconfig.json
./dist/[output-name]
```

## Examples Overview

### 01-hello-world
**Difficulty**: Beginner  
**Topics**: Basic program structure, console output

The simplest GoodScript program. Shows how to use `console.log()` to print output.

```bash
cd 01-hello-world
gsc --target cpp --compile src/main1-gs.ts
./dist/hello-world
```

### 02-variables-and-types
**Difficulty**: Beginner  
**Topics**: Type annotations, type inference, primitive types

Demonstrates GoodScript's type system including:
- Explicit type annotations
- Type inference
- Primitive types: `string`, `number`, `boolean`
- Integer types: `integer` (32-bit), `integer53` (53-bit safe)

### 03-functions
**Difficulty**: Beginner  
**Topics**: Functions, arrow functions, lambdas, higher-order functions

Shows different ways to define and use functions:
- Regular function declarations
- Arrow functions
- Single-expression arrow functions
- Higher-order functions (functions that return functions)

### 04-arrays
**Difficulty**: Beginner  
**Topics**: Arrays, array methods, iteration, for-of loops

Demonstrates working with arrays:
- Array literals and indexing
- Array methods: `map()`, `filter()`, `reduce()`, `forEach()`
- Iterating with `for-of` loops
- String iteration

### 05-maps
**Difficulty**: Beginner  
**Topics**: Map<K,V>, key-value storage, dynamic data

Shows how to use `Map<K,V>` for dynamic data storage:
- Creating maps and adding entries
- Getting, checking, and deleting entries
- Iterating over keys, values, and entries
- Map size and clear operations

### 06-strings
**Difficulty**: Beginner  
**Topics**: String operations, template literals

Demonstrates string manipulation:
- String methods: `trim()`, `split()`, `slice()`, `toUpperCase()`, `toLowerCase()`
- Search operations: `indexOf()`, `includes()`
- Template literals for string interpolation
- String iteration

### 07-math
**Difficulty**: Beginner  
**Topics**: Math object, mathematical operations

Shows the Math object and mathematical operations:
- Basic arithmetic operators
- Math functions: `min()`, `max()`, `abs()`, `floor()`, `ceil()`, `round()`
- Powers and roots: `pow()`, `sqrt()`
- Trigonometry: `sin()`, `cos()`, `tan()`
- Logarithms: `log()`, `log10()`
- Math constants: `PI`, `E`

### 08-exceptions
**Difficulty**: Intermediate  
**Topics**: Exception handling, try-catch-finally, error propagation

Demonstrates error handling in GoodScript:
- Basic `try-catch` blocks
- `try-catch-finally` for cleanup
- Throwing and catching errors
- Error handling in loops

### 09-async-await
**Difficulty**: Intermediate  
**Topics**: Async/await, Promises, asynchronous programming

Shows asynchronous programming patterns:
- `async` functions and `await` expressions
- `Promise<T>` types
- Promise resolution and rejection
- Error handling with async/await
- Sequential async operations

### 10-file-io
**Difficulty**: Intermediate  
**Topics**: FileSystem API, file I/O, async file operations

Demonstrates file system operations:
- Synchronous file operations: `FileSystem.readText()`, `FileSystem.writeText()`
- Asynchronous file operations: `FileSystemAsync.readText()`, `FileSystemAsync.writeText()`
- Directory operations: `mkdir()`, `readDir()`
- File metadata: `exists()`, `stat()`

### 11-http-client
**Difficulty**: Intermediate  
**Topics**: HTTP API, network requests, REST clients

Shows how to make HTTP requests:
- Synchronous requests: `HTTP.syncFetch()`
- Asynchronous requests: `HTTPAsync.fetch()`
- Custom headers and POST requests
- Error handling for network operations

### 12-classes
**Difficulty**: Intermediate  
**Topics**: Classes, constructors, methods, object-oriented programming

Demonstrates object-oriented programming:
- Class declarations and constructors
- Instance methods and properties
- Creating and using class instances
- Method chaining and state management

## GoodScript Language Features

These examples showcase the following GoodScript features:

### Type System
- **Primitive types**: `number`, `string`, `boolean`, `void`
- **Integer types**: `integer` (32-bit), `integer53` (53-bit JavaScript-safe)
- **Generic types**: `Array<T>`, `Map<K,V>`, `Promise<T>`
- **Type inference**: Automatic type detection
- **Structural typing**: Duck typing for type compatibility

### Control Flow
- `if-else` statements
- `for-of` loops (no `for-in`)
- `try-catch-finally` exception handling
- `break` and `continue` in loops

### Functions
- Function declarations
- Arrow functions (`=>`)
- Lambda expressions
- Higher-order functions
- Async functions

### Built-in APIs
- **console**: Logging and debugging
- **Math**: Mathematical operations
- **JSON**: JSON serialization (stringify for primitives)
- **FileSystem/FileSystemAsync**: File I/O
- **HTTP/HTTPAsync**: HTTP client

### Collections
- **Arrays**: `Array<T>` with methods (`map`, `filter`, `reduce`, etc.)
- **Maps**: `Map<K,V>` for key-value storage
- **Strings**: Extensive string manipulation methods

### Modern JavaScript Features
- Template literals (`` `Hello ${name}` ``)
- Optional chaining (`obj?.field`)
- Async/await
- Arrow functions
- `const`/`let` (no `var`)
- Strict equality (`===`, `!==`)

## Language Restrictions ("Good Parts")

GoodScript enforces certain restrictions for safety and analyzability:

- ✅ **Use `const`/`let`** (no `var`)
- ✅ **Use `for-of`** (no `for-in`)
- ✅ **Use `===`/`!==`** (no `==`/`!=`)
- ✅ **Explicit boolean checks** (no truthy/falsy coercion)
- ✅ **Static types** (no `any`)
- ❌ **No `eval`** or `Function` constructor
- ❌ **No `with` statement**
- ❌ **No prototype manipulation**
- ❌ **No dynamic property access** (use `Map<K,V>` instead)

See the [compiler documentation](../compiler/docs/RESTRICTIONS.md) for complete details.

## Compilation Targets

GoodScript can compile to multiple targets:

### C++ (Native Binaries)
```bash
gsc --target cpp --compile src/main-gs.ts -o myapp
./myapp
```

Produces native executables using Zig as the C++ compiler. Supports:
- Linux, macOS, Windows
- WebAssembly (WASI)
- Cross-compilation

### TypeScript (JavaScript Compatibility)
```bash
gsc --target ts src/main-gs.ts
node dist/main.js
```

### Memory Modes (C++ Only)

GoodScript supports two memory management modes:

#### GC Mode (Default)
```bash
gsc --target cpp --compile src/main-gs.ts
```
- Garbage collection (Boehm GC)
- Easier for TypeScript/JavaScript developers
- Allows cyclic references

#### Ownership Mode
```bash
gsc --target cpp --memory ownership --compile src/main-gs.ts
```
- Smart pointers (`unique_ptr`, `shared_ptr`)
- Zero-cost abstractions
- Deterministic destruction (RAII)
- Enforces DAG (no cycles)

## Next Steps

After exploring these examples, you might want to:

1. **Read the documentation**: Check out the [Language Specification](../compiler/docs/LANGUAGE.md) and [Architecture Guide](../compiler/docs/ARCHITECTURE.md)

2. **Write your own programs**: Create a new directory in `examples/` and start coding!

3. **Explore advanced features**: Look at the test suite in `compiler/test/` for more advanced examples

4. **Contribute**: Submit your own examples via pull request!

## Support

- **Documentation**: See `compiler/docs/` for comprehensive guides
- **Issues**: Report bugs or request features on GitHub
- **Community**: Join discussions in the repository

## License

These examples are part of the GoodScript project and are available under the same license (MIT/Apache-2.0 dual license).
