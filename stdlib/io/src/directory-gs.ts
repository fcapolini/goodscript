import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Directory operations with async/sync dual API pattern.
 * 
 * Default operations are asynchronous (non-blocking, Promise-based).
 * Synchronous operations use 'sync' prefix (blocking).
 */
export class Directory {
  // ============================================================
  // EXISTS (Sync-only - no blocking benefit from async)
  // ============================================================

  /**
   * Check if directory exists. (Synchronous only)
   */
  static exists(dirPath: string): boolean {
    try {
      return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
    } catch {
      return false;
    }
  }

  // ============================================================
  // CREATE
  // ============================================================

  /**
   * Create directory. Non-blocking, rejects on error.
   * Creates parent directories as needed.
   */
  static async create(dirPath: string): Promise<void> {
    const success = await Directory.tryCreate(dirPath);
    if (!success) {
      throw new Error(`Failed to create directory: ${dirPath}`);
    }
  }

  /**
   * Create directory. Non-blocking, returns false on error.
   * Creates parent directories as needed.
   */
  static async tryCreate(dirPath: string): Promise<boolean> {
    try {
      await fs.promises.mkdir(dirPath, { recursive: true });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create directory. Blocks, throws on error.
   * Creates parent directories as needed.
   */
  static syncCreate(dirPath: string): void {
    if (!Directory.trySyncCreate(dirPath)) {
      throw new Error(`Failed to create directory: ${dirPath}`);
    }
  }

  /**
   * Create directory. Blocks, returns false on error.
   * Creates parent directories as needed.
   */
  static trySyncCreate(dirPath: string): boolean {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      return true;
    } catch {
      return false;
    }
  }

  // ============================================================
  // REMOVE
  // ============================================================

  /**
   * Remove directory. Non-blocking, rejects on error.
   */
  static async remove(dirPath: string, recursive: boolean = false): Promise<void> {
    const success = await Directory.tryRemove(dirPath, recursive);
    if (!success) {
      throw new Error(`Failed to remove directory: ${dirPath}`);
    }
  }

  /**
   * Remove directory. Non-blocking, returns false on error.
   */
  static async tryRemove(dirPath: string, recursive: boolean = false): Promise<boolean> {
    try {
      if (!Directory.exists(dirPath)) {
        return false;
      }
      if (recursive) {
        await fs.promises.rm(dirPath, { recursive: true });
      } else {
        await fs.promises.rmdir(dirPath);
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Remove directory. Blocks, throws on error.
   */
  static syncRemove(dirPath: string, recursive: boolean = false): void {
    if (!Directory.trySyncRemove(dirPath, recursive)) {
      throw new Error(`Failed to remove directory: ${dirPath}`);
    }
  }

  /**
   * Remove directory. Blocks, returns false on error.
   */
  static trySyncRemove(dirPath: string, recursive: boolean = false): boolean {
    try {
      if (!Directory.exists(dirPath)) {
        return false;
      }
      if (recursive) {
        fs.rmSync(dirPath, { recursive: true });
      } else {
        fs.rmdirSync(dirPath);
      }
      return true;
    } catch {
      return false;
    }
  }

  // ============================================================
  // LIST
  // ============================================================

  /**
   * List directory contents. Non-blocking, rejects on error.
   * Returns array of filenames (not full paths).
   */
  static async list(dirPath: string): Promise<Array<string>> {
    const result = await Directory.tryList(dirPath);
    if (result === null) {
      throw new Error(`Failed to list directory: ${dirPath}`);
    }
    return result;
  }

  /**
   * List directory contents. Non-blocking, returns null on error.
   * Returns array of filenames (not full paths).
   */
  static async tryList(dirPath: string): Promise<Array<string> | null> {
    try {
      return await fs.promises.readdir(dirPath);
    } catch {
      return null;
    }
  }

  /**
   * List directory contents. Blocks, throws on error.
   * Returns array of filenames (not full paths).
   */
  static syncList(dirPath: string): Array<string> {
    const result = Directory.trySyncList(dirPath);
    if (result === null) {
      throw new Error(`Failed to list directory: ${dirPath}`);
    }
    return result;
  }

  /**
   * List directory contents. Blocks, returns null on error.
   * Returns array of filenames (not full paths).
   */
  static trySyncList(dirPath: string): Array<string> | null {
    try {
      return fs.readdirSync(dirPath);
    } catch {
      return null;
    }
  }

  // ============================================================
  // LIST PATHS
  // ============================================================

  /**
   * List directory contents with full paths. Non-blocking, rejects on error.
   */
  static async listPaths(dirPath: string): Promise<Array<string>> {
    const entries = await Directory.list(dirPath);
    return entries.map(entry => path.join(dirPath, entry));
  }

  /**
   * List directory contents with full paths. Non-blocking, returns null on error.
   */
  static async tryListPaths(dirPath: string): Promise<Array<string> | null> {
    const entries = await Directory.tryList(dirPath);
    if (entries === null) {
      return null;
    }
    return entries.map(entry => path.join(dirPath, entry));
  }

  /**
   * List directory contents with full paths. Blocks, throws on error.
   */
  static syncListPaths(dirPath: string): Array<string> {
    const entries = Directory.syncList(dirPath);
    return entries.map(entry => path.join(dirPath, entry));
  }

  /**
   * List directory contents with full paths. Blocks, returns null on error.
   */
  static trySyncListPaths(dirPath: string): Array<string> | null {
    const entries = Directory.trySyncList(dirPath);
    if (entries === null) {
      return null;
    }
    return entries.map(entry => path.join(dirPath, entry));
  }

  // ============================================================
  // LIST FILES
  // ============================================================

  /**
   * List only files in directory (exclude subdirectories). Non-blocking, rejects on error.
   */
  static async listFiles(dirPath: string): Promise<Array<string>> {
    const entries = await Directory.listPaths(dirPath);
    const filtered: Array<string> = [];
    for (const entry of entries) {
      try {
        const stats = await fs.promises.stat(entry);
        if (stats.isFile()) {
          filtered.push(entry);
        }
      } catch {
        // Skip entries that can't be stat'd
      }
    }
    return filtered;
  }

  /**
   * List only files in directory (exclude subdirectories). Blocks, throws on error.
   */
  static syncListFiles(dirPath: string): Array<string> {
    const entries = Directory.syncListPaths(dirPath);
    return entries.filter(entry => {
      try {
        return fs.statSync(entry).isFile();
      } catch {
        return false;
      }
    });
  }

  // ============================================================
  // LIST DIRECTORIES
  // ============================================================

  /**
   * List only subdirectories in directory (exclude files). Non-blocking, rejects on error.
   */
  static async listDirectories(dirPath: string): Promise<Array<string>> {
    const entries = await Directory.listPaths(dirPath);
    const filtered: Array<string> = [];
    for (const entry of entries) {
      try {
        const stats = await fs.promises.stat(entry);
        if (stats.isDirectory()) {
          filtered.push(entry);
        }
      } catch {
        // Skip entries that can't be stat'd
      }
    }
    return filtered;
  }

  /**
   * List only subdirectories in directory (exclude files). Blocks, throws on error.
   */
  static syncListDirectories(dirPath: string): Array<string> {
    const entries = Directory.syncListPaths(dirPath);
    return entries.filter(entry => {
      try {
        return fs.statSync(entry).isDirectory();
      } catch {
        return false;
      }
    });
  }
}
