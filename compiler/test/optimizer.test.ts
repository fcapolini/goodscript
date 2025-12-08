/**
 * Optimizer Tests
 */

import { describe, it, expect } from 'vitest';
import { Optimizer } from '../src/optimizer/optimizer.js';
import { types, exprs } from '../src/ir/builder.js';
import type {
  IRProgram,
  IRModule,
  IRFunctionDecl,
  IRBlock,
  IRExpr,
  BinaryOp,
  UnaryOp,
} from '../src/ir/types.js';

function createTestProgram(func: IRFunctionDecl): IRProgram {
  const module: IRModule = {
    path: 'test.gs',
    declarations: [func],
    imports: [],
  };

  return {
    modules: [module],
  };
}

function createBlock(id: number, instructions: any[], terminator: any): IRBlock {
  return { id, instructions, terminator };
}

describe('Optimizer - Constant Folding', () => {
  const optimizer = new Optimizer();

  it('should fold numeric addition', () => {
    const left = exprs.literal(2, types.number());
    const right = exprs.literal(3, types.number());
    const add: IRExpr = {
      kind: 'binary',
      op: '+' as BinaryOp,
      left,
      right,
      type: types.number(),
    };

    const body = createBlock(
      0,
      [],
      { kind: 'return', value: add }
    );

    const func: IRFunctionDecl = {
      kind: 'function',
      name: 'test',
      params: [],
      returnType: types.number(),
      body,
    };

    const program = createTestProgram(func);
    const optimized = optimizer.optimize(program, 1);

    const optimizedFunc = optimized.modules[0].declarations[0] as IRFunctionDecl;
    const returnValue = optimizedFunc.body.terminator.kind === 'return'
      ? optimizedFunc.body.terminator.value
      : undefined;

    expect(returnValue).toBeDefined();
    expect(returnValue?.kind).toBe('literal');
    if (returnValue?.kind === 'literal') {
      expect(returnValue.value).toBe(5);
    }
  });

  it('should fold numeric subtraction', () => {
    const expr: IRExpr = {
      kind: 'binary',
      op: '-' as BinaryOp,
      left: exprs.literal(10, types.number()),
      right: exprs.literal(3, types.number()),
      type: types.number(),
    };

    const body = createBlock(0, [], { kind: 'return', value: expr });
    const func: IRFunctionDecl = {
      kind: 'function',
      name: 'test',
      params: [],
      returnType: types.number(),
      body,
    };

    const program = createTestProgram(func);
    const optimized = optimizer.optimize(program, 1);

    const optimizedFunc = optimized.modules[0].declarations[0] as IRFunctionDecl;
    const returnValue = optimizedFunc.body.terminator.kind === 'return'
      ? optimizedFunc.body.terminator.value
      : undefined;

    expect(returnValue?.kind).toBe('literal');
    if (returnValue?.kind === 'literal') {
      expect(returnValue.value).toBe(7);
    }
  });

  it('should fold numeric multiplication', () => {
    const expr: IRExpr = {
      kind: 'binary',
      op: '*' as BinaryOp,
      left: exprs.literal(4, types.number()),
      right: exprs.literal(5, types.number()),
      type: types.number(),
    };

    const body = createBlock(0, [], { kind: 'return', value: expr });
    const func: IRFunctionDecl = {
      kind: 'function',
      name: 'test',
      params: [],
      returnType: types.number(),
      body,
    };

    const program = createTestProgram(func);
    const optimized = optimizer.optimize(program, 1);

    const optimizedFunc = optimized.modules[0].declarations[0] as IRFunctionDecl;
    const returnValue = optimizedFunc.body.terminator.kind === 'return'
      ? optimizedFunc.body.terminator.value
      : undefined;

    expect(returnValue?.kind).toBe('literal');
    if (returnValue?.kind === 'literal') {
      expect(returnValue.value).toBe(20);
    }
  });

  it('should fold numeric division', () => {
    const expr: IRExpr = {
      kind: 'binary',
      op: '/' as BinaryOp,
      left: exprs.literal(15, types.number()),
      right: exprs.literal(3, types.number()),
      type: types.number(),
    };

    const body = createBlock(0, [], { kind: 'return', value: expr });
    const func: IRFunctionDecl = {
      kind: 'function',
      name: 'test',
      params: [],
      returnType: types.number(),
      body,
    };

    const program = createTestProgram(func);
    const optimized = optimizer.optimize(program, 1);

    const optimizedFunc = optimized.modules[0].declarations[0] as IRFunctionDecl;
    const returnValue = optimizedFunc.body.terminator.kind === 'return'
      ? optimizedFunc.body.terminator.value
      : undefined;

    expect(returnValue?.kind).toBe('literal');
    if (returnValue?.kind === 'literal') {
      expect(returnValue.value).toBe(5);
    }
  });

  it('should fold string concatenation', () => {
    const expr: IRExpr = {
      kind: 'binary',
      op: '+' as BinaryOp,
      left: exprs.literal('Hello', types.string()),
      right: exprs.literal(' World', types.string()),
      type: types.string(),
    };

    const body = createBlock(0, [], { kind: 'return', value: expr });
    const func: IRFunctionDecl = {
      kind: 'function',
      name: 'test',
      params: [],
      returnType: types.string(),
      body,
    };

    const program = createTestProgram(func);
    const optimized = optimizer.optimize(program, 1);

    const optimizedFunc = optimized.modules[0].declarations[0] as IRFunctionDecl;
    const returnValue = optimizedFunc.body.terminator.kind === 'return'
      ? optimizedFunc.body.terminator.value
      : undefined;

    expect(returnValue?.kind).toBe('literal');
    if (returnValue?.kind === 'literal') {
      expect(returnValue.value).toBe('Hello World');
    }
  });

  it('should fold boolean AND', () => {
    const expr: IRExpr = {
      kind: 'binary',
      op: '&&' as BinaryOp,
      left: exprs.literal(true, types.boolean()),
      right: exprs.literal(false, types.boolean()),
      type: types.boolean(),
    };

    const body = createBlock(0, [], { kind: 'return', value: expr });
    const func: IRFunctionDecl = {
      kind: 'function',
      name: 'test',
      params: [],
      returnType: types.boolean(),
      body,
    };

    const program = createTestProgram(func);
    const optimized = optimizer.optimize(program, 1);

    const optimizedFunc = optimized.modules[0].declarations[0] as IRFunctionDecl;
    const returnValue = optimizedFunc.body.terminator.kind === 'return'
      ? optimizedFunc.body.terminator.value
      : undefined;

    expect(returnValue?.kind).toBe('literal');
    if (returnValue?.kind === 'literal') {
      expect(returnValue.value).toBe(false);
    }
  });

  it('should fold boolean OR', () => {
    const expr: IRExpr = {
      kind: 'binary',
      op: '||' as BinaryOp,
      left: exprs.literal(true, types.boolean()),
      right: exprs.literal(false, types.boolean()),
      type: types.boolean(),
    };

    const body = createBlock(0, [], { kind: 'return', value: expr });
    const func: IRFunctionDecl = {
      kind: 'function',
      name: 'test',
      params: [],
      returnType: types.boolean(),
      body,
    };

    const program = createTestProgram(func);
    const optimized = optimizer.optimize(program, 1);

    const optimizedFunc = optimized.modules[0].declarations[0] as IRFunctionDecl;
    const returnValue = optimizedFunc.body.terminator.kind === 'return'
      ? optimizedFunc.body.terminator.value
      : undefined;

    expect(returnValue?.kind).toBe('literal');
    if (returnValue?.kind === 'literal') {
      expect(returnValue.value).toBe(true);
    }
  });

  it('should fold unary negation', () => {
    const expr: IRExpr = {
      kind: 'unary',
      op: '-' as UnaryOp,
      operand: exprs.literal(42, types.number()),
      type: types.number(),
    };

    const body = createBlock(0, [], { kind: 'return', value: expr });
    const func: IRFunctionDecl = {
      kind: 'function',
      name: 'test',
      params: [],
      returnType: types.number(),
      body,
    };

    const program = createTestProgram(func);
    const optimized = optimizer.optimize(program, 1);

    const optimizedFunc = optimized.modules[0].declarations[0] as IRFunctionDecl;
    const returnValue = optimizedFunc.body.terminator.kind === 'return'
      ? optimizedFunc.body.terminator.value
      : undefined;

    expect(returnValue?.kind).toBe('literal');
    if (returnValue?.kind === 'literal') {
      expect(returnValue.value).toBe(-42);
    }
  });

  it('should fold unary NOT', () => {
    const expr: IRExpr = {
      kind: 'unary',
      op: '!' as UnaryOp,
      operand: exprs.literal(true, types.boolean()),
      type: types.boolean(),
    };

    const body = createBlock(0, [], { kind: 'return', value: expr });
    const func: IRFunctionDecl = {
      kind: 'function',
      name: 'test',
      params: [],
      returnType: types.boolean(),
      body,
    };

    const program = createTestProgram(func);
    const optimized = optimizer.optimize(program, 1);

    const optimizedFunc = optimized.modules[0].declarations[0] as IRFunctionDecl;
    const returnValue = optimizedFunc.body.terminator.kind === 'return'
      ? optimizedFunc.body.terminator.value
      : undefined;

    expect(returnValue?.kind).toBe('literal');
    if (returnValue?.kind === 'literal') {
      expect(returnValue.value).toBe(false);
    }
  });

  it('should fold nested expressions', () => {
    // (2 + 3) * 4 = 20
    const inner: IRExpr = {
      kind: 'binary',
      op: '+' as BinaryOp,
      left: exprs.literal(2, types.number()),
      right: exprs.literal(3, types.number()),
      type: types.number(),
    };

    const outer: IRExpr = {
      kind: 'binary',
      op: '*' as BinaryOp,
      left: inner,
      right: exprs.literal(4, types.number()),
      type: types.number(),
    };

    const body = createBlock(0, [], { kind: 'return', value: outer });
    const func: IRFunctionDecl = {
      kind: 'function',
      name: 'test',
      params: [],
      returnType: types.number(),
      body,
    };

    const program = createTestProgram(func);
    const optimized = optimizer.optimize(program, 1);

    const optimizedFunc = optimized.modules[0].declarations[0] as IRFunctionDecl;
    const returnValue = optimizedFunc.body.terminator.kind === 'return'
      ? optimizedFunc.body.terminator.value
      : undefined;

    expect(returnValue?.kind).toBe('literal');
    if (returnValue?.kind === 'literal') {
      expect(returnValue.value).toBe(20);
    }
  });

  it('should fold comparison operators', () => {
    const expr: IRExpr = {
      kind: 'binary',
      op: '<' as BinaryOp,
      left: exprs.literal(5, types.number()),
      right: exprs.literal(10, types.number()),
      type: types.boolean(),
    };

    const body = createBlock(0, [], { kind: 'return', value: expr });
    const func: IRFunctionDecl = {
      kind: 'function',
      name: 'test',
      params: [],
      returnType: types.boolean(),
      body,
    };

    const program = createTestProgram(func);
    const optimized = optimizer.optimize(program, 1);

    const optimizedFunc = optimized.modules[0].declarations[0] as IRFunctionDecl;
    const returnValue = optimizedFunc.body.terminator.kind === 'return'
      ? optimizedFunc.body.terminator.value
      : undefined;

    expect(returnValue?.kind).toBe('literal');
    if (returnValue?.kind === 'literal') {
      expect(returnValue.value).toBe(true);
    }
  });

  it('should not fold expressions with variables', () => {
    const variable: IRExpr = {
      kind: 'variable',
      name: 'x',
      version: 0,
      type: types.number(),
    };

    const expr: IRExpr = {
      kind: 'binary',
      op: '+' as BinaryOp,
      left: variable,
      right: exprs.literal(5, types.number()),
      type: types.number(),
    };

    const body = createBlock(0, [], { kind: 'return', value: expr });
    const func: IRFunctionDecl = {
      kind: 'function',
      name: 'test',
      params: [],
      returnType: types.number(),
      body,
    };

    const program = createTestProgram(func);
    const optimized = optimizer.optimize(program, 1);

    const optimizedFunc = optimized.modules[0].declarations[0] as IRFunctionDecl;
    const returnValue = optimizedFunc.body.terminator.kind === 'return'
      ? optimizedFunc.body.terminator.value
      : undefined;

    // Should remain a binary expression
    expect(returnValue?.kind).toBe('binary');
  });
});

describe('Optimizer - Control Flow', () => {
  const optimizer = new Optimizer();

  it('should simplify branch with constant true condition', () => {
    const body = createBlock(
      0,
      [],
      {
        kind: 'branch',
        condition: exprs.literal(true, types.boolean()),
        trueBranch: 1,
        falseBranch: 2,
      }
    );

    const func: IRFunctionDecl = {
      kind: 'function',
      name: 'test',
      params: [],
      returnType: types.void(),
      body,
    };

    const program = createTestProgram(func);
    const optimized = optimizer.optimize(program, 1);

    const optimizedFunc = optimized.modules[0].declarations[0] as IRFunctionDecl;
    const terminator = optimizedFunc.body.terminator;

    expect(terminator.kind).toBe('jump');
    if (terminator.kind === 'jump') {
      expect(terminator.target).toBe(1);
    }
  });

  it('should simplify branch with constant false condition', () => {
    const body = createBlock(
      0,
      [],
      {
        kind: 'branch',
        condition: exprs.literal(false, types.boolean()),
        trueBranch: 1,
        falseBranch: 2,
      }
    );

    const func: IRFunctionDecl = {
      kind: 'function',
      name: 'test',
      params: [],
      returnType: types.void(),
      body,
    };

    const program = createTestProgram(func);
    const optimized = optimizer.optimize(program, 1);

    const optimizedFunc = optimized.modules[0].declarations[0] as IRFunctionDecl;
    const terminator = optimizedFunc.body.terminator;

    expect(terminator.kind).toBe('jump');
    if (terminator.kind === 'jump') {
      expect(terminator.target).toBe(2);
    }
  });
});

describe('Optimizer - Multiple Passes', () => {
  const optimizer = new Optimizer();

  it('should perform multiple optimization passes', () => {
    // !!true should fold to true in two passes
    const inner: IRExpr = {
      kind: 'unary',
      op: '!' as UnaryOp,
      operand: exprs.literal(true, types.boolean()),
      type: types.boolean(),
    };

    const outer: IRExpr = {
      kind: 'unary',
      op: '!' as UnaryOp,
      operand: inner,
      type: types.boolean(),
    };

    const body = createBlock(0, [], { kind: 'return', value: outer });
    const func: IRFunctionDecl = {
      kind: 'function',
      name: 'test',
      params: [],
      returnType: types.boolean(),
      body,
    };

    const program = createTestProgram(func);
    const optimized = optimizer.optimize(program, 1);

    const optimizedFunc = optimized.modules[0].declarations[0] as IRFunctionDecl;
    const returnValue = optimizedFunc.body.terminator.kind === 'return'
      ? optimizedFunc.body.terminator.value
      : undefined;

    expect(returnValue?.kind).toBe('literal');
    if (returnValue?.kind === 'literal') {
      expect(returnValue.value).toBe(true);
    }
  });
});
