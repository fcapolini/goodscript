/**
 * GoodScript Global Type Definitions
 * 
 * Include this file in your tsconfig.json to make GoodScript types
 * available globally (no imports needed):
 * 
 * ```json
 * {
 *   "include": [
 *     "src/**/*",
 *     "node_modules/goodscript/types/globals.d.ts"
 *   ]
 * }
 * ```
 * 
 * Then use types without imports:
 * 
 * ```typescript
 * // No imports needed!
 * function fibonacci(n: integer): integer {
 *   // ...
 * }
 * 
 * let buffer: own<ArrayBuffer> = new ArrayBuffer(1024);
 * ```
 */

declare global {
  /**
   * Unique ownership type - exclusive access
   * @see {import('./index.js').own}
   */
  type own<T> = T;

  /**
   * Shared ownership type - reference counted
   * @see {import('./index.js').share}
   */
  type share<T> = T;

  /**
   * Borrowed reference type - non-owning pointer
   * @see {import('./index.js').use}
   */
  type use<T> = T;

  /**
   * 32-bit signed integer type
   * @see {import('./index.js').integer}
   */
  type integer = number;

  /**
   * 53-bit signed integer type (JavaScript safe integer range)
   * @see {import('./index.js').integer53}
   */
  type integer53 = number;
}

export {};
