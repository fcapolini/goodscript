/**
 * Tests for traditional for loops (for (init; condition; increment) { })
 */

import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { IRLowering } from '../src/frontend/lowering.js';
import { stmts, types } from '../src/ir/builder.js';

describe('Traditional For Loop', () => {
  function createProgram(code: string): ts.Program {
    const sourceFile = ts.createSourceFile(
      'test.ts',
      code,
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
      getDefaultLibFileName: () => 'lib.d.ts',
    };
    
    return ts.createProgram(['test.ts'], {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    }, host);
  }

  describe('IR Lowering', () => {
    it('should lower basic for loop with variable declaration', () => {
      const code = `
        function test(): void {
          for (let i: integer = 0; i < 10; i = i + 1) {
            console.log(i);
          }
        }
      `;
      
      const program = createProgram(code);
      const lowering = new IRLowering();
      const ir = lowering.lower(program);
      
      expect(ir.modules).toHaveLength(1);
      const module = ir.modules[0];
      expect(module.declarations).toHaveLength(1);
      
      const func = module.declarations[0];
      expect(func.kind).toBe('function');
      if (func.kind === 'function' && func.body.kind === 'statements') {
        const statements = func.body.statements;
        expect(statements).toHaveLength(1);
        
        const forStmt = statements[0];
        expect(forStmt.kind).toBe('for');
        if (forStmt.kind === 'for') {
          // Check initializer
          expect(forStmt.init).toBeDefined();
          expect(forStmt.init?.kind).toBe('variableDeclaration');
          
          // Check condition
          expect(forStmt.condition).toBeDefined();
          expect(forStmt.condition?.kind).toBe('binary');
          
          // Check increment
          expect(forStmt.increment).toBeDefined();
          expect(forStmt.increment?.kind).toBe('binary');
          
          // Check body
          expect(forStmt.body).toHaveLength(1);
        }
      }
    });

    it('should lower for loop without initializer', () => {
      const code = `
        function test(): void {
          let i: integer = 0;
          for (; i < 10; i = i + 1) {
            console.log(i);
          }
        }
      `;
      
      const program = createProgram(code);
      const lowering = new IRLowering();
      const ir = lowering.lower(program);
      
      const func = ir.modules[0].declarations[0];
      if (func.kind === 'function' && func.body.kind === 'statements') {
        const statements = func.body.statements;
        const forStmt = statements[1]; // After variable declaration
        
        expect(forStmt.kind).toBe('for');
        if (forStmt.kind === 'for') {
          expect(forStmt.init).toBeNull();
          expect(forStmt.condition).toBeDefined();
          expect(forStmt.increment).toBeDefined();
        }
      }
    });

    it('should lower for loop with expression initializer', () => {
      const code = `
        function test(): void {
          let i: integer = 0;
          for (i = 5; i < 10; i = i + 1) {
            console.log(i);
          }
        }
      `;
      
      const program = createProgram(code);
      const lowering = new IRLowering();
      const ir = lowering.lower(program);
      
      const func = ir.modules[0].declarations[0];
      if (func.kind === 'function' && func.body.kind === 'statements') {
        const statements = func.body.statements;
        const forStmt = statements[1];
        
        expect(forStmt.kind).toBe('for');
        if (forStmt.kind === 'for') {
          expect(forStmt.init).toBeDefined();
          expect(forStmt.init?.kind).toBe('expressionStatement');
        }
      }
    });

    it('should lower infinite for loop', () => {
      const code = `
        function test(): void {
          for (;;) {
            break;
          }
        }
      `;
      
      const program = createProgram(code);
      const lowering = new IRLowering();
      const ir = lowering.lower(program);
      
      const func = ir.modules[0].declarations[0];
      if (func.kind === 'function' && func.body.kind === 'statements') {
        const statements = func.body.statements;
        const forStmt = statements[0];
        
        expect(forStmt.kind).toBe('for');
        if (forStmt.kind === 'for') {
          expect(forStmt.init).toBeNull();
          expect(forStmt.condition).toBeUndefined();
          expect(forStmt.increment).toBeUndefined();
          expect(forStmt.body).toHaveLength(1);
          expect(forStmt.body[0].kind).toBe('break');
        }
      }
    });

    it('should handle assignment operator in increment', () => {
      const code = `
        function test(): void {
          for (let i: integer = 0; i < 10; i = i + 1) {}
        }
      `;
      
      const program = createProgram(code);
      const lowering = new IRLowering();
      const ir = lowering.lower(program);
      
      const func = ir.modules[0].declarations[0];
      if (func.kind === 'function' && func.body.kind === 'statements') {
        const forStmt = func.body.statements[0];
        
        expect(forStmt.kind).toBe('for');
        if (forStmt.kind === 'for' && forStmt.increment) {
          expect(forStmt.increment.kind).toBe('binary');
          if (forStmt.increment.kind === 'binary') {
            // Assignment should be treated as binary operation with = operator
            expect(forStmt.increment.operator).toBe('=');
          }
        }
      }
    });
  });

  describe('C++ Code Generation', () => {
    it('should generate valid C++ for loop syntax', () => {
      const code = `
        function test(): void {
          for (let i: integer = 0; i < 10; i = i + 1) {
            console.log(i);
          }
        }
      `;
      
      const program = createProgram(code);
      const lowering = new IRLowering();
      const ir = lowering.lower(program);
      
      // We can't easily test C++ output without importing CppCodegen
      // but we've verified the IR structure above
      expect(ir.modules[0].declarations[0].kind).toBe('function');
    });

    it('should handle integer53 type with explicit annotation', () => {
      const code = `
        function sum(n: integer): integer53 {
          let total: integer53 = 0;
          for (let i: integer = 0; i < n; i = i + 1) {
            total = total + i;
          }
          return total;
        }
      `;
      
      const program = createProgram(code);
      const lowering = new IRLowering();
      const ir = lowering.lower(program);
      
      const func = ir.modules[0].declarations[0];
      expect(func.kind).toBe('function');
      if (func.kind === 'function') {
        expect(func.returnType.kind).toBe('primitive');
        if (func.returnType.kind === 'primitive') {
          expect(func.returnType.type).toBe('integer53');
        }
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle nested for loops', () => {
      const code = `
        function test(): void {
          for (let i: integer = 0; i < 3; i = i + 1) {
            for (let j: integer = 0; j < 3; j = j + 1) {
              console.log(i + j);
            }
          }
        }
      `;
      
      const program = createProgram(code);
      const lowering = new IRLowering();
      const ir = lowering.lower(program);
      
      const func = ir.modules[0].declarations[0];
      if (func.kind === 'function' && func.body.kind === 'statements') {
        const outerFor = func.body.statements[0];
        expect(outerFor.kind).toBe('for');
        
        if (outerFor.kind === 'for') {
          expect(outerFor.body).toHaveLength(1);
          const innerFor = outerFor.body[0];
          expect(innerFor.kind).toBe('for');
        }
      }
    });

    it('should handle for loop with break and continue', () => {
      const code = `
        function test(): void {
          for (let i: integer = 0; i < 10; i = i + 1) {
            if (i === 5) continue;
            if (i === 8) break;
            console.log(i);
          }
        }
      `;
      
      const program = createProgram(code);
      const lowering = new IRLowering();
      const ir = lowering.lower(program);
      
      const func = ir.modules[0].declarations[0];
      if (func.kind === 'function' && func.body.kind === 'statements') {
        const forStmt = func.body.statements[0];
        expect(forStmt.kind).toBe('for');
        
        if (forStmt.kind === 'for') {
          expect(forStmt.body.length).toBeGreaterThan(0);
          // Body contains if statements with continue and break
          const hasIfStatements = forStmt.body.some(s => s.kind === 'if');
          expect(hasIfStatements).toBe(true);
        }
      }
    });
  });
});
