/**
 * @goodscript/io - File System Operations
 * 
 * GoodScript standard library module providing:
 * - File read/write operations
 * - Directory operations
 * - Path utilities
 * 
 * All fallible operations follow the dual-API pattern:
 * - `operation()` throws on error
 * - `tryOperation()` returns null/false on error
 */

export { File } from './file-gs.js';
export { Directory } from './directory-gs.js';
export { Path } from './path-gs.js';
