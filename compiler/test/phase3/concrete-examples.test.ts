import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Compiler } from '../../src/compiler.js';
import { writeFileSync, mkdirSync, existsSync, readFileSync, rmSync, readdirSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { executeJS, executeRust, compareOutputs, isRustcAvailable } from './runtime-helpers.js';

/**
 * Concrete Examples - Real-world GoodScript programs
 * 
 * These tests dynamically discover example projects in the concrete-examples/
 * directory and validate that GoodScript can compile them to both TypeScript
 * and Rust, with equivalent runtime behavior.
 * 
 * Each example project should have the structure:
 *   example-name/
 *     src/
 *       main.gs.ts - Entry point source file
 * 
 * NOTE: Full Rust equivalence is a work in progress for complex examples
 * involving arrays, closures with mutable captures, and string methods.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const EXAMPLES_DIR = join(__dirname, 'concrete-examples');

/**
 * Discover all example directories in concrete-examples/
 */
const discoverExamples = (): string[] => {
  if (!existsSync(EXAMPLES_DIR)) {
    return [];
  }
  
  return readdirSync(EXAMPLES_DIR)
    .filter(name => {
      const fullPath = join(EXAMPLES_DIR, name);
      return statSync(fullPath).isDirectory();
    })
    .sort();
};

describe('Phase 3: Concrete Examples', () => {
  let tmpDir: string;
  let compiler: Compiler;

  beforeEach(() => {
    tmpDir = join(tmpdir(), 'goodscript-test-concrete-' + Date.now() + '-' + Math.random().toString(36).substring(7));
    mkdirSync(tmpDir, { recursive: true });
    compiler = new Compiler();
  });

  afterEach(() => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  const compileAndExecuteExample = (exampleName: string): {
    jsCode: string;
    rustCode: string;
    jsResult: ReturnType<typeof executeJS>;
    rustResult: ReturnType<typeof executeRust> | null;
    equivalent: boolean;
  } => {
    const exampleDir = join(EXAMPLES_DIR, exampleName);
    const srcFile = join(exampleDir, 'src', 'main.gs.ts');
    const outDir = join(tmpDir, exampleName, 'dist');
    
    if (!existsSync(srcFile)) {
      throw new Error(`Example ${exampleName} missing src/main.gs.ts`);
    }
    
    // Create a temporary tsconfig.json for this example
    const tsconfigPath = join(tmpDir, exampleName, 'tsconfig.json');
    mkdirSync(join(tmpDir, exampleName), { recursive: true });
    writeFileSync(tsconfigPath, JSON.stringify({
      compilerOptions: {
        target: 'ES2020',
        module: 'commonjs',
        lib: ['ES2020'],
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        outDir: './dist',
      },
      include: [join(exampleDir, 'src/**/*')],
    }, null, 2), 'utf-8');
    
    // Compile to JavaScript
    const jsCompileResult = compiler.compile({
      files: [srcFile],
      outDir,
      target: 'typescript',
      project: tsconfigPath,
    });
    
    const jsFile = join(outDir, 'main.js');
    const jsCode = existsSync(jsFile) ? readFileSync(jsFile, 'utf-8') : '';
    
    // Compile to Rust
    const rustCompileResult = compiler.compile({
      files: [srcFile],
      outDir,
      target: 'rust',
      project: tsconfigPath,
    });
    
    const rustFile = join(outDir, 'main.rs');
    const rustCode = existsSync(rustFile) ? readFileSync(rustFile, 'utf-8') : '';
    
    // Execute JavaScript
    const jsResult = executeJS(jsCode);
    
    // Execute Rust (only if rustc is available)
    let rustResult = null;
    let equivalent = false;
    
    if (isRustcAvailable() && rustCode) {
      rustResult = executeRust(rustCode);
      equivalent = compareOutputs(jsResult, rustResult);
    }
    
    return {
      jsCode,
      rustCode,
      jsResult,
      rustResult,
      equivalent,
    };
  };

  // Dynamically create test suites for each example
  const examples = discoverExamples();
  
  if (examples.length === 0) {
    it('should find at least one example', () => {
      expect(examples.length).toBeGreaterThan(0);
    });
  }

  for (const exampleName of examples) {
    describe(exampleName, () => {
      it('should compile to JavaScript and execute', () => {
        const result = compileAndExecuteExample(exampleName);
        
        // JavaScript compilation should succeed
        expect(result.jsCode).toBeTruthy();
        
        // JavaScript execution should succeed
        expect(result.jsResult.success).toBe(true);
        if (!result.jsResult.success) {
          console.error('JS execution failed:', result.jsResult.stderr || result.jsResult.error);
        }
        
        // Should produce output
        expect(result.jsResult.stdout).toBeTruthy();
      });

      it('should compile to Rust and execute', () => {
        const result = compileAndExecuteExample(exampleName);
        
        // Rust code should be generated
        expect(result.rustCode).toBeTruthy();
        
        // If rustc is available, Rust should compile and execute
        if (isRustcAvailable()) {
          expect(result.rustResult).not.toBeNull();
          
          if (result.rustResult) {
            // Rust compilation should succeed
            if (!result.rustResult.success) {
              console.error('\n=== Rust Compilation/Execution Failed ===');
              console.error('STDERR:', result.rustResult.stderr);
              console.error('STDOUT:', result.rustResult.stdout);
              console.error('Error:', result.rustResult.error);
              console.error('\n=== Generated Rust Code (first 50 lines) ===');
              console.error(result.rustCode.split('\n').slice(0, 50).join('\n'));
            }
            expect(result.rustResult.success).toBe(true);
            
            // Should produce output
            if (result.rustResult.success) {
              expect(result.rustResult.stdout).toBeTruthy();
            }
          }
        }
      });

      it('should produce equivalent JavaScript and Rust output', () => {
        const result = compileAndExecuteExample(exampleName);
        
        // Both should compile
        expect(result.jsCode).toBeTruthy();
        expect(result.rustCode).toBeTruthy();
        
        // JavaScript should execute successfully
        expect(result.jsResult.success).toBe(true);
        
        // If Rust is available and executes successfully, outputs should match
        if (isRustcAvailable() && result.rustResult !== null) {
          if (result.rustResult.success) {
            expect(result.equivalent).toBe(true);
            
            // If not equivalent, show the difference for debugging
            if (!result.equivalent) {
              console.log('\n=== JavaScript Output ===');
              console.log(result.jsResult.stdout);
              console.log('\n=== Rust Output ===');
              console.log(result.rustResult.stdout);
              console.log('\n=== Difference ===');
              console.log('JS lines:', result.jsResult.stdout.trim().split('\n').length);
              console.log('Rust lines:', result.rustResult.stdout.trim().split('\n').length);
            }
          }
        }
      });
    });
  }
});
