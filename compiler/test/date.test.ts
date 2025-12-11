import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { IRLowering } from '../src/frontend/lowering.js';
import { CppCodegen } from '../src/backend/cpp/codegen.js';

describe('Date Integration', () => {
  function compileToCpp(source: string): string {
    const sourceFile = ts.createSourceFile('test.ts', source, ts.ScriptTarget.ES2022, true);
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
    const program_ir = lowering.lower(program);
    const codegen = new CppCodegen();
    const files = codegen.generate(program_ir, 'gc');
    return files.get('test.cpp') || '';
  }

  it('should compile Date.now() to gs::Date::now()', () => {
    const code = `
      function getCurrentTime(): number {
        return Date.now();
      }
    `;
    const cpp = compileToCpp(code);
    expect(cpp).toContain('gs::Date::now()');
  });

  it('should handle Date.now() in variable declaration', () => {
    const code = `
      function measureTime(): number {
        const start: number = Date.now();
        return start;
      }
    `;
    const cpp = compileToCpp(code);
    expect(cpp).toContain('gs::Date::now()');
  });

  it('should handle Date.now() in expressions', () => {
    const code = `
      function getElapsedTime(start: number): number {
        return Date.now() - start;
      }
    `;
    const cpp = compileToCpp(code);
    expect(cpp).toContain('gs::Date::now()');
  });

  it('should work in both GC and ownership modes', () => {
    const code = `
      function now(): number {
        return Date.now();
      }
    `;
    const sourceFile = ts.createSourceFile('test.ts', code, ts.ScriptTarget.ES2022, true);
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
    const program_ir = lowering.lower(program);
    
    // GC mode
    const codegenGC = new CppCodegen();
    const filesGC = codegenGC.generate(program_ir, 'gc');
    const cppGC = filesGC.get('test.cpp') || '';
    expect(cppGC).toContain('gs::Date::now()');
    
    // Ownership mode
    const codegenOwnership = new CppCodegen();
    const filesOwnership = codegenOwnership.generate(program_ir, 'ownership');
    const cppOwnership = filesOwnership.get('test.cpp') || '';
    expect(cppOwnership).toContain('gs::Date::now()');
  });

  it('should compile a complete timing example', () => {
    const code = `
      function benchmark(): number {
        const start: number = Date.now();
        let sum: integer = 0;
        for (let i: integer = 0; i < 1000; i = i + 1) {
          sum = sum + i;
        }
        const end: number = Date.now();
        return end - start;
      }
    `;
    const cpp = compileToCpp(code);
    expect(cpp).toContain('gs::Date::now()');
    expect(cpp).toContain('start = gs::Date::now()');
    expect(cpp).toContain('end = gs::Date::now()');
  });
});
