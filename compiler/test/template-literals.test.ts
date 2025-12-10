/**
 * Template Literal Tests
 * 
 * Test template literal support (string interpolation)
 */

import { describe, it, expect } from 'vitest';
import { CppCodegen } from '../src/backend/cpp/codegen.js';
import { IRLowering } from '../src/frontend/lowering.js';
import ts from 'typescript';

function compileTemplateToIR(source: string) {
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

describe('Template Literals', () => {
  const codegen = new CppCodegen();

  it('should handle simple template literal with string variable', () => {
    const source = `
      const name = "World";
      const message = \`Hello, \${name}!\`;
    `;
    const ir = compileTemplateToIR(source);
    const output = codegen.generate(ir, 'gc');
    const cpp = output.get('test.cpp');

    expect(cpp).toContain('gs::String::from(');
    expect(cpp).toContain('"Hello, "');
    expect(cpp).toContain('"!"');
  });

  it('should handle template literal with number variable', () => {
    const source = `
      const count = 42;
      const message = \`The answer is \${count}\`;
    `;
    const ir = compileTemplateToIR(source);
    const output = codegen.generate(ir, 'gc');
    const cpp = output.get('test.cpp');

    expect(cpp).toContain('gs::String::from(count)');
    expect(cpp).toContain('"The answer is "');
  });

  it('should handle template literal with expression', () => {
    const source = `
      const x = 10;
      const y = 20;
      const message = \`\${x} + \${y} = \${x + y}\`;
    `;
    const ir = compileTemplateToIR(source);
    const output = codegen.generate(ir, 'gc');
    const cpp = output.get('test.cpp');

    expect(cpp).toContain('gs::String::from(x)');
    expect(cpp).toContain('gs::String::from(y)');
    expect(cpp).toContain('gs::String::from((x + y))');
    expect(cpp).toContain('" + "');
    expect(cpp).toContain('" = "');
  });

  it('should handle template literal with multiple types', () => {
    const source = `
      const name = "Alice";
      const age = 30;
      const active = true;
      const message = \`Name: \${name}, Age: \${age}, Active: \${active}\`;
    `;
    const ir = compileTemplateToIR(source);
    const output = codegen.generate(ir, 'gc');
    const cpp = output.get('test.cpp');

    expect(cpp).toContain('gs::String::from(name)');
    expect(cpp).toContain('gs::String::from(age)');
    expect(cpp).toContain('gs::String::from(active)');
  });

  it('should handle plain template literal without substitutions', () => {
    const source = `
      const message = \`Hello, World!\`;
    `;
    const ir = compileTemplateToIR(source);
    const output = codegen.generate(ir, 'gc');
    const cpp = output.get('test.cpp');

    expect(cpp).toContain('"Hello, World!"');
    expect(cpp).not.toContain('gs::String::from');
  });

  it('should handle template literal in function return', () => {
    const source = `
      function greet(name: string): string {
        return \`Hello, \${name}!\`;
      }
    `;
    const ir = compileTemplateToIR(source);
    const output = codegen.generate(ir, 'gc');
    const cpp = output.get('test.cpp');

    // String parameters don't need conversion, they're already strings
    expect(cpp).toContain('"Hello, "');
    expect(cpp).toContain('"!"');
    // Now uses StringBuilder optimization for template literals
    expect(cpp).toContain('sb.append(name)');
  });

  it('should handle nested template expressions', () => {
    const source = `
      const x = 5;
      const y = 3;
      const message = \`Result: \${x * 2 + y}\`;
    `;
    const ir = compileTemplateToIR(source);
    const output = codegen.generate(ir, 'gc');
    const cpp = output.get('test.cpp');

    expect(cpp).toContain('gs::String::from(');
    expect(cpp).toContain('"Result: "');
  });
});
