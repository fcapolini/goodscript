# @goodscript/io

File system I/O utilities for GoodScript.

## Features

- **File**: Read/write operations for text and binary files
- **Directory**: Directory management (create, remove, list)
- **Path**: Cross-platform path manipulation utilities

All fallible operations follow the dual-API pattern (throwing and try* variants).

## Installation

```bash
npm install @goodscript/io
```

## Usage

```typescript
import { File, Directory, Path } from '@goodscript/io';

// File operations
const content = File.readText('input.txt');
File.writeText('output.txt', content);

// Safe operations
const maybeContent = File.tryReadText('maybe-missing.txt');
if (maybeContent !== null) {
  console.log(maybeContent);
}

// Directory operations
Directory.create('my-dir');
const files = Directory.listFiles('my-dir');

// Path utilities
const fullPath = Path.join('dir', 'subdir', 'file.txt');
const ext = Path.extension(fullPath);  // '.txt'
const stem = Path.stem(fullPath);      // 'file'
```

## License

MIT OR Apache-2.0
