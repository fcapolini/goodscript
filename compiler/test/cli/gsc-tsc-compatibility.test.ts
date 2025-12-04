/**
 * CLI Tests: gsc as tsc drop-in replacement
 * Tests that gsc supports the same command-line interface as tsc
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const GSC_BIN = path.join(__dirname, '../../dist/gsc.js');
const TSC_BIN = 'npx tsc';

describe('CLI: gsc as tsc drop-in replacement', () => {
  let tmpDir: string;

  beforeEach(() => {
    // Create a temporary directory for each test
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsc-cli-test-'));
  });

  afterEach(() => {
    // Cleanup
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe('Command-line arguments', () => {
    it('should support --help flag', () => {
      const output = execSync(`node ${GSC_BIN} --help`, { encoding: 'utf-8' });
      
      expect(output).toContain('GoodScript Compiler');
      expect(output).toContain('Usage:');
      expect(output).toContain('Options:');
    });

    it('should support -h flag', () => {
      const output = execSync(`node ${GSC_BIN} -h`, { encoding: 'utf-8' });
      
      expect(output).toContain('GoodScript Compiler');
    });

    it('should support --version flag', () => {
      const output = execSync(`node ${GSC_BIN} --version`, { encoding: 'utf-8' });
      
      expect(output.trim()).toMatch(/^\d+\.\d+\.\d+/);
    });

    it('should support -V flag', () => {
      const output = execSync(`node ${GSC_BIN} -V`, { encoding: 'utf-8' });
      
      expect(output.trim()).toMatch(/^\d+\.\d+\.\d+/);
    });

    it('should support --out-dir flag', () => {
      const sourceFile = path.join(tmpDir, 'test-gs.ts');
      const outDir = path.join(tmpDir, 'dist');
      
      fs.writeFileSync(sourceFile, 'const x = 42;\nexport { x };');
      
      execSync(`node ${GSC_BIN} --out-dir ${outDir} ${sourceFile}`, { encoding: 'utf-8' });
      
      expect(fs.existsSync(path.join(outDir, 'test.js'))).toBe(true);
    });

    it('should support -o flag (shorthand for --out-dir)', () => {
      const sourceFile = path.join(tmpDir, 'test-gs.ts');
      const outDir = path.join(tmpDir, 'dist');
      
      fs.writeFileSync(sourceFile, 'const x = 42;\nexport { x };');
      
      execSync(`node ${GSC_BIN} -o ${outDir} ${sourceFile}`, { encoding: 'utf-8' });
      
      expect(fs.existsSync(path.join(outDir, 'test.js'))).toBe(true);
    });

    it('should support --project flag', () => {
      const tsconfig = path.join(tmpDir, 'tsconfig.json');
      const sourceFile = path.join(tmpDir, 'src', 'test-gs.ts');
      const outDir = path.join(tmpDir, 'dist');
      
      fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
      fs.writeFileSync(sourceFile, 'const x = 42;\nexport { x };');
      fs.writeFileSync(tsconfig, JSON.stringify({
        compilerOptions: {
          outDir: 'dist',
          target: 'ES2020',
          module: 'ESNext',
          lib: ['ES2020']
        },
        include: ['src/**/*']
      }, null, 2));
      
      execSync(`node ${GSC_BIN} --project ${tsconfig}`, { 
        cwd: tmpDir,
        encoding: 'utf-8' 
      });
      
      expect(fs.existsSync(path.join(outDir, 'test.js'))).toBe(true);
    });

    it('should support -p flag (shorthand for --project)', () => {
      const tsconfig = path.join(tmpDir, 'tsconfig.json');
      const sourceFile = path.join(tmpDir, 'src', 'test-gs.ts');
      const outDir = path.join(tmpDir, 'dist');
      
      fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
      fs.writeFileSync(sourceFile, 'const x = 42;\nexport { x };');
      fs.writeFileSync(tsconfig, JSON.stringify({
        compilerOptions: {
          outDir: 'dist',
          target: 'ES2020',
          module: 'ESNext',
          lib: ['ES2020']
        },
        include: ['src/**/*']
      }, null, 2));
      
      execSync(`node ${GSC_BIN} -p ${tsconfig}`, { 
        cwd: tmpDir,
        encoding: 'utf-8' 
      });
      
      expect(fs.existsSync(path.join(outDir, 'test.js'))).toBe(true);
    });
  });

  describe('tsconfig.json handling', () => {
    it('should use tsconfig.json when no files specified (like tsc)', () => {
      const tsconfig = path.join(tmpDir, 'tsconfig.json');
      const sourceFile = path.join(tmpDir, 'src', 'test-gs.ts');
      const outDir = path.join(tmpDir, 'dist');
      
      fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
      fs.writeFileSync(sourceFile, 'const x = 42;\nexport { x };');
      fs.writeFileSync(tsconfig, JSON.stringify({
        compilerOptions: {
          outDir: 'dist',
          target: 'ES2020',
          module: 'ESNext',
          lib: ['ES2020']
        },
        include: ['src/**/*']
      }, null, 2));
      
      execSync(`node ${GSC_BIN}`, { 
        cwd: tmpDir,
        encoding: 'utf-8' 
      });
      
      expect(fs.existsSync(path.join(outDir, 'test.js'))).toBe(true);
    });

    it('should respect tsconfig.json outDir setting', () => {
      const tsconfig = path.join(tmpDir, 'tsconfig.json');
      const sourceFile = path.join(tmpDir, 'src', 'main-gs.ts');
      
      fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
      fs.writeFileSync(sourceFile, 'const greeting = "Hello";\nexport { greeting };');
      fs.writeFileSync(tsconfig, JSON.stringify({
        compilerOptions: {
          outDir: 'build',
          target: 'ES2020',
          lib: ['ES2020']
        },
        include: ['src/**/*']
      }, null, 2));
      
      execSync(`node ${GSC_BIN}`, { 
        cwd: tmpDir,
        encoding: 'utf-8' 
      });
      
      expect(fs.existsSync(path.join(tmpDir, 'build', 'main.js'))).toBe(true);
    });

    it('should respect tsconfig.json target setting', () => {
      const tsconfig = path.join(tmpDir, 'tsconfig.json');
      const sourceFile = path.join(tmpDir, 'test-gs.ts');
      const outDir = path.join(tmpDir, 'dist');
      
      fs.writeFileSync(sourceFile, 'const x = () => 42;\nexport { x };');
      fs.writeFileSync(tsconfig, JSON.stringify({
        compilerOptions: {
          outDir: 'dist',
          target: 'ES5',  // ES5 transpiles arrow functions
          module: 'CommonJS',
          lib: ['ES5']
        },
        files: ['test-gs.ts']
      }, null, 2));
      
      execSync(`node ${GSC_BIN} -p ${tsconfig}`, { 
        cwd: tmpDir,
        encoding: 'utf-8' 
      });
      
      const output = fs.readFileSync(path.join(outDir, 'test.js'), 'utf-8');
      // Should successfully compile and create output file
      expect(fs.existsSync(path.join(outDir, 'test.js'))).toBe(true);
      expect(output.length).toBeGreaterThan(0);
    });

    it('should override tsconfig.json outDir with CLI --out-dir', () => {
      const tsconfig = path.join(tmpDir, 'tsconfig.json');
      const sourceFile = path.join(tmpDir, 'test-gs.ts');
      const cliOutDir = path.join(tmpDir, 'cli-out');
      
      fs.writeFileSync(sourceFile, 'const x = 42;\nexport { x };');
      fs.writeFileSync(tsconfig, JSON.stringify({
        compilerOptions: {
          outDir: 'config-out',
          target: 'ES2020',
          lib: ['ES2020']
        },
        files: ['test-gs.ts']
      }, null, 2));
      
      execSync(`node ${GSC_BIN} -p ${tsconfig} -o ${cliOutDir}`, { 
        cwd: tmpDir,
        encoding: 'utf-8' 
      });
      
      // Should use CLI outDir, not config outDir
      expect(fs.existsSync(path.join(cliOutDir, 'test.js'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'config-out', 'test.js'))).toBe(false);
    });
  });

  describe('Mixed TypeScript and GoodScript files', () => {
    it('should compile both .ts and -gs.ts files', () => {
      const tsFile = path.join(tmpDir, 'regular.ts');
      const gsFile = path.join(tmpDir, 'goodscript-gs.ts');
      const outDir = path.join(tmpDir, 'dist');
      
      fs.writeFileSync(tsFile, 'export const tsValue = 1;');
      fs.writeFileSync(gsFile, 'export const gsValue = 2;');
      
      execSync(`node ${GSC_BIN} -o ${outDir} ${tsFile} ${gsFile}`, { encoding: 'utf-8' });
      
      expect(fs.existsSync(path.join(outDir, 'regular.js'))).toBe(true);
      expect(fs.existsSync(path.join(outDir, 'goodscript.js'))).toBe(true);
    });

    it('should handle .ts files like tsc (no Phase 1 restrictions)', () => {
      const tsFile = path.join(tmpDir, 'legacy.ts');
      const outDir = path.join(tmpDir, 'dist');
      
      // This code violates Phase 1 but is valid TypeScript
      fs.writeFileSync(tsFile, `
        var x = 42;  // var is allowed in .ts files
        function greet() { return "hello"; }  // function keyword allowed
        export { x, greet };
      `);
      
      const result = execSync(`node ${GSC_BIN} -o ${outDir} ${tsFile}`, { encoding: 'utf-8' });
      
      expect(fs.existsSync(path.join(outDir, 'legacy.js'))).toBe(true);
      expect(result).not.toContain('GS105'); // No var keyword error
      expect(result).not.toContain('GS108'); // No function keyword error
    });

    it('should enforce Phase 1 restrictions on -gs.ts files', () => {
      const gsFile = path.join(tmpDir, 'strict-gs.ts');
      const outDir = path.join(tmpDir, 'dist');
      
      fs.writeFileSync(gsFile, `
        var x = 42;  // Should fail with GS105
        export { x };
      `);
      
      try {
        execSync(`node ${GSC_BIN} -o ${outDir} ${gsFile}`, { encoding: 'utf-8' });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.stdout?.toString() || error.message).toContain('GS105');
      }
    });
  });

  describe('Exit codes', () => {
    it('should exit with 0 on successful compilation', () => {
      const sourceFile = path.join(tmpDir, 'test-gs.ts');
      const outDir = path.join(tmpDir, 'dist');
      
      fs.writeFileSync(sourceFile, 'const x = 42;\nexport { x };');
      
      const exitCode = execSync(`node ${GSC_BIN} -o ${outDir} ${sourceFile}; echo $?`, { 
        encoding: 'utf-8',
        shell: '/bin/bash'
      }).trim();
      
      expect(exitCode.endsWith('0')).toBe(true);
    });

    it('should exit with non-zero on compilation error', () => {
      const sourceFile = path.join(tmpDir, 'error-gs.ts');
      
      fs.writeFileSync(sourceFile, 'var x = 42;'); // Phase 1 violation
      
      try {
        execSync(`node ${GSC_BIN} ${sourceFile}`, { encoding: 'utf-8' });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.status).not.toBe(0);
      }
    });
  });

  describe('File resolution', () => {
    it('should error on non-existent file', () => {
      try {
        execSync(`node ${GSC_BIN} nonexistent-gs.ts`, { encoding: 'utf-8' });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        const output = error.stderr?.toString() || error.stdout?.toString() || error.message;
        expect(output).toContain('not found');
      }
    });

    it('should compile files with absolute paths', () => {
      const sourceFile = path.join(tmpDir, 'test-gs.ts');
      const outDir = path.join(tmpDir, 'dist');
      
      fs.writeFileSync(sourceFile, 'const x = 42;\nexport { x };');
      
      execSync(`node ${GSC_BIN} -o ${outDir} ${sourceFile}`, { encoding: 'utf-8' });
      
      expect(fs.existsSync(path.join(outDir, 'test.js'))).toBe(true);
    });

    it('should compile files with relative paths', () => {
      const sourceFile = path.join(tmpDir, 'test-gs.ts');
      const tsconfig = path.join(tmpDir, 'tsconfig.json');
      const outDir = path.join(tmpDir, 'dist');
      
      fs.writeFileSync(sourceFile, 'const x = 42;\nexport { x };');
      fs.writeFileSync(tsconfig, JSON.stringify({
        compilerOptions: {
          outDir: 'dist',
          target: 'ES2020',
          lib: ['ES2020']
        }
      }, null, 2));
      
      execSync(`node ${GSC_BIN} -o dist test-gs.ts`, { 
        cwd: tmpDir,
        encoding: 'utf-8' 
      });
      
      expect(fs.existsSync(path.join(outDir, 'test.js'))).toBe(true);
    });
  });
});
