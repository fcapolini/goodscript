import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Directory operations with dual error handling pattern.
 */
export class Directory {
  /**
   * Check if directory exists.
   */
  static exists(dirPath: string): boolean {
    try {
      return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Create directory. Throws on error.
   * Creates parent directories as needed.
   */
  static create(dirPath: string): void {
    if (!Directory.tryCreate(dirPath)) {
      throw new Error(`Failed to create directory: ${dirPath}`);
    }
  }

  /**
   * Create directory. Returns false on error.
   * Creates parent directories as needed.
   */
  static tryCreate(dirPath: string): boolean {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Remove directory. Throws on error.
   */
  static remove(dirPath: string, recursive: boolean = false): void {
    if (!Directory.tryRemove(dirPath, recursive)) {
      throw new Error(`Failed to remove directory: ${dirPath}`);
    }
  }

  /**
   * Remove directory. Returns false on error.
   */
  static tryRemove(dirPath: string, recursive: boolean = false): boolean {
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

  /**
   * List directory contents. Throws on error.
   * Returns array of filenames (not full paths).
   */
  static list(dirPath: string): Array<string> {
    const result = Directory.tryList(dirPath);
    if (result === null) {
      throw new Error(`Failed to list directory: ${dirPath}`);
    }
    return result;
  }

  /**
   * List directory contents. Returns null on error.
   * Returns array of filenames (not full paths).
   */
  static tryList(dirPath: string): Array<string> | null {
    try {
      return fs.readdirSync(dirPath);
    } catch {
      return null;
    }
  }

  /**
   * List directory contents with full paths. Throws on error.
   */
  static listPaths(dirPath: string): Array<string> {
    const entries = Directory.list(dirPath);
    return entries.map(entry => path.join(dirPath, entry));
  }

  /**
   * List directory contents with full paths. Returns null on error.
   */
  static tryListPaths(dirPath: string): Array<string> | null {
    const entries = Directory.tryList(dirPath);
    if (entries === null) {
      return null;
    }
    return entries.map(entry => path.join(dirPath, entry));
  }

  /**
   * List only files in directory (exclude subdirectories). Throws on error.
   */
  static listFiles(dirPath: string): Array<string> {
    const entries = Directory.listPaths(dirPath);
    return entries.filter(entry => {
      try {
        return fs.statSync(entry).isFile();
      } catch {
        return false;
      }
    });
  }

  /**
   * List only subdirectories in directory (exclude files). Throws on error.
   */
  static listDirectories(dirPath: string): Array<string> {
    const entries = Directory.listPaths(dirPath);
    return entries.filter(entry => {
      try {
        return fs.statSync(entry).isDirectory();
      } catch {
        return false;
      }
    });
  }
}
