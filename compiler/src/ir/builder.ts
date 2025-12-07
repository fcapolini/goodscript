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
  Ownership,
  PrimitiveType,
} from './types.js';

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

  array(element: IRType, ownership: Ownership): IRType {
    return { kind: 'array', element, ownership };
  },

  nullable(inner: IRType): IRType {
    return { kind: 'nullable', inner };
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

  move(source: IRExpr, type: IRType): IRExpr {
    return { kind: 'move', source, type };
  },

  borrow(source: IRExpr, type: IRType): IRExpr {
    return { kind: 'borrow', source, type };
  },
};
