/**
 * Main entry point for GoodScript compiler library
 */

export { Compiler, CompileOptions, CompileResult } from './compiler';
export { Parser } from './parser';
export { OwnershipAnalyzer } from './ownership-analyzer';
export { Validator } from './validator';
export { TypeScriptCodegen } from './ts-codegen';
export { CppCodegen } from './cpp/codegen';
export {
  OwnershipKind,
  OwnershipInfo,
  OwnershipGraph,
  OwnershipEdge,
  SourceLocation,
  Diagnostic,
  ValidationResult,
} from './types';
