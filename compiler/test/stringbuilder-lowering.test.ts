import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { IRLowering } from '../src/frontend/lowering.js';

describe('StringBuilder lowering', () => {
  it('should lower for loop with string concatenation', () => {
    const code = `
      function test(): string {
        let result: string = "";
        for (let i: integer = 0; i < 10; i = i + 1) {
          result = result + "x";
        }
        return result;
      }
    `;

    const sourceFile = ts.createSourceFile('test.ts', code, ts.ScriptTarget.Latest, true);
    const host: ts.CompilerHost = {
      getSourceFile: (fileName) => fileName === 'test.ts' ? sourceFile : undefined,
      getDefaultLibFileName: () => 'lib.d.ts',
      writeFile: () => {},
      getCurrentDirectory: () => '',
      getCanonicalFileName: (fileName) => fileName,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => '\n',
      fileExists: () => true,
      readFile: () => '',
    };

    const program = ts.createProgram(['test.ts'], {}, host);
    
    const lowering = new IRLowering();
    const irProgram = lowering.lower(program);
    
    expect(irProgram.modules).toHaveLength(1);
    const module = irProgram.modules[0];
    expect(module.declarations).toHaveLength(1);
    
    const func = module.declarations[0];
    expect(func.kind).toBe('function');
    expect(func.name).toBe('test');
    
    if (func.kind === 'function' && 'statements' in func.body) {
      const statements = func.body.statements;
      console.log('Statements:', JSON.stringify(statements, null, 2));
      
      // Should have: variable declaration, for loop, return
      expect(statements.length).toBe(3);
      expect(statements[0].kind).toBe('variableDeclaration');
      expect(statements[1].kind).toBe('for');
      expect(statements[2].kind).toBe('return');
    }
  });
});
