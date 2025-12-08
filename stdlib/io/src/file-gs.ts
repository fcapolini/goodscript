import * as fs from 'node:fs';

/**
 * File operations with dual error handling pattern.
 * 
 * Note: In the future, this will dispatch to backend-specific implementations:
 * - Haxe backend → sys.io.File
 * - C++ backend → custom implementation
 * 
 * Current implementation uses Node.js fs module for development.
 */
export class File {
  /**
   * Read file as UTF-8 text. Throws on error.
   */
  static readText(path: string): string {
    const result = File.tryReadText(path);
    if (result === null) {
      throw new Error(`Failed to read file: ${path}`);
    }
    return result;
  }

  /**
   * Read file as UTF-8 text. Returns null on error.
   */
  static tryReadText(path: string): string | null {
    try {
      return fs.readFileSync(path, 'utf-8');
    } catch {
      return null;
    }
  }

  /**
   * Read file as bytes. Throws on error.
   */
  static readBytes(path: string): Uint8Array {
    const result = File.tryReadBytes(path);
    if (result === null) {
      throw new Error(`Failed to read file: ${path}`);
    }
    return result;
  }

  /**
   * Read file as bytes. Returns null on error.
   */
  static tryReadBytes(path: string): Uint8Array | null {
    try {
      return new Uint8Array(fs.readFileSync(path));
    } catch {
      return null;
    }
  }

  /**
   * Write text to file. Throws on error.
   */
  static writeText(path: string, content: string): void {
    if (!File.tryWriteText(path, content)) {
      throw new Error(`Failed to write file: ${path}`);
    }
  }

  /**
   * Write text to file. Returns false on error.
   */
  static tryWriteText(path: string, content: string): boolean {
    try {
      fs.writeFileSync(path, content, 'utf-8');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Write bytes to file. Throws on error.
   */
  static writeBytes(path: string, data: Uint8Array): void {
    if (!File.tryWriteBytes(path, data)) {
      throw new Error(`Failed to write file: ${path}`);
    }
  }

  /**
   * Write bytes to file. Returns false on error.
   */
  static tryWriteBytes(path: string, data: Uint8Array): boolean {
    try {
      fs.writeFileSync(path, data);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Append text to file. Throws on error.
   */
  static appendText(path: string, content: string): void {
    if (!File.tryAppendText(path, content)) {
      throw new Error(`Failed to append to file: ${path}`);
    }
  }

  /**
   * Append text to file. Returns false on error.
   */
  static tryAppendText(path: string, content: string): boolean {
    try {
      fs.appendFileSync(path, content, 'utf-8');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if file exists.
   */
  static exists(path: string): boolean {
    try {
      return fs.existsSync(path) && fs.statSync(path).isFile();
    } catch {
      return false;
    }
  }

  /**
   * Delete file. Throws on error.
   */
  static remove(path: string): void {
    if (!File.tryRemove(path)) {
      throw new Error(`Failed to remove file: ${path}`);
    }
  }

  /**
   * Delete file. Returns false on error.
   */
  static tryRemove(path: string): boolean {
    try {
      fs.unlinkSync(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file size in bytes. Throws on error.
   */
  static size(path: string): number {
    const result = File.trySize(path);
    if (result === null) {
      throw new Error(`Failed to get file size: ${path}`);
    }
    return result;
  }

  /**
   * Get file size in bytes. Returns null on error.
   */
  static trySize(path: string): number | null {
    try {
      return fs.statSync(path).size;
    } catch {
      return null;
    }
  }
}
