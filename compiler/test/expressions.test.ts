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
    
    const terminator = decl.body.terminator;
    expect(terminator.kind).toBe('return');
    if (terminator.kind !== 'return') throw new Error('Expected return');
    
    expect(terminator.value).toBeDefined();
    expect(terminator.value!.kind).toBe('conditional');
    
    if (terminator.value!.kind === 'conditional') {
      expect(terminator.value!.condition.kind).toBe('binary');
      expect(terminator.value!.whenTrue.kind).toBe('variable');
      expect(terminator.value!.whenFalse.kind).toBe('variable');
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
    
    const terminator = decl.body.terminator;
    if (terminator.kind !== 'return') throw new Error('Expected return');
    
    expect(terminator.value!.kind).toBe('conditional');
    if (terminator.value!.kind === 'conditional') {
      // The whenFalse should be another conditional
      expect(terminator.value!.whenFalse.kind).toBe('conditional');
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
    
    const terminator = decl.body.terminator;
    if (terminator.kind !== 'return') throw new Error('Expected return');
    
    // Parentheses should be transparent in the IR
    expect(terminator.value!.kind).toBe('binary');
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
    
    const terminator = decl.body.terminator;
    if (terminator.kind !== 'return') throw new Error('Expected return');
    
    expect(terminator.value!.kind).toBe('new');
    if (terminator.value!.kind === 'new') {
      expect(terminator.value!.className).toBe('Point');
      expect(terminator.value!.args).toHaveLength(2);
      expect(terminator.value!.args[0].kind).toBe('literal');
      expect(terminator.value!.args[1].kind).toBe('literal');
    }
  });
});
