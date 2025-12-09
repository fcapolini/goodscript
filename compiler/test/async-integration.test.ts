/**
 * Async/Await Integration Tests - Phase 7b.1 Step 5
 * End-to-end tests verifying async/await works through the entire compilation pipeline
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { CppCodegen } from '../src/backend/cpp/codegen.js';
import { IRLowering } from '../src/frontend/lowering.js';
import { types, exprs } from '../src/ir/builder.js';
import type { IRProgram, IRModule, IRFunctionDecl } from '../src/ir/types.js';
import * as ts from 'typescript';

function createProgram(module: IRModule): IRProgram {
  return { modules: [module] };
}

function createTsProgram(source: string): ts.Program {
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

describe('Async/Await Integration', () => {
  describe('Full compilation pipeline', () => {
    it('should compile TypeScript async function to C++ coroutine', () => {
      // Source TypeScript code
      const source = `
        async function getNumber(): Promise<number> {
          return 42;
        }
      `;
      
      // Parse and lower TypeScript
      const program = createTsProgram(source);
      const lowering = new IRLowering();
      const ir = lowering.lower(program);
      
      // Verify IR
      expect(ir.modules).toHaveLength(1);
      const module = ir.modules[0];
      expect(module.declarations).toHaveLength(1);
      const func = module.declarations[0] as IRFunctionDecl;
      expect(func.kind).toBe('function');
      expect(func.name).toBe('getNumber');
      expect(func.async).toBe(true);
      expect(func.returnType.kind).toBe('promise');
      
      // Generate C++
      const codegen = new CppCodegen('gc');
      const files = codegen.generate(ir);
      const code = Array.from(files.values()).join('\n');
      
      // Verify C++ output
      expect(code).toContain('cppcoro::task<double>');
      expect(code).toContain('co_return 42');
      expect(code).toContain('#include <cppcoro/task.hpp>');
    });

    it('should compile async function with await', () => {
      const source = `
        async function getData(): Promise<string> {
          return "hello";
        }
        
        async function processData(): Promise<string> {
          const data = await getData();
          return data;
        }
      `;
      
      const program = createTsProgram(source);
      
      const lowering = new IRLowering();
      const ir = lowering.lower(program);
      const module = ir.modules[0];
      
      // Verify two functions
      expect(module.declarations).toHaveLength(2);
      
      // Check processData has await expression
      const processData = module.declarations[1] as IRFunctionDecl;
      expect(processData.name).toBe('processData');
      expect(processData.async).toBe(true);
      
      // Generate C++
      const codegen = new CppCodegen('gc');
      const files = codegen.generate(ir);
      const code = Array.from(files.values()).join('\n');
      
      // Verify both functions are coroutines
      expect(code).toContain('cppcoro::task<gs::String> getData()');
      expect(code).toContain('cppcoro::task<gs::String> processData()');
      expect(code).toContain('co_await');
    });

    it('should compile async function with multiple awaits', () => {
      const source = `
        async function add(a: number, b: number): Promise<number> {
          return a + b;
        }
        
        async function calculate(): Promise<number> {
          const x = await add(10, 20);
          const y = await add(x, 30);
          return y;
        }
      `;
      
      const program = createTsProgram(source);
      
      const lowering = new IRLowering();
      const ir = lowering.lower(program);
      const module = ir.modules[0];
      
      const codegen = new CppCodegen('gc');
      const files = codegen.generate(createProgram(module));
      const code = Array.from(files.values()).join('\n');
      
      // Should have two co_await expressions
      const awaitCount = (code.match(/co_await/g) || []).length;
      expect(awaitCount).toBeGreaterThanOrEqual(2);
    });

    it('should compile async function with try/catch', () => {
      const source = `
        async function riskyOperation(): Promise<number> {
          throw new Error("test");
        }
        
        async function handleError(): Promise<number> {
          try {
            return await riskyOperation();
          } catch (e) {
            return 0;
          }
        }
      `;
      
      const program = createTsProgram(source);
      
      const lowering = new IRLowering();
      const ir = lowering.lower(program);
      const module = ir.modules[0];
      
      const codegen = new CppCodegen('gc');
      const files = codegen.generate(createProgram(module));
      const code = Array.from(files.values()).join('\n');
      
      // Should have try/catch with co_await and co_return
      expect(code).toContain('try');
      expect(code).toContain('catch');
      expect(code).toContain('co_await');
      expect(code).toContain('co_return');
    });

    it('should compile async class methods', () => {
      const source = `
        class DataService {
          async fetch(url: string): Promise<string> {
            return url;
          }
          
          static async create(): Promise<DataService> {
            return new DataService();
          }
        }
      `;
      
      const program = createTsProgram(source);
      
      const lowering = new IRLowering();
      const ir = lowering.lower(program);
      const module = ir.modules[0];
      
      // Verify class with async methods
      expect(module.declarations).toHaveLength(1);
      const cls = module.declarations[0];
      expect(cls.kind).toBe('class');
      
      const codegen = new CppCodegen('gc');
      const files = codegen.generate(createProgram(module));
      const code = Array.from(files.values()).join('\n');
      
      // Should generate coroutine methods
      expect(code).toContain('cppcoro::task');
      expect(code).toContain('co_return');
    });

    it('should handle async void functions', () => {
      const source = `
        async function logMessage(msg: string): Promise<void> {
          console.log(msg);
        }
        
        async function main(): Promise<void> {
          await logMessage("Hello");
          await logMessage("World");
        }
      `;
      
      const program = createTsProgram(source);
      
      const lowering = new IRLowering();
      const ir = lowering.lower(program);
      const module = ir.modules[0];
      
      const codegen = new CppCodegen('gc');
      const files = codegen.generate(createProgram(module));
      const code = Array.from(files.values()).join('\n');
      
      // Should generate cppcoro::task<void>
      expect(code).toContain('cppcoro::task<void>');
      expect(code).toContain('co_await');
    });

    it('should handle nested async functions', () => {
      const source = `
        async function outer(): Promise<number> {
          async function inner(): Promise<number> {
            return 42;
          }
          return await inner();
        }
      `;
      
      const program = createTsProgram(source);
      
      const lowering = new IRLowering();
      const ir = lowering.lower(program);
      const module = ir.modules[0];
      
      const codegen = new CppCodegen('gc');
      const files = codegen.generate(createProgram(module));
      const code = Array.from(files.values()).join('\n');
      
      // Both functions should be coroutines
      expect(code).toContain('cppcoro::task<double>');
      expect(code).toContain('co_await');
      expect(code).toContain('co_return');
    });
  });

  describe('Edge cases', () => {
    it('should handle async function with no awaits', () => {
      const source = `
        async function justReturn(): Promise<number> {
          return 42;
        }
      `;
      
      const program = createTsProgram(source);
      
      const lowering = new IRLowering();
      const ir = lowering.lower(program);
      const module = ir.modules[0];
      
      const func = module.declarations[0] as IRFunctionDecl;
      expect(func.async).toBe(true);
      
      const codegen = new CppCodegen('gc');
      const files = codegen.generate(createProgram(module));
      const code = Array.from(files.values()).join('\n');
      
      // Should still use co_return even without awaits
      expect(code).toContain('cppcoro::task<double>');
      expect(code).toContain('co_return 42');
    });

    it('should handle async function with conditional await', () => {
      const source = `
        async function getData(): Promise<string> {
          return "data";
        }
        
        async function conditional(flag: boolean): Promise<string> {
          if (flag) {
            return await getData();
          }
          return "default";
        }
      `;
      
      const program = createTsProgram(source);
      
      const lowering = new IRLowering();
      const ir = lowering.lower(program);
      const module = ir.modules[0];
      
      const codegen = new CppCodegen('gc');
      const files = codegen.generate(createProgram(module));
      const code = Array.from(files.values()).join('\n');
      
      expect(code).toContain('if');
      expect(code).toContain('co_await');
      expect(code).toContain('co_return');
    });

    it('should handle async function with early return', () => {
      const source = `
        async function earlyReturn(value: number): Promise<number> {
          if (value === 0) {
            return 0;
          }
          return value * 2;
        }
      `;
      
      const program = createTsProgram(source);
      
      const lowering = new IRLowering();
      const ir = lowering.lower(program);
      const module = ir.modules[0];
      
      const codegen = new CppCodegen('gc');
      const files = codegen.generate(createProgram(module));
      const code = Array.from(files.values()).join('\n');
      
      // All returns should be co_return
      const coReturnCount = (code.match(/co_return/g) || []).length;
      expect(coReturnCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Performance considerations', () => {
    it('should generate efficient coroutine code', () => {
      const source = `
        async function simple(): Promise<number> {
          return 42;
        }
      `;
      
      const program = createTsProgram(source);
      
      const lowering = new IRLowering();
      const ir = lowering.lower(program);
      const module = ir.modules[0];
      
      const codegen = new CppCodegen('gc');
      const files = codegen.generate(createProgram(module));
      const code = Array.from(files.values()).join('\n');
      
      // Should not have unnecessary complexity
      expect(code).not.toContain('std::function');  // No function wrappers
      expect(code).toContain('cppcoro::task<double> simple()');  // Direct coroutine
    });
  });
});
