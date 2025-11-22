import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Compiler } from '../../src/compiler.js';
import { writeFileSync, mkdirSync, existsSync, readFileSync, rmSync, readdirSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { executeJS, executeCpp, compareOutputs, isCppCompilerAvailable } from './runtime-helpers.js';

/**
 * Concrete Examples - Real-world GoodScript programs
 * 
 * These tests dynamically discover example projects in the concrete-examples/
 * directory and validate that GoodScript can compile them to both TypeScript
 * and native, with equivalent runtime behavior.
 * 
 * Each example project should have the structure:
 *   example-name/
 *     src/
 *       main.gs.ts - Entry point source file
 * 
 * NOTE: Full native equivalence is a work in progress for complex examples
 * involving arrays, closures, and string methods.
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

/**
 * Compile C++ source to binary and keep it in the dist directory
 */
const compileCppBinary = (cppFile: string, outDir: string, exampleName: string): boolean => {
  if (!isCppCompilerAvailable()) {
    return false;
  }
  
  const binFile = join(outDir, exampleName);
  
  try {
    execSync(
      `g++ -std=c++17 ${cppFile} -o ${binFile} 2>&1`,
      { encoding: 'utf-8', timeout: 30000 }
    );
    return true;
  } catch (error: any) {
    console.error(`Failed to compile C++ binary for ${exampleName}:`, error.stdout || error.stderr || error.message);
    return false;
  }
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
    cppCode: string;
    jsResult: ReturnType<typeof executeJS>;
    nativeResult: ReturnType<typeof executeCpp> | null;
    equivalent: boolean;
  } => {
    const exampleDir = join(EXAMPLES_DIR, exampleName);
    const srcFile = join(exampleDir, 'src', 'main.gs.ts');
    // Use the example's own dist directory
    const outDir = join(exampleDir, 'dist');
    
    if (!existsSync(srcFile)) {
      throw new Error(`Example ${exampleName} missing src/main.gs.ts`);
    }
    
    // Ensure the dist directory exists
    mkdirSync(outDir, { recursive: true });
    
    // Use the example's tsconfig.json if it exists, otherwise create a temporary one
    const exampleTsconfigPath = join(exampleDir, 'tsconfig.json');
    const tsconfigPath = existsSync(exampleTsconfigPath) 
      ? exampleTsconfigPath
      : join(tmpDir, exampleName, 'tsconfig.json');
    
    // Create temporary tsconfig only if the example doesn't have one
    if (!existsSync(exampleTsconfigPath)) {
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
        goodscript: {
          level: 'native',
        },
        include: [join(exampleDir, 'src/**/*')],
      }, null, 2), 'utf-8');
    }
    
    // Compile to JavaScript
    const jsCompileResult = compiler.compile({
      files: [srcFile],
      outDir,
      target: 'typescript',
      project: tsconfigPath,
    });
    
    const jsFile = join(outDir, 'main.js');
    const jsCode = existsSync(jsFile) ? readFileSync(jsFile, 'utf-8') : '';
    
    // Compile to C++
    const cppCompileResult = compiler.compile({
      files: [srcFile],
      outDir,
      target: 'native',
      project: tsconfigPath,
    });
    
    const cppFile = join(outDir, 'main.cpp');
    const cppCode = existsSync(cppFile) ? readFileSync(cppFile, 'utf-8') : '';
    
    // Compile native binary and keep it in the dist directory
    let nativeBinaryCompiled = false;
    if (isCppCompilerAvailable() && cppCode) {
      nativeBinaryCompiled = compileCppBinary(cppFile, outDir, exampleName);
    }
    
    // Execute JavaScript
    const jsResult = executeJS(jsCode);
    
    // Execute native (only if C++ compiler is available)
    let nativeResult = null;
    let equivalent = false;
    
    if (isCppCompilerAvailable() && cppCode && nativeBinaryCompiled) {
      nativeResult = executeCpp(cppCode, join(outDir, exampleName));
      equivalent = compareOutputs(jsResult, nativeResult);
    }
    
    return {
      jsCode,
      cppCode,
      jsResult,
      nativeResult,
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

  // No examples currently have unresolved GS303 errors
  const examplesWithGS303Errors = new Set<string>();

  for (const exampleName of examples) {
    describe(exampleName, () => {
      const skipDueToGS303 = examplesWithGS303Errors.has(exampleName);
      
      it.skipIf(skipDueToGS303)('should compile to JavaScript and execute', () => {
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

      it.skipIf(skipDueToGS303)('should compile to C++ and execute', () => {
        const result = compileAndExecuteExample(exampleName);
        
        // C++ code should be generated
        expect(result.cppCode).toBeTruthy();
        
        // If C++ compiler is available, C++ should compile and execute
        if (isCppCompilerAvailable()) {
          expect(result.nativeResult).not.toBeNull();
          
          if (result.nativeResult !== null) {
            // C++ compilation should succeed
            if (!result.nativeResult.success) {
              console.error('\n=== C++ Compilation/Execution Failed ===');
              console.error('STDERR:', result.nativeResult.stderr);
              console.error('STDOUT:', result.nativeResult.stdout);
              console.error('Error:', result.nativeResult.error);
              console.error('\n=== Generated C++ Code (first 50 lines) ===');
              console.error(result.cppCode.split('\n').slice(0, 50).join('\n'));
            }
            expect(result.nativeResult.success).toBe(true);
            
            // Should produce output
            if (result.nativeResult.success) {
              expect(result.nativeResult.stdout).toBeTruthy();
            }
          }
        }
      });

      it.skipIf(skipDueToGS303)('should produce equivalent JavaScript and C++ output', () => {
        const result = compileAndExecuteExample(exampleName);
        
        // Both should compile
        expect(result.jsCode).toBeTruthy();
        expect(result.cppCode).toBeTruthy();
        
        // JavaScript should execute successfully
        expect(result.jsResult.success).toBe(true);
        
        // If C++ is available and executes successfully, outputs should match
        if (isCppCompilerAvailable() && result.nativeResult !== null) {
          if (result.nativeResult.success) {
            expect(result.equivalent).toBe(true);
            
            // If not equivalent, show the difference for debugging
            if (!result.equivalent) {
              console.log('\n=== JavaScript Output ===');
              console.log(result.jsResult.stdout);
              console.log('\n=== C++ Output ===');
              console.log(result.nativeResult.stdout);
              console.log('\n=== Difference ===');
              console.log('JS lines:', result.jsResult.stdout.trim().split('\n').length);
              console.log('C++ lines:', result.nativeResult.stdout.trim().split('\n').length);
            }
          }
        }
      });
    });
  }
});
