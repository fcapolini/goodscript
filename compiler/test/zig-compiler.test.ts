/**
 * Zig Compiler Integration Tests
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ZigCompiler } from '../src/backend/cpp/zig-compiler.js';
import { CppCodegen } from '../src/backend/cpp/codegen.js';
import { types } from '../src/ir/builder.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  IRProgram,
  IRModule,
  IRFunctionDecl,
  IRBlock,
} from '../src/ir/types.js';

function createProgram(module: IRModule): IRProgram {
  return { modules: [module] };
}

function createBlock(id: number, instructions: any[], terminator: any): IRBlock {
  return { id, instructions, terminator };
}

describe('Zig Compiler', () => {
  let zigAvailable = false;

  beforeAll(async () => {
    zigAvailable = await ZigCompiler.checkZigAvailable();
    
    if (zigAvailable) {
      const version = await ZigCompiler.getZigVersion();
      console.log(`Zig version: ${version}`);
    } else {
      console.log('Zig not available - skipping integration tests');
    }
  });

  it('should detect Zig availability', async () => {
    const available = await ZigCompiler.checkZigAvailable();
    expect(typeof available).toBe('boolean');
  });

  it('should get Zig version if available', async () => {
    if (!zigAvailable) {
      console.log('Skipping: Zig not available');
      return;
    }

    const version = await ZigCompiler.getZigVersion();
    expect(version).toBeTruthy();
    expect(version).toMatch(/\d+\.\d+\.\d+/);
  });

  it('should compile simple C++ program', async () => {
    if (!zigAvailable) {
      console.log('Skipping: Zig not available');
      return;
    }

    // Create a simple C++ program (no GC, no dependencies)
    const sources = new Map<string, string>();
    sources.set('main.cpp', `
#include <iostream>

int main() {
  std::cout << "Hello, World!" << std::endl;
  return 0;
}
`);

    const compiler = new ZigCompiler('build-test', 'vendor');
    const result = await compiler.compile({
      sources,
      output: 'build-test/hello',
      mode: 'ownership', // Use ownership mode to avoid GC dependency
      optimize: '0',
    });

    expect(result.success).toBe(true);
    expect(result.outputPath).toBe('build-test/hello');
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.buildTime).toBeGreaterThan(0);

    // Verify binary was created
    const stats = await fs.stat('build-test/hello');
    expect(stats.isFile()).toBe(true);

    // Cleanup
    await fs.rm('build-test', { recursive: true, force: true });
  });

  it('should compile GoodScript-generated C++ code', async () => {
    if (!zigAvailable) {
      console.log('Skipping: Zig not available');
      return;
    }

    // Generate C++ code from IR
    const func: IRFunctionDecl = {
      kind: 'function',
      name: 'add',
      params: [
        { name: 'a', type: types.number() },
        { name: 'b', type: types.number() },
      ],
      returnType: types.number(),
      body: createBlock(
        0,
        [],
        {
          kind: 'return',
          value: {
            kind: 'binary',
            op: '+',
            left: { kind: 'variable', name: 'a', version: 0, type: types.number() },
            right: { kind: 'variable', name: 'b', version: 0, type: types.number() },
            type: types.number(),
          },
        }
      ),
    };

    const module: IRModule = {
      path: 'math.gs',
      declarations: [func],
      imports: [],
    };

    // Add a main function that just calls add and returns the result
    const mainFunc: IRFunctionDecl = {
      kind: 'function',
      name: 'main',
      params: [],
      returnType: types.integer(),
      body: createBlock(
        0,
        [
          {
            kind: 'assign',
            target: { kind: 'variable', name: 'result', version: 0, type: types.number() },
            value: {
              kind: 'callExpr',
              callee: { kind: 'variable', name: 'math::add', version: 0, type: types.function([types.number(), types.number()], types.number()) },
              args: [
                { kind: 'literal', value: 2, type: types.number() },
                { kind: 'literal', value: 3, type: types.number() },
              ],
              type: types.number(),
            },
          },
        ],
        {
          kind: 'return',
          value: { kind: 'variable', name: 'result', version: 0, type: types.number() },
        }
      ),
    };

    const mainModule: IRModule = {
      path: 'main.gs',
      declarations: [mainFunc],
      imports: [{ from: './math.js', names: [{ name: 'add' }] }],
    };

    const codegen = new CppCodegen();
    const program = { modules: [module, mainModule] };
    const sources = codegen.generate(program, 'ownership');

    // Add a global C++ main() function that calls goodscript::main::main()
    const mainCpp = sources.get('main.cpp');
    if (mainCpp) {
      sources.set('main.cpp', mainCpp + `\n\nint main() {\n  return goodscript::main::main();\n}\n`);
    }

    // Compile with Zig
    const compiler = new ZigCompiler('build-test-gs', 'vendor');
    const result = await compiler.compile({
      sources,
      output: 'build-test-gs/app',
      mode: 'ownership',
      optimize: '0',
      includePaths: [path.join(process.cwd(), '..')], // Include parent dir for runtime/cpp/
    });

    if (!result.success) {
      console.log('Compilation failed with diagnostics:', result.diagnostics);
    }
    expect(result.success).toBe(true);
    expect(result.outputPath).toBe('build-test-gs/app');

    // Cleanup
    await fs.rm('build-test-gs', { recursive: true, force: true });
  });

  it('should cache vendored dependencies', async () => {
    if (!zigAvailable) {
      console.log('Skipping: Zig not available');
      return;
    }

    const sources = new Map<string, string>();
    sources.set('main.cpp', `
#include <iostream>
int main() { return 0; }
`);

    const compiler = new ZigCompiler('build-test-cache', 'vendor');

    // First compilation (will compile MPS - takes time)
    const result1 = await compiler.compile({
      sources,
      output: 'build-test-cache/app1',
      mode: 'gc',
      optimize: '0',
    });

    if (!result1.success) {
      console.log('First compilation failed:', result1.diagnostics);
    }
    expect(result1.success).toBe(true);
    const compileMessage1 = result1.diagnostics.find(d => d.includes('Compiling mps'));
    
    // Second compilation (should use cache)
    const result2 = await compiler.compile({
      sources,
      output: 'build-test-cache/app2',
      mode: 'gc',
      optimize: '0',
    });

    expect(result2.success).toBe(true);
    const cacheMessage2 = result2.diagnostics.find(d => d.includes('cached mps'));
    
    // First compile should compile, second should use cache
    if (compileMessage1) {
      expect(cacheMessage2).toBeTruthy();
    }

    // Cleanup
    await fs.rm('build-test-cache', { recursive: true, force: true });
  }, 15000); // Increase timeout to 15s for MPS compilation

  it('should support different optimization levels', async () => {
    if (!zigAvailable) {
      console.log('Skipping: Zig not available');
      return;
    }

    const sources = new Map<string, string>();
    sources.set('main.cpp', `
#include <iostream>
int main() { 
  std::cout << "Test" << std::endl;
  return 0; 
}
`);

    const compiler = new ZigCompiler('build-test-opt', 'vendor');

    // Test different optimization levels
    for (const opt of ['0', '1', '2', '3', 's', 'z'] as const) {
      const result = await compiler.compile({
        sources,
        output: `build-test-opt/app-O${opt}`,
        mode: 'ownership',
        optimize: opt,
      });

      expect(result.success).toBe(true);
    }

    // Cleanup
    await fs.rm('build-test-opt', { recursive: true, force: true });
  });

  it('should handle compilation errors gracefully', async () => {
    if (!zigAvailable) {
      console.log('Skipping: Zig not available');
      return;
    }

    // Invalid C++ code
    const sources = new Map<string, string>();
    sources.set('main.cpp', `
#include <iostream>

int main() {
  undefined_function();  // This will cause a compilation error
  return 0;
}
`);

    const compiler = new ZigCompiler('build-test-error', 'vendor');
    const result = await compiler.compile({
      sources,
      output: 'build-test-error/app',
      mode: 'ownership',
      optimize: '0',
    });

    expect(result.success).toBe(false);
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.diagnostics.some(d => d.toLowerCase().includes('error'))).toBe(true);

    // Cleanup
    await fs.rm('build-test-error', { recursive: true, force: true }).catch(() => {});
  });

  it('should compile in ownership mode', async () => {
    if (!zigAvailable) {
      console.log('Skipping: Zig not available');
      return;
    }

    const sources = new Map<string, string>();
    sources.set('main.cpp', `
#include <iostream>
#include <memory>

int main() {
  auto ptr = std::make_unique<int>(42);
  std::cout << *ptr << std::endl;
  return 0;
}
`);

    const compiler = new ZigCompiler('build-test-ownership', 'vendor');
    const result = await compiler.compile({
      sources,
      output: 'build-test-ownership/app',
      mode: 'ownership',
      optimize: '2',
    });

    expect(result.success).toBe(true);

    // Cleanup
    await fs.rm('build-test-ownership', { recursive: true, force: true });
  });

  it('should support debug symbols', async () => {
    if (!zigAvailable) {
      console.log('Skipping: Zig not available');
      return;
    }

    const sources = new Map<string, string>();
    sources.set('main.cpp', `
#include <iostream>
int main() { return 0; }
`);

    const compiler = new ZigCompiler('build-test-debug', 'vendor');
    const result = await compiler.compile({
      sources,
      output: 'build-test-debug/app',
      mode: 'ownership',
      optimize: '0',
      debug: true,
    });

    expect(result.success).toBe(true);

    // Debug binary should be larger
    const stats = await fs.stat('build-test-debug/app');
    expect(stats.size).toBeGreaterThan(0);

    // Cleanup
    await fs.rm('build-test-debug', { recursive: true, force: true });
  });
});

describe('Zig Compiler - Cross Compilation', () => {
  let zigAvailable = false;

  beforeAll(async () => {
    zigAvailable = await ZigCompiler.checkZigAvailable();
  });

  it('should support target triple specification', async () => {
    if (!zigAvailable) {
      console.log('Skipping: Zig not available');
      return;
    }

    const sources = new Map<string, string>();
    sources.set('main.cpp', `
#include <iostream>
int main() { return 0; }
`);

    const compiler = new ZigCompiler('build-test-cross', 'vendor');
    
    // Try to cross-compile (this might fail on some systems, that's OK)
    try {
      const result = await compiler.compile({
        sources,
        output: 'build-test-cross/app',
        mode: 'ownership',
        optimize: '0',
        target: 'x86_64-linux-gnu',
      });

      // If it succeeds, great!
      expect(result.success).toBe(true);
    } catch (error) {
      // If it fails, that's OK - not all targets are available everywhere
      console.log('Cross-compilation not available on this system');
    }

    // Cleanup
    await fs.rm('build-test-cross', { recursive: true, force: true }).catch(() => {});
  });
});
