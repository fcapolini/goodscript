/**
 * Identifier Handler
 * 
 * Handles identifier expressions with special cases for:
 * - Special identifiers (undefined, NaN, Infinity, String)
 * - Hoisted functions
 * - Unwrapped optionals
 * - Smart pointer dereferencing
 */

import * as ts from 'typescript';
import * as ast from '../ast';
import { cpp } from '../builder';
import * as cppUtils from '../cpp-utils';
import { TransformContext } from '../transform-context';

export class IdentifierHandler {
  constructor(
    private ctx: TransformContext
  ) {}

  /**
   * Handle identifier expressions
   */
  handleIdentifier(node: ts.Identifier): ast.Expression {
    const varName = node.text;
    
    // Handle special identifiers
    if (varName === 'undefined') {
      return cpp.id('std::nullopt');
    }
    
    // Handle global constants
    if (varName === 'NaN') {
      return cpp.id('gs::Number::NaN');
    }
    if (varName === 'Infinity') {
      return cpp.id('gs::Number::Infinity');
    }
    
    // Handle global types/objects
    if (varName === 'String') {
      return cpp.id('gs::String');
    }
    
    const escapedName = cppUtils.escapeName(varName);
    
    // Check local variables FIRST (shadowing takes precedence)
    // If this is a local variable (parameter, local declaration, etc.), use it as-is
    if (this.ctx.variableTypes.has(escapedName) || 
        this.ctx.variableTypes.has(`this.${escapedName}`)) {
      // If this identifier is tracked as unwrapped
      if (this.ctx.unwrappedOptionals.has(escapedName)) {
        return this.handleUnwrappedOptional(escapedName);
      }
      return cpp.id(escapedName);
    }
    
    // If this is a hoisted function (and NOT a local variable), qualify with gs::
    if (this.ctx.hoistedFunctions.has(escapedName)) {
      return cpp.id(`gs::${escapedName}`);
    }
    
    // If this identifier is tracked as unwrapped
    if (this.ctx.unwrappedOptionals.has(escapedName)) {
      return this.handleUnwrappedOptional(escapedName);
    }
    
    return cpp.id(escapedName);
  }

  /**
   * Handle unwrapped optional identifiers (inside null checks)
   */
  private handleUnwrappedOptional(escapedName: string): ast.Expression {
    // Check if it's a smart pointer null check (compared with nullptr)
    // Smart pointers don't need unwrapping - they're already usable
    if (this.ctx.smartPointerNullChecks.has(escapedName)) {
      return cpp.id(escapedName);
    }
    
    // Check if it's a smart pointer type (shared_ptr, unique_ptr, weak_ptr)
    const varType = this.ctx.variableTypes.get(escapedName);
    if (varType && cppUtils.isSmartPointerType(varType)) {
      // Smart pointers don't need unwrapping - they're already usable
      // Just return the identifier (nullptr check passed, so it's safe to use)
      return cpp.id(escapedName);
    }
    
    // For raw pointers (from Map.get() on non-smart-pointer values)
    if (this.ctx.pointerVariables.has(escapedName)) {
      // Dereference the pointer
      return cpp.unary('*', cpp.id(escapedName));
    }
    
    // For std::optional types
    return cpp.id(`${escapedName}.value()`);
  }
}
