import * as path from 'node:path';

/**
 * Path manipulation utilities.
 * 
 * Note: In the future, this will dispatch to backend-specific implementations:
 * - Haxe backend → haxe.io.Path
 * - C++ backend → custom implementation
 * 
 * Current implementation uses Node.js path module for development.
 */
export class Path {
  /**
   * Join path segments.
   */
  static join(...parts: Array<string>): string {
    return path.join(...parts);
  }

  /**
   * Get directory name from path.
   */
  static dirname(filePath: string): string {
    return path.dirname(filePath);
  }

  /**
   * Get file name from path (including extension).
   */
  static basename(filePath: string): string {
    return path.basename(filePath);
  }

  /**
   * Get file extension (including dot, e.g., ".txt").
   */
  static extension(filePath: string): string {
    return path.extname(filePath);
  }

  /**
   * Normalize path (resolve .. and . segments).
   */
  static normalize(filePath: string): string {
    return path.normalize(filePath);
  }

  /**
   * Check if path is absolute.
   */
  static isAbsolute(filePath: string): boolean {
    return path.isAbsolute(filePath);
  }

  /**
   * Resolve path segments to absolute path.
   */
  static resolve(...paths: Array<string>): string {
    return path.resolve(...paths);
  }

  /**
   * Get relative path from 'from' to 'to'.
   */
  static relative(from: string, to: string): string {
    return path.relative(from, to);
  }

  /**
   * Get file name without extension.
   */
  static stem(filePath: string): string {
    const base = path.basename(filePath);
    const ext = path.extname(filePath);
    return ext ? base.slice(0, -ext.length) : base;
  }

  /**
   * Replace extension in path.
   */
  static withExtension(filePath: string, newExt: string): string {
    const dir = path.dirname(filePath);
    const stem = Path.stem(filePath);
    const ext = newExt.startsWith('.') ? newExt : `.${newExt}`;
    return path.join(dir, stem + ext);
  }

  /**
   * Split path into array of segments.
   */
  static segments(filePath: string): Array<string> {
    const normalized = path.normalize(filePath);
    return normalized.split(path.sep).filter(s => s !== '');
  }

  /**
   * Get path separator for current platform.
   */
  static get separator(): string {
    return path.sep;
  }

  /**
   * Get path delimiter for current platform (used in PATH env var).
   */
  static get delimiter(): string {
    return path.delimiter;
  }
}
