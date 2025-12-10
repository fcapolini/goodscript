import { describe, it, expect } from 'vitest';
import { IRLowering } from '../src/frontend/lowering.js';
import * as ts from 'typescript';
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

describe('Nested Functions', () => {
  it('should lower nested function declaration to IR', () => {
    const source = `
      function outer(x: number): number {
        function inner(y: number): number {
          return y * 2;
        }
        return inner(x);
      }
    `;
    const ir = parseAndLower(source);
    const module = ir.modules[0];

    expect(module.functions.length).toBe(1);
    expect(module.functions[0].name).toBe('outer');
    
    // Check that function body contains a nested function declaration
    const outerBody = module.functions[0].body;
    expect(outerBody.statements.length).toBe(2); // functionDecl + return
    expect(outerBody.statements[0].kind).toBe('functionDecl');
    
    if (outerBody.statements[0].kind === 'functionDecl') {
      expect(outerBody.statements[0].name).toBe('inner');
      expect(outerBody.statements[0].params.length).toBe(1);
      expect(outerBody.statements[0].params[0].name).toBe('y');
    }
  });

  it('should generate C++ lambda for nested function', () => {
    const source = `
      function outer(x: number): number {
        function inner(y: number): number {
          return y * 2;
        }
        return inner(x);
      }
    `;
    const ir = parseAndLower(source);
    const module = ir.modules[0];
    
    const codegen = new CppCodegen();
    const { source: cppSource } = codegen.generateModule(module, 'gc');
    
    // Check that C++ contains a lambda declaration
    expect(cppSource).toContain('auto inner = [](');
    expect(cppSource).toContain('-> double {');
    expect(cppSource).toContain('return (y * 2)');
  });

  it('should handle multiple nested functions', () => {
    const source = `
      function outer(): number {
        function add(a: number, b: number): number {
          return a + b;
        }
        function multiply(a: number, b: number): number {
          return a * b;
        }
        return add(2, multiply(3, 4));
      }
    `;
    const ir = parseAndLower(source);
    const module = ir.modules[0];

    const outerBody = module.functions[0].body;
    const funcDecls = outerBody.statements.filter(s => s.kind === 'functionDecl');
    expect(funcDecls.length).toBe(2);
    
    const codegen = new CppCodegen();
    const { source: cppSource } = codegen.generateModule(module, 'gc');
    
    expect(cppSource).toContain('auto add = [](');
    expect(cppSource).toContain('auto multiply = [](');
  });

  it('should handle nested function with no parameters', () => {
    const source = `
      function outer(): number {
        function inner(): number {
          return 42;
        }
        return inner();
      }
    `;
    const ir = parseAndLower(source);
    const module = ir.modules[0];
    
    const codegen = new CppCodegen();
    const { source: cppSource } = codegen.generateModule(module, 'gc');
    
    // Lambda with no parameters
    expect(cppSource).toContain('auto inner = []() -> double {');
  });

  it('should handle nested function calling outer function parameter', () => {
    const source = `
      function outer(x: number): number {
        function inner(): number {
          return x * 2;
        }
        return inner();
      }
    `;
    const ir = parseAndLower(source);
    const module = ir.modules[0];
    
    // Note: This test demonstrates the current limitation
    // The nested function references 'x' from outer scope but doesn't capture it
    // This will fail at C++ compilation time - we need closure support
    const codegen = new CppCodegen();
    const { source: cppSource } = codegen.generateModule(module, 'gc');
    
    // Current implementation generates lambda without capture
    expect(cppSource).toContain('auto inner = []() -> double {');
    // This will contain reference to 'x' but won't compile without capture
    expect(cppSource).toContain('return (x * 2)');
  });

  it('should handle nested async function', () => {
    const source = `
      async function outer(): Promise<number> {
        async function inner(): Promise<number> {
          return 42;
        }
        return await inner();
      }
    `;
    const ir = parseAndLower(source);
    const module = ir.modules[0];

    const outerBody = module.functions[0].body;
    expect(outerBody.statements[0].kind).toBe('functionDecl');
    
    if (outerBody.statements[0].kind === 'functionDecl') {
      expect(outerBody.statements[0].async).toBe(true);
    }
  });

  it('should handle deeply nested functions', () => {
    const source = `
      function level1(): number {
        function level2(): number {
          function level3(): number {
            return 42;
          }
          return level3();
        }
        return level2();
      }
    `;
    const ir = parseAndLower(source);
    const module = ir.modules[0];

    const level1Body = module.functions[0].body;
    expect(level1Body.statements[0].kind).toBe('functionDecl');
    
    if (level1Body.statements[0].kind === 'functionDecl') {
      const level2Body = level1Body.statements[0].body;
      expect(level2Body.statements[0].kind).toBe('functionDecl');
    }
  });
});
