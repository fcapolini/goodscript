/**
 * Frontend: TypeScript → IR
 * 
 * - Parsing
 * - Validation (Phase 1)
 * - Ownership analysis (Phase 2)
 * - Lowering to IR
 */

export * from './parser.js';
export * from './validator.js';
export * from './ownership-analyzer.js';
export * from './null-checker.js';
export * from './lowering.js';
