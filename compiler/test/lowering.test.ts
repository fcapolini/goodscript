/**
 * IR Lowering Tests
 * 
 * Test conversion from TypeScript AST to IR
 */

import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { IRLowering } from '../src/frontend/lowering.js';
import { PrimitiveType, BinaryOp } from '../src/ir/types.js';

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

describe('IR Lowering', () => {
  describe('Literals', () => {
    it('should lower number literals', () => {
      const ir = parseAndLower('const x = 42;');
      
      expect(ir.modules).toHaveLength(1);
      const module = ir.modules[0];
      expect(module.declarations).toHaveLength(1);
      
      const decl = module.declarations[0];
      expect(decl.kind).toBe('const');
      if (decl.kind !== 'const') throw new Error('Expected const');
      expect(decl.name).toBe('x');
      expect(decl.value.kind).toBe('literal');
      
      if (decl.value.kind === 'literal') {
        expect(decl.value.value).toBe(42);
        expect(decl.value.type.kind).toBe('primitive');
        if (decl.value.type.kind === 'primitive') {
          expect(decl.value.type.type).toBe(PrimitiveType.Number);
        }
      }
    });

    it('should lower string literals', () => {
      const ir = parseAndLower('const msg = "hello";');
      
      const decl = ir.modules[0].declarations[0];
      if (decl.kind !== 'const') throw new Error('Expected const');
      expect(decl.value.kind).toBe('literal');
      
      if (decl.value.kind === 'literal') {
        expect(decl.value.value).toBe('hello');
        if (decl.value.type.kind === 'primitive') {
          expect(decl.value.type.type).toBe(PrimitiveType.String);
        }
      }
    });

    it('should lower boolean literals', () => {
      const ir = parseAndLower('const flag = true;');
      
      const decl = ir.modules[0].declarations[0];
      if (decl.kind !== 'const') throw new Error('Expected const');
      if (decl.kind !== 'const') throw new Error('Expected const');
      if (decl.kind !== 'const') throw new Error('Expected const');
      expect(decl.value.kind).toBe('literal');
      
      if (decl.value.kind === 'literal') {
        expect(decl.value.value).toBe(true);
        if (decl.value.type.kind === 'primitive') {
          expect(decl.value.type.type).toBe(PrimitiveType.Boolean);
        }
      }
    });
  });

  describe('Binary Expressions', () => {
    it('should lower addition', () => {
      const ir = parseAndLower('const sum = 10 + 20;');
      
      const decl = ir.modules[0].declarations[0];
      if (decl.kind !== 'const') throw new Error('Expected const');
      if (decl.kind !== 'const') throw new Error('Expected const');
      expect(decl.value.kind).toBe('binary');
      
      if (decl.value.kind === 'binary') {
        expect(decl.value.op).toBe(BinaryOp.Add);
        expect(decl.value.left.kind).toBe('literal');
        expect(decl.value.right.kind).toBe('literal');
        
        if (decl.value.left.kind === 'literal') {
          expect(decl.value.left.value).toBe(10);
        }
        if (decl.value.right.kind === 'literal') {
          expect(decl.value.right.value).toBe(20);
        }
      }
    });

    it('should lower comparison', () => {
      const ir = parseAndLower('const isGreater = 5 > 3;');
      
      const decl = ir.modules[0].declarations[0];
      if (decl.kind !== 'const') throw new Error('Expected const');
      expect(decl.value.kind).toBe('binary');
      
      if (decl.value.kind === 'binary') {
        expect(decl.value.op).toBe(BinaryOp.Gt);
      }
    });

    it('should lower nested expressions', () => {
      const ir = parseAndLower('const result = 10 + 20 * 2;');
      
      const decl = ir.modules[0].declarations[0];
      if (decl.kind !== 'const') throw new Error('Expected const');
      expect(decl.value.kind).toBe('binary');
      
      if (decl.value.kind === 'binary') {
        expect(decl.value.op).toBe(BinaryOp.Add); // + has lower precedence
        // TypeScript parses as: 10 + (20 * 2)
        expect(decl.value.right.kind).toBe('binary'); // (20 * 2)
      }
    });
  });

  describe('Functions', () => {
    it('should lower function declarations', () => {
      const ir = parseAndLower(`
        function add(a: number, b: number): number {
          return a + b;
        }
      `);
      
      const module = ir.modules[0];
      const decl = module.declarations[0];
      expect(decl.kind).toBe('function');
      if (decl.kind !== 'function') throw new Error('Expected function');
      expect(decl.name).toBe('add');
      expect(decl.params).toHaveLength(2);
      expect(decl.params[0].name).toBe('a');
      expect(decl.params[1].name).toBe('b');
      expect(decl.body).toBeDefined();
    });

    it('should lower integer type annotations', () => {
      const ir = parseAndLower(`
        function count(n: integer): integer {
          return n + 1;
        }
      `);
      
      const decl = ir.modules[0].declarations[0];
      expect(decl.kind).toBe('function');
      if (decl.kind !== 'function') throw new Error('Expected function');
      expect(decl.params[0].type.kind).toBe('primitive');
      
      if (decl.kind === 'function' && decl.params[0].type.kind === 'primitive') {
        expect(decl.params[0].type.type).toBe(PrimitiveType.Integer);
      }
      
      if (decl.kind === 'function' && decl.returnType.kind === 'primitive') {
        expect(decl.returnType.type).toBe(PrimitiveType.Integer);
      }
    });

    it('should lower integer53 type annotations', () => {
      const ir = parseAndLower(`
        function getId(id: integer53): integer53 {
          return id;
        }
      `);
      
      const decl = ir.modules[0].declarations[0];
      expect(decl.kind).toBe('function');
      
      if (decl.kind === 'function' && decl.params[0].type.kind === 'primitive') {
        expect(decl.params[0].type.type).toBe(PrimitiveType.Integer53);
      }
      
      if (decl.kind === 'function' && decl.returnType.kind === 'primitive') {
        expect(decl.returnType.type).toBe(PrimitiveType.Integer53);
      }
    });

    it('should lower arrow functions in variables', () => {
      const ir = parseAndLower('const add = (x: number) => x + 1;');
      
      const decl = ir.modules[0].declarations[0];
      expect(decl.kind).toBe('const');
      expect(decl.name).toBe('add');
      // Arrow function will be lowered as an expression
    });
  });

  describe('Type Annotations', () => {
    it('should lower explicit number type', () => {
      const ir = parseAndLower('const x: number = 42;');
      
      const decl = ir.modules[0].declarations[0];
      if (decl.kind !== 'const') throw new Error('Expected const');
      expect(decl.type.kind).toBe('primitive');
      if (decl.type.kind === 'primitive') {
        expect(decl.type.type).toBe(PrimitiveType.Number);
      }
    });

    it('should infer types from literals', () => {
      const ir = parseAndLower('const x = 42;');
      
      const decl = ir.modules[0].declarations[0];
      if (decl.kind !== 'const') throw new Error('Expected const');
      expect(decl.type.kind).toBe('primitive');
      if (decl.type.kind === 'primitive') {
        expect(decl.type.type).toBe(PrimitiveType.Number);
      }
    });
  });

  describe('Classes', () => {
    it('should lower class declarations', () => {
      const ir = parseAndLower(`
        class Person {
          name: string;
          age: number;
          
          greet(): string {
            return "Hello";
          }
        }
      `);
      
      const decl = ir.modules[0].declarations[0];
      expect(decl.kind).toBe('class');
      if (decl.kind !== 'class') throw new Error('Expected class');
      expect(decl.name).toBe('Person');
      expect(decl.fields).toHaveLength(2);
      expect(decl.fields[0].name).toBe('name');
      expect(decl.fields[1].name).toBe('age');
      expect(decl.methods).toHaveLength(1);
      expect(decl.methods[0].name).toBe('greet');
    });
  });

  describe('Method Calls', () => {
    it('should lower method calls as IRMethodCall', () => {
      const ir = parseAndLower(`
        function test(arr: number[]): number[] {
          return arr.map((x: number) => x * 2);
        }
      `);
      
      const decl = ir.modules[0].declarations[0];
      expect(decl.kind).toBe('function');
      if (decl.kind !== 'function') throw new Error('Expected function');
      
      // Check the return terminator contains a method call
      const terminator = decl.body.terminator;
      expect(terminator.kind).toBe('return');
      if (terminator.kind !== 'return') throw new Error('Expected return');
      expect(terminator.value).toBeDefined();
      expect(terminator.value!.kind).toBe('methodCall');
      
      if (terminator.value!.kind !== 'methodCall') throw new Error('Expected methodCall');
      expect(terminator.value!.method).toBe('map');
      expect(terminator.value!.args).toHaveLength(1);
      expect(terminator.value!.args[0].kind).toBe('lambda');
    });
  });
});

