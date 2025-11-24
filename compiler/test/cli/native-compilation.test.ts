/**
 * CLI Tests: Native compilation and cross-compilation
 * Tests for C++ code generation, binary compilation, and cross-compilation features
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const GSC_BIN = path.join(__dirname, '../../dist/gsc.js');

/**
 * Check if Zig is available for binary compilation tests
 */
function isZigAvailable(): boolean {
  try {
    execSync('zig version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

describe('CLI: Native Compilation', () => {
  let tmpDir: string;
  const zigAvailable = isZigAvailable();

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsc-native-test-'));
  });

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe('C++ source generation', () => {
    it('should generate C++ source with --target native', () => {
      const sourceFile = path.join(tmpDir, 'test.gs.ts');
      const outDir = path.join(tmpDir, 'dist');
      
      fs.writeFileSync(sourceFile, `
        const greet = (name: string): void => {
          console.log(\`Hello, \${name}!\`);
        };
        greet("World");
      `);
      
      execSync(`node ${GSC_BIN} --target native -o ${outDir} ${sourceFile}`, {
        encoding: 'utf-8'
      });
      
      const cppFile = path.join(outDir, 'test.cpp');
      expect(fs.existsSync(cppFile)).toBe(true);
      
      const cppContent = fs.readFileSync(cppFile, 'utf-8');
      expect(cppContent).toContain('#include "gs_runtime.hpp"');
      expect(cppContent).toContain('namespace gs {');
      expect(cppContent).toContain('int main()');
    });

    it('should generate C++ source with -t native shorthand', () => {
      const sourceFile = path.join(tmpDir, 'test.gs.ts');
      const outDir = path.join(tmpDir, 'dist');
      
      fs.writeFileSync(sourceFile, 'const x: number = 42;');
      
      execSync(`node ${GSC_BIN} -t native -o ${outDir} ${sourceFile}`, {
        encoding: 'utf-8'
      });
      
      expect(fs.existsSync(path.join(outDir, 'test.cpp'))).toBe(true);
    });

    it('should preserve directory structure in output', () => {
      const srcDir = path.join(tmpDir, 'src');
      const subDir = path.join(srcDir, 'utils');
      const outDir = path.join(tmpDir, 'dist');
      
      fs.mkdirSync(subDir, { recursive: true });
      
      const mainFile = path.join(srcDir, 'main.gs.ts');
      const utilFile = path.join(subDir, 'helper.gs.ts');
      
      fs.writeFileSync(mainFile, 'const x = 1;');
      fs.writeFileSync(utilFile, 'const y = 2;');
      
      execSync(`node ${GSC_BIN} -t native -o ${outDir} ${mainFile} ${utilFile}`, {
        encoding: 'utf-8'
      });
      
      expect(fs.existsSync(path.join(outDir, 'main.cpp'))).toBe(true);
      expect(fs.existsSync(path.join(outDir, 'utils', 'helper.cpp'))).toBe(true);
    });
  });

  describe('Binary compilation', () => {
    it('should show error when Zig not available and --compile-binary used', () => {
      if (zigAvailable) {
        // Skip if Zig is available (we can't test the error case)
        return;
      }

      const sourceFile = path.join(tmpDir, 'test.gs.ts');
      const outDir = path.join(tmpDir, 'dist');
      
      fs.writeFileSync(sourceFile, 'const x = 42;');
      
      try {
        execSync(`node ${GSC_BIN} -t native --compile-binary -o ${outDir} ${sourceFile}`, {
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        const output = error.stdout || error.stderr || '';
        expect(output).toContain('Zig compiler not found');
        expect(output).toContain('brew install zig');
      }
    });

    it('should compile to native binary with --compile-binary', () => {
      if (!zigAvailable) {
        console.log('Skipping: Zig not available');
        return;
      }

      const sourceFile = path.join(tmpDir, 'test.gs.ts');
      const outDir = path.join(tmpDir, 'dist');
      
      fs.writeFileSync(sourceFile, `
        const x: number = 42;
        console.log(x);
      `);
      
      execSync(`node ${GSC_BIN} -t native --compile-binary -o ${outDir} ${sourceFile}`, {
        encoding: 'utf-8'
      });
      
      const cppFile = path.join(outDir, 'test.cpp');
      const binFile = path.join(outDir, 'test');
      
      expect(fs.existsSync(cppFile)).toBe(true);
      expect(fs.existsSync(binFile)).toBe(true);
      
      // Verify binary is executable
      const stats = fs.statSync(binFile);
      expect((stats.mode & 0o111) !== 0).toBe(true); // Has execute permission
    });

    it('should compile to native binary with -b shorthand', () => {
      if (!zigAvailable) {
        console.log('Skipping: Zig not available');
        return;
      }

      const sourceFile = path.join(tmpDir, 'test.gs.ts');
      const outDir = path.join(tmpDir, 'dist');
      
      fs.writeFileSync(sourceFile, 'const x = 1;');
      
      execSync(`node ${GSC_BIN} -t native -b -o ${outDir} ${sourceFile}`, {
        encoding: 'utf-8'
      });
      
      expect(fs.existsSync(path.join(outDir, 'test'))).toBe(true);
    });

    it('should execute compiled binary correctly', () => {
      if (!zigAvailable) {
        console.log('Skipping: Zig not available');
        return;
      }

      const sourceFile = path.join(tmpDir, 'test.gs.ts');
      const outDir = path.join(tmpDir, 'dist');
      
      fs.writeFileSync(sourceFile, `
        const message: string = "Hello from GoodScript!";
        console.log(message);
      `);
      
      execSync(`node ${GSC_BIN} -t native -b -o ${outDir} ${sourceFile}`, {
        encoding: 'utf-8'
      });
      
      const binFile = path.join(outDir, 'test');
      const output = execSync(binFile, { encoding: 'utf-8' });
      
      expect(output.trim()).toBe('Hello from GoodScript!');
    });
  });

  describe('Cross-compilation', () => {
    it('should support --arch flag for target architecture', () => {
      if (!zigAvailable) {
        console.log('Skipping: Zig not available');
        return;
      }

      const sourceFile = path.join(tmpDir, 'test.gs.ts');
      const outDir = path.join(tmpDir, 'dist');
      
      fs.writeFileSync(sourceFile, 'const x = 42;');
      
      // Cross-compile to Linux (should work from any platform)
      execSync(`node ${GSC_BIN} -t native -b --arch x86_64-linux -o ${outDir} ${sourceFile}`, {
        encoding: 'utf-8'
      });
      
      const binFile = path.join(outDir, 'test');
      expect(fs.existsSync(binFile)).toBe(true);
      
      // Verify it's an ELF executable
      const fileOutput = execSync(`file ${binFile}`, { encoding: 'utf-8' });
      expect(fileOutput).toContain('ELF');
      expect(fileOutput).toContain('x86-64');
    });

    it('should support -a shorthand for --arch', () => {
      if (!zigAvailable) {
        console.log('Skipping: Zig not available');
        return;
      }

      const sourceFile = path.join(tmpDir, 'test.gs.ts');
      const outDir = path.join(tmpDir, 'dist');
      
      fs.writeFileSync(sourceFile, 'const x = 42;');
      
      execSync(`node ${GSC_BIN} -t native -b -a x86_64-linux -o ${outDir} ${sourceFile}`, {
        encoding: 'utf-8'
      });
      
      expect(fs.existsSync(path.join(outDir, 'test'))).toBe(true);
    });

    it('should cross-compile to Windows', () => {
      if (!zigAvailable) {
        console.log('Skipping: Zig not available');
        return;
      }

      const sourceFile = path.join(tmpDir, 'test.gs.ts');
      const outDir = path.join(tmpDir, 'dist');
      
      fs.writeFileSync(sourceFile, 'const x = 42;');
      
      execSync(`node ${GSC_BIN} -t native -b -a x86_64-windows -o ${outDir} ${sourceFile}`, {
        encoding: 'utf-8'
      });
      
      const binFile = path.join(outDir, 'test');
      const fileOutput = execSync(`file ${binFile}`, { encoding: 'utf-8' });
      expect(fileOutput).toContain('PE32+');
      expect(fileOutput).toContain('Windows');
    });

    it('should cross-compile to macOS ARM64', () => {
      if (!zigAvailable) {
        console.log('Skipping: Zig not available');
        return;
      }

      const sourceFile = path.join(tmpDir, 'test.gs.ts');
      const outDir = path.join(tmpDir, 'dist');
      
      fs.writeFileSync(sourceFile, 'const x = 42;');
      
      execSync(`node ${GSC_BIN} -t native -b -a aarch64-macos -o ${outDir} ${sourceFile}`, {
        encoding: 'utf-8'
      });
      
      const binFile = path.join(outDir, 'test');
      const fileOutput = execSync(`file ${binFile}`, { encoding: 'utf-8' });
      expect(fileOutput).toContain('Mach-O');
      expect(fileOutput).toContain('arm64');
    });

    it('should cross-compile to WebAssembly', () => {
      if (!zigAvailable) {
        console.log('Skipping: Zig not available');
        return;
      }

      const sourceFile = path.join(tmpDir, 'test.gs.ts');
      const outDir = path.join(tmpDir, 'dist');
      
      fs.writeFileSync(sourceFile, 'const x = 42;');
      
      execSync(`node ${GSC_BIN} -t native -b -a wasm32-wasi -o ${outDir} ${sourceFile}`, {
        encoding: 'utf-8'
      });
      
      const binFile = path.join(outDir, 'test');
      const fileOutput = execSync(`file ${binFile}`, { encoding: 'utf-8' });
      expect(fileOutput).toContain('WebAssembly');
      expect(fileOutput).toContain('wasm');
    });
  });

  describe('Complex programs', () => {
    it('should compile programs with classes and methods', () => {
      if (!zigAvailable) {
        console.log('Skipping: Zig not available');
        return;
      }

      const sourceFile = path.join(tmpDir, 'test.gs.ts');
      const outDir = path.join(tmpDir, 'dist');
      
      fs.writeFileSync(sourceFile, `
        class Calculator {
          add(a: number, b: number): number {
            return a + b;
          }
        }
        
        const calc = new Calculator();
        const result = calc.add(10, 32);
        console.log(result);
      `);
      
      execSync(`node ${GSC_BIN} -t native -b -o ${outDir} ${sourceFile}`, {
        encoding: 'utf-8'
      });
      
      const binFile = path.join(outDir, 'test');
      const output = execSync(binFile, { encoding: 'utf-8' });
      
      expect(output.trim()).toBe('42');
    });

    it('should compile programs with arrays and loops', () => {
      if (!zigAvailable) {
        console.log('Skipping: Zig not available');
        return;
      }

      const sourceFile = path.join(tmpDir, 'test.gs.ts');
      const outDir = path.join(tmpDir, 'dist');
      
      fs.writeFileSync(sourceFile, `
        const numbers: number[] = [1, 2, 3, 4, 5];
        let sum = 0;
        for (const n of numbers) {
          sum = sum + n;
        }
        console.log(sum);
      `);
      
      execSync(`node ${GSC_BIN} -t native -b -o ${outDir} ${sourceFile}`, {
        encoding: 'utf-8'
      });
      
      const binFile = path.join(outDir, 'test');
      const output = execSync(binFile, { encoding: 'utf-8' });
      
      expect(output.trim()).toBe('15');
    });

    it('should compile programs with string operations', () => {
      if (!zigAvailable) {
        console.log('Skipping: Zig not available');
        return;
      }

      const sourceFile = path.join(tmpDir, 'test.gs.ts');
      const outDir = path.join(tmpDir, 'dist');
      
      fs.writeFileSync(sourceFile, `
        const first: string = "Hello";
        const second: string = "World";
        const greeting = first + ", " + second + "!";
        console.log(greeting);
      `);
      
      execSync(`node ${GSC_BIN} -t native -b -o ${outDir} ${sourceFile}`, {
        encoding: 'utf-8'
      });
      
      const binFile = path.join(outDir, 'test');
      const output = execSync(binFile, { encoding: 'utf-8' });
      
      expect(output.trim()).toBe('Hello, World!');
    });
  });

  describe('Error handling', () => {
    it('should report errors in source code', () => {
      const sourceFile = path.join(tmpDir, 'test.gs.ts');
      const outDir = path.join(tmpDir, 'dist');
      
      // Write code with a syntax error
      fs.writeFileSync(sourceFile, 'const x = ;');
      
      try {
        execSync(`node ${GSC_BIN} -t native -o ${outDir} ${sourceFile}`, {
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.status).not.toBe(0);
      }
    });

    it('should report ownership errors when present', () => {
      const sourceFile = path.join(tmpDir, 'test.gs.ts');
      const outDir = path.join(tmpDir, 'dist');
      
      // Write code with ownership cycle (should fail DAG check)
      // Self-reference creates a cycle in the ownership graph
      fs.writeFileSync(sourceFile, `
        class TreeNode {
          children: share<TreeNode>[] = [];
        }
        const node = new TreeNode();
      `);
      
      try {
        execSync(`node ${GSC_BIN} -t native -o ${outDir} ${sourceFile}`, {
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        expect.fail('Should have thrown an error for ownership cycle');
      } catch (error: any) {
        const output = error.stdout || error.stderr || error.message || '';
        // The compilation should fail with a cycle error
        expect(output).toContain('cycle');
      }
    });
  });

  describe('Combined flags', () => {
    it('should support combining multiple flags', () => {
      if (!zigAvailable) {
        console.log('Skipping: Zig not available');
        return;
      }

      const sourceFile = path.join(tmpDir, 'test.gs.ts');
      const outDir = path.join(tmpDir, 'dist');
      
      fs.writeFileSync(sourceFile, `
        const message = "Combined flags work!";
        console.log(message);
      `);
      
      // Combine target, compile-binary, arch, and output flags
      execSync(`node ${GSC_BIN} -t native -b -a x86_64-linux -o ${outDir} ${sourceFile}`, {
        encoding: 'utf-8'
      });
      
      const binFile = path.join(outDir, 'test');
      expect(fs.existsSync(binFile)).toBe(true);
      
      const fileOutput = execSync(`file ${binFile}`, { encoding: 'utf-8' });
      expect(fileOutput).toContain('ELF');
    });

    it('should work with verbose flag', () => {
      const sourceFile = path.join(tmpDir, 'test.gs.ts');
      const outDir = path.join(tmpDir, 'dist');
      
      fs.writeFileSync(sourceFile, 'const x = 42;');
      
      const output = execSync(`node ${GSC_BIN} -t native -o ${outDir} -v ${sourceFile}`, {
        encoding: 'utf-8'
      });
      
      expect(output).toContain('GoodScript Compiler');
      expect(output).toContain('Target: native');
    });
  });
});
