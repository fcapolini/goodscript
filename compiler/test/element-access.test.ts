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
    
    // Check function body (AST-level IR has statements array)
    if (!('statements' in decl.body)) throw new Error('Expected IRFunctionBody with statements');
    const statements = decl.body.statements;
    expect(statements.length).toBeGreaterThan(0);
    
    // Last statement should be return
    const lastStmt = statements[statements.length - 1];
    expect(lastStmt.kind).toBe('return');
    if (lastStmt.kind !== 'return') throw new Error('Expected return');
    
    expect(lastStmt.value).toBeDefined();
    expect(lastStmt.value!.kind).toBe('indexAccess');
    
    if (lastStmt.value!.kind === 'indexAccess') {
      expect(lastStmt.value!.object.kind).toBe('identifier');
      expect(lastStmt.value!.index.kind).toBe('literal');
      if (lastStmt.value!.index.kind === 'literal') {
        expect(lastStmt.value!.index.value).toBe(0);
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
    
    if (!('statements' in decl.body)) throw new Error('Expected IRFunctionBody with statements');
    const statements = decl.body.statements;
    const lastStmt = statements[statements.length - 1];
    if (lastStmt.kind !== 'return') throw new Error('Expected return');
    
    expect(lastStmt.value!.kind).toBe('indexAccess');
    if (lastStmt.value!.kind === 'indexAccess') {
      expect(lastStmt.value!.object.kind).toBe('identifier');
      expect(lastStmt.value!.index.kind).toBe('identifier');
      if (lastStmt.value!.index.kind === 'identifier') {
        expect(lastStmt.value!.index.name).toBe('i');
      }
    }
  });
});
