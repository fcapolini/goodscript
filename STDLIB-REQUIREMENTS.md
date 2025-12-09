# Standard Library Requirements for Compiler & Runtime

**Date**: December 9, 2025  
**Status**: Phase 7a (complete) + Phase 7b (complete) ✅

This document catalogs the language features and runtime APIs required to support the GoodScript standard library. The stdlib defines the requirements; the compiler and runtime must adapt to support them.

## Executive Summary

**Current State**: 
- ✅ Phase 7a.1: Exception handling (try/catch/throw/finally)
- ✅ Phase 7a.2: Array methods (map, filter, slice, push, forEach, reduce, every, some, indexOf, includes)
- ✅ Phase 7a.3: for-of loops (arrays, strings, break, continue, nested loops)
- ✅ Phase 7a.4: Map<K,V> methods (set, get, has, delete, clear, forEach, keys, values, entries, size)
- ✅ Phase 7a.5: Optional chaining (obj?.field, nested chaining, method calls)
- ✅ Phase 7a.6: String methods (split, slice, trim, toLowerCase, toUpperCase, indexOf, includes)
- ✅ Phase 7b.1: Async/await and Promise<T> (all 5 steps complete: IR types, AST lowering, C++ codegen, runtime library, integration tests + documentation)
- ✅ Phase 7b.2: FileSystem API (built-in global classes for sync/async file I/O)
- ✅ Phase 7b.3: HTTP Client (libcurl integration, HTTP/HTTPAsync built-in globals, sync and async support)
- Compiler handles expressions, functions, arrays, objects, lambdas, iteration, nullable access, coroutines, file I/O, HTTP requests
- Binary compilation working via Zig
- 297 tests passing (228→297, +69 tests total)

**Gap**: stdlib still needs union types, more runtime APIs (JSON parser, Math object, etc.)

**Priority**: Implement features in phases, starting with most fundamental and widely used.

---

### ✅ 7a.6 String Methods (COMPLETE)
**Status**: Implemented December 9, 2025

**Implemented**:
- Runtime: Complete gs::String implementation (621 lines)
- All 7 required methods: split(), slice(), trim(), toLowerCase(), toUpperCase(), indexOf(), includes()
- Plus 10+ bonus methods: lastIndexOf, substring, startsWith, endsWith, repeat, padStart, padEnd, match
- No compiler changes needed - method calls work through existing infrastructure
- Method chaining fully supported

**Tests**:
- `test/string-methods.test.ts` - 7 comprehensive tests (all passing)
- `examples/string-methods-test-gs.ts` - End-to-end testing

**Runtime Implementation**:
```cpp
namespace gs {
  class String {
    std::string impl_;
  public:
    int indexOf(const String& searchString) const;
    String slice(int beginIndex, std::optional<int> endIndex) const;
    String trim() const;
    String toLowerCase() const;
    String toUpperCase() const;
    bool includes(const String& searchString) const;
    Array<String> split(const String& separator) const;
    // ... 10+ more methods
  };
}
```

**Key Insight**: Good architecture means features "just work". String methods required zero new compiler code.

---

### ✅ 7a.5 Optional Chaining (COMPLETE)
**Status**: Implemented December 9, 2025

**Implemented**:
- IR support: `optional?: boolean` flag on SSA and AST-level memberAccess
- TypeScript lowering: Detects `questionDotToken` on PropertyAccessExpression
- Nested chaining: `options?.headers?.has()` fully working
- Method calls: `obj?.method(args)` converted to call with optional memberAccess callee
- C++ codegen: Basic ternary operator (`obj != nullptr ? obj->field : nullptr`)

**Tests**:
- `test/optional-chaining.test.ts` - 5 comprehensive tests (all passing)
- Basic property access, nested chaining, conditionals, method calls

**Generated C++**:
```cpp
// options?.method → (options != nullptr ? options->method : nullptr)
if (expr.optional) {
  return `(${obj} != nullptr ? ${obj}->${member} : nullptr)`;
}
```

**Limitations**:
- C++ implementation is placeholder (should use std::optional)
- Union types (T | null) not fully integrated
- Optional call expressions (func?.()) not yet supported

---

### ✅ 7a.3 for-of Loops (COMPLETE)
**Status**: Implemented December 9, 2025

**Implemented**:
- AST-level IR: `IRForOfStatement` with variable, iterable, and body
- Break/continue statements: Full support for loop control
- C++ codegen: Range-based for loops (`for (auto x : array)`)
- Nested loops: Full support for nested iterations
- Type safety: Properly typed loop variables

**Tests**:
- `test/for-of.test.ts` - 9 comprehensive tests (all passing)
- `examples/for-of-test-gs.ts` - End-to-end compilation test

**Generated C++**:
```cpp
for (auto num : numbers) {
  gs::console::log(gs::String("  "), num);
}
```

**Limitations**:
- String iteration not yet tested (but should work with gs::String)
- Map.entries() iteration requires Map methods (Phase 7a.4)

---

## Phase 7a Completed Features

### ✅ 7a.1 Exception Handling (COMPLETE)
**Status**: Implemented December 8, 2025

**Implemented**:
- AST-level IR: `IRTryStatement`, `IRCatchClause`, `IRThrowStatement`, `IRFinallyBlock`
- C++ codegen: `try-catch-finally` blocks, `throw` statements
- Error class: Full TypeScript Error API (name, message, stack)
- Test coverage: 15+ tests for all exception scenarios

**Tests**:
- `examples/null-test-gs.ts` - Try/catch with null checks
- `examples/null-simple-test-gs.ts` - Basic exception handling

### ✅ 7a.2 Array Methods (COMPLETE)
**Status**: Implemented December 8, 2025

**Implemented**:
- Method name sanitization fix (map, filter, etc. no longer renamed to map_, filter_)
- Lambda return type inference (auto return type instead of explicit void)
- console.log generation (properly maps to gs::console::log)
- Array method compilation: map, filter, slice, push, forEach, reduce, every, some, indexOf, includes

**Tests**:
- `examples/array-methods-test-gs.ts` - map, filter, slice, push
- `examples/array-methods-advanced-test-gs.ts` - forEach, reduce, every, some, indexOf, includes

**Limitations**:
- find() requires union type support (number | undefined) - not yet implemented
- Lambda capture not yet implemented (forEach with external variables)

---

## 1. Compiler Language Features (Required)

### 1.1 Exception Handling ⚠️ **CRITICAL**
**Used by**: All stdlib modules (error handling pattern)

```typescript
// Required syntax
try {
  const result = await operation();
} catch (error) {
  return null;
}

throw new Error("message");
```

**Impact**: 100+ usages across stdlib
- http: error handling for network failures
- io: error handling for file operations
- json: error handling for parse failures
- core: throw-or-return dual API pattern

**Implementation needs**:
- AST lowering: `TryStatement`, `CatchClause`, `ThrowStatement`
- IR: `IRTry`, `IRCatch`, `IRThrow` instructions
- C++ codegen: `try-catch` blocks, `throw` statements
- Runtime: Exception types (Error class)

---

### 1.2 Async/Await ⚠️ **CRITICAL**
**Used by**: http, io modules (all async operations)

```typescript
// Required syntax
async function fetch(url: string): Promise<HttpResponse> {
  const response = await fetch(url);
  return response;
}

static async readText(path: string): Promise<string> {
  return await fs.promises.readFile(path, 'utf-8');
}
```

**Impact**: 30+ async functions across stdlib
- http: all async HTTP operations
- io: async file/directory operations

**Status**: ✅ **COMPLETE** (Phase 7b.1 all 5 steps)
- Step 1: IR type system with Promise<T> (11 tests)
- Step 2: AST lowering for async/await (14 tests)
- Step 3: C++ codegen with cppcoro (14 tests)
- Step 4: Runtime Promise library (3 tests)
- Step 5: Integration testing and documentation (11 tests)
- cppcoro vendored in `compiler/vendor/cppcoro/`
- ASYNC-AWAIT-GUIDE.md comprehensive documentation
- 53/53 tests passing (281 total)

**Implementation complete**:
- ✅ IR: `{ kind: 'promise'; resultType: IRType }`, `async?: boolean` on functions/methods
- ✅ AST lowering: Detect AsyncKeyword, lower AwaitExpression
- ✅ C++ codegen: cppcoro::task<T>, co_await, co_return
- ✅ Type signatures: `Promise<${resultType}>` support
- ✅ Runtime: Promise.resolve(), Promise.reject() static methods
- ✅ Integration: End-to-end async examples, comprehensive documentation

---

### 1.3 Optional Chaining ⚠️ **HIGH**
**Used by**: http module (checking optional parameters)

```typescript
// Required syntax
const method = options?.method || 'GET';
const timeout = options?.timeout;
if (options?.headers) { ... }
```

**Impact**: 10+ usages in http module

**Implementation needs**:
- AST lowering: `QuestionDotToken` (optional chain)
- IR: conditional access expressions
- C++ codegen: null checks before member access
- Equivalent to: `options !== null ? options.method : undefined`

---

### 1.4 Array Methods ⚠️ **HIGH**
**Used by**: core, json, io modules

```typescript
// Required methods
arr.map(fn)           // transform elements
arr.filter(fn)        // filter elements
arr.slice(start, end) // extract subarray
arr.push(item)        // append element
Array.from(iterable)  // convert iterable to array
```

**Impact**: 20+ usages across stdlib
- array-tools: chunk, zip operations
- json: array transformations
- io: path manipulation

**Implementation needs**:
- IR: method call expressions for built-in types
- Runtime: C++ std::vector methods, TS Array methods
- Type system: method signatures for Array<T>

---

### 1.5 Map Methods ⚠️ **HIGH**
**Used by**: core, http, json modules

```typescript
// Required methods
map.get(key)           // retrieve value (returns undefined if missing)
map.set(key, value)    // store value
map.has(key)          // check existence
map.forEach(fn)       // iterate entries
map.keys()            // get all keys
map.values()          // get all values  
map.entries()         // get all [key, value] pairs
```

**Impact**: 30+ usages across stdlib
- map-tools: utilities for map operations
- http: header manipulation
- json: object representation

**Implementation needs**:
- IR: method call expressions for Map<K,V>
- Runtime: C++ std::unordered_map wrapper, TS Map methods
- Type system: method signatures for Map<K,V>

---

### 1.6 for-of Loops ⚠️ **MEDIUM**
**Used by**: core, json modules (iteration)

```typescript
// Required syntax
for (const item of array) { ... }
for (const [key, value] of map.entries()) { ... }
for (const map of maps) { ... }
```

**Impact**: 15+ usages across stdlib
- map-tools: merging, filtering
- json: object/array conversion

**Implementation needs**:
- AST lowering: `ForOfStatement`
- IR: iteration instructions
- C++ codegen: range-based for loops
- Iterator protocol support

---

### 1.7 Tuple Types ⚠️ **MEDIUM**
**Used by**: core module (array utilities)

```typescript
// Required syntax
type Pair<T, U> = [T, U];
const tuple: [string, number] = ["key", 42];
function zip<T, U>(a: T[], b: U[]): [T, U][] { ... }
```

**Impact**: 5+ usages in array-tools, map-tools

**Implementation needs**:
- IR: tuple type representation
- C++ codegen: std::tuple or std::pair
- Type system: tuple structural typing

---

### 1.8 Type Predicates & Guards ⚠️ **LOW**
**Used by**: json module (type checking)

```typescript
// Required syntax
if (value.kind === 'string') {
  // TypeScript knows value.kind is 'string' here
  return value.value; // string type
}
```

**Impact**: Used in discriminated union handling (json module)

**Implementation needs**:
- Type narrowing in control flow
- Discriminated union support
- Already partially supported by TypeScript checker

---

### 1.9 Math Object ⚠️ **LOW**
**Used by**: core module (min/max)

```typescript
// Required methods
Math.min(a, b)
Math.max(a, b)
```

**Impact**: 2 usages in array-tools

**Implementation needs**:
- Runtime: Math namespace with static methods
- C++ codegen: std::min, std::max
- IR: built-in function calls

---

### 1.10 String Methods ⚠️ **MEDIUM**
**Used by**: core, io modules

```typescript
// Required methods
str.split(separator)    // split into array
str.slice(start, end)   // extract substring
str.trim()             // remove whitespace
str.toLowerCase()      // convert to lowercase
str.toUpperCase()      // convert to uppercase
```

**Impact**: 10+ usages in string-tools, path

**Implementation needs**:
- IR: method calls for string type
- Runtime: C++ std::string methods, TS String methods
- Type system: method signatures for string

---

## 2. Runtime APIs (Required)

### 2.1 Built-in Types & Methods

#### 2.1.1 Error Class ⚠️ **CRITICAL**
```typescript
new Error(message: string)
error.message: string
error.name: string
```

**Used by**: All stdlib modules (exception handling)

**C++ Implementation**:
```cpp
namespace gs {
  class Error {
    std::string message;
    std::string name;
  public:
    Error(const std::string& msg);
    // ...
  };
}
```

---

#### 2.1.2 Promise<T> ⚠️ **CRITICAL**
```typescript
Promise<T>
Promise.resolve(value)
Promise.reject(error)
promise.then(onResolve, onReject)
promise.catch(onReject)
```

**Used by**: http, io modules (async operations)

**C++ Implementation**: Use cppcoro (already vendored)
```cpp
#include <cppcoro/task.hpp>
template<typename T>
using Promise = cppcoro::task<T>;
```

---

#### 2.1.3 Map<K, V> Methods ⚠️ **HIGH**
```typescript
map.get(key): V | undefined
map.set(key, value): void
map.has(key): boolean
map.delete(key): boolean
map.clear(): void
map.size: number
map.keys(): Iterator<K>
map.values(): Iterator<V>
map.entries(): Iterator<[K, V]>
map.forEach(callback): void
```

**C++ Implementation**:
```cpp
namespace gs {
  template<typename K, typename V>
  class Map {
    std::unordered_map<K, V> data;
  public:
    std::optional<V> get(const K& key);
    void set(const K& key, const V& value);
    bool has(const K& key);
    // ... other methods
  };
}
```

---

#### 2.1.4 Array<T> Methods ⚠️ **HIGH**
```typescript
arr.push(item): void
arr.pop(): T | undefined
arr.shift(): T | undefined
arr.unshift(item): void
arr.slice(start, end): Array<T>
arr.map(fn): Array<U>
arr.filter(fn): Array<T>
arr.forEach(fn): void
arr.find(fn): T | undefined
arr.indexOf(item): number
Array.from(iterable): Array<T>
Array.isArray(value): boolean
```

**C++ Implementation**:
```cpp
namespace gs {
  template<typename T>
  class Array {
    std::vector<T> data;
  public:
    void push(const T& item) { data.push_back(item); }
    std::optional<T> pop();
    Array<T> slice(int start, int end);
    template<typename Fn> auto map(Fn fn);
    // ... other methods
  };
}
```

---

#### 2.1.5 String Methods ✅ **COMPLETE**
```typescript
str.length: number
str.split(separator): Array<string>
str.slice(start, end): string
str.trim(): string
str.toLowerCase(): string
str.toUpperCase(): string
str.indexOf(search): number
str.includes(search): boolean
String(value): string // type conversion
```

**C++ Implementation**: Wrapper around `std::string`
```cpp
namespace gs {
  class String {
    std::string data;
  public:
    int length() const { return data.length(); }
    Array<String> split(const String& sep);
    String slice(int start, int end);
    // ... other methods
  };
}
```

---

### 2.2 Platform APIs

#### 2.2.1 HTTP/Fetch ⚠️ **HIGH**
**Used by**: http module

**TypeScript/Browser**: Native `fetch()` API  
**Node.js**: Native `fetch()` (Node 18+)  
**C++**: libcurl (need to vendor)

```cpp
// C++ HTTP client (using libcurl)
namespace gs::http {
  struct Response {
    int status;
    std::string statusText;
    Map<String, String> headers;
    std::string body;
    bool ok;
  };
  
  cppcoro::task<Response> fetch(const std::string& url);
}
```

**Vendor**: Add libcurl to `compiler/vendor/` (~1MB)

---

#### 2.2.2 File System ✅ **COMPLETE**
**Used by**: io module

**Status**: ✅ **COMPLETE** (Phase 7b.2)

**Implementation**:
- Built-in global classes: `FileSystem` (sync), `FileSystemAsync` (async)
- 18+ methods: exists, readText, writeText, appendText, readBytes, writeBytes, mkdir, mkdirRecursive, readDir, stat, isFile, isDirectory, remove, removeRecursive, copy, move, cwd, absolute
- Runtime: `runtime/cpp/ownership/gs_filesystem.hpp` (700 lines, cross-platform)
- Tests: `test/filesystem.test.ts` (9 tests, all passing)
- Documentation: `FILESYSTEM-API-GUIDE.md` (complete API reference)
- Example: `examples/filesystem-demo-gs.ts` (comprehensive usage patterns)

**TypeScript/Node.js**: `node:fs`, `node:fs/promises`  
**C++**: std::filesystem (C++17), POSIX I/O

```cpp
// GoodScript usage (no imports needed - built-in globals)
const content = FileSystem.readText('config.json');
FileSystem.writeText('output.txt', 'Hello!');

// Async variant
const data = await FileSystemAsync.readText('large-file.txt');
await FileSystemAsync.writeText('data.txt', 'Async write!');
```

---

#### 2.2.3 JSON Parser ⚠️ **MEDIUM**
**Used by**: json module

**TypeScript**: Native `JSON.parse()`, `JSON.stringify()`  
**C++**: nlohmann/json (header-only, ~500KB)

```cpp
// Vendor nlohmann/json
#include <nlohmann/json.hpp>

namespace gs::json {
  JsonValue parse(const std::string& text);
  std::string stringify(const JsonValue& value, bool pretty);
}
```

**Vendor**: Add nlohmann/json to `compiler/vendor/`

---

#### 2.2.4 Timers ⚠️ **MEDIUM**
**Used by**: http module (timeout)

**TypeScript/Browser/Node**: `setTimeout`, `clearTimeout`  
**C++**: std::this_thread::sleep_for, cppcoro timers

```cpp
namespace gs {
  int setTimeout(std::function<void()> fn, int ms);
  void clearTimeout(int id);
}
```

---

## 3. Implementation Priority (Phased Approach)

### Phase 7a: Core Language Features (Week 1-2)
**Goal**: Enable basic stdlib functionality

1. **Exception Handling** (try/catch/throw)
   - AST lowering
   - IR instructions
   - C++ codegen
   - Error class runtime

2. **Array Methods** (map, filter, slice, push)
   - Method call IR
   - C++ Array class with methods
   - Type signatures

3. **Map Methods** (get, set, has, forEach, entries)
   - Method call IR
   - C++ Map class with methods
   - Type signatures

4. **for-of Loops**
   - AST lowering
   - IR iteration
   - C++ range-based for

5. **Optional Chaining** (options?.field)
   - AST lowering
   - IR conditional access
   - C++ null checks

**Tests**: stdlib/core can compile and run

---

### Phase 7b: Async Runtime (Week 3-4)
**Goal**: Enable async I/O and HTTP

1. ✅ **Async/Await** (Phase 7b.1 - COMPLETE)
   - AST lowering
   - Promise<T> IR type
   - C++ cppcoro integration
   - Promise runtime implementation

2. ✅ **File System API** (Phase 7b.2 - COMPLETE)
   - Runtime: gs_filesystem.hpp (C++17 std::filesystem)
   - Built-in FileSystem and FileSystemAsync globals
   - 18+ methods (sync and async variants)
   - Cross-platform (POSIX/Windows)

3. ✅ **HTTP Client** (Phase 7b.3 - COMPLETE)
   - Vendored libcurl 8.7.1 (382 files, MIT-like license)
   - Runtime: gs_http.hpp (~350 lines, sync and async support)
   - Built-in globals: HTTP (sync), HTTPAsync (async)
   - Methods: HTTP.syncFetch(), HTTPAsync.fetch()
   - Features: Custom headers, POST/PUT, timeout support
   - Platform SSL: macOS (Secure Transport), Windows (Schannel), Linux (HTTP-only or OpenSSL)
   - Documentation: PHASE-7B3-HTTP-CLIENT-PLAN.md, vendor/curl/README.md

**Tests**: ✅ All Phase 7b complete (65 tests total: 11 async/await, 10 FileSystem, 44 runtime library, 3 HTTP)

---

### Phase 7c: Utilities & Polish (Week 5)
**Goal**: Complete stdlib support

1. **String Methods** (split, slice, trim, case)
   - Runtime implementation

2. **Math Object** (min, max)
   - Runtime namespace

3. **JSON Parser**
   - Vendor nlohmann/json
   - Runtime wrapper

4. **Tuple Types**
   - IR support
   - C++ std::tuple codegen

**Tests**: All stdlib modules compile and run

---

## 4. Success Criteria

### Phase 7a Success
```bash
cd stdlib/core
pnpm build              # Compiles to C++
pnpm test               # Runs unit tests
gsc --compile src/      # Compiles to native binary
```

### Phase 7b Success
```bash
cd stdlib/io
pnpm build && pnpm test

cd stdlib/http
pnpm build && pnpm test
```

### Phase 7c Success
```bash
cd stdlib/json
pnpm build && pnpm test

# All stdlib modules work
for dir in core io http json; do
  cd stdlib/$dir && pnpm build && pnpm test
done
```

---

## 5. Architecture Notes

### 5.1 Runtime Library Structure

```
runtime/
├── cpp/
│   ├── include/
│   │   ├── gs/
│   │   │   ├── array.hpp       # Array<T> implementation
│   │   │   ├── map.hpp         # Map<K,V> implementation
│   │   │   ├── string.hpp      # String implementation
│   │   │   ├── error.hpp       # Error class
│   │   │   ├── promise.hpp     # Promise<T> (cppcoro wrapper)
│   │   │   ├── console.hpp     # console.log (already exists)
│   │   │   ├── math.hpp        # Math namespace
│   │   │   ├── io/
│   │   │   │   ├── file.hpp    # File operations
│   │   │   │   └── path.hpp    # Path utilities
│   │   │   ├── http/
│   │   │   │   └── client.hpp  # HTTP client
│   │   │   └── json/
│   │   │       └── parser.hpp  # JSON parser
│   │   └── gs.hpp              # Master header
│   └── src/
│       └── ... (implementations)
└── ts/
    └── ... (TypeScript runtime - mostly native APIs)
```

### 5.2 Vendored Dependencies

**Current** (already vendored):
- MPS 1.118.0 (GC) - BSD 2-clause, ~300KB
- PCRE2 10.47 (RegExp) - BSD 3-clause, ~500KB
- cppcoro (async) - MIT, header-only

**To Add**:
- libcurl 8.x (HTTP) - MIT-like, ~1MB
- nlohmann/json 3.x (JSON) - MIT, header-only ~500KB

**Total**: ~2.3MB vendored dependencies (acceptable for zero-install toolchain)

---

## 6. Testing Strategy

### Unit Tests (Vitest)
```typescript
// test/array-methods.test.ts
it('should map array elements', () => {
  const arr = [1, 2, 3];
  const doubled = arr.map(x => x * 2);
  expect(doubled).toEqual([2, 4, 6]);
});
```

### Integration Tests (End-to-End)
```bash
# Compile and run stdlib examples
gsc --compile examples/http-example-gs.ts -o http-test
./http-test
```

### Performance Benchmarks
```bash
# Benchmark async I/O
gsc --compile --optimize 2 benchmarks/file-read-gs.ts
./file-read < large-file.txt
```

---

## 7. Documentation Updates

After implementation, update:
1. `compiler/docs/LANGUAGE.md` - Add async/await, try/catch syntax
2. `compiler/docs/RUNTIME.md` - NEW: Document runtime APIs
3. `stdlib/README.md` - Usage examples with native compilation
4. `.github/copilot-instructions.md` - Update feature status

---

## Summary

**Current Compiler**: Basic expressions, functions, arrays, objects ✅  
**Required for stdlib**: Exception handling, async/await, array/map/string methods, I/O APIs ❌

**Estimated Timeline**: 5 weeks to full stdlib support
- Week 1-2: Core language features (try/catch, loops, methods)
- Week 3-4: Async runtime (Promise, I/O, HTTP)
- Week 5: Utilities (JSON, Math, String, tuning)

**Next Steps**:
1. Start Phase 7a: Implement try/catch/throw
2. Add Array/Map method support
3. Implement for-of loops
4. Add optional chaining

The stdlib is our north star - let's build the compiler to support it!
