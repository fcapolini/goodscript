import { describe, it, expect } from 'vitest';
import { IRLowering } from '../src/frontend/lowering.js';
import { CppCodegen } from '../src/backend/cpp/codegen.js';
import ts from 'typescript';

/**
 * Test suite for object literal IR lowering and C++ codegen
 */

describe('Object Literal Support', () => {
  function compileCode(code: string): { ir: any; header: string; source: string } {
    const sourceFile = ts.createSourceFile('test.ts', code, ts.ScriptTarget.Latest, true);
    const compilerHost: ts.CompilerHost = {
      getSourceFile: (fileName) => fileName === 'test.ts' ? sourceFile : undefined,
      writeFile: () => {},
      getCurrentDirectory: () => '',
      getDirectories: () => [],
      fileExists: () => true,
      readFile: () => '',
      getCanonicalFileName: (fileName) => fileName,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => '\n',
      getDefaultLibFileName: () => 'lib.d.ts'
    };
    
    const program = ts.createProgram(['test.ts'], {}, compilerHost);

    const lowering = new IRLowering();
    const ir = lowering.lower(program);
    
    const codegen = new CppCodegen('gc');
    const { header, source } = codegen.generate(ir);
    
    return { ir, header, source };
  }

  it('should lower object literal to IR with struct type', () => {
    const code = `
      type Point = { x: number; y: number };
      function createPoint(): Point {
        return { x: 10, y: 20 };
      }
    `;
    
    const { ir } = compileCode(code);
    const func = ir.modules[0].declarations.find((d: any) => d.name === 'createPoint');
    expect(func).toBeDefined();
    
    const returnStmt = func.body.statements[0];
    expect(returnStmt.kind).toBe('return');
    expect(returnStmt.value.kind).toBe('objectLiteral');
    expect(returnStmt.value.type.kind).toBe('struct');
    expect(returnStmt.value.type.fields).toHaveLength(2);
  });

  it('should generate struct definition in header', () => {
    const code = `
      type Point = { x: number; y: number };
      function createPoint(): Point {
        return { x: 10, y: 20 };
      }
    `;
    
    const { header } = compileCode(code);
    expect(header).toContain('struct AnonymousStruct');
    expect(header).toContain('double x;');
    expect(header).toContain('double y;');
  });

  it('should generate object literal initialization in source', () => {
    const code = `
      type Point = { x: number; y: number };
      function createPoint(): Point {
        return { x: 10, y: 20 };
      }
    `;
    
    const { source } = compileCode(code);
    expect(source).toContain('AnonymousStruct');
    expect(source).toContain('.x = 10');
    expect(source).toContain('.y = 20');
  });

  it('should handle nested object literals', () => {
    const code = `
      type Rect = { topLeft: { x: number; y: number }; bottomRight: { x: number; y: number } };
      function createRect(): Rect {
        return { topLeft: { x: 0, y: 0 }, bottomRight: { x: 100, y: 100 } };
      }
    `;
    
    const { header } = compileCode(code);
    // Should generate two anonymous structs
    expect(header).toMatch(/struct AnonymousStruct\d+/);
  });

  it('should handle object literals with string fields', () => {
    const code = `
      type Person = { name: string; age: number };
      function createPerson(): Person {
        return { name: "Alice", age: 30 };
      }
    `;
    
    const { source } = compileCode(code);
    expect(source).toContain('.name = gs::String("Alice")');
    expect(source).toContain('.age = 30');
  });

  it('should reuse struct types with same shape', () => {
    const code = `
      type Point = { x: number; y: number };
      function p1(): Point { return { x: 1, y: 2 }; }
      function p2(): Point { return { x: 3, y: 4 }; }
    `;
    
    const { header } = compileCode(code);
    // Should only generate ONE struct definition (they have the same shape)
    const structMatches = header.match(/struct AnonymousStruct/g);
    expect(structMatches).toHaveLength(1);
  });

  it('should handle object literals in variable declarations', () => {
    const code = `
      type Point = { x: number; y: number };
      const p: Point = { x: 5, y: 10 };
      console.log(p.x);
    `;
    
    const { source } = compileCode(code);
    expect(source).toContain('AnonymousStruct');
    expect(source).toContain('.x = 5');
    expect(source).toContain('.y = 10');
  });

  it('should handle object literals with boolean fields', () => {
    const code = `
      type Config = { enabled: boolean; timeout: number };
      const config: Config = { enabled: true, timeout: 5000 };
    `;
    
    const { source } = compileCode(code);
    expect(source).toContain('.enabled = true');
    expect(source).toContain('.timeout = 5000');
  });
});
