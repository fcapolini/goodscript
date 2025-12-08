import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { IRLowering } from '../src/frontend/lowering.js';

describe('Map methods', () => {
  function createProgram(source: string) {
    const sourceFile = ts.createSourceFile(
      'test.ts',
      source,
      ts.ScriptTarget.ES2022,
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
      getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    };
    const program = ts.createProgram(['test.ts'], {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    }, host);
    const typeChecker = program.getTypeChecker();
    return { sourceFile, typeChecker };
  }

  function lowerFunction(source: string, funcIndex = 0) {
    const { sourceFile, typeChecker } = createProgram(source);
    const lowering = new IRLowering();
    (lowering as any).typeChecker = typeChecker;
    const func = sourceFile.statements[funcIndex] as ts.FunctionDeclaration;
    return (lowering as any).lowerFunction(func, sourceFile);
  }

  describe('Map.set and Map.get', () => {
    it('should lower Map.set() call', () => {
      const source = `
        function test(): void {
          const map = new Map<string, number>();
          map.set("key", 42);
        }
      `;
      const irFunc = lowerFunction(source);
      
      expect(irFunc.body.statements).toBeDefined();
      const setCall = irFunc.body.statements.find((s: any) => 
        s.kind === 'expressionStatement' && 
        s.expression.kind === 'call'
      );
      expect(setCall).toBeDefined();
      expect(setCall.expression.callee.kind).toBe('memberAccess');
    });

    it('should lower Map.get() call', () => {
      const source = `
        function test(): number | undefined {
          const map = new Map<string, number>();
          return map.get("key");
        }
      `;
      const irFunc = lowerFunction(source);
      
      const returnStmt = irFunc.body.statements.find((s: any) => s.kind === 'return');
      expect(returnStmt).toBeDefined();
      expect(returnStmt.value).toBeDefined();
      expect(returnStmt.value.kind).toBe('call');
      expect(returnStmt.value.callee.kind).toBe('memberAccess');
    });
  });

  describe('Map.has', () => {
    it('should lower Map.has() call', () => {
      const source = `
        function test(): boolean {
          const map = new Map<string, number>();
          return map.has("key");
        }
      `;
      const irFunc = lowerFunction(source);
      
      const returnStmt = irFunc.body.statements.find((s: any) => s.kind === 'return');
      expect(returnStmt).toBeDefined();
      expect(returnStmt.value.kind).toBe('call');
    });
  });

  describe('Map.delete', () => {
    it('should lower Map.delete() call', () => {
      const source = `
        function test(): boolean {
          const map = new Map<string, number>();
          return map.delete("key");
        }
      `;
      const irFunc = lowerFunction(source);
      
      const returnStmt = irFunc.body.statements.find((s: any) => s.kind === 'return');
      expect(returnStmt).toBeDefined();
      expect(returnStmt.value.kind).toBe('call');
    });
  });

  describe('Map.clear', () => {
    it('should lower Map.clear() call', () => {
      const source = `
        function test(): void {
          const map = new Map<string, number>();
          map.clear();
        }
      `;
      const irFunc = lowerFunction(source);
      
      const clearCall = irFunc.body.statements.find((s: any) => 
        s.kind === 'expressionStatement' && 
        s.expression.kind === 'call'
      );
      expect(clearCall).toBeDefined();
    });
  });

  describe('Map.forEach', () => {
    it('should lower Map.forEach() with callback', () => {
      const source = `
        function test(): void {
          const map = new Map<string, number>();
          map.forEach((value: number, key: string) => {
            console.log(key, value);
          });
        }
      `;
      const irFunc = lowerFunction(source);
      
      const forEachCall = irFunc.body.statements.find((s: any) => 
        s.kind === 'expressionStatement' && 
        s.expression.kind === 'call'
      );
      expect(forEachCall).toBeDefined();
      // forEach with lambda argument should work
      const callExpr = forEachCall.expression;
      expect(callExpr.arguments.length).toBeGreaterThan(0);
    });
  });

  describe('Map.keys, values, entries', () => {
    it('should lower Map.keys() call', () => {
      const source = `
        function test(): void {
          const map = new Map<string, number>();
          for (const key of map.keys()) {
            console.log(key);
          }
        }
      `;
      const irFunc = lowerFunction(source);
      
      const forOfStmt = irFunc.body.statements.find((s: any) => s.kind === 'for-of');
      expect(forOfStmt).toBeDefined();
      expect(forOfStmt.iterable.kind).toBe('call');
    });

    it('should lower Map.values() call', () => {
      const source = `
        function test(): void {
          const map = new Map<string, number>();
          for (const value of map.values()) {
            console.log(value);
          }
        }
      `;
      const irFunc = lowerFunction(source);
      
      const forOfStmt = irFunc.body.statements.find((s: any) => s.kind === 'for-of');
      expect(forOfStmt).toBeDefined();
      expect(forOfStmt.iterable.kind).toBe('call');
    });

    it('should lower Map.entries() call', () => {
      const source = `
        function test(): void {
          const map = new Map<string, number>();
          for (const entry of map.entries()) {
            console.log(entry);
          }
        }
      `;
      const irFunc = lowerFunction(source);
      
      const forOfStmt = irFunc.body.statements.find((s: any) => s.kind === 'for-of');
      expect(forOfStmt).toBeDefined();
      expect(forOfStmt.iterable.kind).toBe('call');
    });
  });

  describe('Map.size', () => {
    it('should lower Map.size property access', () => {
      const source = `
        function test(): number {
          const map = new Map<string, number>();
          return map.size;
        }
      `;
      const irFunc = lowerFunction(source);
      
      const returnStmt = irFunc.body.statements.find((s: any) => s.kind === 'return');
      expect(returnStmt).toBeDefined();
      expect(returnStmt.value.kind).toBe('memberAccess');
    });
  });

  describe('Map constructor', () => {
    it('should lower new Map() constructor', () => {
      const source = `
        function test(): void {
          const map = new Map<string, number>();
        }
      `;
      const irFunc = lowerFunction(source);
      
      const varDecl = irFunc.body.statements.find((s: any) => s.kind === 'variableDeclaration');
      expect(varDecl).toBeDefined();
      expect(varDecl.initializer).toBeDefined();
      expect(varDecl.initializer.kind).toBe('newExpression');
    });

    it('should lower new Map() with entries', () => {
      const source = `
        function test(): void {
          const map = new Map<string, number>([["key", 42]]);
        }
      `;
      const irFunc = lowerFunction(source);
      
      const varDecl = irFunc.body.statements.find((s: any) => s.kind === 'variableDeclaration');
      expect(varDecl).toBeDefined();
      expect(varDecl.initializer.kind).toBe('newExpression');
      // Constructor with initial entries should have args
      expect(varDecl.initializer.arguments).toBeDefined();
    });
  });
});
