/**
 * GoodScript Compiler v0.12.0
 * 
 * Clean rewrite with proper IR-based architecture
 */

export * from './ir/index.js';
export * from './frontend/index.js';
export * from './backend/index.js';
export * from './optimizer/index.js';

// Main compiler API
export { compile } from './compiler.js';
export type { CompileOptions, CompileResult } from './types.js';
