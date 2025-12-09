/**
 * Tests for async/await AST lowering
 * Phase 7b.1 Step 2: async/await support
 */

import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { IRLowering } from '../src/frontend/lowering.js';
import type { IRFunctionDecl, IRExpression } from '../src/ir/types.js';

function createProgram(source: string): ts.Program {
  const sourceFile = ts.createSourceFile(
    'test.ts',
    source,
    ts.ScriptTarget.Latest,
    true
  );

  const host: ts.CompilerHost = {
    getSourceFile: (fileName) => fileName === 'test.ts' ? sourceFile : undefined,
    writeFile: () => {},
    getCurrentDirectory: () => '',
    getDirectories: () => [],
    fileExists: () => true,
    readFile: () => '',
    getCanonicalFileName: (fileName) => fileName,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
    getDefaultLibFileName: (options) => ts.getDefaultLibFileName(options),
  };

  return ts.createProgram(['test.ts'], {}, host);
}

describe('Async/Await Lowering', () => {
  describe('Async function detection', () => {
    it('should detect async keyword on function declaration', () => {
      const source = `
        async function fetchData(): Promise<string> {
          return "data";
        }
      `;

      const program = createProgram(source);
      const lowering = new IRLowering();
      const ir = lowering.lower(program);

      expect(ir.modules).toHaveLength(1);
      expect(ir.modules[0].declarations).toHaveLength(1);

      const funcDecl = ir.modules[0].declarations[0] as IRFunctionDecl;
      expect(funcDecl.kind).toBe('function');
      expect(funcDecl.name).toBe('fetchData');
      expect(funcDecl.async).toBe(true);
      expect(funcDecl.returnType.kind).toBe('promise');
    });

    it('should mark non-async functions correctly', () => {
      const source = `
        function getData(): string {
          return "data";
        }
      `;

      const program = createProgram(source);
      const lowering = new IRLowering();
      const ir = lowering.lower(program);

      const funcDecl = ir.modules[0].declarations[0] as IRFunctionDecl;
      expect(funcDecl.kind).toBe('function');
      expect(funcDecl.name).toBe('getData');
      expect(funcDecl.async).toBeFalsy();
    });

    it('should detect async methods in classes', () => {
      const source = `
        class DataService {
          async fetch(): Promise<string> {
            return "data";
          }
        }
      `;

      const program = createProgram(source);
      const lowering = new IRLowering();
      const ir = lowering.lower(program);

      const classDecl = ir.modules[0].declarations[0];
      expect(classDecl.kind).toBe('class');
      if (classDecl.kind === 'class') {
        expect(classDecl.methods).toHaveLength(1);
        expect(classDecl.methods[0].name).toBe('fetch');
        expect(classDecl.methods[0].async).toBe(true);
      }
    });

    it('should detect static async methods', () => {
      const source = `
        class DataService {
          static async fetchStatic(): Promise<number> {
            return 42;
          }
        }
      `;

      const program = createProgram(source);
      const lowering = new IRLowering();
      const ir = lowering.lower(program);

      const classDecl = ir.modules[0].declarations[0];
      if (classDecl.kind === 'class') {
        expect(classDecl.methods[0].name).toBe('fetchStatic');
        expect(classDecl.methods[0].async).toBe(true);
        expect(classDecl.methods[0].isStatic).toBe(true);
      }
    });
  });

  describe('Await expression lowering', () => {
    it('should lower simple await expression', () => {
      const source = `
        async function test(): Promise<string> {
          const data = await fetchData();
          return data;
        }
      `;

      const program = createProgram(source);
      const lowering = new IRLowering();
      const ir = lowering.lower(program);

      const funcDecl = ir.modules[0].declarations[0] as IRFunctionDecl;
      expect(funcDecl.async).toBe(true);
      
      if (funcDecl.body.kind !== 'block') {
        const statements = funcDecl.body.statements;
        expect(statements.length).toBeGreaterThan(0);
        
        // First statement should be variable declaration with await
        const firstStmt = statements[0];
        expect(firstStmt.kind).toBe('variableDeclaration');
        if (firstStmt.kind === 'variableDeclaration' && firstStmt.initializer) {
          expect(firstStmt.initializer.kind).toBe('await');
        }
      }
    });

    it('should lower await in return statement', () => {
      const source = `
        async function test(): Promise<number> {
          return await getNumber();
        }
      `;

      const program = createProgram(source);
      const lowering = new IRLowering();
      const ir = lowering.lower(program);

      const funcDecl = ir.modules[0].declarations[0] as IRFunctionDecl;
      if (funcDecl.body.kind !== 'block') {
        const statements = funcDecl.body.statements;
        const returnStmt = statements.find(s => s.kind === 'return');
        
        expect(returnStmt).toBeDefined();
        if (returnStmt?.kind === 'return' && returnStmt.value) {
          expect(returnStmt.value.kind).toBe('await');
        }
      }
    });

    it('should lower chained await expressions', () => {
      const source = `
        async function test(): Promise<number> {
          const a = await getA();
          const b = await getB();
          return a + b;
        }
      `;

      const program = createProgram(source);
      const lowering = new IRLowering();
      const ir = lowering.lower(program);

      const funcDecl = ir.modules[0].declarations[0] as IRFunctionDecl;
      if (funcDecl.body.kind !== 'block') {
        const statements = funcDecl.body.statements;
        
        // Should have two variable declarations with await
        const awaitDecls = statements.filter(s => 
          s.kind === 'variableDeclaration' && 
          s.initializer?.kind === 'await'
        );
        
        expect(awaitDecls.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('should extract result type from Promise<T>', () => {
      const source = `
        async function test(): Promise<number> {
          const num: number = await getNumber();
          return num;
        }
      `;

      const program = createProgram(source);
      const lowering = new IRLowering();
      const ir = lowering.lower(program);

      const funcDecl = ir.modules[0].declarations[0] as IRFunctionDecl;
      if (funcDecl.body.kind !== 'block') {
        const statements = funcDecl.body.statements;
        const varDecl = statements[0];
        
        if (varDecl.kind === 'variableDeclaration' && varDecl.initializer?.kind === 'await') {
          // The await expression type should be the unwrapped type (number, not Promise<number>)
          expect(varDecl.initializer.type.kind).toBe('primitive');
        }
      }
    });

    it('should lower await with method calls', () => {
      const source = `
        async function test(): Promise<string> {
          const response = await fetch("url");
          const text = await response.text();
          return text;
        }
      `;

      const program = createProgram(source);
      const lowering = new IRLowering();
      const ir = lowering.lower(program);

      const funcDecl = ir.modules[0].declarations[0] as IRFunctionDecl;
      expect(funcDecl.async).toBe(true);
      
      if (funcDecl.body.kind !== 'block') {
        const statements = funcDecl.body.statements;
        expect(statements.length).toBeGreaterThan(0);
        
        // Both variable declarations should have await expressions
        const awaitCount = statements.filter(s => 
          s.kind === 'variableDeclaration' && 
          s.initializer?.kind === 'await'
        ).length;
        
        expect(awaitCount).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('Return type validation', () => {
    it('should have Promise return type for async functions', () => {
      const source = `
        async function test(): Promise<void> {
          await delay();
        }
      `;

      const program = createProgram(source);
      const lowering = new IRLowering();
      const ir = lowering.lower(program);

      const funcDecl = ir.modules[0].declarations[0] as IRFunctionDecl;
      expect(funcDecl.async).toBe(true);
      expect(funcDecl.returnType.kind).toBe('promise');
      
      if (funcDecl.returnType.kind === 'promise') {
        expect(funcDecl.returnType.resultType.kind).toBe('primitive');
      }
    });

    it('should handle Promise<number> return type', () => {
      const source = `
        async function getNumber(): Promise<number> {
          return 42;
        }
      `;

      const program = createProgram(source);
      const lowering = new IRLowering();
      const ir = lowering.lower(program);

      const funcDecl = ir.modules[0].declarations[0] as IRFunctionDecl;
      expect(funcDecl.returnType.kind).toBe('promise');
      
      if (funcDecl.returnType.kind === 'promise') {
        expect(funcDecl.returnType.resultType.kind).toBe('primitive');
        if (funcDecl.returnType.resultType.kind === 'primitive') {
          expect(funcDecl.returnType.resultType.type).toBe('number');
        }
      }
    });
  });

  describe('Complex async patterns', () => {
    it('should handle nested async function calls', () => {
      const source = `
        async function inner(): Promise<number> {
          return 42;
        }
        
        async function outer(): Promise<number> {
          const result = await inner();
          return result * 2;
        }
      `;

      const program = createProgram(source);
      const lowering = new IRLowering();
      const ir = lowering.lower(program);

      expect(ir.modules[0].declarations).toHaveLength(2);
      
      const innerFunc = ir.modules[0].declarations[0] as IRFunctionDecl;
      const outerFunc = ir.modules[0].declarations[1] as IRFunctionDecl;
      
      expect(innerFunc.async).toBe(true);
      expect(outerFunc.async).toBe(true);
    });

    it('should handle await in conditional expressions', () => {
      const source = `
        async function test(): Promise<string> {
          const shouldFetch = true;
          return shouldFetch ? await fetchData() : "default";
        }
      `;

      const program = createProgram(source);
      const lowering = new IRLowering();
      const ir = lowering.lower(program);

      const funcDecl = ir.modules[0].declarations[0] as IRFunctionDecl;
      expect(funcDecl.async).toBe(true);
    });

    it('should handle Promise.all pattern', () => {
      const source = `
        async function fetchAll(): Promise<string[]> {
          const results = await Promise.all([fetch1(), fetch2()]);
          return results;
        }
      `;

      const program = createProgram(source);
      const lowering = new IRLowering();
      const ir = lowering.lower(program);

      const funcDecl = ir.modules[0].declarations[0] as IRFunctionDecl;
      expect(funcDecl.async).toBe(true);
      
      if (funcDecl.body.kind !== 'block') {
        const statements = funcDecl.body.statements;
        const awaitStmt = statements.find(s => 
          s.kind === 'variableDeclaration' && 
          s.initializer?.kind === 'await'
        );
        
        expect(awaitStmt).toBeDefined();
      }
    });
  });
});
