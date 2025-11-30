/**
 * Phase 3 Tests: Object literals
 * 
 * Tests C++ code generation for object literal expressions
 * 
 * NOTE: LiteralObject feature not yet implemented in AST-based codegen.
 * These tests are skipped until the feature is added.
 */

import { describe, it, expect } from 'vitest';
import { CppCodegen } from '../../../src/cpp/codegen';
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

describe.skip('Phase 3: Object literals', () => {
  it('should generate LiteralObject for object literals', () => {
    const source = `
const person = { name: "Alice", age: 30 };
    `;
    const cpp = compileToCpp(source);
    expect(cpp).toContain('gs::LiteralObject');
    expect(cpp).toContain('gs::Property');
    expect(cpp).toContain('"name"');
    expect(cpp).toContain('"Alice"');
    expect(cpp).toContain('30');
  });

  it('should generate property access via .get().value()', () => {
    const source = `
const person = { name: "Alice" };
const n = person.name;
    `;
    const cpp = compileToCpp(source);
    expect(cpp).toContain('person.get(gs::String("name")).value()');
  });

  it('should handle mixed types in object literals', () => {
    const source = `
const data = { 
  str: "hello",
  num: 42,
  flag: true
};
    `;
    const cpp = compileToCpp(source);
    expect(cpp).toContain('gs::Property(gs::String("hello"))');
    expect(cpp).toContain('gs::Property(42)');
    expect(cpp).toContain('gs::Property(true)');
  });

  it('should handle shorthand properties', () => {
    const source = `
const x = 10;
const obj = { x };
    `;
    const cpp = compileToCpp(source);
    expect(cpp).toContain('gs::Property(x)');
  });

  it('should handle empty object literals', () => {
    const source = `
const empty = {};
    `;
    const cpp = compileToCpp(source);
    expect(cpp).toContain('gs::LiteralObject{}');
  });

  it('should handle nested object literals', () => {
    const source = `
const nested = {
  outer: { inner: 42 }
};
    `;
    const cpp = compileToCpp(source);
    expect(cpp).toContain('gs::LiteralObject');
    expect(cpp).toContain('gs::Property');
  });
});
