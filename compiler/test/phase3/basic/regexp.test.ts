import { describe, it, expect } from 'vitest';
import { CppCodegen } from '../../../src/cpp/codegen';
import ts from 'typescript';

describe('C++ Codegen - RegExp Support', () => {
  function compile(code: string): string {
    const sourceFile = ts.createSourceFile(
      'test.ts',
      code,
      ts.ScriptTarget.ES2020,
      true
    );
    const codegen = new CppCodegen();
    return codegen.generate(sourceFile);
  }
  
  it('should generate basic regex literal', () => {
    const code = `const pattern = /hello/;`;
    const cpp = compile(code);
    
    expect(cpp).toContain('gs::RegExp(R"(hello)")');
  });
  
  it('should generate regex with flags', () => {
    const code = `const pattern = /\\d+/g;`;
    const cpp = compile(code);
    
    expect(cpp).toContain('gs::RegExp(R"(\\d+)", "g")');
  });
  
  it('should generate regex with multiple flags', () => {
    const code = `const pattern = /test/gi;`;
    const cpp = compile(code);
    
    expect(cpp).toContain('gs::RegExp(R"(test)", "gi")');
  });
  
  it('should handle regex.test() method', () => {
    const code = `
const pattern = /hello/;
const result = pattern.test("hello world");
    `;
    const cpp = compile(code);
    
    expect(cpp).toContain('gs::RegExp(R"(hello)")');
    expect(cpp).toContain('.test(');
  });
  
  it('should handle string.match() method', () => {
    const code = `
const text = "numbers: 1, 2, 3";
const pattern = /\\d+/g;
const matches = text.match(pattern);
    `;
    const cpp = compile(code);
    
    expect(cpp).toContain('gs::RegExp(R"(\\d+)", "g")');
    expect(cpp).toContain('.match(');
  });
  
  it('should handle string.replace() with regex', () => {
    const code = `
const text = "hello world";
const pattern = /world/;
const result = text.replace(pattern, "GoodScript");
    `;
    const cpp = compile(code);
    
    expect(cpp).toContain('gs::RegExp(R"(world)")');
    expect(cpp).toContain('.replace(');
  });
  
  it('should handle string.split() with regex', () => {
    const code = `
const text = "a,b,c";
const pattern = /,/;
const parts = text.split(pattern);
    `;
    const cpp = compile(code);
    
    expect(cpp).toContain('gs::RegExp(R"(,)")');
    expect(cpp).toContain('.split(');
  });
  
  it('should handle complex regex patterns', () => {
    const code = `const emailPattern = /^[\\w.-]+@[\\w.-]+\\.[a-zA-Z]{2,}$/;`;
    const cpp = compile(code);
    
    expect(cpp).toContain('gs::RegExp(R"(^[\\w.-]+@[\\w.-]+\\.[a-zA-Z]{2,}$)")');
  });
  
  it('should preserve special regex characters', () => {
    const code = `const pattern = /\\s+|\\n+|\\t+/g;`;
    const cpp = compile(code);
    
    expect(cpp).toContain('R"(\\s+|\\n+|\\t+)"');
    expect(cpp).toContain('"g"');
  });
});
