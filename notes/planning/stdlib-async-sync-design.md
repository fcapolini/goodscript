# Async/Sync Dual API Design

## Overview

GoodScript stdlib provides **dual APIs for I/O operations**: synchronous and asynchronous variants, similar to the existing throwing/non-throwing pattern.

## Design Principles

### 1. Naming Convention

```typescript
// Asynchronous operations (default, modern)
File.readText(path)              // Non-blocking, returns Promise, rejects on error
File.tryReadText(path)           // Non-blocking, returns Promise<T | null>, never rejects

// Synchronous operations (sync prefix, explicit)
File.syncReadText(path)          // Blocking, throws on error
File.trySyncReadText(path)       // Blocking, returns null on error
```

### 2. Pattern Matrix

Every I/O operation has **4 variants** in a 2×2 matrix:

|                    | **Throws**                 | **Safe (null on error)**    |
|--------------------|----------------------------|-----------------------------|
| **Asynchronous**   | `operation()`              | `tryOperation()`            |
| **Synchronous**    | `syncOperation()`          | `trySyncOperation()`        |

### 3. Promise Behavior

- **Throwing async** (`operation`): Returns `Promise<T>`, rejects on error
- **Safe async** (`tryOperation`): Returns `Promise<T | null>`, never rejects (null on error)

## File API Example

```typescript
export class File {
  // ============================================================
  // READ TEXT
  // ============================================================
  
  /**
   * Read file as UTF-8 text. Non-blocking, rejects on error.
   */
  static async readText(path: string): Promise<string> {
    const result = await File.tryReadText(path);
    if (result === null) {
      throw new Error(`Failed to read file: ${path}`);
    }
    return result;
  }

  /**
   * Read file as UTF-8 text. Non-blocking, returns null on error.
   */
  static async tryReadText(path: string): Promise<string | null> {
    try {
      return await fs.promises.readFile(path, 'utf-8');
    } catch {
      return null;
    }
  }

  /**
   * Read file as UTF-8 text. Blocks, throws on error.
   */
  static syncReadText(path: string): string {
    const result = File.trySyncReadText(path);
    if (result === null) {
      throw new Error(`Failed to read file: ${path}`);
    }
    return result;
  }

  /**
   * Read file as UTF-8 text. Blocks, returns null on error.
   */
  static trySyncReadText(path: string): string | null {
    try {
      return fs.readFileSync(path, 'utf-8');
    } catch {
      return null;
    }
  }

  // ============================================================
  // WRITE TEXT
  // ============================================================

  /**
   * Write text to file. Non-blocking, rejects on error.
   */
  static async writeText(path: string, content: string): Promise<void> {
    const success = await File.tryWriteText(path, content);
    if (!success) {
      throw new Error(`Failed to write file: ${path}`);
    }
  }

  /**
   * Write text to file. Non-blocking, returns false on error.
   */
  static async tryWriteText(path: string, content: string): Promise<boolean> {
    try {
      await fs.promises.writeFile(path, content, 'utf-8');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Write text to file. Blocks, throws on error.
   */
  static syncWriteText(path: string, content: string): void {
    if (!File.trySyncWriteText(path, content)) {
      throw new Error(`Failed to write file: ${path}`);
    }
  }

  /**
   * Write text to file. Blocks, returns false on error.
   */
  static trySyncWriteText(path: string, content: string): boolean {
    try {
      fs.writeFileSync(path, content, 'utf-8');
      return true;
    } catch {
      return false;
    }
  }

  // ... (readBytes, writeBytes, appendText, remove, etc.)
}
```

## Directory API Example

```typescript
export class Directory {
  /**
   * List files in directory. Non-blocking, rejects on error.
   */
  static async listFiles(path: string): Promise<Array<string>> { ... }

  /**
   * List files in directory. Non-blocking, returns null on error.
   */
  static async tryListFiles(path: string): Promise<Array<string> | null> { ... }

  /**
   * List files in directory. Blocks, throws on error.
   */
  static syncListFiles(path: string): Array<string> { ... }

  /**
   * List files in directory. Blocks, returns null on error.
   */
  static trySyncListFiles(path: string): Array<string> | null { ... }
}
```

## HTTP API Example (Future)

```typescript
export class Http {
  /**
   * Fetch URL. Non-blocking, rejects on error.
   */
  static async fetch(url: string): Promise<Response> { ... }

  /**
   * Fetch URL. Non-blocking, returns null on error.
   */
  static async tryFetch(url: string): Promise<Response | null> { ... }

  /**
   * Fetch URL. Blocks (sys targets only), throws on error.
   */
  static syncFetch(url: string): Response { ... }

  /**
   * Fetch URL. Blocks (sys targets only), returns null on error.
   */
  static trySyncFetch(url: string): Response | null { ... }
}
```

## Usage Examples

### Pattern 1: Fail-Fast Asynchronous (Default, Modern)

```typescript
// Modern async/await, throws on error
async function loadConfig() {
  const config = await File.readText('config.json');
  const data = JSON.parse(config);
  return processData(data);
}
```

### Pattern 2: Safe Asynchronous

```typescript
// Safe async, handle errors manually
async function loadConfig() {
  const config = await File.tryReadText('config.json');
  if (config === null) {
    console.log('Config not found, using defaults');
    return defaultConfig;
  }
  return JSON.parse(config);
}
```

### Pattern 3: Parallel Async Operations

```typescript
// Load multiple files concurrently
async function loadAll() {
  const [config, schema, data] = await Promise.all([
    File.readText('config.json'),
    File.readText('schema.json'),
    File.readText('data.json'),
  ]);
  
  return { config, schema, data };
}
```

### Pattern 4: Safe Parallel with Error Handling

```typescript
// Load multiple files, some may fail
async function loadAll() {
  const [config, schema, data] = await Promise.all([
    File.tryReadText('config.json'),
    File.tryReadText('schema.json'),
    File.tryReadText('data.json'),
  ]);
  
  return {
    config: config ?? defaultConfig,
    schema: schema ?? defaultSchema,
    data: data ?? defaultData,
  };
}
```

### Pattern 5: Synchronous (Explicit, for CLI/Scripts)

```typescript
// Traditional synchronous I/O, throws on error
const config = File.syncReadText('config.json');
const data = JSON.parse(config);
processData(data);
```

### Pattern 6: Safe Synchronous

```typescript
// Safe synchronous I/O, handle errors manually
const config = File.trySyncReadText('config.json');
if (config === null) {
  console.log('Config not found, using defaults');
  return defaultConfig;
}
return JSON.parse(config);
}
```

## Backend Implementation Strategy
### TypeScript/JavaScript Backend

**Async operations** (default): Use `fs.promises.*` or Deno async APIs
**Sync operations**: Use Node.js `fs.*Sync()` or Deno sync APIs

```typescript
// TypeScript backend
static async tryReadText(path: string): Promise<string | null> {
  return await fs.promises.readFile(path, 'utf-8');  // Async (default)
}

static trySyncReadText(path: string): string | null {
  return fs.readFileSync(path, 'utf-8');  // Sync (explicit)
} return await fs.promises.readFile(path, 'utf-8');  // Async
}
```
### C++ Backend

**Async operations** (default): cppcoro + async I/O (vendored)
**Sync operations**: Standard POSIX I/O (`fopen`, `fread`, etc.)

```cpp
// C++ backend (future)
cppcoro::task<std::string> tryReadText(const std::string& path) {
  // cppcoro async I/O (default)
  co_return co_await async_read_file(path);
}

std::string trySyncReadText(const std::string& path) {
  // Blocking POSIX I/O (explicit)
} co_return co_await async_read_file(path);
}
```
### Haxe Backend (Future, GC-only)

**Async operations** (default): 
- **Option A**: Wrap in thread pool (emulate async)
- **Option B**: Use tink_core Promises
- **Option C**: Mark as unavailable (compile error)

**Sync operations**: Direct mapping to `sys.io.File.*`

```haxe
// Haxe backend - async requires workaround
static function tryReadText(path: String): Promise<Null<String>> {
  // Option A: Thread pool
  return ThreadPool.run(() -> sys.io.File.getContent(path));
  
  // Option B: tink_core
  return tink.core.Future.async(cb -> {
    cb(sys.io.File.getContent(path));
  });
  
  // Option C: Compile error
  #error "Async I/O not supported on Haxe targets"
}

// Haxe backend - sync works natively
static function trySyncReadText(path: String): Null<String> {
  return sys.io.File.getContent(path);  // Native sync
} #error "Async I/O not supported on Haxe targets"
}
## Implementation Phases

### Phase 1: Core I/O (Current Priority)
- 🔲 `File.readText` / `tryReadText` (async, new default)
- 🔲 `File.writeText` / `tryWriteText` (async, new default)
- 🔲 `File.syncReadText` / `trySyncReadText` (sync, migrate existing)
- 🔲 `File.syncWriteText` / `trySyncWriteText` (sync, migrate existing)
- 🔲 Extend to all File methods (readBytes, appendText, remove, etc.)
- 🔲 Extend to Directory methods (listFiles, create, remove, etc.)
- 🔲 Extend to all File methods (readBytes, appendText, remove, etc.)
### Phase 2: Networking
- 🔲 `Http.fetch` / `tryFetch` (async, all targets)
- 🔲 `Http.syncFetch` / `trySyncFetch` (sync, sys targets only)
- 🔲 WebSocket support (async-only)c, sys targets only)
- 🔲 `Http.asyncFetch` / `tryAsyncFetch` (async, all targets)
- 🔲 WebSocket support (async-only)

### Phase 3: Advanced I/O
- 🔲 Stream-based APIs (async iterators)
- 🔲 File watching (async-only)
## Design Rationale

### Why Async as Default?

```typescript
// ✅ Good: Modern async/await is the future
const data = await File.readText('file.txt');

// ✅ Explicit when you need blocking I/O
const data = File.syncReadText('file.txt');
```

**Reasons**: 
1. **Modern**: Async/await is the standard in modern TypeScript/JavaScript
2. **Scalable**: Non-blocking I/O is essential for servers and concurrent workloads
3. **Future-proof**: Aligns with JavaScript ecosystem evolution (Node.js, Deno, Bun)
### Why `try*` Instead of `Result<T, E>`?enefits from async patterns
5. **Encourages best practices**: Makes sync blocking explicit, encouraging async-first thinking
```typescript
// Alternative: Result type (Rust-style)
type Result<T, E> = { ok: true, value: T } | { ok: false, error: E };
File.readText(path): Promise<Result<string, Error>>

// Chosen: null on error (simpler, consistent)
File.tryReadText(path): Promise<string | null>
```e Result<T, E> = { ok: true, value: T } | { ok: false, error: E };
File.asyncReadText(path): Promise<Result<string, Error>>

// Chosen: null on error (simpler, consistent)
File.tryAsyncReadText(path): Promise<string | null>
```

**Reason**: 
1. **Consistency**: Matches existing `try*` pattern
```typescript
// ❌ Callback-based (Haxe Http style)
File.readTextCallback(path, (data) => { ... }, (error) => { ... });

// ✅ Promise-based (modern TS/JS)
const data = await File.readText(path);
```❌ Callback-based (Haxe Http style)
File.readTextCallback(path, (data) => { ... }, (error) => { ... });

// ✅ Promise-based (modern TS/JS)
const data = await File.asyncReadText(path);
```

## Migration Guide

### Existing Sync Code → New API

```typescript
// Before (old sync API)
const data = File.readText('input.txt');
processData(data);

// After (new sync API - add 'sync' prefix)
const data = File.syncReadText('input.txt');
processData(data);
```

**Migration**: Add `sync` prefix to all existing File/Directory method calls.

### Migrating to Async (Recommended)

```typescript
// Before: Blocking
function loadConfigs() {
  const a = File.syncReadText('a.json');
  const b = File.syncReadText('b.json');  // Blocked by previous read
  const c = File.syncReadText('c.json');  // Blocked by previous reads
  return [a, b, c];
}

// After: Non-blocking parallel
async function loadConfigs() {
  const [a, b, c] = await Promise.all([
    File.readText('a.json'),
    File.readText('b.json'),
    File.readText('c.json'),
  ]);
  return [a, b, c];
}   File.asyncReadText('a.json'),
    File.asyncReadText('b.json'),
    File.asyncReadText('c.json'),
  ]);
  return [a, b, c];
}
```

## Notes
## Notes

- **Async is the default** - Modern, scalable, and future-proof
- **Sync methods still available** - Use `sync*` prefix when you need blocking I/O (CLIs, scripts)
- **Backend-agnostic design** - APIs work the same across C++, TypeScript, and Haxe (where supported)
- **Error handling flexibility** - Choose throwing (`operation`) or safe (`tryOperation`) per your needs
- **Worker compatibility** - Async APIs designed to work within GoodScript's Worker concurrency model
- **Migration path**: Add `sync` prefix to existing code, then gradually migrate to async where beneficial
---

**Last Updated**: December 8, 2025
