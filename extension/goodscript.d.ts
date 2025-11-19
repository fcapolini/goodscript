/**
 * GoodScript built-in type definitions
 * These types are recognized by the GoodScript compiler
 */

/// <reference lib="es2020" />

/**
 * Exclusive Ownership type - indicates a variable exclusively owns a value
 */
declare type unique<T> = T;

/**
 * Shared Ownership type - indicates a variable potentially shares a value
 * This contributes to reference counting
 */
declare type shared<T> = T;

/**
 * Weak Reference type - indicates a variable uses a value it doesn't own
 * Weak references are implicitly nullable (can be null or undefined)
 * GoodScript treats null and undefined as synonyms
 */
declare type weak<T> = T | null | undefined;

/**
 * Console interface for output
 */
declare const console: {
  log(...args: any[]): void;
  error(...args: any[]): void;
  warn(...args: any[]): void;
};
