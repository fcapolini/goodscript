import * as fs from 'node:fs';

/**
 * File operations with async/sync dual API pattern.
 * 
 * Default operations are asynchronous (non-blocking, Promise-based).
 * Synchronous operations use 'sync' prefix (blocking).
 * 
 * All fallible operations provide:
 * - `operation()` - async/sync, throws on error
 * - `tryOperation()` - async/sync, returns null on error
 * 
 * Note: In the future, this will dispatch to backend-specific implementations:
 * - TypeScript → fs.promises (async) / fs.*Sync (sync)
 * - Haxe backend → tink_core/thread pool (async) / sys.io.File (sync)
 * - C++ backend → cppcoro (async) / POSIX I/O (sync)
 */
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
  // READ BYTES
  // ============================================================

  /**
   * Read file as bytes. Non-blocking, rejects on error.
   */
  static async readBytes(path: string): Promise<Uint8Array> {
    const result = await File.tryReadBytes(path);
    if (result === null) {
      throw new Error(`Failed to read file: ${path}`);
    }
    return result;
  }

  /**
   * Read file as bytes. Non-blocking, returns null on error.
   */
  static async tryReadBytes(path: string): Promise<Uint8Array | null> {
    try {
      const buffer = await fs.promises.readFile(path);
      return new Uint8Array(buffer);
    } catch {
      return null;
    }
  }

  /**
   * Read file as bytes. Blocks, throws on error.
   */
  static syncReadBytes(path: string): Uint8Array {
    const result = File.trySyncReadBytes(path);
    if (result === null) {
      throw new Error(`Failed to read file: ${path}`);
    }
    return result;
  }

  /**
   * Read file as bytes. Blocks, returns null on error.
   */
  static trySyncReadBytes(path: string): Uint8Array | null {
    try {
      return new Uint8Array(fs.readFileSync(path));
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

  // ============================================================
  // WRITE BYTES
  // ============================================================

  /**
   * Write bytes to file. Non-blocking, rejects on error.
   */
  static async writeBytes(path: string, data: Uint8Array): Promise<void> {
    const success = await File.tryWriteBytes(path, data);
    if (!success) {
      throw new Error(`Failed to write file: ${path}`);
    }
  }

  /**
   * Write bytes to file. Non-blocking, returns false on error.
   */
  static async tryWriteBytes(path: string, data: Uint8Array): Promise<boolean> {
    try {
      await fs.promises.writeFile(path, data);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Write bytes to file. Blocks, throws on error.
   */
  static syncWriteBytes(path: string, data: Uint8Array): void {
    if (!File.trySyncWriteBytes(path, data)) {
      throw new Error(`Failed to write file: ${path}`);
    }
  }

  /**
   * Write bytes to file. Blocks, returns false on error.
   */
  static trySyncWriteBytes(path: string, data: Uint8Array): boolean {
    try {
      fs.writeFileSync(path, data);
      return true;
    } catch {
      return false;
    }
  }

  // ============================================================
  // APPEND TEXT
  // ============================================================

  /**
   * Append text to file. Non-blocking, rejects on error.
   */
  static async appendText(path: string, content: string): Promise<void> {
    const success = await File.tryAppendText(path, content);
    if (!success) {
      throw new Error(`Failed to append to file: ${path}`);
    }
  }

  /**
   * Append text to file. Non-blocking, returns false on error.
   */
  static async tryAppendText(path: string, content: string): Promise<boolean> {
    try {
      await fs.promises.appendFile(path, content, 'utf-8');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Append text to file. Blocks, throws on error.
   */
  static syncAppendText(path: string, content: string): void {
    if (!File.trySyncAppendText(path, content)) {
      throw new Error(`Failed to append to file: ${path}`);
    }
  }

  /**
   * Append text to file. Blocks, returns false on error.
   */
  static trySyncAppendText(path: string, content: string): boolean {
    try {
      fs.appendFileSync(path, content, 'utf-8');
      return true;
    } catch {
      return false;
    }
  }

  // ============================================================
  // REMOVE
  // ============================================================

  /**
   * Delete file. Non-blocking, rejects on error.
   */
  static async remove(path: string): Promise<void> {
    const success = await File.tryRemove(path);
    if (!success) {
      throw new Error(`Failed to remove file: ${path}`);
    }
  }

  /**
   * Delete file. Non-blocking, returns false on error.
   */
  static async tryRemove(path: string): Promise<boolean> {
    try {
      await fs.promises.unlink(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete file. Blocks, throws on error.
   */
  static syncRemove(path: string): void {
    if (!File.trySyncRemove(path)) {
      throw new Error(`Failed to remove file: ${path}`);
    }
  }

  /**
   * Delete file. Blocks, returns false on error.
   */
  static trySyncRemove(path: string): boolean {
    try {
      fs.unlinkSync(path);
      return true;
    } catch {
      return false;
    }
  }

  // ============================================================
  // EXISTS (Sync-only - no blocking benefit from async)
  // ============================================================

  /**
   * Check if file exists. (Synchronous only)
   */
  static exists(path: string): boolean {
    try {
      return fs.existsSync(path) && fs.statSync(path).isFile();
    } catch {
      return false;
    }
  }

  // ============================================================
  // SIZE
  // ============================================================

  /**
   * Get file size in bytes. Non-blocking, rejects on error.
   */
  static async size(path: string): Promise<number> {
    const result = await File.trySize(path);
    if (result === null) {
      throw new Error(`Failed to get file size: ${path}`);
    }
    return result;
  }

  /**
   * Get file size in bytes. Non-blocking, returns null on error.
   */
  static async trySize(path: string): Promise<number | null> {
    try {
      const stats = await fs.promises.stat(path);
      return stats.size;
    } catch {
      return null;
    }
  }

  /**
   * Get file size in bytes. Blocks, throws on error.
   */
  static syncSize(path: string): number {
    const result = File.trySyncSize(path);
    if (result === null) {
      throw new Error(`Failed to get file size: ${path}`);
    }
    return result;
  }

  /**
   * Get file size in bytes. Blocks, returns null on error.
   */
  static trySyncSize(path: string): number | null {
    try {
      return fs.statSync(path).size;
    } catch {
      return null;
    }
  }
}
