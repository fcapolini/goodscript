/**
 * IR Builder
 * 
 * Fluent API for constructing IR nodes
 */

import type {
  IRType,
  IRExpr,
  IRVariable,
  IRBlock,
  IRInstruction,
  IRTerminator,
  BinaryOp,
  UnaryOp,
  IRStatement,
  IRExpression,
} from './types.js';
import { PrimitiveType, Ownership } from './types.js';

/**
 * Fluent builder for IR construction
 */
export class IRBuilder {
  private blockCounter = 0;
  private variableVersions = new Map<string, number>();

  /**
   * Create a new basic block
   */
  block(instructions: IRInstruction[], terminator: IRTerminator): IRBlock {
    return {
      id: this.blockCounter++,
      instructions,
      terminator,
    };
  }

  /**
   * Create a new SSA variable version
   */
  variable(name: string, type: IRType): IRVariable {
    const version = this.variableVersions.get(name) ?? 0;
    this.variableVersions.set(name, version + 1);
    
    return {
      kind: 'variable',
      name,
      version,
      type,
    };
  }

  /**
   * Reset variable versions (for new function scope)
   */
  resetVersions(): void {
    this.variableVersions.clear();
  }
}

// ============================================================================
// Type Constructors
// ============================================================================

export const types = {
  primitive(type: PrimitiveType): IRType {
    return { kind: 'primitive', type };
  },

  number(): IRType {
    return { kind: 'primitive', type: PrimitiveType.Number };
  },

  integer(): IRType {
    return { kind: 'primitive', type: PrimitiveType.Integer };
  },

  integer53(): IRType {
    return { kind: 'primitive', type: PrimitiveType.Integer53 };
  },

  string(): IRType {
    return { kind: 'primitive', type: PrimitiveType.String };
  },

  boolean(): IRType {
    return { kind: 'primitive', type: PrimitiveType.Boolean };
  },

  void(): IRType {
    return { kind: 'primitive', type: PrimitiveType.Void };
  },

  class(name: string, ownership: Ownership, typeArgs?: IRType[]): IRType {
    return { kind: 'class', name, ownership, typeArgs };
  },

  array(element: IRType, ownership?: Ownership): IRType {
    return { kind: 'array', element, ownership: ownership ?? Ownership.Value };
  },

  map(key: IRType, value: IRType, ownership?: Ownership): IRType {
    return { kind: 'map', key, value, ownership: ownership ?? Ownership.Value };
  },

  nullable(inner: IRType): IRType {
    return { kind: 'nullable', inner };
  },

  union(types: IRType[]): IRType {
    return { kind: 'union', types };
  },

  function(params: IRType[], returnType: IRType): IRType {
    return { kind: 'function', params, returnType };
  },
};

// ============================================================================
// Expression Constructors
// ============================================================================

export const expr = {
  literal(value: number | string | boolean | null, type: IRType): IRExpr {
    return { kind: 'literal', value, type };
  },

  binary(op: BinaryOp, left: IRExpr, right: IRExpr, type: IRType): IRExpr {
    return { kind: 'binary', op, left, right, type };
  },

  unary(op: UnaryOp, operand: IRExpr, type: IRType): IRExpr {
    return { kind: 'unary', op, operand, type };
  },

  member(object: IRExpr, member: string, type: IRType): IRExpr {
    return { kind: 'member', object, member, type };
  },

  index(object: IRExpr, index: IRExpr, type: IRType): IRExpr {
    return { kind: 'index', object, index, type };
  },

  call(callee: IRExpr, args: IRExpr[], type: IRType): IRExpr {
    return { kind: 'callExpr', callee, args, type };
  },

  new(className: string, args: IRExpr[], type: IRType): IRExpr {
    return { kind: 'new', className, args, type };
  },

  array(elements: IRExpr[], type: IRType): IRExpr {
    return { kind: 'array', elements, type };
  },

  move(source: IRExpr, type: IRType): IRExpr {
    return { kind: 'move', source, type };
  },

  borrow(source: IRExpr, type: IRType): IRExpr {
    return { kind: 'borrow', source, type };
  },

  variable(name: string, version: number, type: IRType): IRExpr {
    return { kind: 'variable', name, version, type };
  },

  fieldAccess(object: IRExpr, field: string, type: IRType): IRExpr {
    return { kind: 'member', object, member: field, type };
  },
};

/**
 * Expression builders (for AST-level IR)
 */
export const exprs = {
  literal(value: number | string | boolean | null, type: IRType, location?: { line: number; column: number }): IRExpression {
    return { kind: 'literal', value, type, location };
  },

  identifier(name: string, type: IRType, location?: { line: number; column: number }): IRExpression {
    return { kind: 'identifier', name, type, location };
  },

  binary(operator: BinaryOp, left: IRExpression, right: IRExpression, type: IRType, location?: { line: number; column: number }): IRExpression {
    return { kind: 'binary', operator, left, right, type, location };
  },

  unary(operator: UnaryOp, operand: IRExpression, type: IRType, location?: { line: number; column: number }): IRExpression {
    return { kind: 'unary', operator, operand, type, location };
  },

  call(callee: IRExpression, args: IRExpression[], type: IRType, location?: { line: number; column: number }): IRExpression {
    return { kind: 'call', callee, arguments: args, type, location };
  },

  memberAccess(object: IRExpression, member: string, type: IRType, location?: { line: number; column: number }): IRExpression {
    return { kind: 'memberAccess', object, member, type, location };
  },

  indexAccess(object: IRExpression, index: IRExpression, type: IRType, location?: { line: number; column: number }): IRExpression {
    return { kind: 'indexAccess', object, index, type, location };
  },

  assignment(left: IRExpression, right: IRExpression, type: IRType, location?: { line: number; column: number }): IRExpression {
    return { kind: 'assignment', left, right, type, location };
  },

  arrayLiteral(elements: IRExpression[], type: IRType, location?: { line: number; column: number }): IRExpression {
    return { kind: 'arrayLiteral', elements, type, location };
  },

  objectLiteral(properties: Array<{ key: string; value: IRExpression }>, type: IRType, location?: { line: number; column: number }): IRExpression {
    return { kind: 'objectLiteral', properties, type, location };
  },
};

/**
 * Statement builders (for AST-level IR)
 */
export const stmts = {
  variableDeclaration(
    name: string,
    variableType: IRType,
    initializer?: IRExpression,
    location?: { line: number; column: number }
  ): IRStatement {
    return {
      kind: 'variableDeclaration',
      name,
      variableType,
      initializer,
      location,
    };
  },

  return(value?: IRExpression, location?: { line: number; column: number }): IRStatement {
    return {
      kind: 'return',
      value,
      location,
    };
  },

  expressionStatement(expression: IRExpression, location?: { line: number; column: number }): IRStatement {
    return {
      kind: 'expressionStatement',
      expression,
      location,
    };
  },

  if(
    condition: IRExpression,
    thenBranch: IRStatement[],
    elseBranch?: IRStatement[],
    location?: { line: number; column: number }
  ): IRStatement {
    return {
      kind: 'if',
      condition,
      thenBranch,
      elseBranch,
      location,
    };
  },

  while(
    condition: IRExpression,
    body: IRStatement[],
    location?: { line: number; column: number }
  ): IRStatement {
    return {
      kind: 'while',
      condition,
      body,
      location,
    };
  },

  for(
    initializer: IRStatement | undefined,
    condition: IRExpression | undefined,
    increment: IRExpression | undefined,
    body: IRStatement[],
    location?: { line: number; column: number }
  ): IRStatement {
    return {
      kind: 'for',
      initializer,
      condition,
      increment,
      body,
      location,
    };
  },

  block(statements: IRStatement[], location?: { line: number; column: number }): IRStatement {
    return {
      kind: 'block',
      statements,
      location,
    };
  },
};

