/**
 * Async Runtime Tests - Phase 7b.1 Step 4
 * Tests Promise runtime library (gs::Promise<T> with cppcoro)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ZigCompiler } from '../src/backend/cpp/zig-compiler.js';
import { CppCodegen } from '../src/backend/cpp/codegen.js';
import { types, exprs, stmts } from '../src/ir/builder.js';
import type {
  IRProgram,
  IRModule,
  IRFunctionDecl,
  IRBlock,
  IRStatement,
} from '../src/ir/types.js';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

function createProgram(module: IRModule): IRProgram {
  return { modules: [module] };
}

function createBlock(id: number, instructions: any[], terminator: any): IRBlock {
  return { id, instructions, terminator };
}

describe('Async Runtime', () => {
  describe('cppcoro::task<T> generation', () => {
    it('should generate cppcoro::task for async functions', () => {
      // async function test(): Promise<number> {
      //   return 42;
      // }
      
      const returnType = types.promise(types.number());
      
      const func: IRFunctionDecl = {
        kind: 'function',
        name: 'test',
        params: [],
        returnType,
        async: true,
        body: createBlock(0, [], {
          kind: 'return',
          value: exprs.literal(42, types.number()),
        }),
      };
      
      const module: IRModule = {
        path: 'test-gs.ts',
        declarations: [func],
        imports: [],
        exports: [],
      };
      
      const codegen = new CppCodegen('ownership');
      const files = codegen.generate(createProgram(module));
      const code = Array.from(files.values()).join('\n');
      
      // Should generate cppcoro::task<double> for Promise<number>
      expect(code).toContain('cppcoro::task<double>');
      expect(code).toContain('co_return');
    });
  });

  describe('Runtime library verification', () => {
    it('should have Promise static methods in runtime headers', async () => {
      // Verify gs_promise.hpp contains resolve() and reject()
      const ownershipPromise = await fs.readFile(
        'runtime/cpp/ownership/gs_promise.hpp',
        'utf-8'
      );
      const gcPromise = await fs.readFile(
        'runtime/cpp/gc/promise.hpp',
        'utf-8'
      );
      
      // Check ownership mode
      expect(ownershipPromise).toContain('static Promise<T> resolve(T value)');
      expect(ownershipPromise).toContain('static Promise<T> reject(gs::Error error)');
      expect(ownershipPromise).toContain('static Promise<void> resolve()');
      
      // Check GC mode
      expect(gcPromise).toContain('static Promise<T> resolve(T value)');
      expect(gcPromise).toContain('static Promise<T> reject(gs::Error error)');
      expect(gcPromise).toContain('static Promise<void> resolve()');
    });
    
    it('should have cppcoro integration', async () => {
      const ownershipPromise = await fs.readFile(
        'runtime/cpp/ownership/gs_promise.hpp',
        'utf-8'
      );
      
      // Verify cppcoro integration
      expect(ownershipPromise).toContain('#include <cppcoro/task.hpp>');
      expect(ownershipPromise).toContain('#include <cppcoro/sync_wait.hpp>');
      expect(ownershipPromise).toContain('cppcoro::task<T>');
      expect(ownershipPromise).toContain('cppcoro::sync_wait');
    });
  });
});
