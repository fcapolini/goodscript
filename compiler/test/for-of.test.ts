import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { IRLowering } from '../src/frontend/lowering.js';
import { types } from '../src/ir/builder.js';

describe('for-of loops', () => {
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
    const { sourceFile, typeChecker} = createProgram(source);
    const lowering = new IRLowering();
    // Use private access hack for testing
    (lowering as any).typeChecker = typeChecker;
    const func = sourceFile.statements[funcIndex] as ts.FunctionDeclaration;
    return (lowering as any).lowerFunction(func, sourceFile);
  }

  describe('basic for-of', () => {
    it('should lower for-of over array', () => {
      const source = `
        function test(): void {
          const arr: number[] = [1, 2, 3];
          for (const x of arr) {
            console.log(x);
          }
        }
      `;
      const irFunc = lowerFunction(source);
      
      expect(irFunc.body).toBeDefined();
      expect(irFunc.body.statements).toBeDefined();
      expect(irFunc.body.statements.length).toBeGreaterThan(1);
      
      // Should have a for-of statement
      const forOfStmt = irFunc.body.statements.find((s: any) => s.kind === 'for-of');
      expect(forOfStmt).toBeDefined();
      expect(forOfStmt.variable).toBeDefined();
      expect(forOfStmt.iterable).toBeDefined();
      expect(forOfStmt.body).toBeDefined();
    });

    it('should handle let variable in for-of', () => {
      const source = `
        function test(): void {
          const arr: number[] = [1, 2, 3];
          for (let x of arr) {
            x = x + 1;
          }
        }
      `;
      const irFunc = lowerFunction(source);
      
      const block = irFunc.body;
      const forOfStmt = block.statements.find((s: any) => s.kind === 'for-of');
      expect(forOfStmt).toBeDefined();
      expect(forOfStmt.variable).toBeDefined();
    });

    it('should handle for-of with block body', () => {
      const source = `
        function test(): void {
          const arr: number[] = [1, 2, 3];
          for (const x of arr) {
            const y = x * 2;
            console.log(y);
          }
        }
      `;
      const irFunc = lowerFunction(source);
      
      const block = irFunc.body;
      const forOfStmt = block.statements.find((s: any) => s.kind === 'for-of');
      expect(forOfStmt).toBeDefined();
      expect(Array.isArray(forOfStmt.body)).toBe(true);
      expect(forOfStmt.body.length).toBe(2);
    });
  });

  describe('for-of with string', () => {
    it('should lower for-of over string', () => {
      const source = `
        function test(): void {
          const str: string = "hello";
          for (const char of str) {
            console.log(char);
          }
        }
      `;
      const irFunc = lowerFunction(source);
      
      const block = irFunc.body;
      const forOfStmt = block.statements.find((s: any) => s.kind === 'for-of');
      expect(forOfStmt).toBeDefined();
    });
  });

  describe('for-of with expressions', () => {
    it('should handle for-of with array literal', () => {
      const source = `
        function test(): void {
          for (const x of [1, 2, 3]) {
            console.log(x);
          }
        }
      `;
      const irFunc = lowerFunction(source);
      
      const block = irFunc.body;
      const forOfStmt = block.statements.find((s: any) => s.kind === 'for-of');
      expect(forOfStmt).toBeDefined();
      expect(forOfStmt.iterable.kind).toBe('arrayLiteral');
    });

    it('should handle for-of with function call', () => {
      const source = `
        function getArray(): number[] {
          return [1, 2, 3];
        }
        function test(): void {
          for (const x of getArray()) {
            console.log(x);
          }
        }
      `;
      const irFunc = lowerFunction(source, 1); // Get the second function (test)
      
      const block = irFunc.body;
      const forOfStmt = block.statements.find((s: any) => s.kind === 'for-of');
      expect(forOfStmt).toBeDefined();
      expect(forOfStmt.iterable.kind).toBe('call');
    });
  });

  describe('nested for-of', () => {
    it('should handle nested for-of loops', () => {
      const source = `
        function test(): void {
          const matrix: number[][] = [[1, 2], [3, 4]];
          for (const row of matrix) {
            for (const cell of row) {
              console.log(cell);
            }
          }
        }
      `;
      const irFunc = lowerFunction(source);
      
      const block = irFunc.body;
      const outerForOf = block.statements.find((s: any) => s.kind === 'for-of');
      expect(outerForOf).toBeDefined();
      
      // Inner for-of should be in the body
      expect(Array.isArray(outerForOf.body)).toBe(true);
      const innerForOf = outerForOf.body.find((s: any) => s.kind === 'for-of');
      expect(innerForOf).toBeDefined();
    });
  });

  describe('for-of with break/continue', () => {
    it('should handle break in for-of', () => {
      const source = `
        function test(): void {
          const arr: number[] = [1, 2, 3, 4, 5];
          for (const x of arr) {
            if (x > 3) {
              break;
            }
            console.log(x);
          }
        }
      `;
      const irFunc = lowerFunction(source);
      
      const block = irFunc.body;
      const forOfStmt = block.statements.find((s: any) => s.kind === 'for-of');
      expect(forOfStmt).toBeDefined();
      
      // Body should contain if statement with break
      const ifStmt = forOfStmt.body[0];
      expect(ifStmt.kind).toBe('if');
      expect(Array.isArray(ifStmt.thenBranch)).toBe(true);
      const blockStmt = ifStmt.thenBranch[0];
      expect(blockStmt.kind).toBe('block');
      const breakStmt = blockStmt.statements[0];
      expect(breakStmt.kind).toBe('break');
    });

    it('should handle continue in for-of', () => {
      const source = `
        function test(): void {
          const arr: number[] = [1, 2, 3, 4, 5];
          for (const x of arr) {
            if (x % 2 === 0) {
              continue;
            }
            console.log(x);
          }
        }
      `;
      const irFunc = lowerFunction(source);
      
      const block = irFunc.body;
      const forOfStmt = block.statements.find((s: any) => s.kind === 'for-of');
      expect(forOfStmt).toBeDefined();
      
      // Body should contain if statement with continue
      const ifStmt = forOfStmt.body[0];
      expect(ifStmt.kind).toBe('if');
      const blockStmt = ifStmt.thenBranch[0];
      expect(blockStmt.kind).toBe('block');
      const continueStmt = blockStmt.statements[0];
      expect(continueStmt.kind).toBe('continue');
    });
  });
});
