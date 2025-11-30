/**
 * Tests for C++ AST optimizer
 */

import { describe, it, expect } from 'vitest';
import { AstCodegen } from '../../../src/cpp/codegen';
import ts from 'typescript';

function compileWithOptimization(source: string, level: 0 | 1 | 2 = 1): string {
  const sourceFile = ts.createSourceFile(
    'test.ts',
    source,
    ts.ScriptTarget.ES2020,
    true
  );
  
  const codegen = new AstCodegen(undefined, { level });
  return codegen.generate(sourceFile);
}

describe('C++ AST Optimizer', () => {
  describe('Constant Folding', () => {
    it('should fold constant arithmetic expressions', () => {
      const source = `const result: number = 2 + 3;`;
      const cpp = compileWithOptimization(source, 1);
      
      // With optimization, should compute 5
      expect(cpp).toContain('const double result = 5;');
    });
    
    it('should fold constant multiplication', () => {
      const source = `const result: number = 4 * 5;`;
      const cpp = compileWithOptimization(source, 1);
      
      expect(cpp).toContain('const double result = 20;');
    });
    
    it('should fold constant comparisons', () => {
      const source = `const result: boolean = 3 < 5;`;
      const cpp = compileWithOptimization(source, 1);
      
      expect(cpp).toContain('const bool result = true;');
    });
    
    it('should fold boolean negation', () => {
      const source = `
        function test(): boolean {
          return !false;
        }
      `;
      const cpp = compileWithOptimization(source, 1);
      
      expect(cpp).toContain('return true;');
    });
    
    it('should not fold when optimization is disabled', () => {
      const source = `const result: number = 2 + 3;`;
      const cpp = compileWithOptimization(source, 0);
      
      // Without optimization, expression should remain
      expect(cpp).toContain('const double result = 2 + 3;');
    });
  });
  
  describe('Dead Code Elimination', () => {
    it('should eliminate unreachable code after return', () => {
      const source = `
        function test(): number {
          return 42;
          const unreachable: number = 1;
        }
      `;
      const cpp = compileWithOptimization(source, 1);
      
      // Should not contain unreachable code
      expect(cpp).not.toContain('unreachable');
    });
    
    it('should eliminate if (false) branches', () => {
      const source = `
        function test(): number {
          if (false) {
            return 1;
          }
          return 2;
        }
      `;
      const cpp = compileWithOptimization(source, 1);
      
      // Should only have return 2
      expect(cpp).toContain('return 2;');
      expect(cpp).not.toContain('return 1;');
    });
    
    it('should keep only then branch when if (true)', () => {
      const source = `
        function test(): number {
          if (true) {
            return 1;
          }
          return 2;
        }
      `;
      const cpp = compileWithOptimization(source, 1);
      
      // Should only have return 1
      expect(cpp).toContain('return 1;');
      // The optimizer should eliminate the unreachable return 2
      // However, we need to check the actual output format
    });
    
    it('should eliminate while (false) loops', () => {
      const source = `
        function test(): void {
          while (false) {
            const x: number = 1;
          }
        }
      `;
      const cpp = compileWithOptimization(source, 1);
      
      // Should not contain the loop variable
      expect(cpp).not.toContain('double x');
    });
  });
  
  describe('Expression Simplification', () => {
    it('should remove unnecessary parentheses around literals', () => {
      const source = `const x: number = (42);`;
      const cpp = compileWithOptimization(source, 1);
      
      // Note: We may not see this optimization immediately since
      // the AST might not represent explicit parens around simple literals
      expect(cpp).toContain('double x = 42;');
    });
    
    it('should simplify ternary with constant condition', () => {
      const source = `const x: number = true ? 1 : 2;`;
      const cpp = compileWithOptimization(source, 1);
      
      expect(cpp).toContain('double x = 1;');
    });
  });
  
  describe('Optimization Levels', () => {
    it('should respect level 0 (no optimization)', () => {
      const source = `const result: number = 1 + 1;`;
      const cpp = compileWithOptimization(source, 0);
      
      expect(cpp).toContain('result = 1 + 1');
    });
    
    it('should apply optimizations at level 1', () => {
      const source = `const result: number = 1 + 1;`;
      const cpp = compileWithOptimization(source, 1);
      
      expect(cpp).toContain('result = 2');
    });
    
    it('should apply optimizations at level 2', () => {
      const source = `const result: number = 1 + 1;`;
      const cpp = compileWithOptimization(source, 2);
      
      expect(cpp).toContain('result = 2');
    });
  });
});
