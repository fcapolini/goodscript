# GoodScript Standard Library

Implementation of Phase 1.1 (Core Essentials) from STDLIB-ROADMAP.md

## Completed Packages

### @goodscript/core - Core Types & Collections

**Status**: ✅ Complete (89 tests passing)

Provides utilities for working with arrays, maps, sets, and strings with dual error handling.

**Key Features**:
- `ArrayTools`: Array operations (at, first, last, chunk, zip, range, flatten, unique, partition)
- `MapTools`: Map utilities (getOrDefault, keys, values, mapValues, filter, merge)
- `SetTools`: Set operations (union, intersection, difference, isSubset, isSuperset)
- `StringTools`: String parsing (parseInt, parseFloat, trim, split, etc.)

**Dual Error Handling**:
```typescript
ArrayTools.at(arr, 10);      // Throws on error
ArrayTools.tryAt(arr, 10);   // Returns null on error
```

---

### @goodscript/io - File System Operations

**Status**: ✅ Complete (29 tests passing)

Provides cross-platform file system operations with dual error handling.

**Key Features**:
- `File`: Read/write text and binary files
- `Directory`: Create, remove, and list directories
- `Path`: Path manipulation utilities

**Example**:
```typescript
import { File, Directory, Path } from '@goodscript/io';

const content = File.tryReadText('config.json');
if (content !== null) {
  // Process file
}

Directory.create('output');
const files = Directory.listFiles('output');
```

---

### @goodscript/json - JSON Parsing

**Status**: ✅ Complete (30 tests passing)

Type-safe JSON parsing using discriminated unions.

**Key Features**:
- Type-safe `JsonValue` with explicit kinds
- Dual error handling (parse/tryParse, stringify/tryStringify)
- Typed extraction helpers (`JsonExt`)

**Example**:
```typescript
import { JSON, JsonTools, type JsonValue } from '@goodscript/json';

const data = JSON.parse('{"name": "Alice"}');
if (data.kind === 'object') {
  const name = JsonTools.get(data, 'name');
  if (name.kind === 'string') {
    console.log(name.value);  // "Alice"
  }
}
```

---

## Test Summary

| Package | Tests | Status |
|---------|-------|--------|
| @goodscript/core | 89 | ✅ Passing |
| @goodscript/io | 29 | ✅ Passing |
| @goodscript/json | 30 | ✅ Passing |
| **Total** | **148** | **✅ All Passing** |

## Design Principles

1. **Dual Error Handling**: Every fallible operation has both:
   - `operation()` - throws on error
   - `tryOperation()` - returns null/false on error

2. **Backend Agnostic**: Current implementation uses Node.js APIs, but designed to dispatch to:
   - Haxe backend → `haxe.*` stdlib
   - C++ backend → custom implementations

3. **TypeScript Idioms**: Feels natural to TypeScript developers while being GoodScript-compliant

4. **Ownership Ready**: APIs designed to support `own<T>`, `share<T>`, `use<T>` annotations

## Development

Each package is independently buildable and testable:

```bash
# Build all stdlib packages
pnpm --filter "./stdlib/*" build

# Test all stdlib packages
pnpm --filter "./stdlib/*" test

# Work on specific package
cd stdlib/core
pnpm build && pnpm test
```

## Next Steps (Phase 1.2+)

Per STDLIB-ROADMAP.md:

- **Phase 2**: Networking & Async
  - `@goodscript/http` - HTTP client
  - `@goodscript/async` - Promises & async/await
  - `@goodscript/process` - Process execution

- **Phase 3**: Advanced Features
  - `@goodscript/regex` - Regular expressions
  - `@goodscript/crypto` - Cryptography
  - `@goodscript/datetime` - Date/time handling

## License

MIT OR Apache-2.0
