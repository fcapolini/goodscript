/**
 * Element Access Tests
 * 
 * Test array/object index access lowering
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

describe('Element Access', () => {
  it('should lower array index access', () => {
    const ir = parseAndLower(`
      function getFirst(arr: number[]): number {
        return arr[0];
      }
    `);
    
    const decl = ir.modules[0].declarations[0];
    expect(decl.kind).toBe('function');
    if (decl.kind !== 'function') throw new Error('Expected function');
    
    const terminator = decl.body.terminator;
    expect(terminator.kind).toBe('return');
    if (terminator.kind !== 'return') throw new Error('Expected return');
    
    expect(terminator.value).toBeDefined();
    expect(terminator.value!.kind).toBe('index');
    
    if (terminator.value!.kind === 'index') {
      expect(terminator.value!.object.kind).toBe('variable');
      expect(terminator.value!.index.kind).toBe('literal');
      if (terminator.value!.index.kind === 'literal') {
        expect(terminator.value!.index.value).toBe(0);
      }
    }
  });

  it('should lower array index with variable', () => {
    const ir = parseAndLower(`
      function getAt(arr: string[], i: number): string {
        return arr[i];
      }
    `);
    
    const decl = ir.modules[0].declarations[0];
    if (decl.kind !== 'function') throw new Error('Expected function');
    
    const terminator = decl.body.terminator;
    if (terminator.kind !== 'return') throw new Error('Expected return');
    
    expect(terminator.value!.kind).toBe('index');
    if (terminator.value!.kind === 'index') {
      expect(terminator.value!.object.kind).toBe('variable');
      expect(terminator.value!.index.kind).toBe('variable');
      if (terminator.value!.index.kind === 'variable') {
        expect(terminator.value!.index.name).toBe('i');
      }
    }
  });
});
