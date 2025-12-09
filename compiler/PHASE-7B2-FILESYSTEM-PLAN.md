# Phase 7b.2: File System API

**Status**: Planning  
**Date**: December 9, 2025  
**Prerequisites**: ✅ Phase 7b.1 (Async/await) complete

## Overview

Enable GoodScript programs to perform file system operations using a TypeScript-compatible API. The runtime already has comprehensive `FileSystem` and `FileSystemAsync` implementations in `gs_filesystem.hpp`, so this phase focuses on making them accessible from GoodScript code.

## Goals

1. Enable import and usage of FileSystem module
2. Support both sync and async filesystem operations
3. Provide type-safe filesystem API
4. Generate correct C++ code for filesystem operations
5. Comprehensive testing and documentation

## Runtime Status

**Already implemented** in `runtime/cpp/ownership/gs_filesystem.hpp`:

### Synchronous API (`FileSystem`)
- ✅ `exists(path): boolean` - Check if path exists
- ✅ `readText(path, encoding?): string` - Read file as text
- ✅ `writeText(path, content, encoding?, mode?): void` - Write text to file
- ✅ `appendText(path, content, encoding?, mode?): void` - Append text to file
- ✅ `readBytes(path): Array<number>` - Read file as bytes
- ✅ `writeBytes(path, data, mode?): void` - Write bytes to file
- ✅ `remove(path): void` - Delete file or empty directory
- ✅ `removeRecursive(path): void` - Delete directory recursively
- ✅ `mkdir(path, mode?): void` - Create directory
- ✅ `mkdirRecursive(path, mode?): void` - Create directory recursively
- ✅ `readDir(path, recursive?): Array<string>` - List directory contents
- ✅ `stat(path): FileInfo` - Get file information
- ✅ `isFile(path): boolean` - Check if path is a file
- ✅ `isDirectory(path): boolean` - Check if path is a directory
- ✅ `copy(source, dest): void` - Copy file or directory
- ✅ `move(source, dest): void` - Move/rename file or directory
- ✅ `cwd(): string` - Get current working directory
- ✅ `absolute(path): string` - Get absolute path

### Asynchronous API (`FileSystemAsync`)
- ✅ All methods above with `Promise<T>` return types
- ✅ Uses cppcoro::task<T> under the hood
- ✅ Compatible with async/await

### Type Definitions
- ✅ `FileType` enum (File, Directory, Symlink, Unknown)
- ✅ `FileInfo` struct (path, type, size, modified)

## Implementation Plan

### Step 1: Module System Support
**Goal**: Enable `import` statements for built-in modules

**Tasks**:
1. Add module resolution for `@goodscript/io` or `goodscript:fs`
2. Support built-in module declarations
3. Generate appropriate C++ includes

**Example**:
```typescript
import { FileSystem } from 'goodscript:fs';
// or
import { FileSystem } from '@goodscript/io';
```

**Compiler changes**:
- `frontend/lowering.ts`: Recognize built-in module imports
- `ir/types.ts`: Add module reference types
- `backend/cpp/codegen.ts`: Generate `#include "runtime/cpp/ownership/gs_filesystem.hpp"`

**Tests**: `test/module-imports.test.ts`

### Step 2: Static Method Calls
**Goal**: Lower `FileSystem.readText(path)` to C++ static method calls

**Tasks**:
1. Recognize static property access on built-in classes
2. Lower to IR method call expressions
3. Generate correct C++ namespace and method calls

**Example**:
```typescript
const content = FileSystem.readText('file.txt');
// →
const content = gs::FileSystem::readText(gs::String("file.txt"));
```

**Compiler changes**:
- `frontend/lowering.ts`: Handle static property access and calls
- `ir/types.ts`: Add static method call IR nodes
- `backend/cpp/codegen.ts`: Generate namespace::method calls

**Tests**: `test/filesystem-static.test.ts`

### Step 3: Async FileSystem Support
**Goal**: Support `FileSystemAsync` with async/await

**Tasks**:
1. Recognize async filesystem imports
2. Lower async methods to Promise<T> returns
3. Generate cppcoro::task<T> calls

**Example**:
```typescript
import { FileSystemAsync } from 'goodscript:fs';

async function readConfig(): Promise<string> {
  return await FileSystemAsync.readText('config.json');
}
// →
cppcoro::task<gs::String> readConfig() {
  co_return co_await gs::FileSystemAsync::readText(gs::String("config.json"));
}
```

**Compiler changes**:
- `frontend/lowering.ts`: Handle async filesystem methods
- `backend/cpp/codegen.ts`: Generate co_await for async calls

**Tests**: `test/filesystem-async.test.ts`

### Step 4: FileInfo and Enums
**Goal**: Support FileInfo struct and FileType enum

**Tasks**:
1. Add struct type definitions to IR
2. Support enum access (FileType.File, etc.)
3. Generate correct C++ struct/enum access

**Example**:
```typescript
const info = FileSystem.stat('file.txt');
if (info.type === FileType.File) {
  console.log(`Size: ${info.size}`);
}
// →
auto info = gs::FileSystem::stat(gs::String("file.txt"));
if (info.type == gs::FileType::File) {
  gs::console::log(gs::String("Size: ") + gs::to_string(info.size));
}
```

**Compiler changes**:
- `ir/types.ts`: Add struct and enum types
- `frontend/lowering.ts`: Lower struct property access and enum members
- `backend/cpp/codegen.ts`: Generate C++ struct and enum access

**Tests**: `test/filesystem-types.test.ts`

### Step 5: Integration Testing & Examples
**Goal**: End-to-end filesystem usage examples

**Tasks**:
1. Create comprehensive integration tests
2. Write example programs using filesystem
3. Document filesystem API usage
4. Create FILESYSTEM-API-GUIDE.md

**Examples**:
- Read/write configuration files
- Directory traversal and filtering
- File copying utility
- Async file processing

**Tests**: `test/filesystem-integration.test.ts`

**Documentation**: `FILESYSTEM-API-GUIDE.md`

## Success Criteria

### Step 1 Success
```bash
pnpm test module-imports  # Passes
```

### Step 2 Success
```bash
pnpm test filesystem-static  # Passes
# Can compile: const content = FileSystem.readText('file.txt');
```

### Step 3 Success
```bash
pnpm test filesystem-async  # Passes
# Can compile: await FileSystemAsync.readText('file.txt');
```

### Step 4 Success
```bash
pnpm test filesystem-types  # Passes
# Can use FileInfo and FileType enum
```

### Step 5 Success
```bash
pnpm test filesystem-integration  # Passes
pnpm build && pnpm test  # All tests pass (including filesystem)
```

### End-to-end example compiles and runs:
```typescript
// examples/filesystem-demo-gs.ts
import { FileSystem, FileSystemAsync, FileType } from 'goodscript:fs';

async function main(): Promise<void> {
  // Sync operations
  if (!FileSystem.exists('data')) {
    FileSystem.mkdir('data');
  }
  
  FileSystem.writeText('data/config.json', '{"version": 1}');
  const config = FileSystem.readText('data/config.json');
  console.log(config);
  
  // Async operations
  const files = await FileSystemAsync.readDir('data');
  for (const file of files) {
    const info = await FileSystemAsync.stat(`data/${file}`);
    if (info.type === FileType.File) {
      console.log(`File: ${file} (${info.size} bytes)`);
    }
  }
}
```

## Timeline

- **Step 1**: Module imports (1-2 days)
- **Step 2**: Static method calls (1-2 days)
- **Step 3**: Async filesystem (1 day) - leverages Phase 7b.1
- **Step 4**: Types and enums (1-2 days)
- **Step 5**: Integration and docs (1 day)

**Total**: 5-8 days

## Dependencies

- ✅ Phase 7b.1 (Async/await) - Required for async filesystem
- ✅ Runtime filesystem implementation - Already complete
- ⏳ Module system - Needs implementation (Step 1)
- ⏳ Static method calls - Needs implementation (Step 2)
- ⏳ Struct types - Needs implementation (Step 4)
- ⏳ Enum types - Needs implementation (Step 4)

## Notes

1. **Runtime is ready**: All filesystem functionality already implemented in C++
2. **Focus on compiler**: This phase is primarily about compiler support for modules and static methods
3. **Async support**: Leverages existing async/await infrastructure from Phase 7b.1
4. **Cross-platform**: Runtime already handles Windows/POSIX differences
5. **Type safety**: FileInfo and FileType provide type-safe filesystem operations

## Future Enhancements (Post-7b.2)

- File watchers (inotify/FSEvents)
- Streams for large files
- True async I/O (io_uring on Linux, IOCP on Windows)
- Advanced permissions and ACLs
- Symbolic link handling
- File locking

---

Last Updated: December 9, 2025
