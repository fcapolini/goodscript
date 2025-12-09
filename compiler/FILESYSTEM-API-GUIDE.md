# GoodScript FileSystem API Guide

**Status**: ✅ Complete (Phase 7b.2)  
**Date**: December 9, 2025

## Overview

GoodScript provides comprehensive file system access through two built-in global classes:

- **`FileSystem`**: Synchronous file operations (blocking)
- **`FileSystemAsync`**: Asynchronous file operations (non-blocking, returns `Promise<T>`)

Both classes provide identical APIs with the same methods and signatures. The async variant is recommended for I/O-heavy applications to avoid blocking the main thread.

## Quick Start

```typescript
// Synchronous (simple, blocking)
const content = FileSystem.readText('config.json');
console.log(content);

// Asynchronous (non-blocking, recommended for I/O)
async function readConfig(): Promise<string> {
  const content = await FileSystemAsync.readText('config.json');
  return content;
}
```

## FileSystem API Reference

### File Reading

#### `readText(path: string, encoding?: string): string`

Read entire file as text (UTF-8).

```typescript
// Read text file
const config = FileSystem.readText('config.json');
const readme = FileSystem.readText('README.md');

// Async version
const content = await FileSystemAsync.readText('large-file.txt');
```

**Parameters**:
- `path`: File path (relative or absolute)
- `encoding`: Encoding (optional, always UTF-8 in C++)

**Returns**: File contents as string

**Throws**: `Error` if file doesn't exist or can't be read

---

#### `readBytes(path: string): Array<number>`

Read entire file as byte array.

```typescript
// Read binary file
const imageData = FileSystem.readBytes('logo.png');
console.log(`Image size: ${imageData.length} bytes`);

// Async version
const data = await FileSystemAsync.readBytes('file.bin');
```

**Returns**: Array of bytes (0-255)

---

### File Writing

#### `writeText(path: string, content: string, encoding?: string, mode?: number): void`

Write text to file (creates or overwrites).

```typescript
// Write text file
FileSystem.writeText('output.txt', 'Hello, World!');

// Write JSON configuration
const config = '{"version": 1, "debug": false}';
FileSystem.writeText('config.json', config);

// Async version
await FileSystemAsync.writeText('data.txt', 'Async write!');
```

**Parameters**:
- `path`: File path
- `content`: Text content to write
- `encoding`: Encoding (optional)
- `mode`: POSIX file permissions (optional, Unix/Linux only)

---

#### `writeBytes(path: string, data: Array<number>, mode?: number): void`

Write byte array to file.

```typescript
// Write binary data
const data: Array<number> = [0x89, 0x50, 0x4E, 0x47]; // PNG header
FileSystem.writeBytes('header.bin', data);

// Async version
await FileSystemAsync.writeBytes('output.bin', data);
```

---

#### `appendText(path: string, content: string, encoding?: string, mode?: number): void`

Append text to file (creates if doesn't exist).

```typescript
// Append to log file
FileSystem.appendText('app.log', '[INFO] Application started\n');
FileSystem.appendText('app.log', '[INFO] Processing data\n');

// Async version
await FileSystemAsync.appendText('log.txt', 'New entry\n');
```

---

### File Existence & Info

#### `exists(path: string): boolean`

Check if file or directory exists.

```typescript
// Check if file exists
if (FileSystem.exists('config.json')) {
  console.log('Config file found');
}

// Check if directory exists
if (!FileSystem.exists('data')) {
  FileSystem.mkdir('data');
}

// Async version
const exists = await FileSystemAsync.exists('file.txt');
```

---

#### `stat(path: string): FileInfo`

Get file information (metadata).

```typescript
// Get file info
const info = FileSystem.stat('data.txt');
console.log(`Size: ${info.size} bytes`);
console.log(`Type: ${info.type}`); // FileType.File, FileType.Directory, etc.
console.log(`Modified: ${info.modified}`); // Unix timestamp (ms)

// Async version
const info = await FileSystemAsync.stat('file.txt');
```

**Returns**: `FileInfo` object with:
- `path: string` - Full path
- `type: FileType` - File type enum
- `size: number` - Size in bytes
- `modified: number` - Last modified time (Unix timestamp in milliseconds)

---

#### `isFile(path: string): boolean`

Check if path is a regular file.

```typescript
if (FileSystem.isFile('data.txt')) {
  console.log('It is a file');
}

// Async version
const isFile = await FileSystemAsync.isFile('path');
```

---

#### `isDirectory(path: string): boolean`

Check if path is a directory.

```typescript
if (FileSystem.isDirectory('src')) {
  console.log('It is a directory');
}

// Async version
const isDir = await FileSystemAsync.isDirectory('path');
```

---

### Directory Operations

#### `mkdir(path: string, mode?: number): void`

Create directory (fails if parent doesn't exist).

```typescript
// Create directory
FileSystem.mkdir('data');
FileSystem.mkdir('logs');

// With permissions (Unix/Linux)
FileSystem.mkdir('secure', 0o700); // rwx------

// Async version
await FileSystemAsync.mkdir('output');
```

**Throws**: `Error` if parent directory doesn't exist

---

#### `mkdirRecursive(path: string, mode?: number): void`

Create directory recursively (like `mkdir -p`).

```typescript
// Create nested directories
FileSystem.mkdirRecursive('data/cache/images');
FileSystem.mkdirRecursive('logs/2025/12');

// Async version
await FileSystemAsync.mkdirRecursive('a/b/c/d');
```

---

#### `readDir(path: string, recursive?: boolean): Array<string>`

List directory contents.

```typescript
// List files in directory
const files = FileSystem.readDir('data');
for (const file of files) {
  console.log(file);
}

// Recursive listing
const allFiles = FileSystem.readDir('src', true);

// Async version
const files = await FileSystemAsync.readDir('.');
```

**Parameters**:
- `path`: Directory path
- `recursive`: Include subdirectories (default: false)

**Returns**: Array of filenames/paths

---

### File & Directory Deletion

#### `remove(path: string): void`

Delete file or empty directory.

```typescript
// Delete file
FileSystem.remove('temp.txt');

// Delete empty directory
FileSystem.remove('empty-dir');

// Async version
await FileSystemAsync.remove('old-file.txt');
```

**Note**: Fails if directory is not empty

---

#### `removeRecursive(path: string): void`

Delete directory and all contents (like `rm -rf`).

```typescript
// Delete directory tree
FileSystem.removeRecursive('temp-files');
FileSystem.removeRecursive('old-cache');

// Async version
await FileSystemAsync.removeRecursive('to-delete');
```

**Warning**: This permanently deletes everything in the directory!

---

### File Operations

#### `copy(source: string, destination: string): void`

Copy file or directory.

```typescript
// Copy file
FileSystem.copy('original.txt', 'backup.txt');

// Copy directory
FileSystem.copy('src', 'src-backup');

// Async version
await FileSystemAsync.copy('file.txt', 'file-copy.txt');
```

---

#### `move(source: string, destination: string): void`

Move or rename file/directory.

```typescript
// Rename file
FileSystem.move('old-name.txt', 'new-name.txt');

// Move to different directory
FileSystem.move('temp/file.txt', 'data/file.txt');

// Async version
await FileSystemAsync.move('src.txt', 'dest.txt');
```

---

### Path Utilities

#### `cwd(): string`

Get current working directory.

```typescript
const currentDir = FileSystem.cwd();
console.log(`Working directory: ${currentDir}`);

// Async version
const dir = await FileSystemAsync.cwd();
```

---

#### `absolute(path: string): string`

Convert relative path to absolute path.

```typescript
// Get absolute path
const absPath = FileSystem.absolute('data/config.json');
console.log(`Absolute: ${absPath}`);

// Async version
const abs = await FileSystemAsync.absolute('./file.txt');
```

---

## FileType Enum

```typescript
enum FileType {
  File,       // Regular file
  Directory,  // Directory
  Symlink,    // Symbolic link
  Unknown     // Unknown type
}
```

**Usage**:

```typescript
const info = FileSystem.stat('path');
if (info.type === FileType.File) {
  console.log('It is a file');
} else if (info.type === FileType.Directory) {
  console.log('It is a directory');
}
```

---

## FileInfo Interface

```typescript
interface FileInfo {
  path: string;        // Full path
  type: FileType;      // File type
  size: number;        // Size in bytes (integer)
  modified: number;    // Last modified time (Unix timestamp in ms)
}
```

---

## Common Patterns

### Configuration File Management

```typescript
interface Config {
  version: number;
  debug: boolean;
}

function loadConfig(path: string): Config | null {
  if (!FileSystem.exists(path)) {
    return null;
  }
  const content = FileSystem.readText(path);
  // Use JSON.parse() when available
  return { version: 1, debug: false };
}

function saveConfig(path: string, config: Config): void {
  // Use JSON.stringify() when available
  const content = `{"version":${config.version},"debug":${config.debug}}`;
  FileSystem.writeText(path, content);
}
```

### Log File Management

```typescript
function log(message: string): void {
  const logPath = 'app.log';
  const timestamp = Date.now();
  const entry = `[${timestamp}] ${message}\n`;
  
  if (!FileSystem.exists(logPath)) {
    FileSystem.writeText(logPath, '=== Log Started ===\n');
  }
  
  FileSystem.appendText(logPath, entry);
}
```

### Directory Processing

```typescript
async function processDirectory(dir: string): Promise<void> {
  const files = await FileSystemAsync.readDir(dir);
  
  for (const file of files) {
    const path = `${dir}/${file}`;
    const info = await FileSystemAsync.stat(path);
    
    if (info.type === FileType.File) {
      const content = await FileSystemAsync.readText(path);
      console.log(`Processing: ${file} (${content.length} chars)`);
    } else if (info.type === FileType.Directory) {
      await processDirectory(path); // Recursive
    }
  }
}
```

### Backup Utility

```typescript
async function backupFiles(sourceDir: string, backupDir: string): Promise<void> {
  // Create backup directory
  if (!await FileSystemAsync.exists(backupDir)) {
    await FileSystemAsync.mkdir(backupDir);
  }
  
  // Copy all files
  const files = await FileSystemAsync.readDir(sourceDir);
  for (const file of files) {
    const src = `${sourceDir}/${file}`;
    const dest = `${backupDir}/${file}`;
    await FileSystemAsync.copy(src, dest);
    console.log(`Backed up: ${file}`);
  }
}
```

---

## Error Handling

All file operations throw `Error` on failure:

```typescript
function safeRead(path: string): string | null {
  try {
    return FileSystem.readText(path);
  } catch (e) {
    console.log(`Failed to read ${path}: ${e}`);
    return null;
  }
}

async function safeReadAsync(path: string): Promise<string | null> {
  try {
    return await FileSystemAsync.readText(path);
  } catch (e) {
    console.log(`Failed to read ${path}: ${e}`);
    return null;
  }
}
```

---

## Performance Considerations

### When to Use Sync vs Async

**Use `FileSystem` (sync) when**:
- Simple scripts or tools
- Sequential operations where order matters
- Small files that read/write quickly
- Code simplicity is more important than performance

**Use `FileSystemAsync` (async) when**:
- I/O-heavy applications
- Processing many files
- Large files (> 1MB)
- Server applications or long-running processes
- You need non-blocking I/O

### Example: Sync vs Async

```typescript
// Synchronous (blocks until complete)
function syncProcess(): void {
  const file1 = FileSystem.readText('file1.txt'); // Blocks
  const file2 = FileSystem.readText('file2.txt'); // Blocks
  const file3 = FileSystem.readText('file3.txt'); // Blocks
  // Total time: T1 + T2 + T3
}

// Asynchronous (non-blocking)
async function asyncProcess(): Promise<void> {
  const file1 = await FileSystemAsync.readText('file1.txt');
  const file2 = await FileSystemAsync.readText('file2.txt');
  const file3 = await FileSystemAsync.readText('file3.txt');
  // Can interleave with other async operations
  // Better responsiveness in concurrent applications
}
```

---

## Implementation Details

### C++ Backend

Both `FileSystem` and `FileSystemAsync` map to C++ classes in the runtime:

```cpp
// Generated C++ code
gs::FileSystem::readText(gs::String("file.txt"));
gs::FileSystemAsync::readText(gs::String("file.txt")); // Returns cppcoro::task<gs::String>
```

### Runtime Library

- **Location**: `runtime/cpp/ownership/gs_filesystem.hpp`
- **Size**: ~700 lines of C++ code
- **Dependencies**: C++17 `<filesystem>`, cppcoro (for async)
- **Cross-platform**: POSIX (Linux, macOS) and Windows (Win32 API)

### Async Implementation

`FileSystemAsync` methods return `Promise<T>` in GoodScript, which compile to `cppcoro::task<T>` in C++:

```typescript
// GoodScript
const content = await FileSystemAsync.readText('file.txt');

// Generated C++
auto content = co_await gs::FileSystemAsync::readText(gs::String("file.txt"));
```

**Note**: Current async implementation wraps sync operations in coroutines. True async I/O (io_uring, IOCP) is planned for future releases.

---

## Platform Differences

### File Permissions (Unix/Linux vs Windows)

The `mode` parameter is only meaningful on Unix/Linux systems:

```typescript
// Unix/Linux: Sets file permissions
FileSystem.writeText('file.txt', 'data', undefined, 0o644); // rw-r--r--

// Windows: Mode parameter is ignored
```

### Path Separators

Use forward slashes `/` for cross-platform compatibility. GoodScript handles conversion automatically:

```typescript
// ✅ Cross-platform (recommended)
FileSystem.readText('data/config.json');

// ⚠️ Windows-only (not recommended)
FileSystem.readText('data\\config.json');
```

---

## Testing

The FileSystem API includes comprehensive tests:

- **Test file**: `test/filesystem.test.ts`
- **Coverage**: 9 tests covering sync, async, and combined usage
- **Status**: ✅ All tests passing

Example tests:
```typescript
describe('FileSystem Built-in', () => {
  it('should generate code for FileSystem.readText()', () => {
    const source = `const content = FileSystem.readText('file.txt');`;
    // Verifies correct C++ code generation
  });
  
  it('should generate code for FileSystemAsync.readText()', () => {
    const source = `
      async function read(): Promise<string> {
        return await FileSystemAsync.readText('file.txt');
      }
    `;
    // Verifies async/await and Promise<T> handling
  });
});
```

---

## Limitations & Future Work

### Current Limitations

1. **No streaming**: Files are read/written entirely in memory
2. **No file watchers**: Cannot monitor files for changes
3. **Async is pseudo-async**: Wraps sync operations (not true async I/O)
4. **No advanced permissions**: Limited ACL support

### Planned Enhancements

- **File streams**: For large files (> 100MB)
- **File watchers**: inotify (Linux), FSEvents (macOS), ReadDirectoryChangesW (Windows)
- **True async I/O**: io_uring (Linux), IOCP (Windows)
- **Advanced permissions**: Full ACL support
- **Symbolic link handling**: Follow/no-follow options
- **File locking**: Cooperative locking for concurrent access

---

## Migration from Node.js

If you're familiar with Node.js `fs` module:

| Node.js | GoodScript |
|---------|-----------|
| `fs.existsSync(path)` | `FileSystem.exists(path)` |
| `fs.readFileSync(path, 'utf8')` | `FileSystem.readText(path)` |
| `fs.writeFileSync(path, data)` | `FileSystem.writeText(path, data)` |
| `fs.appendFileSync(path, data)` | `FileSystem.appendText(path, data)` |
| `fs.mkdirSync(path)` | `FileSystem.mkdir(path)` |
| `fs.mkdirSync(path, {recursive: true})` | `FileSystem.mkdirRecursive(path)` |
| `fs.readdirSync(path)` | `FileSystem.readDir(path)` |
| `fs.unlinkSync(path)` | `FileSystem.remove(path)` |
| `fs.rmSync(path, {recursive: true})` | `FileSystem.removeRecursive(path)` |
| `fs.copyFileSync(src, dest)` | `FileSystem.copy(src, dest)` |
| `fs.renameSync(old, new)` | `FileSystem.move(old, new)` |
| `fs.statSync(path)` | `FileSystem.stat(path)` |
| `fs.promises.readFile(path, 'utf8')` | `FileSystemAsync.readText(path)` |
| `fs.promises.writeFile(path, data)` | `FileSystemAsync.writeText(path, data)` |

---

## Complete Example

See `examples/filesystem-demo-gs.ts` for a comprehensive demonstration including:

- Basic file operations (read, write, append)
- Directory management (create, list, traverse)
- Configuration file handling
- Log file management
- File processing pipelines
- Backup utilities
- Error handling patterns

---

## Related Documentation

- **ASYNC-AWAIT-GUIDE.md**: Async/await and Promise<T> guide
- **STDLIB-REQUIREMENTS.md**: Standard library requirements
- **PHASE-7B2-FILESYSTEM-PLAN.md**: FileSystem implementation plan

---

**Last Updated**: December 9, 2025  
**Status**: Production ready ✅
