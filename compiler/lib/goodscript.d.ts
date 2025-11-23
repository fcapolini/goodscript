/**
 * GoodScript built-in type definitions
 * These types are recognized by the GoodScript compiler
 */

/**
 * Exclusive ownership qualifier - indicates a variable exclusively owns a value
 * Maps to std::unique_ptr<T> in C++
 */
declare type own<T> = T;

/**
 * Shared ownership qualifier - indicates a variable shares a value with others
 * This contributes to reference counting
 * Maps to std::shared_ptr<T> in C++
 */
declare type share<T> = T;

/**
 * Non-owning reference qualifier - indicates a variable uses a value it doesn't own
 * Use references are implicitly nullable (can be null or undefined)
 * GoodScript treats null and undefined as synonyms
 * Maps to std::weak_ptr<T> in C++
 */
declare type use<T> = T | null | undefined;

/**
 * Console interface for output
 */
// declare const console: {
//   log(...args: any[]): void;
//   error(...args: any[]): void;
//   warn(...args: any[]): void;
// };
