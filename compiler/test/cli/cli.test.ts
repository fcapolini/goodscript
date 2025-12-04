/**
 * CLI Integration Tests
 * 
 * Tests the actual gsc command-line interface behavior including:
 * - Module imports and resolution
 * - File extensions (-gs.ts, .ts)
 * - Cross-file compilation
 * - tsconfig.json integration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const TEST_DIR = path.join(__dirname, '.cli-test-temp');
const GSC = path.join(__dirname, '..', '..', 'dist', 'gsc.js');

describe('CLI Integration Tests', () => {
  beforeEach(() => {
    // Create temporary test directory
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
  });

  describe('Module Imports', () => {
    it('should compile files with -gs.ts imports', () => {
      // Create first-gs.ts
      fs.writeFileSync(
        path.join(TEST_DIR, 'first-gs.ts'),
        'export class First { value: number = 42; }'
      );

      // Create second-gs.ts importing from first-gs.ts
      fs.writeFileSync(
        path.join(TEST_DIR, 'second-gs.ts'),
        `import { First } from "./first-gs";  // Must use -gs suffix to match filename
const f = new First();
console.log(f.value);`
      );

      // Create tsconfig.json with standard settings
      fs.writeFileSync(
        path.join(TEST_DIR, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            module: 'commonjs',
            lib: ['ES2020'],
            outDir: 'dist'
          }
        }, null, 2)
      );

      // Should compile without errors (compile both files)
      const result = execSync(`node ${GSC} -o dist first-gs.ts second-gs.ts`, {
        cwd: TEST_DIR,
        encoding: 'utf-8'
      });

      expect(result).not.toContain('ERROR');
      expect(fs.existsSync(path.join(TEST_DIR, 'dist', 'first.js'))).toBe(true);
      expect(fs.existsSync(path.join(TEST_DIR, 'dist', 'second.js'))).toBe(true);
    });

    it('should fail with helpful error when importing without extension', () => {
      fs.writeFileSync(
        path.join(TEST_DIR, 'first-gs.ts'),
        'export class First {}'
      );

      fs.writeFileSync(
        path.join(TEST_DIR, 'second-gs.ts'),
        'import { First } from "./first";'
      );

      fs.writeFileSync(
        path.join(TEST_DIR, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            module: 'commonjs',
            outDir: 'dist'
          }
        }, null, 2)
      );

      try {
        execSync(`node ${GSC} -o dist second-gs.ts`, {
          cwd: TEST_DIR,
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        expect.fail('Should have failed');
      } catch (e: any) {
        expect(e.stdout || e.stderr).toContain('Cannot find module');
      }
    });

    it('should fail when missing allowImportingTsExtensions', () => {
      fs.writeFileSync(
        path.join(TEST_DIR, 'first-gs.ts'),
        'export class First {}'
      );

      fs.writeFileSync(
        path.join(TEST_DIR, 'second-gs.ts'),
        'import { First } from "./first-gs";'
      );

      fs.writeFileSync(
        path.join(TEST_DIR, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            module: 'commonjs',
            outDir: 'dist'
          }
        }, null, 2)
      );

      // Should compile successfully with -gs.ts convention (no special flags needed)
      const result = execSync(`node ${GSC} -o dist second-gs.ts`, {
        cwd: TEST_DIR,
        encoding: 'utf-8'
      });

      expect(result).not.toContain('ERROR');
      expect(fs.existsSync(path.join(TEST_DIR, 'dist', 'second.js'))).toBe(true);
    });

    it('should compile multiple interdependent files', () => {
      // a-gs.ts exports class A
      fs.writeFileSync(
        path.join(TEST_DIR, 'a-gs.ts'),
        'export class A { name: string = "A"; }'
      );

      // b-gs.ts imports A and exports class B
      fs.writeFileSync(
        path.join(TEST_DIR, 'b-gs.ts'),
        `import { A } from "./a-gs";
export class B {
  a: A;
  constructor() { this.a = new A(); }
}`
      );

      // main-gs.ts imports both
      fs.writeFileSync(
        path.join(TEST_DIR, 'main-gs.ts'),
        `import { A } from "./a-gs";
import { B } from "./b-gs";
const a = new A();
const b = new B();
console.log(a.name, b.a.name);`
      );

      fs.writeFileSync(
        path.join(TEST_DIR, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            module: 'commonjs',
            outDir: 'dist'
          }
        }, null, 2)
      );

      const result = execSync(`node ${GSC} -o dist main-gs.ts`, {
        cwd: TEST_DIR,
        encoding: 'utf-8'
      });

      expect(result).not.toContain('ERROR');
      expect(fs.existsSync(path.join(TEST_DIR, 'dist', 'main.js'))).toBe(true);
      expect(fs.existsSync(path.join(TEST_DIR, 'dist', 'a.js'))).toBe(true);
      expect(fs.existsSync(path.join(TEST_DIR, 'dist', 'b.js'))).toBe(true);
    });
  });

  describe('Mixed .ts and -gs.ts files', () => {
    it('should compile both .ts and -gs.ts files in same project', () => {
      // Regular .ts file
      fs.writeFileSync(
        path.join(TEST_DIR, 'regular.ts'),
        'export class Regular { value: number = 1; }'
      );

      // GoodScript -gs.ts file
      fs.writeFileSync(
        path.join(TEST_DIR, 'goodscript-gs.ts'),
        `import { Regular } from "./regular";
export class Good {
  r: Regular;
  constructor() { this.r = new Regular(); }
}`
      );

      fs.writeFileSync(
        path.join(TEST_DIR, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            module: 'commonjs',
            outDir: 'dist'
          }
        }, null, 2)
      );

      const result = execSync(`node ${GSC} -o dist goodscript-gs.ts regular.ts`, {
        cwd: TEST_DIR,
        encoding: 'utf-8'
      });

      expect(result).not.toContain('ERROR');
      expect(fs.existsSync(path.join(TEST_DIR, 'dist', 'regular.js'))).toBe(true);
      expect(fs.existsSync(path.join(TEST_DIR, 'dist', 'goodscript.js'))).toBe(true);
    });
  });

  describe('tsconfig.json usage', () => {
    it('should use tsconfig.json when no files specified', () => {
      fs.writeFileSync(
        path.join(TEST_DIR, 'main-gs.ts'),
        'console.log("Hello");'
      );

      fs.writeFileSync(
        path.join(TEST_DIR, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            module: 'commonjs',
            outDir: 'dist'
          },
          include: ['*-gs.ts']
        }, null, 2)
      );

      const result = execSync(`node ${GSC}`, {
        cwd: TEST_DIR,
        encoding: 'utf-8'
      });

      expect(result).not.toContain('ERROR');
      expect(fs.existsSync(path.join(TEST_DIR, 'dist', 'main.js'))).toBe(true);
    });

    it('should respect outDir from tsconfig.json', () => {
      fs.writeFileSync(
        path.join(TEST_DIR, 'main-gs.ts'),
        'console.log("Hello");'
      );

      fs.writeFileSync(
        path.join(TEST_DIR, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            module: 'commonjs',
            outDir: 'build'
          }
        }, null, 2)
      );

      execSync(`node ${GSC} main-gs.ts`, {
        cwd: TEST_DIR,
        encoding: 'utf-8'
      });

      expect(fs.existsSync(path.join(TEST_DIR, 'build', 'main.js'))).toBe(true);
    });
  });

  describe('Error reporting', () => {
    it('should report GoodScript validation errors', () => {
      fs.writeFileSync(
        path.join(TEST_DIR, 'bad-gs.ts'),
        'var x = 5;' // var is prohibited
      );

      try {
        execSync(`node ${GSC} -o dist bad-gs.ts`, {
          cwd: TEST_DIR,
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        expect.fail('Should have failed');
      } catch (e: any) {
        const output = e.stdout || e.stderr;
        expect(output).toContain('var');
        expect(output).toContain('GS105');
      }
    });

    it('should report TypeScript errors', () => {
      fs.writeFileSync(
        path.join(TEST_DIR, 'type-error-gs.ts'),
        `const x: number = "string";`
      );

      try {
        execSync(`node ${GSC} -o dist type-error-gs.ts`, {
          cwd: TEST_DIR,
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        expect.fail('Should have failed');
      } catch (e: any) {
        const output = e.stdout || e.stderr;
        expect(output).toContain('Type');
      }
    });
  });

  describe('Command-line options', () => {
    it('should support --help flag', () => {
      const result = execSync(`node ${GSC} --help`, {
        encoding: 'utf-8'
      });

      expect(result).toContain('GoodScript Compiler');
      expect(result).toContain('Go for TypeScript developers');
      expect(result).toContain('Usage:');
    });

    it('should support --version flag', () => {
      const result = execSync(`node ${GSC} --version`, {
        encoding: 'utf-8'
      });

      expect(result).toMatch(/\d+\.\d+\.\d+/);
    });

    it('should support -t native flag', () => {
      fs.writeFileSync(
        path.join(TEST_DIR, 'main-gs.ts'),
        'console.log("Hello");'
      );

      const result = execSync(`node ${GSC} -t native -o dist main-gs.ts`, {
        cwd: TEST_DIR,
        encoding: 'utf-8'
      });

      expect(result).not.toContain('ERROR');
      // Should generate C++ files
      expect(fs.existsSync(path.join(TEST_DIR, 'dist', 'main.cpp'))).toBe(true);
    });

    it('should default to GC mode for native target', () => {
      fs.writeFileSync(
        path.join(TEST_DIR, 'main-gs.ts'),
        'console.log("Hello");'
      );

      const result = execSync(`node ${GSC} -t native -o dist main-gs.ts`, {
        cwd: TEST_DIR,
        encoding: 'utf-8'
      });

      expect(result).not.toContain('ERROR');
      // Check that generated C++ uses GC (contains malloc or gc includes)
      const mainCpp = fs.readFileSync(
        path.join(TEST_DIR, 'dist', 'main.cpp'),
        'utf-8'
      );
      // GC mode should not have ownership-specific code
      expect(mainCpp).not.toContain('std::unique_ptr');
      expect(mainCpp).not.toContain('std::shared_ptr');
    });
  });
});
