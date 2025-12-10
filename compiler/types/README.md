# GoodScript Type Definitions

TypeScript type definitions for GoodScript's ownership system, integer types, and runtime APIs.

## Installation

Install the GoodScript compiler (includes type definitions):

```bash
npm install -g goodscript
```

Or as a project dependency:

```bash
npm install --save-dev goodscript
```

## Usage

### Option 1: Explicit Imports (Recommended)

Import types explicitly in your `-gs.ts` files:

```typescript
import type { own, share, use, integer, integer53 } from 'goodscript';

export function fibonacci(n: integer): integer {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

export class Buffer {
  data: own<ArrayBuffer>;
  
  constructor(size: integer) {
    this.data = new ArrayBuffer(size);
  }
}

export class Node {
  value: integer;
  next: share<Node> | null;
  
  constructor(value: integer) {
    this.value = value;
    this.next = null;
  }
}
```
import type { own, share, use, integer, integer53 } from 'goodscript';

export function fibonacci(n: integer): integer {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

export class Buffer {
  data: own<ArrayBuffer>;
  
  constructor(size: integer) {
    this.data = new ArrayBuffer(size);
  }
}

export class Node {
  value: integer;
  next: share<Node> | null;
  
  constructor(value: integer) {
    this.value = value;
    this.next = null;
  }
}
```

### Option 2: Global Types

Reference the globals file in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    // ... other options
  },
  "include": [
    "src/**/*",
    "node_modules/goodscript/types/globals.d.ts"
  ]
}
```

Then use types without imports:

```typescript
// No imports needed!
function sum(numbers: Array<integer>): integer {
  let total: integer = 0;
  for (const num of numbers) {
    total = total + num;
  }
  return total;
}

let buffer: own<ArrayBuffer> = new ArrayBuffer(1024);
```

## Type Reference

### Ownership Types

#### `own<T>`
Unique ownership - exclusive access to a value.
- **C++ mode**: `std::unique_ptr<T>` (ownership) or `T*` (GC)
- **JS/TS mode**: Type alias for `T`

```typescript
let buffer: own<ArrayBuffer> = new ArrayBuffer(1024);
```

#### `share<T>`
Shared ownership - reference counted.
- **C++ mode**: `std::shared_ptr<T>` (ownership) or `T*` (GC)
- **JS/TS mode**: Type alias for `T`

```typescript
let config: share<Config> = getSharedConfig();
```

#### `use<T>`
Borrowed reference - non-owning pointer.
- **C++ mode**: Raw pointer `T*`
- **JS/TS mode**: Type alias for `T`

```typescript
function process(data: use<Buffer>): void {
  // Temporary access, no ownership
}
```

### Integer Types

#### `integer`
32-bit signed integer.
- **C++ mode**: `int32_t`
- **JS/TS mode**: `number`
- **Range**: -2,147,483,648 to 2,147,483,647

```typescript
let count: integer = 42;
let index: integer = 0;
```

#### `integer53`
53-bit signed integer (JavaScript safe integer range).
- **C++ mode**: `int64_t`
- **JS/TS mode**: `number`
- **Range**: ±9,007,199,254,740,991 (`Number.MAX_SAFE_INTEGER`)

```typescript
let timestamp: integer53 = Date.now();
let id: integer53 = 9007199254740991;
```

## Runtime API Types

Import runtime API types for built-in GoodScript functionality:

```typescript
import type { 
  HttpResponse,
  FileStat,
  console,
  Math,
  JSON,
  FileSystem,
  FileSystemAsync,
  HTTP,
  HTTPAsync
} from 'goodscript/runtime';
```

### Available Runtime APIs

- **`console`** - Console logging (`log`, `error`, `warn`, `info`, `debug`)
- **`Math`** - Mathematical functions and constants
- **`JSON`** - JSON serialization (`stringify`)
- **`FileSystem`** - Synchronous file I/O operations
- **`FileSystemAsync`** - Asynchronous file I/O operations
- **`HTTP`** - Synchronous HTTP client
- **`HTTPAsync`** - Asynchronous HTTP client

See `runtime.d.ts` for complete API documentation.

## Package Exports

The `goodscript` package provides multiple export paths:

```typescript
// Core types (ownership + integers)
import type { own, share, use, integer, integer53 } from 'goodscript';

// Runtime APIs
import type { console, FileSystem, HTTP } from 'goodscript/runtime';

// Global type augmentation (tsconfig.json)
{
  "compilerOptions": {
    "types": ["goodscript/globals"]
  }
}

// Compiler internals (advanced usage)
import { compile } from 'goodscript/compiler';
```

## Files

- **`index.d.ts`** - Main entry point (ownership types + integers)
- **`runtime.d.ts`** - Runtime API type definitions
- **`globals.d.ts`** - Global type augmentation

## TypeScript Integration

GoodScript files use the `-gs.ts` naming convention:

```
src/
├── math-gs.ts          # GoodScript file
├── utils-gs.ts         # GoodScript file
└── index.ts            # Regular TypeScript file
```

All TypeScript tooling works out of the box:
- ✅ VSCode IntelliSense
- ✅ `tsc` type checking
- ✅ ESLint
- ✅ Prettier

## License

MIT OR Apache-2.0
