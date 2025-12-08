/**
 * Conditional Expression Tests
 */

import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { IRLowering } from '../src/frontend/lowering.js';

function parseAndLower(source: string) {
  const sourceFile = ts.createSourceFile(
    'test.ts',
    source,
    ts.ScriptTarget.ES2022,
    true
  );

  const program = ts.createProgram(['test.ts'], {}, {
    getSourceFile: (fileName) => fileName === 'test.ts' ? sourceFile : undefined,
    writeFile: () => {},
    getCurrentDirectory: () => '',
    getDirectories: () => [],
    fileExists: () => true,
    readFile: () => '',
    getCanonicalFileName: (fileName) => fileName,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
    getDefaultLibFileName: () => 'lib.d.ts',
  });

  const lowering = new IRLowering();
  return lowering.lower(program);
}

describe('Conditional Expressions', () => {
  it('should lower ternary operator', () => {
    const ir = parseAndLower(`
      function max(a: number, b: number): number {
        return a > b ? a : b;
      }
    `);
    
    const decl = ir.modules[0].declarations[0];
    expect(decl.kind).toBe('function');
    if (decl.kind !== 'function') throw new Error('Expected function');
    
    if (!('statements' in decl.body)) throw new Error('Expected IRFunctionBody with statements');
    const statements = decl.body.statements;
    const lastStmt = statements[statements.length - 1];
    expect(lastStmt.kind).toBe('return');
    if (lastStmt.kind !== 'return') throw new Error('Expected return');
    
    expect(lastStmt.value).toBeDefined();
    expect(lastStmt.value!.kind).toBe('conditional');
    
    if (lastStmt.value!.kind === 'conditional') {
      expect(lastStmt.value!.condition.kind).toBe('binary');
      expect(lastStmt.value!.thenExpr.kind).toBe('identifier');
      expect(lastStmt.value!.elseExpr.kind).toBe('identifier');
    }
  });

  it('should lower nested conditional', () => {
    const ir = parseAndLower(`
      function classify(n: number): string {
        return n > 0 ? "positive" : n < 0 ? "negative" : "zero";
      }
    `);
    
    const decl = ir.modules[0].declarations[0];
    if (decl.kind !== 'function') throw new Error('Expected function');
    
    if (!('statements' in decl.body)) throw new Error('Expected IRFunctionBody with statements');
    const statements = decl.body.statements;
    const lastStmt = statements[statements.length - 1];
    if (lastStmt.kind !== 'return') throw new Error('Expected return');
    
    expect(lastStmt.value!.kind).toBe('conditional');
    if (lastStmt.value!.kind === 'conditional') {
      // The elseExpr should be another conditional
      expect(lastStmt.value!.elseExpr.kind).toBe('conditional');
    }
  });
});

describe('Parenthesized Expressions', () => {
  it('should unwrap parenthesized expressions', () => {
    const ir = parseAndLower(`
      function calc(x: number): number {
        return (x + 1) * 2;
      }
    `);
    
    const decl = ir.modules[0].declarations[0];
    if (decl.kind !== 'function') throw new Error('Expected function');
    
    if (!('statements' in decl.body)) throw new Error('Expected IRFunctionBody with statements');
    const statements = decl.body.statements;
    const lastStmt = statements[statements.length - 1];
    if (lastStmt.kind !== 'return') throw new Error('Expected return');
    
    // Parentheses should be transparent in the IR
    expect(lastStmt.value!.kind).toBe('binary');
  });
});

describe('New Expressions', () => {
  it('should lower new expressions', () => {
    const ir = parseAndLower(`
      function makePoint(): Point {
        return new Point(0, 0);
      }
    `);
    
    const decl = ir.modules[0].declarations[0];
    if (decl.kind !== 'function') throw new Error('Expected function');
    
    if (!('statements' in decl.body)) throw new Error('Expected IRFunctionBody with statements');
    const statements = decl.body.statements;
    const lastStmt = statements[statements.length - 1];
    if (lastStmt.kind !== 'return') throw new Error('Expected return');
    
    expect(lastStmt.value!.kind).toBe('newExpression');
    if (lastStmt.value!.kind === 'newExpression') {
      expect(lastStmt.value!.className).toBe('Point');
      expect(lastStmt.value!.arguments).toHaveLength(2);
      expect(lastStmt.value!.arguments[0].kind).toBe('literal');
      expect(lastStmt.value!.arguments[1].kind).toBe('literal');
    }
  });
});
