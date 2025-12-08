/**
 * @goodscript/json - JSON Parsing and Serialization
 * 
 * GoodScript standard library module providing:
 * - Type-safe JSON parsing with discriminated unions
 * - JSON serialization
 * - Typed extraction helpers
 * 
 * All fallible operations follow the dual-API pattern:
 * - `operation()` throws on error
 * - `tryOperation()` returns null on error
 */

export { JSON, JsonTools } from './json-gs.js';
export type { JsonValue } from './json-gs.js';
