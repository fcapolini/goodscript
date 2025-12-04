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

    it('should validate .ts file imported by -gs.ts file', () => {
      // Regular .ts file with prohibited var keyword
      fs.writeFileSync(
        path.join(TEST_DIR, 'lib.ts'),
        'export var badVar = 5;'  // var is prohibited
      );

      // GoodScript -gs.ts file importing the bad .ts file
      fs.writeFileSync(
        path.join(TEST_DIR, 'main-gs.ts'),
        `import { badVar } from "./lib";
console.log(badVar);`
      );

      fs.writeFileSync(
        path.join(TEST_DIR, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            module: 'commonjs',
            outDir: 'dist'
          },
          goodscript: {
            level: 1  // Phase 1 validation - validates ALL files
          }
        }, null, 2)
      );

      try {
        execSync(`node ${GSC} -o dist main-gs.ts`, {
          cwd: TEST_DIR,
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        expect.fail('Should have failed due to var in imported file');
      } catch (e: any) {
        const output = e.stdout || e.stderr;
        expect(output).toContain('var');
        expect(output).toContain('GS105');
        expect(output).toContain('lib.ts');  // Error should reference the imported file
      }
    });

    it('should validate transitively imported files', () => {
      // a.ts with prohibited feature
      fs.writeFileSync(
        path.join(TEST_DIR, 'a.ts'),
        'export var bad = true;'  // var is prohibited
      );

      // b.ts imports a.ts (both regular .ts files)
      fs.writeFileSync(
        path.join(TEST_DIR, 'b.ts'),
        `import { bad } from "./a";
export const value = bad === true ? 1 : 0;`
      );

      // main-gs.ts imports b.ts (GoodScript imports regular TS)
      fs.writeFileSync(
        path.join(TEST_DIR, 'main-gs.ts'),
        `import { value } from "./b";
console.log(value);`
      );

      fs.writeFileSync(
        path.join(TEST_DIR, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            module: 'commonjs',
            outDir: 'dist'
          },
          goodscript: {
            level: 1  // Phase 1 validation
          }
        }, null, 2)
      );

      try {
        execSync(`node ${GSC} -o dist main-gs.ts`, {
          cwd: TEST_DIR,
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        expect.fail('Should have failed due to var in transitively imported file');
      } catch (e: any) {
        const output = e.stdout || e.stderr;
        expect(output).toContain('var');
        expect(output).toContain('GS105');
        expect(output).toContain('a.ts');  // Error should reference the transitively imported file
      }
    });

    it('should validate ALL files when level >= 1', () => {
      // standalone.ts with prohibited feature
      fs.writeFileSync(
        path.join(TEST_DIR, 'standalone.ts'),
        'export var bad = 5;'  // var is prohibited
      );

      // main-gs.ts doesn't import standalone.ts, but it's in the compilation
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
          goodscript: {
            level: 1  // Phase 1 validation validates ALL files
          }
        }, null, 2)
      );

      // Should FAIL - level 1 validates all files
      try {
        execSync(`node ${GSC} -o dist main-gs.ts standalone.ts`, {
          cwd: TEST_DIR,
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        expect.fail('Should have failed - GoodScript entry point validates all files');
      } catch (e: any) {
        const output = e.stdout || e.stderr;
        expect(output).toContain('var');
        expect(output).toContain('GS105');
        expect(output).toContain('standalone.ts');
      }
    });

    it('should NOT validate when level is 0 (default for typescript target)', () => {
      // GoodScript -gs.ts file
      fs.writeFileSync(
        path.join(TEST_DIR, 'lib-gs.ts'),
        'export class Lib { value: number = 42; }'
      );

      // Regular .ts file (entry point) importing GoodScript file - can use any TS features
      fs.writeFileSync(
        path.join(TEST_DIR, 'main.ts'),
        `import { Lib } from "./lib-gs";
var x = 5;  // var is allowed - entry point is .ts, not -gs.ts
const lib = new Lib();
console.log(lib.value, x);`
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

      // Should compile successfully - level defaults to 0 for typescript target
      const result = execSync(`node ${GSC} -o dist main.ts lib-gs.ts`, {
        cwd: TEST_DIR,
        encoding: 'utf-8'
      });

      expect(result).not.toContain('ERROR');
      expect(fs.existsSync(path.join(TEST_DIR, 'dist', 'main.js'))).toBe(true);
      expect(fs.existsSync(path.join(TEST_DIR, 'dist', 'lib.js'))).toBe(true);
    });

    it('should provide helpful context when validating imported files', () => {
      // lib.ts with prohibited feature
      fs.writeFileSync(
        path.join(TEST_DIR, 'lib.ts'),
        'export var bad = true;'  // var is prohibited
      );

      // main-gs.ts imports lib.ts
      fs.writeFileSync(
        path.join(TEST_DIR, 'main-gs.ts'),
        `import { bad } from "./lib";
console.log(bad);`
      );

      fs.writeFileSync(
        path.join(TEST_DIR, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            module: 'commonjs',
            outDir: 'dist'
          },
          goodscript: {
            level: 1  // Phase 1 validation
          }
        }, null, 2)
      );

      try {
        execSync(`node ${GSC} -o dist main-gs.ts`, {
          cwd: TEST_DIR,
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        expect.fail('Should have failed');
      } catch (e: any) {
        const output = e.stdout || e.stderr;
        // Should report the error in lib.ts
        expect(output).toContain('var');
        expect(output).toContain('GS105');
        expect(output).toContain('lib.ts');
      }
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

      fs.writeFileSync(
        path.join(TEST_DIR, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            module: 'commonjs',
            outDir: 'dist'
          },
          goodscript: {
            level: 1  // Enable Phase 1 validation
          }
        }, null, 2)
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
