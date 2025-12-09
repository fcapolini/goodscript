import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { IRLowering } from '../src/frontend/lowering.js';
import { CppCodegen } from '../src/backend/cpp/codegen.js';

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

describe('String Methods', () => {
  describe('IR Lowering', () => {
    it('should lower string.split()', () => {
      const ir = parseAndLower(`
        function test(str: string): string[] {
          return str.split(',');
        }
      `);
      
      const module = ir.modules[0];
      const func = module.declarations.find(d => d.kind === 'function' && d.name === 'test');
      expect(func).toBeDefined();
      
      if (func?.kind === 'function' && 'statements' in func.body) {
        const returnStmt = func.body.statements.find(s => s.kind === 'return');
        expect(returnStmt).toBeDefined();
        
        if (returnStmt?.kind === 'return' && returnStmt.value) {
          expect(returnStmt.value.kind).toBe('call');
          if (returnStmt.value.kind === 'call') {
            expect(returnStmt.value.callee.kind).toBe('memberAccess');
            if (returnStmt.value.callee.kind === 'memberAccess') {
              expect(returnStmt.value.callee.member).toBe('split');
            }
          }
        }
      }
    });

    it('should lower string.slice()', () => {
      const ir = parseAndLower(`
        function test(str: string): string {
          return str.slice(0, 5);
        }
      `);
      
      const module = ir.modules[0];
      const func = module.declarations.find(d => d.kind === 'function' && d.name === 'test');
      expect(func).toBeDefined();
    });

    it('should lower string.trim()', () => {
      const ir = parseAndLower(`
        function test(str: string): string {
          return str.trim();
        }
      `);
      
      const module = ir.modules[0];
      const func = module.declarations.find(d => d.kind === 'function' && d.name === 'test');
      expect(func).toBeDefined();
    });

    it('should lower string.toLowerCase()', () => {
      const ir = parseAndLower(`
        function test(str: string): string {
          return str.toLowerCase();
        }
      `);
      
      const module = ir.modules[0];
      const func = module.declarations.find(d => d.kind === 'function' && d.name === 'test');
      expect(func).toBeDefined();
    });

    it('should lower string.toUpperCase()', () => {
      const ir = parseAndLower(`
        function test(str: string): string {
          return str.toUpperCase();
        }
      `);
      
      const module = ir.modules[0];
      const func = module.declarations.find(d => d.kind === 'function' && d.name === 'test');
      expect(func).toBeDefined();
    });

    it('should lower string.indexOf()', () => {
      const ir = parseAndLower(`
        function test(str: string, search: string): number {
          return str.indexOf(search);
        }
      `);
      
      const module = ir.modules[0];
      const func = module.declarations.find(d => d.kind === 'function' && d.name === 'test');
      expect(func).toBeDefined();
    });

    it('should lower string.includes()', () => {
      const ir = parseAndLower(`
        function test(str: string, search: string): boolean {
          return str.includes(search);
        }
      `);
      
      const module = ir.modules[0];
      const func = module.declarations.find(d => d.kind === 'function' && d.name === 'test');
      expect(func).toBeDefined();
    });
  });

  describe('C++ Code Generation', () => {
    it.skip('should generate C++ code for string.split()', () => {
      // String methods are handled as regular method calls in C++ codegen
      // The runtime (gs::String class) implements these methods
      const ir = parseAndLower(`
        function test(): string[] {
          const str = "a,b,c";
          return str.split(",");
        }
      `);
      
      const codegen = new CppCodegen();
      const files = codegen.generate(ir, 'gc');
      const cpp = Array.from(files.values()).join('\n');
      
      expect(cpp).toContain('split');
      expect(cpp).toContain('gs::String');
    });

    it.skip('should generate C++ code for string.slice()', () => {
      const ir = parseAndLower(`
        function test(): string {
          const str = "hello world";
          return str.slice(0, 5);
        }
      `);
      
      const codegen = new CppCodegen();
      const files = codegen.generate(ir, 'gc');
      const cpp = Array.from(files.values()).join('\n');
      
      expect(cpp).toContain('slice');
    });

    it.skip('should generate C++ code for string methods without args', () => {
      const ir = parseAndLower(`
        function test(str: string): string {
          return str.trim().toLowerCase().toUpperCase();
        }
      `);
      
      const codegen = new CppCodegen();
      const files = codegen.generate(ir, 'gc');
      const cpp = Array.from(files.values()).join('\n');
      
      expect(cpp).toContain('trim');
      expect(cpp).toContain('toLowerCase');
      expect(cpp).toContain('toUpperCase');
    });
  });
});
