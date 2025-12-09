/**
 * Tests for async/await C++ code generation
 * Phase 7b.1 Step 3: C++ codegen with cppcoro
 */

import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { IRLowering } from '../src/frontend/lowering.js';
import { CppCodegen } from '../src/backend/cpp/codegen.js';
import type { IRFunctionDecl } from '../src/ir/types.js';

function createProgram(source: string): ts.Program {
  const sourceFile = ts.createSourceFile(
    'test.ts',
    source,
    ts.ScriptTarget.Latest,
    true
  );

  const host: ts.CompilerHost = {
    getSourceFile: (fileName) => fileName === 'test.ts' ? sourceFile : undefined,
    writeFile: () => {},
    getCurrentDirectory: () => '',
    getDirectories: () => [],
    fileExists: () => true,
    readFile: () => '',
    getCanonicalFileName: (fileName) => fileName,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
    getDefaultLibFileName: (options) => ts.getDefaultLibFileName(options),
  };

  return ts.createProgram(['test.ts'], {}, host);
}

describe('Async/Await C++ Codegen', () => {
  describe('Promise<T> type generation', () => {
    it('should generate cppcoro::task<T> for Promise<number>', () => {
      const source = `
        async function getNumber(): Promise<number> {
          return 42;
        }
      `;

      const program = createProgram(source);
      const lowering = new IRLowering();
      const ir = lowering.lower(program);
      
      const codegen = new CppCodegen();
      const files = codegen.generate(ir, 'gc');
      
      const cppCode = Array.from(files.values()).join('\n');
      
      // Should generate cppcoro::task<double> (number → double)
      expect(cppCode).toContain('cppcoro::task<double>');
      expect(cppCode).toContain('getNumber()');
    });

    it('should generate cppcoro::task<gs::String> for Promise<string>', () => {
      const source = `
        async function getText(): Promise<string> {
          return "hello";
        }
      `;

      const program = createProgram(source);
      const lowering = new IRLowering();
      const ir = lowering.lower(program);
      
      const codegen = new CppCodegen();
      const files = codegen.generate(ir, 'gc');
      
      const cppCode = Array.from(files.values()).join('\n');
      
      expect(cppCode).toContain('cppcoro::task<gs::String>');
    });

    it('should generate cppcoro::task<void> for Promise<void>', () => {
      const source = `
        async function doSomething(): Promise<void> {
          console.log("done");
        }
      `;

      const program = createProgram(source);
      const lowering = new IRLowering();
      const ir = lowering.lower(program);
      
      const codegen = new CppCodegen();
      const files = codegen.generate(ir, 'gc');
      
      const cppCode = Array.from(files.values()).join('\n');
      
      expect(cppCode).toContain('cppcoro::task<void>');
    });
  });

  describe('co_await generation', () => {
    it('should generate co_await for await expressions', () => {
      const source = `
        async function test(): Promise<number> {
          const result = await getNumber();
          return result;
        }
      `;

      const program = createProgram(source);
      const lowering = new IRLowering();
      const ir = lowering.lower(program);
      
      const codegen = new CppCodegen();
      const files = codegen.generate(ir, 'gc');
      
      const cppCode = Array.from(files.values()).join('\n');
      
      expect(cppCode).toContain('co_await');
    });

    it('should generate co_await in return statement', () => {
      const source = `
        async function test(): Promise<string> {
          return await fetch("url");
        }
      `;

      const program = createProgram(source);
      const lowering = new IRLowering();
      const ir = lowering.lower(program);
      
      const codegen = new CppCodegen();
      const files = codegen.generate(ir, 'gc');
      
      const cppCode = Array.from(files.values()).join('\n');
      
      // Should have both co_await and co_return
      expect(cppCode).toContain('co_await');
      expect(cppCode).toContain('co_return');
    });

    it('should handle multiple await expressions', () => {
      const source = `
        async function test(): Promise<number> {
          const a = await getA();
          const b = await getB();
          return a + b;
        }
      `;

      const program = createProgram(source);
      const lowering = new IRLowering();
      const ir = lowering.lower(program);
      
      const codegen = new CppCodegen();
      const files = codegen.generate(ir, 'gc');
      
      const cppCode = Array.from(files.values()).join('\n');
      
      // Should have two co_await expressions
      const matches = cppCode.match(/co_await/g);
      expect(matches).toBeTruthy();
      expect(matches!.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('co_return generation', () => {
    it('should generate co_return instead of return in async functions', () => {
      const source = `
        async function test(): Promise<number> {
          return 42;
        }
      `;

      const program = createProgram(source);
      const lowering = new IRLowering();
      const ir = lowering.lower(program);
      
      const codegen = new CppCodegen();
      const files = codegen.generate(ir, 'gc');
      
      const cppCode = Array.from(files.values()).join('\n');
      
      expect(cppCode).toContain('co_return');
      // Should NOT have plain return in async function
      expect(cppCode).not.toMatch(/[^_]return 42/);
    });

    it('should generate co_return for void async functions', () => {
      const source = `
        async function test(): Promise<void> {
          console.log("done");
        }
      `;

      const program = createProgram(source);
      const lowering = new IRLowering();
      const ir = lowering.lower(program);
      
      const codegen = new CppCodegen();
      const files = codegen.generate(ir, 'gc');
      
      const cppCode = Array.from(files.values()).join('\n');
      
      // Implicit co_return for void functions (may not appear if no explicit return)
      // But the function should compile as a coroutine
      expect(cppCode).toContain('cppcoro::task<void>');
    });

    it('should use plain return in non-async functions', () => {
      const source = `
        function test(): number {
          return 42;
        }
      `;

      const program = createProgram(source);
      const lowering = new IRLowering();
      const ir = lowering.lower(program);
      
      const codegen = new CppCodegen();
      const files = codegen.generate(ir, 'gc');
      
      const cppCode = Array.from(files.values()).join('\n');
      
      expect(cppCode).toContain('return 42');
      expect(cppCode).not.toContain('co_return');
    });
  });

  describe('cppcoro header inclusion', () => {
    it('should include cppcoro/task.hpp header', () => {
      const source = `
        async function test(): Promise<number> {
          return 42;
        }
      `;

      const program = createProgram(source);
      const lowering = new IRLowering();
      const ir = lowering.lower(program);
      
      const codegen = new CppCodegen();
      const files = codegen.generate(ir, 'gc');
      
      const headerCode = Array.from(files.values()).join('\n');
      
      expect(headerCode).toContain('#include <cppcoro/task.hpp>');
    });
  });

  describe('Async methods', () => {
    it('should generate cppcoro::task for async class methods', () => {
      const source = `
        class Service {
          async fetch(): Promise<string> {
            return "data";
          }
        }
      `;

      const program = createProgram(source);
      const lowering = new IRLowering();
      const ir = lowering.lower(program);
      
      const codegen = new CppCodegen();
      const files = codegen.generate(ir, 'gc');
      
      const cppCode = Array.from(files.values()).join('\n');
      
      expect(cppCode).toContain('cppcoro::task<gs::String>');
      expect(cppCode).toContain('co_return');
    });

    it('should generate cppcoro::task for static async methods', () => {
      const source = `
        class Service {
          static async fetch(): Promise<number> {
            return 42;
          }
        }
      `;

      const program = createProgram(source);
      const lowering = new IRLowering();
      const ir = lowering.lower(program);
      
      const codegen = new CppCodegen();
      const files = codegen.generate(ir, 'gc');
      
      const cppCode = Array.from(files.values()).join('\n');
      
      expect(cppCode).toContain('cppcoro::task<double>');
    });
  });

  describe('Complex async patterns', () => {
    it('should handle async function calling another async function', () => {
      const source = `
        async function fetchData(): Promise<string> {
          return "data";
        }
        
        async function process(): Promise<string> {
          const data = await fetchData();
          return data;
        }
      `;

      const program = createProgram(source);
      const lowering = new IRLowering();
      const ir = lowering.lower(program);
      
      const codegen = new CppCodegen();
      const files = codegen.generate(ir, 'gc');
      
      const cppCode = Array.from(files.values()).join('\n');
      
      // Should have two function declarations with cppcoro::task
      const taskMatches = cppCode.match(/cppcoro::task<gs::String>/g);
      expect(taskMatches).toBeTruthy();
      expect(taskMatches!.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle await in conditional expressions', () => {
      const source = `
        async function test(): Promise<number> {
          const shouldFetch = true;
          return shouldFetch ? await getNumber() : 0;
        }
      `;

      const program = createProgram(source);
      const lowering = new IRLowering();
      const ir = lowering.lower(program);
      
      const codegen = new CppCodegen();
      const files = codegen.generate(ir, 'gc');
      
      const cppCode = Array.from(files.values()).join('\n');
      
      expect(cppCode).toContain('co_await');
      expect(cppCode).toContain('co_return');
    });
  });
});
