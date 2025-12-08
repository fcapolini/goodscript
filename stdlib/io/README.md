# @goodscript/io

File system I/O utilities for GoodScript.

## Features

- **File**: Read/write operations for text and binary files (async + sync)
- **Directory**: Directory management (create, remove, list) (async + sync)
- **Path**: Cross-platform path manipulation utilities

All I/O operations follow the **async/sync dual-API pattern**:
- Default operations are **asynchronous** (Promise-based, non-blocking)
- Synchronous operations use **`sync`** prefix (blocking)
- Both provide throwing and `try*` (safe) variants

## Installation

```bash
npm install @goodscript/io
```

## Usage

### Async Operations (Default, Recommended)

```typescript
import { File, Directory, Path } from '@goodscript/io';

// Async file operations (Promise-based)
async function processConfig() {
  // Read file (throws on error)
  const content = await File.readText('input.txt');
  
  // Safe read (returns null on error)
  const maybeContent = await File.tryReadText('maybe-missing.txt');
  if (maybeContent !== null) {
    console.log(maybeContent);
  }
  
  // Write file
  await File.writeText('output.txt', content);
  
  // Parallel I/O
  const [config, schema, data] = await Promise.all([
    File.readText('config.json'),
    File.readText('schema.json'),
    File.readText('data.json'),
  ]);
}

// Async directory operations
async function processDirectory() {
  await Directory.create('my-dir');
  const files = await Directory.listFiles('my-dir');
  console.log(files);
}
```

### Sync Operations (Explicit, for CLI/Scripts)

```typescript
import { File, Directory, Path } from '@goodscript/io';

// Sync file operations (blocking)
const content = File.syncReadText('input.txt');
File.syncWriteText('output.txt', content);

// Safe sync operations
const maybeContent = File.trySyncReadText('maybe-missing.txt');
if (maybeContent !== null) {
  console.log(maybeContent);
}

// Sync directory operations
Directory.syncCreate('my-dir');
const files = Directory.syncListFiles('my-dir');
```

### Path Utilities (Always Sync)

```typescript
const fullPath = Path.join('dir', 'subdir', 'file.txt');
const ext = Path.extension(fullPath);  // '.txt'
const stem = Path.stem(fullPath);      // 'file'
```

## License

MIT OR Apache-2.0
