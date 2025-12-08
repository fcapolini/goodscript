import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { IRLowering } from '../src/frontend/lowering.js';

describe('Optional Chaining', () => {
  function lowerCode(code: string) {
    const sourceFile = ts.createSourceFile(
      'test.ts',
      code,
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

  it('should lower optional property access', () => {
    const code = `
      interface Options {
        method: string;
      }
      
      function test(options: Options | null): void {
        const method = options?.method;
      }
    `;
    
    const result = lowerCode(code);
    expect(result.modules).toHaveLength(1);
    const module = result.modules[0];
    
    // Find the test function
    const testFunc = module.declarations.find(
      d => d.kind === 'function' && d.name === 'test'
    );
    expect(testFunc).toBeDefined();
    expect(testFunc?.kind).toBe('function');
    
    if (testFunc?.kind !== 'function') throw new Error('Expected function');
    
    // Find the variable declaration for 'method'
    if (!('statements' in testFunc.body)) throw new Error('Expected body with statements');
    const varDecl = testFunc.body.statements.find(
      stmt => stmt.kind === 'variableDeclaration' && stmt.name === 'method'
    );
    expect(varDecl).toBeDefined();
    
    // Check that initializer is a memberAccess with optional=true
    const init = (varDecl as any).initializer;
    expect(init.kind).toBe('memberAccess');
    expect(init.member).toBe('method');
    expect(init.optional).toBe(true);
  });

  it('should handle non-optional property access', () => {
    const code = `
      interface Options {
        method: string;
      }
      
      function test(options: Options): void {
        const method = options.method;
      }
    `;
    
    const result = lowerCode(code);
    const module = result.modules[0];
    const testFunc = module.declarations.find(
      d => d.kind === 'function' && d.name === 'test'
    );
    
    if (testFunc?.kind !== 'function') throw new Error('Expected function');
    
    if (!('statements' in testFunc.body)) throw new Error('Expected body with statements');
    const varDecl = testFunc.body.statements.find(
      stmt => stmt.kind === 'variableDeclaration' && stmt.name === 'method'
    );
    
    const init = (varDecl as any).initializer;
    expect(init.kind).toBe('memberAccess');
    expect(init.optional).toBeFalsy();  // false or undefined for non-optional
  });

  it('should handle optional chaining in binary expressions', () => {
    const code = `
      interface Options {
        method: string;
      }
      
      function test(options: Options | null): void {
        const method = options?.method || 'GET';
      }
    `;
    
    const result = lowerCode(code);
    const module = result.modules[0];
    const testFunc = module.declarations.find(
      d => d.kind === 'function' && d.name === 'test'
    );
    
    if (testFunc?.kind !== 'function') throw new Error('Expected function');
    
    if (!('statements' in testFunc.body)) throw new Error('Expected body with statements');
    const varDecl = testFunc.body.statements.find(
      stmt => stmt.kind === 'variableDeclaration' && stmt.name === 'method'
    );
    
    const init = (varDecl as any).initializer;
    expect(init.kind).toBe('binary');
    expect(init.operator).toBe('||');
    
    // Left side should be optional memberAccess
    expect(init.left.kind).toBe('memberAccess');
    expect(init.left.optional).toBe(true);
  });

  it('should handle optional chaining in conditionals', () => {
    const code = `
      interface Options {
        headers: Map<string, string>;
      }
      
      function test(options: Options | null): void {
        if (options?.headers !== null) {
          console.log('Has headers');
        }
      }
    `;
    
    const result = lowerCode(code);
    const module = result.modules[0];
    const testFunc = module.declarations.find(
      d => d.kind === 'function' && d.name === 'test'
    );
    
    if (testFunc?.kind !== 'function') throw new Error('Expected function');
    
    if (!('statements' in testFunc.body)) throw new Error('Expected body with statements');
    const ifStmt = testFunc.body.statements.find(stmt => stmt.kind === 'if');
    expect(ifStmt).toBeDefined();
    
    const condition = (ifStmt as any).condition;
    expect(condition.kind).toBe('binary');
    // TypeScript may optimize !== null to != null
    expect(['!=', '!==']).toContain(condition.operator);
    
    // Left side should be optional memberAccess
    expect(condition.left.kind).toBe('memberAccess');
    expect(condition.left.optional).toBe(true);
    expect(condition.left.member).toBe('headers');
  });

  it('should handle nested optional chaining', () => {
    const code = `
      interface Headers {
        has(key: string): boolean;
      }
      interface Options {
        headers: Headers;
      }
      
      function test(options: Options | null): void {
        const hasAuth = options?.headers?.has('Authorization');
      }
    `;
    
    const result = lowerCode(code);
    const module = result.modules[0];
    const testFunc = module.declarations.find(
      d => d.kind === 'function' && d.name === 'test'
    );
    
    if (testFunc?.kind !== 'function') throw new Error('Expected function');
    
    if (!('statements' in testFunc.body)) throw new Error('Expected body with statements');
    const varDecl = testFunc.body.statements.find(
      stmt => stmt.kind === 'variableDeclaration' && stmt.name === 'hasAuth'
    );
    
    const init = (varDecl as any).initializer;
    
    // The outer expression should be a call
    expect(init.kind).toBe('call');
    
    // The callee should be an optional memberAccess
    expect(init.callee.kind).toBe('memberAccess');
    expect(init.callee.optional).toBe(true);
    expect(init.callee.member).toBe('has');
    
    // The object of that memberAccess should also be optional
    expect(init.callee.object.kind).toBe('memberAccess');
    expect(init.callee.object.optional).toBe(true);
    expect(init.callee.object.member).toBe('headers');
  });
});
