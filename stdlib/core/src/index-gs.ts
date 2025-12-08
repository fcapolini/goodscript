/**
 * @goodscript/core - Core Types & Collections
 * 
 * GoodScript standard library module providing utilities for:
 * - Array operations with dual error handling
 * - Map and Set utilities
 * - String parsing with fallible operations
 * 
 * All fallible operations follow the dual-API pattern:
 * - `operation()` throws on error
 * - `tryOperation()` returns null on error
 */

export { ArrayTools } from './array-tools-gs.js';
export { MapTools } from './map-tools-gs.js';
export { SetTools } from './set-tools-gs.js';
export { StringTools } from './string-tools-gs.js';
