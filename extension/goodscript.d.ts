/**
 * GoodScript built-in type definitions
 * Phase 1: Strict TypeScript subset ("The Good Parts")
 */

/// <reference lib="es2020" />

/**
 * Console interface for output
 */
declare const console: {
  log(...args: any[]): void;
  error(...args: any[]): void;
  warn(...args: any[]): void;
};
