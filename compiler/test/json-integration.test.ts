import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { IRLowering } from '../src/frontend/lowering.js';
import { CppCodegen } from '../src/backend/cpp/codegen.js';

describe('JSON object integration', () => {
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

  it('should compile JSON.stringify() with number', () => {
    const source = `
      function test(): string {
        return JSON.stringify(42);
      }
    `;
    const cpp = compileToCpp(source);
    expect(cpp).toContain('gs::JSON::stringify');
    expect(cpp).toContain('gs::JSON::stringify(42)');
  });

  it('should compile JSON.stringify() with string', () => {
    const source = `
      function test(): string {
        return JSON.stringify("hello");
      }
    `;
    const cpp = compileToCpp(source);
    expect(cpp).toContain('gs::JSON::stringify');
  });

  it('should compile JSON.stringify() with boolean', () => {
    const source = `
      function test(): string {
        return JSON.stringify(true);
      }
    `;
    const cpp = compileToCpp(source);
    expect(cpp).toContain('gs::JSON::stringify');
    expect(cpp).toContain('gs::JSON::stringify(true)');
  });

  it('should compile JSON.stringify() with variable', () => {
    const source = `
      function test(value: number): string {
        return JSON.stringify(value);
      }
    `;
    const cpp = compileToCpp(source);
    expect(cpp).toContain('gs::JSON::stringify');
    expect(cpp).toContain('gs::JSON::stringify(value)');
  });

  it('should compile multiple JSON.stringify() calls', () => {
    const source = `
      function test(a: number, b: string): string {
        const str1 = JSON.stringify(a);
        const str2 = JSON.stringify(b);
        return str1 + str2;
      }
    `;
    const cpp = compileToCpp(source);
    expect(cpp).toContain('gs::JSON::stringify');
    // Should have 2 occurrences
    const matches = cpp.match(/gs::JSON::stringify/g);
    expect(matches).toHaveLength(2);
  });
});
