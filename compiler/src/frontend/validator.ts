/**
 * Validator
 * 
 * Phase 1: TypeScript "Good Parts" validation
 */

import ts from 'typescript';
import type { Diagnostic } from '../types.js';

export class Validator {
  validate(sourceFile: ts.SourceFile): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    // TODO: Implement validation rules
    // - No var
    // - No == (only ===)
    // - No for-in
    // - No eval/with
    // - Arrow functions only
    // etc.

    return diagnostics;
  }
}
