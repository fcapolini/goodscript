import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { IRLowering } from '../src/frontend/lowering.js';
import { CppCodegen } from '../src/backend/cpp/codegen.js';

describe('Math object integration', () => {
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

  it('should compile Math.min() method call', () => {
    const source = `
      function test(): number {
        return Math.min(5, 10);
      }
    `;
    const cpp = compileToCpp(source);
    expect(cpp).toContain('gs::Math::min');
    expect(cpp).toContain('gs::Math::min(5, 10)');
  });

  it('should compile Math.max() method call', () => {
    const source = `
      function test(): number {
        return Math.max(5, 10);
      }
    `;
    const cpp = compileToCpp(source);
    expect(cpp).toContain('gs::Math::max');
    expect(cpp).toContain('gs::Math::max(5, 10)');
  });

  it('should compile Math.abs() method call', () => {
    const source = `
      function test(): number {
        return Math.abs(-42);
      }
    `;
    const cpp = compileToCpp(source);
    expect(cpp).toContain('gs::Math::abs');
    // Note: codegen wraps negative literals in parens: (-42)
    expect(cpp).toMatch(/gs::Math::abs\(\(-42\)\)/);
  });

  it('should compile Math.floor() method call', () => {
    const source = `
      function test(): number {
        return Math.floor(3.7);
      }
    `;
    const cpp = compileToCpp(source);
    expect(cpp).toContain('gs::Math::floor');
    expect(cpp).toMatch(/gs::Math::floor\(3\.7/);
  });

  it('should compile Math.ceil() method call', () => {
    const source = `
      function test(): number {
        return Math.ceil(3.2);
      }
    `;
    const cpp = compileToCpp(source);
    expect(cpp).toContain('gs::Math::ceil');
    expect(cpp).toMatch(/gs::Math::ceil\(3\.2/);
  });

  it('should compile Math.round() method call', () => {
    const source = `
      function test(): number {
        return Math.round(3.5);
      }
    `;
    const cpp = compileToCpp(source);
    expect(cpp).toContain('gs::Math::round');
    expect(cpp).toMatch(/gs::Math::round\(3\.5/);
  });

  it('should compile Math.sqrt() method call', () => {
    const source = `
      function test(): number {
        return Math.sqrt(16);
      }
    `;
    const cpp = compileToCpp(source);
    expect(cpp).toContain('gs::Math::sqrt');
    expect(cpp).toContain('gs::Math::sqrt(16)');
  });

  it('should compile Math.pow() method call', () => {
    const source = `
      function test(): number {
        return Math.pow(2, 3);
      }
    `;
    const cpp = compileToCpp(source);
    expect(cpp).toContain('gs::Math::pow');
    expect(cpp).toContain('gs::Math::pow(2, 3)');
  });

  it('should compile Math constant access (Math.PI)', () => {
    const source = `
      function test(): number {
        return Math.PI;
      }
    `;
    const cpp = compileToCpp(source);
    expect(cpp).toContain('gs::Math::PI');
  });

  it('should compile Math constant access (Math.E)', () => {
    const source = `
      function test(): number {
        return Math.E;
      }
    `;
    const cpp = compileToCpp(source);
    expect(cpp).toContain('gs::Math::E');
  });

  it('should compile multiple Math calls', () => {
    const source = `
      function calculate(x: number, y: number): number {
        const a = Math.min(x, y);
        const b = Math.max(x, y);
        const c = Math.abs(a - b);
        return Math.sqrt(c);
      }
    `;
    const cpp = compileToCpp(source);
    expect(cpp).toContain('gs::Math::min');
    expect(cpp).toContain('gs::Math::max');
    expect(cpp).toContain('gs::Math::abs');
    expect(cpp).toContain('gs::Math::sqrt');
  });

  it('should compile trigonometric functions', () => {
    const source = `
      function test(): number {
        const a = Math.sin(Math.PI / 2);
        const b = Math.cos(0);
        const c = Math.tan(Math.PI / 4);
        return a + b + c;
      }
    `;
    const cpp = compileToCpp(source);
    expect(cpp).toContain('gs::Math::sin');
    expect(cpp).toContain('gs::Math::cos');
    expect(cpp).toContain('gs::Math::tan');
    expect(cpp).toContain('gs::Math::PI');
  });

  it('should compile logarithmic functions', () => {
    const source = `
      function test(): number {
        const a = Math.log(Math.E);
        const b = Math.log10(100);
        const c = Math.log2(8);
        return a + b + c;
      }
    `;
    const cpp = compileToCpp(source);
    expect(cpp).toContain('gs::Math::log');
    expect(cpp).toContain('gs::Math::log10');
    expect(cpp).toContain('gs::Math::log2');
  });

  it('should compile Math.sign()', () => {
    const source = `
      function test(x: number): number {
        return Math.sign(x);
      }
    `;
    const cpp = compileToCpp(source);
    expect(cpp).toContain('gs::Math::sign');
  });

  it('should compile Math.random()', () => {
    const source = `
      function test(): number {
        return Math.random();
      }
    `;
    const cpp = compileToCpp(source);
    expect(cpp).toContain('gs::Math::random');
  });
});
