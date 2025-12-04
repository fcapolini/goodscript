# Goodscript Filesystem API Reference

## Overview

Goodscript’s filesystem module is async-first, with synchronous variants suffixed by “Sync”. Semantics intentionally mirror Node.js, including the options object pattern for text encoding: `{ encoding?: string }`. The minimal core aims to cover common tasks; the extended set rounds out convenience and lower-level access.

---

## Minimal core (v1)

### Functions

- **readFile:**  
  `async readFile(path: string, options?: { encoding?: string }): Promise<string | Uint8Array>`  
  Reads entire file contents. If `options.encoding` is provided, returns a string; otherwise returns bytes.

- **readFileSync:**  
  `readFileSync(path: string, options?: { encoding?: string }): string | Uint8Array`  
  Synchronous variant.

- **writeFile:**  
  `async writeFile(path: string, data: string | Uint8Array, options?: { encoding?: string }): Promise<void>`  
  Writes data to a file, replacing contents. If `data` is a string, `options.encoding` applies (default “utf-8” if omitted).

- **writeFileSync:**  
  `writeFileSync(path: string, data: string | Uint8Array, options?: { encoding?: string }): void`  
  Synchronous variant.

- **stat:**  
  `async stat(path: string): Promise<FileStat>`  
  Returns metadata (size, times, permissions).

- **statSync:**  
  `statSync(path: string): FileStat`  
  Synchronous variant.

- **readdir:**  
  `async readdir(path: string): Promise<string[]>`  
  Lists directory entries.

- **readdirSync:**  
  `readdirSync(path: string): string[]`  
  Synchronous variant.

- **mkdir:**  
  `async mkdir(path: string): Promise<void>`  
  Creates a directory.

- **mkdirSync:**  
  `mkdirSync(path: string): void`  
  Synchronous variant.

- **unlink:**  
  `async unlink(path: string): Promise<void>`  
  Deletes a file.

- **unlinkSync:**  
  `unlinkSync(path: string): void`  
  Synchronous variant.

- **rmdir:**  
  `async rmdir(path: string): Promise<void>`  
  Deletes a directory.

- **rmdirSync:**  
  `rmdirSync(path: string): void`  
  Synchronous variant.

---

## Extended set (v2+)

- **appendFile:**  
  `async appendFile(path: string, data: string | Uint8Array, options?: { encoding?: string }): Promise<void>`  
  Appends data to end of file.

- **appendFileSync:**  
  `appendFileSync(path: string, data: string | Uint8Array, options?: { encoding?: string }): void`  
  Synchronous variant.

- **copyFile:**  
  `async copyFile(src: string, dest: string): Promise<void>`  
  Copies file contents.

- **copyFileSync:**  
  `copyFileSync(src: string, dest: string): void`  
  Synchronous variant.

- **rename:**  
  `async rename(oldPath: string, newPath: string): Promise<void>`  
  Renames or moves a file or directory.

- **renameSync:**  
  `renameSync(oldPath: string, newPath: string): void`  
  Synchronous variant.

- **exists:**  
  `async exists(path: string): Promise<boolean>`  
  Convenience existence check (does not throw).

- **existsSync:**  
  `existsSync(path: string): boolean`  
  Synchronous variant.

- **open:**  
  `async open(path: string, mode: "r" | "w" | "a"): Promise<FileHandle>`  
  Opens a file for streaming operations.

- **openSync:**  
  `openSync(path: string, mode: "r" | "w" | "a"): FileHandle`  
  Synchronous variant.

- **close:**  
  `async close(handle: FileHandle): Promise<void>`  
  Closes a file handle.

- **closeSync:**  
  `closeSync(handle: FileHandle): void`  
  Synchronous variant.

- **chmod:**  
  `async chmod(path: string, mode: number): Promise<void>`  
  Changes file permissions.

- **chmodSync:**  
  `chmodSync(path: string, mode: number): void`  
  Synchronous variant.

- **watch:**  
  `async watch(path: string, callback: (event: FileEvent) => void): Promise<Watcher>`  
  Watches a file or directory for changes.

---

## Types

### FileStat

```typescript
interface FileStat {
  size: number;      // bytes
  mtime: Date;       // modified time
  atime: Date;       // access time
  ctime: Date;       // change/creation time (platform-dependent)
  isFile: boolean;
  isDirectory: boolean;
  mode: number;      // permission bits (platform-dependent)
}
```

### FileHandle

```typescript
interface FileHandle {
  read(length: number, options?: { encoding?: string }): Promise<string | Uint8Array>;
  write(data: string | Uint8Array, options?: { encoding?: string }): Promise<void>;
  close(): Promise<void>;
}
```

### FileEvent

```typescript
type FileEvent =
  | { type: "create"; path: string }
  | { type: "modify"; path: string }
  | { type: "delete"; path: string }
  | { type: "rename"; oldPath: string; newPath: string };
```

### Watcher

```typescript
interface Watcher {
  stop(): void;
}
```

---

## Semantics and behavior

- **Async-first:** All primary APIs are asynchronous and return promises (or Goodscript’s async primitive).
- **Sync naming:** Blocking variants use the `Sync` suffix.
- **Encoding:** Pass `{ encoding: "<name>" }` to decode/encode strings. If omitted in `readFile`, bytes are returned. If `data` is a string, `writeFile` uses the specified encoding (default “utf-8”).
- **Errors:** Operations throw on error (e.g., not found, permission denied). `exists/existsSync` return booleans instead of throwing.
- **Paths:** Accept absolute or relative paths. Path normalization and platform differences should be documented separately.
- **Permissions:** `mode` is platform-dependent; Goodscript conveys it as a numeric bitfield for portability.

---

## Examples

```typescript
// Read text
const text = await fs.readFile("notes.txt", { encoding: "utf-8" });

// Read binary
const bin = await fs.readFile("image.png");

// Write text
await fs.writeFile("output.txt", "Hello, Goodscript!", { encoding: "utf-8" });

// Append
await fs.appendFile("log.txt", "New entry\n", { encoding: "utf-8" });

// Stat
const info = await fs.stat("notes.txt");
print(`Size: ${info.size}, modified: ${info.mtime}`);

// List directory
const files = await fs.readdir(".");
for (const f of files) print(f);

// Rename
await fs.rename("old.txt", "new.txt");

// Copy
await fs.copyFile("source.bin", "dest.bin");

// Sync variant
const textSync = fs.readFileSync("notes.txt", { encoding: "utf-8" });
fs.writeFileSync("output.txt", "Sync write", { encoding: "utf-8" });
```
