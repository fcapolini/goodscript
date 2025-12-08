/**
 * Basic Infrastructure Tests
 * 
 * Verify that the compiler infrastructure is working
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../src/compiler.js';
import { IRBuilder, types, expr } from '../src/ir/builder.js';
import { BinaryOp, Ownership } from '../src/ir/types.js';

describe('Compiler Infrastructure', () => {
  it('should compile with empty input', async () => {
    const result = await compile({
      files: [],
      target: 'cpp',
    });

    expect(result.success).toBe(true);
    expect(result.diagnostics).toEqual([]);
  });

  it('should handle validation errors gracefully', async () => {
    const result = await compile({
      files: [],
      target: 'cpp',
      mode: 'gc',
    });

    // Should succeed even with empty input
    expect(result.success).toBe(true);
  });
});

describe('IR Builder', () => {
  it('should create SSA variables', () => {
    const builder = new IRBuilder();
    
    const x0 = builder.variable('x', types.number());
    const x1 = builder.variable('x', types.number());
    const y0 = builder.variable('y', types.string());

    expect(x0.name).toBe('x');
    expect(x0.version).toBe(0);
    expect(x1.name).toBe('x');
    expect(x1.version).toBe(1);
    expect(y0.name).toBe('y');
    expect(y0.version).toBe(0);
  });

  it('should create type constructors', () => {
    const numType = types.number();
    expect(numType.kind).toBe('primitive');

    const classType = types.class('Person', Ownership.Own);
    expect(classType.kind).toBe('class');
    if (classType.kind === 'class') {
      expect(classType.name).toBe('Person');
      expect(classType.ownership).toBe(Ownership.Own);
    }

    const arrayType = types.array(types.number(), Ownership.Value);
    expect(arrayType.kind).toBe('array');
    if (arrayType.kind === 'array') {
      expect(arrayType.element.kind).toBe('primitive');
    }
  });

  it('should create expressions', () => {
    const literal = expr.literal(42, types.number());
    expect(literal.kind).toBe('literal');
    if (literal.kind === 'literal') {
      expect(literal.value).toBe(42);
    }

    const add = expr.binary(
      BinaryOp.Add,
      literal,
      expr.literal(10, types.number()),
      types.number()
    );
    expect(add.kind).toBe('binary');
    if (add.kind === 'binary') {
      expect(add.op).toBe(BinaryOp.Add);
    }
  });

  it('should create basic blocks', () => {
    const builder = new IRBuilder();
    
    const block = builder.block(
      [],
      { kind: 'return', value: expr.literal(42, types.number()) }
    );

    expect(block.id).toBe(0);
    expect(block.terminator.kind).toBe('return');
  });

  it('should reset variable versions', () => {
    const builder = new IRBuilder();
    
    const x0 = builder.variable('x', types.number());
    expect(x0.version).toBe(0);
    
    builder.resetVersions();
    
    const x0_again = builder.variable('x', types.number());
    expect(x0_again.version).toBe(0);
  });
});

describe('Type System', () => {
  it('should create primitive types', () => {
    const num = types.number();
    const str = types.string();
    const bool = types.boolean();
    const voidType = types.void();

    expect(num.kind).toBe('primitive');
    expect(str.kind).toBe('primitive');
    expect(bool.kind).toBe('primitive');
    expect(voidType.kind).toBe('primitive');
  });

  it('should create ownership types', () => {
    const ownPerson = types.class('Person', Ownership.Own);
    const sharePerson = types.class('Person', Ownership.Share);
    const usePerson = types.class('Person', Ownership.Use);

    if (ownPerson.kind === 'class') {
      expect(ownPerson.ownership).toBe(Ownership.Own);
    }
    if (sharePerson.kind === 'class') {
      expect(sharePerson.ownership).toBe(Ownership.Share);
    }
    if (usePerson.kind === 'class') {
      expect(usePerson.ownership).toBe(Ownership.Use);
    }
  });

  it('should create nullable types', () => {
    const nullableString = types.nullable(types.string());
    expect(nullableString.kind).toBe('nullable');
    if (nullableString.kind === 'nullable') {
      expect(nullableString.inner.kind).toBe('primitive');
    }
  });

  it('should create array types', () => {
    const numberArray = types.array(types.number(), Ownership.Value);
    expect(numberArray.kind).toBe('array');
    if (numberArray.kind === 'array') {
      expect(numberArray.element.kind).toBe('primitive');
    }
  });
});
