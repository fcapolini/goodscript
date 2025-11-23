/**
 * Test Unicode string handling in C++ code generation
 */

import { describe, it, expect } from 'vitest';
import { CppCodegen } from '../../../src/cpp-codegen';
import ts from 'typescript';

function compileToCpp(source: string): string {
  const sourceFile = ts.createSourceFile(
    'test.ts',
    source,
    ts.ScriptTarget.ES2020,
    true
  );
  
  const codegen = new CppCodegen();
  return codegen.generate(sourceFile);
}

describe('Phase 3: Unicode Strings', () => {
  it('should handle ASCII strings', () => {
    const cpp = compileToCpp(`const msg = "Hello World";`);
    expect(cpp).toContain('"Hello World"');
  });

  it('should handle Chinese characters', () => {
    const cpp = compileToCpp(`const msg = "你好世界";`);
    expect(cpp).toContain('"你好世界"');
  });

  it('should handle Japanese characters', () => {
    const cpp = compileToCpp(`const msg = "こんにちは";`);
    expect(cpp).toContain('"こんにちは"');
  });

  it('should handle emoji', () => {
    const cpp = compileToCpp(`const msg = "Hello 🎉";`);
    expect(cpp).toContain('"Hello 🎉"');
  });

  it('should handle mixed Unicode', () => {
    const cpp = compileToCpp(`const msg = "Hello 世界 🚀";`);
    expect(cpp).toContain('"Hello 世界 🚀"');
  });

  it('should escape special characters in Unicode strings', () => {
    const cpp = compileToCpp(`const msg = "Line1\\nLine2 世界";`);
    // The \n is escaped as \\n in the source, which becomes \n in the C++ string literal
    expect(cpp).toContain('"Line1\\nLine2 世界"');
  });

  it('should sanitize Unicode identifiers for portability', () => {
    // While C++20 supports some Unicode identifiers, we sanitize for maximum portability
    const cpp = compileToCpp(`const 数量 = 100;`);
    // Chinese characters should be converted to hex codes
    expect(cpp).not.toContain('数量');
    expect(cpp).toContain('_u6570__u91cf_'); // Hex codes for 数 and 量
    expect(cpp).toContain('= 100');
  });
});
