# GoodScript Standard Library - Implementation Roadmap

**Version:** 0.12.0  
**Last Updated:** December 8, 2025

## Overview

This roadmap outlines the phased implementation of GoodScript's standard library, leveraging Haxe's cross-platform APIs as a foundation while providing GoodScript-idiomatic wrappers with ownership semantics and dual-error-handling patterns.

## Design Principles

1. **Haxe API alignment**: Mirror Haxe stdlib structure for cross-platform compatibility
2. **Dual error handling**: Every fallible operation has `operation()` (throws) and `tryOperation()` (returns null)
3. **Ownership annotations**: Add `own<T>`, `share<T>`, `use<T>` semantics (enforced in C++ ownership mode)
4. **TypeScript idioms**: Feel natural to TypeScript developers
5. **Performance paths**: C++ backend gets custom implementations where it matters

## Implementation Strategy

### Backend-Specific Implementations

Each stdlib module has:

```typescript
// @goodscript/module/index-gs.ts (public API)
export class SomeAPI {
  static operation(...): T {
    // Wraps tryOperation, throws on null
  }
  
  static tryOperation(...): T | null {
    // Dispatches to backend-specific implementation
  }
}

// Implementation dispatch (compiler handles this):
// - Haxe backend → haxe.SomeAPI.method()
// - C++ backend → custom C++ implementation
```

### Testing Strategy

- **Unit tests**: Test API surface, not implementation
- **Cross-backend tests**: Same test suite runs on all backends
- **Integration tests**: Real-world usage patterns
- **Performance benchmarks**: Compare C++ vs Haxe backends

## Phase 1: Core Essentials (Foundation)

**Goal**: Minimum viable stdlib for real applications

**Timeline**: 2-3 weeks after CLI completion

### 1.1 `@goodscript/core` - Core Types & Collections

**Priority**: Critical

**Haxe mapping**: `haxe.*`, `Array`, `Map`, `Set`

**Modules**:

```typescript
// Array extensions
export class ArrayExt {
  // Fallible operations (dual API)
  static at<T>(arr: Array<T>, index: integer): T;  // Throws on out-of-bounds
  static tryAt<T>(arr: Array<T>, index: integer): T | null;
  
  static first<T>(arr: Array<T>): T;  // Throws if empty
  static tryFirst<T>(arr: Array<T>): T | null;
  
  static last<T>(arr: Array<T>): T;
  static tryLast<T>(arr: Array<T>): T | null;
  
  // Safe operations
  static chunk<T>(arr: Array<T>, size: integer): Array<Array<T>>;
  static zip<T, U>(a: Array<T>, b: Array<U>): Array<[T, U]>;
}

// Map utilities
export class MapExt {
  static getOrDefault<K, V>(map: Map<K, V>, key: K, defaultValue: V): V;
  static tryGet<K, V>(map: Map<K, V>, key: K): V | null;
}

// Set utilities
export class SetExt {
  static union<T>(a: Set<T>, b: Set<T>): Set<T>;
  static intersection<T>(a: Set<T>, b: Set<T>): Set<T>;
  static difference<T>(a: Set<T>, b: Set<T>): Set<T>;
}

// String utilities
export class StringExt {
  static tryParseInt(s: string): integer | null;
  static parseInt(s: string): integer;  // Throws on invalid
  
  static tryParseFloat(s: string): number | null;
  static parseFloat(s: string): number;
}
```

**Haxe stdlib mapping**:
- `Array` methods → `Array<T>` (Haxe native)
- `Map` → `haxe.ds.Map`
- `Set` → Custom (Haxe doesn't have built-in Set)

**C++ custom implementation**: High priority (performance-critical)

**Tests**: 50+ unit tests, property-based testing for collections

---

### 1.2 `@goodscript/io` - File System

**Priority**: Critical

**Haxe mapping**: `sys.io.File`, `sys.FileSystem`

**Modules**:

```typescript
// File operations
export class File {
  // Read operations
  static readText(path: string): string;
  static tryReadText(path: string): string | null;
  
  static readBytes(path: string): own<Uint8Array>;
  static tryReadBytes(path: string): own<Uint8Array> | null;
  
  // Write operations
  static writeText(path: string, content: string): void;
  static tryWriteText(path: string, content: string): boolean;
  
  static writeBytes(path: string, data: use<Uint8Array>): void;
  static tryWriteBytes(path: string, data: use<Uint8Array>): boolean;
  
  // Append operations
  static appendText(path: string, content: string): void;
  static tryAppendText(path: string, content: string): boolean;
}

// Directory operations
export class Directory {
  static exists(path: string): boolean;
  static create(path: string): void;
  static tryCreate(path: string): boolean;
  
  static remove(path: string, recursive: boolean): void;
  static tryRemove(path: string, recursive: boolean): boolean;
  
  static list(path: string): own<Array<string>>;
  static tryList(path: string): own<Array<string>> | null;
}

// Path utilities
export class Path {
  static join(...parts: Array<string>): string;
  static dirname(path: string): string;
  static basename(path: string): string;
  static extension(path: string): string;
  static normalize(path: string): string;
  static isAbsolute(path: string): boolean;
}
```

**Haxe stdlib mapping**:
- `File.readText()` → `sys.io.File.getContent()`
- `File.writeText()` → `sys.io.File.saveContent()`
- `Directory.*` → `sys.FileSystem.*`
- `Path.*` → `haxe.io.Path.*`

**C++ custom implementation**: High priority (performance + ownership enforcement)

**Tests**: File I/O edge cases, permission errors, large files

---

### 1.3 `@goodscript/json` - JSON Parsing

**Priority**: Critical

**Haxe mapping**: `haxe.Json`

**Modules**:

```typescript
// JSON operations
export class JSON {
  static parse(text: string): own<JsonValue>;
  static tryParse(text: string): own<JsonValue> | null;
  
  static stringify(value: use<JsonValue>, pretty: boolean = false): string;
  static tryStringify(value: use<JsonValue>, pretty: boolean = false): string | null;
}

// JSON value type (discriminated union)
export type JsonValue =
  | { kind: 'null' }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'number'; value: number }
  | { kind: 'string'; value: string }
  | { kind: 'array'; value: own<Array<JsonValue>> }
  | { kind: 'object'; value: own<Map<string, JsonValue>> };

// Typed extraction helpers
export class JsonExt {
  static asString(value: use<JsonValue>): string;
  static tryAsString(value: use<JsonValue>): string | null;
  
  static asNumber(value: use<JsonValue>): number;
  static tryAsNumber(value: use<JsonValue>): number | null;
  
  static asArray(value: use<JsonValue>): use<Array<JsonValue>>;
  static tryAsArray(value: use<JsonValue>): use<Array<JsonValue>> | null;
  
  static asObject(value: use<JsonValue>): use<Map<string, JsonValue>>;
  static tryAsObject(value: use<JsonValue>): use<Map<string, JsonValue>> | null;
}
```

**Haxe stdlib mapping**:
- `JSON.parse()` → `haxe.Json.parse()`
- `JSON.stringify()` → `haxe.Json.stringify()`

**C++ custom implementation**: Medium priority (can use nlohmann/json library)

**Tests**: Valid JSON, malformed JSON, edge cases (NaN, Infinity, Unicode)

---

## Phase 2: Networking & Async (Enable Real Apps)

**Goal**: Build web servers, API clients, async I/O

**Timeline**: 3-4 weeks after Phase 1

### 2.1 `@goodscript/http` - HTTP Client

**Priority**: High

**Haxe mapping**: `haxe.Http`, `sys.net.Socket`

**Modules**:

```typescript
// HTTP client
export class HttpClient {
  // Simple requests
  static get(url: string): own<HttpResponse>;
  static tryGet(url: string): own<HttpResponse> | null;
  
  static post(url: string, body: string, contentType: string): own<HttpResponse>;
  static tryPost(url: string, body: string, contentType: string): own<HttpResponse> | null;
  
  // Full request builder
  static request(req: use<HttpRequest>): own<HttpResponse>;
  static tryRequest(req: use<HttpRequest>): own<HttpResponse> | null;
}

export interface HttpRequest {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers: Map<string, string>;
  body: string | null;
  timeout: integer;  // milliseconds
}

export interface HttpResponse {
  status: integer;
  headers: Map<string, string>;
  body: string;
}
```

**Haxe stdlib mapping**:
- `HttpClient.get()` → `haxe.Http.requestUrl()`
- Full control → `haxe.Http` API

**C++ custom implementation**: High priority (use libcurl or cpp-httplib)

**Tests**: Mock server, timeouts, redirects, error cases

---

### 2.2 `@goodscript/async` - Promises & Async/Await

**Priority**: High

**Haxe mapping**: Custom (Haxe has different async model)

**Modules**:

```typescript
// Promise-based async
export class Promise<T> {
  constructor(
    executor: (
      resolve: (value: T) => void,
      reject: (error: Error) => void
    ) => void
  );
  
  then<U>(onFulfilled: (value: T) => U): own<Promise<U>>;
  catch(onRejected: (error: Error) => void): own<Promise<T>>;
  finally(onFinally: () => void): own<Promise<T>>;
  
  static resolve<T>(value: T): own<Promise<T>>;
  static reject<T>(error: Error): own<Promise<T>>;
  static all<T>(promises: Array<Promise<T>>): own<Promise<Array<T>>>;
  static race<T>(promises: Array<Promise<T>>): own<Promise<T>>;
}

// Async utilities
export class Async {
  static sleep(ms: integer): own<Promise<void>>;
  static timeout<T>(promise: Promise<T>, ms: integer): own<Promise<T>>;
}
```

**Implementation note**: This likely needs custom implementation for both backends (Haxe uses different async primitives)

**C++ implementation**: Use cppcoro (already vendored)

**Tests**: Promise chains, error propagation, race conditions

---

### 2.3 `@goodscript/process` - Process Execution

**Priority**: Medium

**Haxe mapping**: `Sys.command()`, `sys.io.Process`

**Modules**:

```typescript
// Process execution
export class Process {
  static execute(command: string, args: Array<string>): own<ProcessResult>;
  static tryExecute(command: string, args: Array<string>): own<ProcessResult> | null;
  
  static spawn(command: string, args: Array<string>): own<ChildProcess>;
  static trySpawn(command: string, args: Array<string>): own<ChildProcess> | null;
}

export interface ProcessResult {
  exitCode: integer;
  stdout: string;
  stderr: string;
}

export class ChildProcess {
  readonly pid: integer;
  
  write(data: string): void;
  waitForExit(): integer;
  kill(signal: integer = 15): void;  // SIGTERM by default
  
  onStdout(callback: (data: string) => void): void;
  onStderr(callback: (data: string) => void): void;
  onExit(callback: (exitCode: integer) => void): void;
}
```

**Haxe stdlib mapping**:
- `Process.execute()` → `Sys.command()`
- `Process.spawn()` → `sys.io.Process`

**C++ custom implementation**: Medium priority

**Tests**: Command execution, pipes, environment variables

---

## Phase 3: Advanced Features (Productivity Boost)

**Goal**: Make GoodScript highly productive for real-world development

**Timeline**: 4-5 weeks after Phase 2

### 3.1 `@goodscript/regex` - Regular Expressions

**Priority**: Medium

**Haxe mapping**: `EReg` (wraps PCRE)

**Modules**:

```typescript
export class Regex {
  constructor(pattern: string, flags: string = '');
  
  test(text: string): boolean;
  match(text: string): own<RegexMatch> | null;
  matchAll(text: string): own<Array<RegexMatch>>;
  replace(text: string, replacement: string): string;
  split(text: string): own<Array<string>>;
}

export interface RegexMatch {
  matched: string;
  groups: Array<string>;
  index: integer;
}
```

**Haxe stdlib mapping**: `EReg` (uses PCRE2, already vendored)

**C++ implementation**: Use PCRE2 (already vendored)

**Tests**: Common patterns, Unicode, capture groups

---

### 3.2 `@goodscript/datetime` - Date & Time

**Priority**: Medium

**Haxe mapping**: `Date`, `DateTools`

**Modules**:

```typescript
export class DateTime {
  // Constructors
  static now(): own<DateTime>;
  static fromTimestamp(seconds: number): own<DateTime>;
  static fromISO(iso: string): own<DateTime>;
  static tryFromISO(iso: string): own<DateTime> | null;
  
  // Getters
  year(): integer;
  month(): integer;  // 1-12
  day(): integer;    // 1-31
  hour(): integer;   // 0-23
  minute(): integer; // 0-59
  second(): integer; // 0-59
  
  // Formatting
  toISO(): string;
  toTimestamp(): number;
  format(pattern: string): string;
  
  // Arithmetic
  addDays(days: integer): own<DateTime>;
  addHours(hours: integer): own<DateTime>;
  diffSeconds(other: use<DateTime>): number;
}
```

**Haxe stdlib mapping**:
- `DateTime` → `Date`
- Arithmetic → `DateTools`

**C++ implementation**: Use Howard Hinnant's date library or std::chrono

**Tests**: Timezones, leap years, DST transitions

---

### 3.3 `@goodscript/encoding` - Text Encoding

**Priority**: Low

**Haxe mapping**: Custom (Haxe assumes UTF-8)

**Modules**:

```typescript
export class Base64 {
  static encode(data: use<Uint8Array>): string;
  static decode(text: string): own<Uint8Array>;
  static tryDecode(text: string): own<Uint8Array> | null;
}

export class Hex {
  static encode(data: use<Uint8Array>): string;
  static decode(text: string): own<Uint8Array>;
  static tryDecode(text: string): own<Uint8Array> | null;
}

export class UTF8 {
  static encode(text: string): own<Uint8Array>;
  static decode(bytes: use<Uint8Array>): string;
  static tryDecode(bytes: use<Uint8Array>): string | null;  // Invalid UTF-8
}
```

**Haxe implementation**: `haxe.crypto.Base64`, custom for others

**C++ implementation**: Custom or use existing libraries

**Tests**: Edge cases, invalid input, Unicode

---

### 3.4 `@goodscript/crypto` - Cryptography

**Priority**: Low (security-sensitive, needs careful review)

**Haxe mapping**: `haxe.crypto.*`

**Modules**:

```typescript
export class Hash {
  static sha256(data: use<Uint8Array>): own<Uint8Array>;
  static sha512(data: use<Uint8Array>): own<Uint8Array>;
  static md5(data: use<Uint8Array>): own<Uint8Array>;  // Legacy only
}

export class HMAC {
  static sha256(key: use<Uint8Array>, data: use<Uint8Array>): own<Uint8Array>;
}

// Note: Symmetric/asymmetric crypto postponed to Phase 4
```

**Haxe stdlib mapping**: `haxe.crypto.Sha256`, etc.

**C++ implementation**: Use OpenSSL or libsodium

**Security note**: Needs cryptography expert review before production use

**Tests**: Test vectors from NIST, known-answer tests

---

## Phase 4: Platform-Specific Extensions (Ecosystem Growth)

**Goal**: Enable platform-specific capabilities

**Timeline**: Ongoing after Phase 3

### 4.1 `@goodscript/platform/jvm` - JVM Interop

**Priority**: Medium (when Haxe backend is ready)

**Enables**: Call Java libraries from GoodScript

**Modules**:

```typescript
export class JavaInterop {
  // Java collections
  static createArrayList<T>(): own<JavaArrayList<T>>;
  static createHashMap<K, V>(): own<JavaHashMap<K, V>>;
  
  // Java I/O
  static createBufferedReader(path: string): own<JavaBufferedReader>;
  
  // Custom class loading
  static loadClass(className: string): own<JavaClass>;
}
```

**Only available when compiling to JVM target**

---

### 4.2 `@goodscript/platform/dotnet` - .NET Interop

**Priority**: Medium (for Unity game development)

**Enables**: Call C# libraries from GoodScript

**Modules**:

```typescript
export class DotNetInterop {
  // .NET collections
  static createList<T>(): own<DotNetList<T>>;
  static createDictionary<K, V>(): own<DotNetDictionary<K, V>>;
  
  // Unity-specific (if available)
  static getUnityEngine(): own<UnityEngineNamespace>;
}
```

**Only available when compiling to C# target**

---

### 4.3 `@goodscript/platform/web` - Browser APIs

**Priority**: High (for frontend development)

**Enables**: DOM manipulation, fetch, localStorage, etc.

**Modules**:

```typescript
export class DOM {
  static querySelector(selector: string): own<Element> | null;
  static createElement(tag: string): own<Element>;
  // ... standard DOM APIs
}

export class Fetch {
  static get(url: string): own<Promise<Response>>;
  static post(url: string, body: string): own<Promise<Response>>;
}
```

**Only available when compiling to JavaScript target**

---

## Phase 5: Developer Experience (Polish)

**Goal**: Make stdlib delightful to use

**Timeline**: Ongoing

### 5.1 Documentation

- **API reference**: Generated from source code comments
- **Cookbook**: Common recipes and patterns
- **Migration guides**: From TypeScript stdlib, from Haxe stdlib
- **Performance tips**: When to use C++ vs Haxe backend

### 5.2 Tooling

- **Type definitions**: Auto-generated `.d.ts` for IDE support
- **Playground**: Browser-based REPL with stdlib examples
- **Benchmarks**: Published performance comparisons

### 5.3 Testing Infrastructure

- **Cross-backend test runner**: Run same tests on C++ and Haxe
- **Property-based testing**: QuickCheck-style tests for collections
- **Fuzzing**: Find edge cases in parsers (JSON, regex, etc.)

---

## Implementation Checklist

For each stdlib module:

- [ ] **API design**: Review interface, dual error handling
- [ ] **Haxe mapping**: Identify corresponding Haxe stdlib APIs
- [ ] **C++ implementation**: Write custom C++ or use library
- [ ] **Ownership annotations**: Add `own<T>`, `share<T>`, `use<T>`
- [ ] **Unit tests**: Minimum 80% coverage
- [ ] **Cross-backend tests**: Verify both C++ and Haxe work
- [ ] **Documentation**: API docs, examples, edge cases
- [ ] **Benchmarks**: Performance comparison (if relevant)
- [ ] **Code review**: Security, performance, API consistency

---

## Success Metrics

### Phase 1 Complete:
- Can build CLI tool using GoodScript stdlib
- File I/O, JSON parsing, basic collections all work
- Tests pass on both C++ and Haxe backends

### Phase 2 Complete:
- Can build HTTP API server in GoodScript
- Can build HTTP client application
- Async/await works end-to-end

### Phase 3 Complete:
- Can build production web service
- Regex, dates, encoding all available
- Developer productivity matches TypeScript

### Phase 4 Complete:
- Platform-specific apps work (Unity game, JVM service, etc.)
- Ecosystem starts to form (community packages)

---

## Open Questions

1. **Module organization**: Flat namespace (`@goodscript/io`) vs nested (`@goodscript/io/file`)?
2. **Versioning strategy**: Semantic versioning per module or lockstep?
3. **Tree-shaking**: Ensure unused stdlib code doesn't bloat binaries
4. **Polyfills**: Should we polyfill missing features on older platforms?
5. **Native dependencies**: How to handle platform-specific libs (OpenSSL, etc.)?

---

## Resources Needed

### Development:
- 1 engineer (full-time) for 3-4 months (Phases 1-3)
- 0.5 engineers (ongoing) for Phase 4+

### Infrastructure:
- CI/CD for cross-backend testing (GitHub Actions)
- Benchmark infrastructure (track performance over time)
- Documentation hosting (GitHub Pages or custom)

### Community:
- API review from experienced TypeScript/Haxe developers
- Security review for crypto modules
- Early adopters for feedback

---

**Next Steps**:
1. Finalize Phase 1 module APIs (community feedback)
2. Set up testing infrastructure (cross-backend test runner)
3. Begin implementation with `@goodscript/core`
4. Iterate based on real-world usage

---

**Document Status**: Living roadmap, updated as implementation progresses  
**Feedback**: Open issues on GitHub or discuss in community forums
