/**
 * GoodScript Type Definitions
 * 
 * Core type aliases for GoodScript's ownership system and integer types.
 * Import these types in your -gs.ts files for type-safe GoodScript code.
 * 
 * @example
 * ```typescript
 * import type { own, share, use, integer, integer53 } from 'goodscript';
 * 
 * function fibonacci(n: integer): integer {
 *   if (n <= 1) return n;
 *   return fibonacci(n - 1) + fibonacci(n - 2);
 * }
 * 
 * class Node {
 *   value: integer;
 *   next: share<Node> | null;
 * }
 * ```
 */

/**
 * Unique ownership type - exclusive access to a value
 * 
 * In C++ mode: Compiles to std::unique_ptr<T> (ownership mode) or T* (GC mode)
 * In JS/TS mode: Type alias for T (ownership enforced by compiler)
 * 
 * Use `own<T>` when:
 * - Only one reference should exist at a time
 * - You need exclusive access (no sharing)
 * - Ownership should be transferred (move semantics)
 * 
 * @example
 * ```typescript
 * let buffer: own<ArrayBuffer> = new ArrayBuffer(1024);
 * // Only one owner at a time, transferred via assignment
 * ```
 */
export type own<T> = T;

/**
 * Shared ownership type - reference counted
 * 
 * In C++ mode: Compiles to std::shared_ptr<T> (ownership mode) or T* (GC mode)
 * In JS/TS mode: Type alias for T (semantics enforced by compiler)
 * 
 * Use `share<T>` when:
 * - Multiple references need to access the same data
 * - Lifetime is shared between multiple owners
 * 
 * Note: In ownership mode, `share<T>` must form a DAG (no cycles).
 * 
 * @example
 * ```typescript
 * let config: share<Config> = getConfig();
 * // Multiple references can share ownership
 * ```
 */
export type share<T> = T;

/**
 * Borrowed reference type - non-owning pointer
 * 
 * In C++ mode: Compiles to T* (raw pointer, non-owning)
 * In JS/TS mode: Type alias for T (semantics enforced by compiler)
 * 
 * Use `use<T>` when:
 * - You need temporary access without ownership
 * - Function parameter that borrows data
 * - Must not outlive the owner
 * 
 * @example
 * ```typescript
 * function process(data: use<Buffer>): void {
 *   // Borrow data temporarily, don't take ownership
 * }
 * ```
 */
export type use<T> = T;

/**
 * 32-bit signed integer type
 * 
 * In C++ mode: Compiles to int32_t
 * In JS/TS mode: Type alias for number (semantics not enforced)
 * 
 * Range: -2,147,483,648 to 2,147,483,647
 * 
 * Use `integer` when:
 * - You need integer arithmetic (no fractional values)
 * - Values fit within 32-bit range
 * - Performance is important (smaller than number/double)
 * 
 * @example
 * ```typescript
 * let count: integer = 42;
 * let index: integer = 0;
 * ```
 */
export type integer = number;

/**
 * 53-bit signed integer type (JavaScript safe integer range)
 * 
 * In C++ mode: Compiles to int64_t
 * In JS/TS mode: Type alias for number (semantics not enforced)
 * 
 * Range: -9,007,199,254,740,991 to 9,007,199,254,740,991 (Number.MAX_SAFE_INTEGER)
 * 
 * Use `integer53` when:
 * - You need integers larger than 32-bit but within JS safe range
 * - Cross-platform compatibility with JavaScript is important
 * - Values exceed integer range but don't need BigInt
 * 
 * Note: For values beyond this range, use BigInt explicitly.
 * 
 * @example
 * ```typescript
 * let timestamp: integer53 = Date.now();
 * let id: integer53 = 9007199254740991;
 * ```
 */
export type integer53 = number;

// Re-export runtime type definitions
export * from './runtime.js';
