/**
 * GoodScript Runtime API Type Definitions
 * 
 * TypeScript declarations for GoodScript's built-in runtime APIs.
 * These are implemented in C++ (compiler/runtime/cpp/) but exposed here
 * for TypeScript type checking and IDE autocomplete.
 */

// =============================================================================
// Console API
// =============================================================================

/**
 * Console logging interface
 * 
 * Provides TypeScript-compatible console output methods.
 * 
 * @example
 * ```typescript
 * console.log("Hello, world!");
 * console.error("Something went wrong");
 * console.warn("Deprecation notice");
 * ```
 */
export declare class console {
  /**
   * Print message to stdout with newline
   */
  static log(...args: unknown[]): void;
  
  /**
   * Print error message to stderr with newline
   */
  static error(...args: unknown[]): void;
  
  /**
   * Print warning message to stderr with newline
   */
  static warn(...args: unknown[]): void;
  
  /**
   * Print info message to stdout with newline
   */
  static info(...args: unknown[]): void;
  
  /**
   * Print debug message to stdout with newline
   */
  static debug(...args: unknown[]): void;
}

// =============================================================================
// Math API
// =============================================================================

/**
 * Mathematical functions and constants
 * 
 * Provides TypeScript-compatible Math API.
 * 
 * @example
 * ```typescript
 * const area = Math.PI * Math.pow(radius, 2);
 * const distance = Math.sqrt(dx * dx + dy * dy);
 * ```
 */
export declare class Math {
  // Constants
  static readonly E: number;
  static readonly LN2: number;
  static readonly LN10: number;
  static readonly LOG2E: number;
  static readonly LOG10E: number;
  static readonly PI: number;
  static readonly SQRT1_2: number;
  static readonly SQRT2: number;

  // Basic functions
  static abs(x: number): number;
  static ceil(x: number): number;
  static floor(x: number): number;
  static round(x: number): number;
  static trunc(x: number): number;
  static sign(x: number): number;

  // Min/Max
  static min(...values: number[]): number;
  static max(...values: number[]): number;

  // Power and exponential
  static sqrt(x: number): number;
  static cbrt(x: number): number;
  static pow(base: number, exponent: number): number;
  static exp(x: number): number;
  static expm1(x: number): number;

  // Logarithm
  static log(x: number): number;
  static log10(x: number): number;
  static log2(x: number): number;
  static log1p(x: number): number;

  // Trigonometric
  static sin(x: number): number;
  static cos(x: number): number;
  static tan(x: number): number;
  static asin(x: number): number;
  static acos(x: number): number;
  static atan(x: number): number;
  static atan2(y: number, x: number): number;

  // Hyperbolic
  static sinh(x: number): number;
  static cosh(x: number): number;
  static tanh(x: number): number;
  static asinh(x: number): number;
  static acosh(x: number): number;
  static atanh(x: number): number;

  // Random
  static random(): number;
}

// =============================================================================
// JSON API
// =============================================================================

/**
 * JSON serialization
 * 
 * Provides JSON.stringify() for basic types.
 * Note: Full JSON.parse() support coming in future release.
 * 
 * @example
 * ```typescript
 * const json = JSON.stringify({ name: "Alice", age: 30 });
 * console.log(json); // {"name":"Alice","age":30}
 * ```
 */
export declare class JSON {
  /**
   * Convert value to JSON string
   * 
   * Currently supports: number, string, boolean, null
   * Object and array support coming soon.
   */
  static stringify(value: unknown): string;
}

// =============================================================================
// FileSystem API
// =============================================================================

/**
 * File statistics structure
 */
export interface FileStat {
  size: number;
  isFile: boolean;
  isDirectory: boolean;
  modified: number;
}

/**
 * FileSystem - Synchronous filesystem operations
 * 
 * Cross-platform file I/O API (blocking operations).
 * 
 * @example
 * ```typescript
 * if (FileSystem.exists("data.txt")) {
 *   const content = FileSystem.readText("data.txt");
 *   console.log(content);
 * }
 * 
 * FileSystem.writeText("output.txt", "Hello, world!");
 * ```
 */
export declare class FileSystem {
  /**
   * Check if path exists
   */
  static exists(path: string): boolean;

  /**
   * Read entire file as text (UTF-8 by default)
   */
  static readText(path: string, encoding?: string): string;

  /**
   * Write text to file (UTF-8 by default, creates/overwrites)
   */
  static writeText(path: string, content: string, encoding?: string, mode?: number): void;

  /**
   * Append text to file (UTF-8 by default)
   */
  static appendText(path: string, content: string, encoding?: string, mode?: number): void;

  /**
   * Read entire file as bytes
   */
  static readBytes(path: string): Uint8Array;

  /**
   * Write bytes to file (creates/overwrites)
   */
  static writeBytes(path: string, data: Uint8Array, mode?: number): void;

  /**
   * Delete file or empty directory
   */
  static remove(path: string): void;

  /**
   * Delete directory and all contents recursively
   */
  static removeRecursive(path: string): void;

  /**
   * Create directory (and parent directories if needed)
   */
  static mkdir(path: string, recursive?: boolean): void;

  /**
   * List directory contents (returns file/directory names)
   */
  static readDir(path: string): string[];

  /**
   * Get file/directory statistics
   */
  static stat(path: string): FileStat;

  /**
   * Copy file or directory
   */
  static copy(source: string, destination: string): void;

  /**
   * Move/rename file or directory
   */
  static move(source: string, destination: string): void;
}

/**
 * FileSystemAsync - Asynchronous filesystem operations
 * 
 * Cross-platform async file I/O API (non-blocking operations).
 * All methods return Promise<T>.
 * 
 * @example
 * ```typescript
 * async function processFile() {
 *   const exists = await FileSystemAsync.exists("data.txt");
 *   if (exists) {
 *     const content = await FileSystemAsync.readText("data.txt");
 *     console.log(content);
 *   }
 * }
 * ```
 */
export declare class FileSystemAsync {
  static exists(path: string): Promise<boolean>;
  static readText(path: string, encoding?: string): Promise<string>;
  static writeText(path: string, content: string, encoding?: string, mode?: number): Promise<void>;
  static appendText(path: string, content: string, encoding?: string, mode?: number): Promise<void>;
  static readBytes(path: string): Promise<Uint8Array>;
  static writeBytes(path: string, data: Uint8Array, mode?: number): Promise<void>;
  static remove(path: string): Promise<void>;
  static removeRecursive(path: string): Promise<void>;
  static mkdir(path: string, recursive?: boolean): Promise<void>;
  static readDir(path: string): Promise<string[]>;
  static stat(path: string): Promise<FileStat>;
  static copy(source: string, destination: string): Promise<void>;
  static move(source: string, destination: string): Promise<void>;
}

// =============================================================================
// HTTP Client API
// =============================================================================

/**
 * HTTP Response structure
 */
export interface HttpResponse {
  status: number;
  statusText: string;
  headers: Map<string, string>;
  body: string;
}

/**
 * HTTP - Synchronous HTTP client
 * 
 * Provides blocking HTTP/HTTPS requests.
 * 
 * @example
 * ```typescript
 * const response = HTTP.syncFetch("https://api.example.com/data");
 * console.log(`Status: ${response.status}`);
 * console.log(`Body: ${response.body}`);
 * ```
 */
export declare class HTTP {
  /**
   * Perform synchronous HTTP GET request
   */
  static syncFetch(url: string): HttpResponse;

  /**
   * Perform synchronous HTTP POST request
   */
  static post(url: string, body: string, contentType: string): HttpResponse;
}

/**
 * HTTPAsync - Asynchronous HTTP client
 * 
 * Provides non-blocking HTTP/HTTPS requests.
 * Uses thread pool for true async execution.
 * 
 * @example
 * ```typescript
 * async function fetchData() {
 *   const response = await HTTPAsync.fetch("https://api.example.com/data");
 *   console.log(`Status: ${response.status}`);
 *   console.log(`Body: ${response.body}`);
 * }
 * ```
 */
export declare class HTTPAsync {
  /**
   * Perform asynchronous HTTP GET request
   */
  static fetch(url: string): Promise<HttpResponse>;

  /**
   * Perform asynchronous HTTP POST request
   */
  static post(url: string, body: string, contentType: string): Promise<HttpResponse>;
}
