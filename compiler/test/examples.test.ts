import { describe, it, expect } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import ts from 'typescript';
import { execSync } from 'child_process';
import { Validator } from '../src/frontend/validator.js';
import { IRLowering } from '../src/frontend/lowering.js';
import { CppCodegen } from '../src/backend/cpp/codegen.js';

const EXAMPLES_DIR = path.join(__dirname, '../../examples');
const BUILD_DIR = path.join(__dirname, '../../build');
const GSC_BIN = path.join(__dirname, '../bin/gsc');

// Helper to create TypeScript program
function createProgram(files: string[]): ts.Program {
  return ts.createProgram(files, {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
    moduleResolution: ts.ModuleResolutionKind.Node10,
  });
}

// Helper to compile and run example using CLI
async function compileAndRun(exampleDir: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const examplePath = path.join(EXAMPLES_DIR, exampleDir);
  const tsconfigPath = path.join(examplePath, 'tsconfig.json');
  const distDir = path.join(examplePath, 'dist');
  
  // Read tsconfig to get output filename
  const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
  const outFile = tsconfig.goodscript?.outFile || exampleDir;
  const binaryPath = path.join(distDir, outFile);
  
  // Compile using CLI with project flag (run from example directory)
  try {
    execSync(`node ${GSC_BIN} --project tsconfig.json`, {
      cwd: examplePath,
      encoding: 'utf8',
      timeout: 30000,
      stdio: 'pipe'
    });
  } catch (error: any) {
    throw new Error(`CLI compilation failed: ${error.stderr || error.message}`);
  }
  
  // Run the binary
  try {
    const stdout = execSync(binaryPath, { encoding: 'utf8', timeout: 5000 });
    return { stdout, stderr: '', exitCode: 0 };
  } catch (error: any) {
    return { 
      stdout: error.stdout?.toString() || '', 
      stderr: error.stderr?.toString() || '', 
      exitCode: error.status || 1 
    };
  }
}

describe('Examples', () => {
  // Note: These tests validate TypeScript → IR → C++ compilation.
  // They do not test binary compilation or execution, which is covered by CLI tests.
  
  describe('01-hello-world', () => {
    it('should compile to C++', () => {
      const mainFile = path.join(EXAMPLES_DIR, '01-hello-world', 'src/main-gs.ts');
      const program = createProgram([mainFile]);
      const sourceFile = program.getSourceFile(mainFile);
      expect(sourceFile).toBeTruthy();
      
      const validator = new Validator();
      const diagnostics = validator.validate(sourceFile!);
      expect(diagnostics.filter(d => d.severity === 'error').length).toBe(0);
      
      const lowering = new IRLowering();
      const irProgram = lowering.lower(program);
      
      const codegen = new CppCodegen();
      const cppFiles = codegen.generate(irProgram, 'gc', false);
      expect(cppFiles.size).toBeGreaterThan(0);
      
      const cppContent = Array.from(cppFiles.values()).join('\n');
      expect(cppContent).toContain('Hello, GoodScript!');
    });
  });

  describe('02-variables-and-types', () => {
    it('should compile to C++', () => {
      const mainFile = path.join(EXAMPLES_DIR, '02-variables-and-types', 'src/main-gs.ts');
      const program = createProgram([mainFile]);
      const sourceFile = program.getSourceFile(mainFile);
      expect(sourceFile).toBeTruthy();
      
      const validator = new Validator();
      const diagnostics = validator.validate(sourceFile!);
      expect(diagnostics.filter(d => d.severity === 'error').length).toBe(0);
      
      const lowering = new IRLowering();
      const irProgram = lowering.lower(program);
      
      const codegen = new CppCodegen();
      const cppFiles = codegen.generate(irProgram, 'gc', false);
      expect(cppFiles.size).toBeGreaterThan(0);
      
      const cppContent = Array.from(cppFiles.values()).join('\n');
      expect(cppContent).toContain('message');
    });
  });

  describe('03-functions', () => {
    it('should compile to C++', () => {
      const mainFile = path.join(EXAMPLES_DIR, '03-functions', 'src/main-gs.ts');
      const program = createProgram([mainFile]);
      const sourceFile = program.getSourceFile(mainFile);
      expect(sourceFile).toBeTruthy();
      
      const validator = new Validator();
      const diagnostics = validator.validate(sourceFile!);
      expect(diagnostics.filter(d => d.severity === 'error').length).toBe(0);
      
      const lowering = new IRLowering();
      const irProgram = lowering.lower(program);
      
      const codegen = new CppCodegen();
      const cppFiles = codegen.generate(irProgram, 'gc', false);
      expect(cppFiles.size).toBeGreaterThan(0);
    });
  });

  describe('04-arrays', () => {
    it('should compile to C++', () => {
      const mainFile = path.join(EXAMPLES_DIR, '04-arrays', 'src/main-gs.ts');
      const program = createProgram([mainFile]);
      const sourceFile = program.getSourceFile(mainFile);
      expect(sourceFile).toBeTruthy();
      
      const validator = new Validator();
      const diagnostics = validator.validate(sourceFile!);
      expect(diagnostics.filter(d => d.severity === 'error').length).toBe(0);
      
      const lowering = new IRLowering();
      const irProgram = lowering.lower(program);
      
      const codegen = new CppCodegen();
      const cppFiles = codegen.generate(irProgram, 'gc', false);
      expect(cppFiles.size).toBeGreaterThan(0);
    });
  });

  describe('05-maps', () => {
    it('should compile to C++', () => {
      const mainFile = path.join(EXAMPLES_DIR, '05-maps', 'src/main-gs.ts');
      const program = createProgram([mainFile]);
      const sourceFile = program.getSourceFile(mainFile);
      expect(sourceFile).toBeTruthy();
      
      const validator = new Validator();
      const diagnostics = validator.validate(sourceFile!);
      expect(diagnostics.filter(d => d.severity === 'error').length).toBe(0);
      
      const lowering = new IRLowering();
      const irProgram = lowering.lower(program);
      
      const codegen = new CppCodegen();
      const cppFiles = codegen.generate(irProgram, 'gc', false);
      expect(cppFiles.size).toBeGreaterThan(0);
    });
  });

  describe('06-strings', () => {
    it('should compile to C++', () => {
      const mainFile = path.join(EXAMPLES_DIR, '06-strings', 'src/main-gs.ts');
      const program = createProgram([mainFile]);
      const sourceFile = program.getSourceFile(mainFile);
      expect(sourceFile).toBeTruthy();
      
      const validator = new Validator();
      const diagnostics = validator.validate(sourceFile!);
      expect(diagnostics.filter(d => d.severity === 'error').length).toBe(0);
      
      const lowering = new IRLowering();
      const irProgram = lowering.lower(program);
      
      const codegen = new CppCodegen();
      const cppFiles = codegen.generate(irProgram, 'gc', false);
      expect(cppFiles.size).toBeGreaterThan(0);
    });
  });

  describe('07-math', () => {
    it('should compile to C++', () => {
      const mainFile = path.join(EXAMPLES_DIR, '07-math', 'src/main-gs.ts');
      const program = createProgram([mainFile]);
      const sourceFile = program.getSourceFile(mainFile);
      expect(sourceFile).toBeTruthy();
      
      const validator = new Validator();
      const diagnostics = validator.validate(sourceFile!);
      expect(diagnostics.filter(d => d.severity === 'error').length).toBe(0);
      
      const lowering = new IRLowering();
      const irProgram = lowering.lower(program);
      
      const codegen = new CppCodegen();
      const cppFiles = codegen.generate(irProgram, 'gc', false);
      expect(cppFiles.size).toBeGreaterThan(0);
    });
  });

  describe('08-exceptions', () => {
    it('should compile to C++', () => {
      const mainFile = path.join(EXAMPLES_DIR, '08-exceptions', 'src/main-gs.ts');
      const program = createProgram([mainFile]);
      const sourceFile = program.getSourceFile(mainFile);
      expect(sourceFile).toBeTruthy();
      
      const validator = new Validator();
      const diagnostics = validator.validate(sourceFile!);
      expect(diagnostics.filter(d => d.severity === 'error').length).toBe(0);
      
      const lowering = new IRLowering();
      const irProgram = lowering.lower(program);
      
      const codegen = new CppCodegen();
      const cppFiles = codegen.generate(irProgram, 'gc', false);
      expect(cppFiles.size).toBeGreaterThan(0);
    });
  });

  describe('09-async-await', () => {
    it('should compile to C++', () => {
      const mainFile = path.join(EXAMPLES_DIR, '09-async-await', 'src/main-gs.ts');
      const program = createProgram([mainFile]);
      const sourceFile = program.getSourceFile(mainFile);
      expect(sourceFile).toBeTruthy();
      
      const validator = new Validator();
      const diagnostics = validator.validate(sourceFile!);
      expect(diagnostics.filter(d => d.severity === 'error').length).toBe(0);
      
      const lowering = new IRLowering();
      const irProgram = lowering.lower(program);
      
      const codegen = new CppCodegen();
      const cppFiles = codegen.generate(irProgram, 'gc', false);
      expect(cppFiles.size).toBeGreaterThan(0);
      
      const cppContent = Array.from(cppFiles.values()).join('\n');
      expect(cppContent).toContain('co_await');
    });
  });

  describe('10-file-io', () => {
    it('should compile to C++', () => {
      const mainFile = path.join(EXAMPLES_DIR, '10-file-io', 'src/main-gs.ts');
      const program = createProgram([mainFile]);
      const sourceFile = program.getSourceFile(mainFile);
      expect(sourceFile).toBeTruthy();
      
      const validator = new Validator();
      const diagnostics = validator.validate(sourceFile!);
      expect(diagnostics.filter(d => d.severity === 'error').length).toBe(0);
      
      const lowering = new IRLowering();
      const irProgram = lowering.lower(program);
      
      const codegen = new CppCodegen();
      const cppFiles = codegen.generate(irProgram, 'gc', false);
      expect(cppFiles.size).toBeGreaterThan(0);
      
      const cppContent = Array.from(cppFiles.values()).join('\n');
      expect(cppContent).toContain('FileSystem::');
    });
  });

  describe('11-http-client', () => {
    it('should compile to C++ (API demonstration)', () => {
      const mainFile = path.join(EXAMPLES_DIR, '11-http-client', 'src/main-gs.ts');
      const program = createProgram([mainFile]);
      const sourceFile = program.getSourceFile(mainFile);
      expect(sourceFile).toBeTruthy();
      
      const validator = new Validator();
      const diagnostics = validator.validate(sourceFile!);
      expect(diagnostics.filter(d => d.severity === 'error').length).toBe(0);
      
      const lowering = new IRLowering();
      const irProgram = lowering.lower(program);
      
      const codegen = new CppCodegen();
      const cppFiles = codegen.generate(irProgram, 'gc', false);
      expect(cppFiles.size).toBeGreaterThan(0);
      
      // This is a demo showing HTTP API structure, not actual HTTP calls
      const cppContent = Array.from(cppFiles.values()).join('\n');
      expect(cppContent).toContain('HttpResponse');
      expect(cppContent).toContain('createMockResponse');
    });
  });

  describe('12-classes', () => {
    it('should compile to C++', () => {
      const mainFile = path.join(EXAMPLES_DIR, '12-classes', 'src/main-gs.ts');
      const program = createProgram([mainFile]);
      const sourceFile = program.getSourceFile(mainFile);
      expect(sourceFile).toBeTruthy();
      
      const validator = new Validator();
      const diagnostics = validator.validate(sourceFile!);
      expect(diagnostics.filter(d => d.severity === 'error').length).toBe(0);
      
      const lowering = new IRLowering();
      const irProgram = lowering.lower(program);
      
      const codegen = new CppCodegen();
      const cppFiles = codegen.generate(irProgram, 'gc', false);
      expect(cppFiles.size).toBeGreaterThan(0);
    });
  });
});

describe('Examples - Compilation Only', () => {
  it('should compile all examples to C++ without errors', () => {
    const exampleDirs = fs.readdirSync(EXAMPLES_DIR)
      .filter(dir => dir.match(/^\d{2}-/))
      .filter(dir => {
        const mainFile = path.join(EXAMPLES_DIR, dir, 'src/main-gs.ts');
        return fs.existsSync(mainFile);
      });

    for (const exampleDir of exampleDirs) {
      const mainFile = path.join(EXAMPLES_DIR, exampleDir, 'src/main-gs.ts');
      
      const program = createProgram([mainFile]);
      const sourceFile = program.getSourceFile(mainFile);
      if (!sourceFile) {
        throw new Error(`Could not load source file: ${mainFile}`);
      }
      
      // Validate
      const validator = new Validator();
      const diagnostics = validator.validate(sourceFile);
      const errors = diagnostics.filter(d => d.severity === 'error');
      expect(errors.length).toBe(0);
      
      // Lower to IR
      const lowering = new IRLowering();
      const irProgram = lowering.lower(program);
      
      // Generate C++
      const codegen = new CppCodegen();
      const cppFiles = codegen.generate(irProgram, 'gc', false);
      expect(cppFiles.size).toBeGreaterThan(0);
    }
  });
});

describe('Examples - Execution', () => {
  // These tests compile examples to native binaries and execute them
  // Note: Some examples are skipped due to known codegen issues that need fixing
  
  describe('01-hello-world', () => {
    it('should execute and print hello world', async () => {
      const result = await compileAndRun('01-hello-world');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Hello, GoodScript!');
    });
  });

  describe('02-variables-and-types', () => {
    it('should execute and print variable values', async () => {
      const result = await compileAndRun('02-variables-and-types');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('String:');
      expect(result.stdout).toContain('Number:');
      expect(result.stdout).toContain('Boolean:');
    });
  });

  describe.skip('03-functions', () => {
    // TODO: Fix codegen - arrow functions at module level generate 'const void' instead of proper type
    it('should execute and call functions', async () => {
      const result = await compileAndRun('03-functions');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Sum:');
      expect(result.stdout).toContain('Uppercase:');
    });
  });

  describe.skip('04-arrays', () => {
    // TODO: Fix codegen issues with array operations
    it('should execute array operations', async () => {
      const result = await compileAndRun('04-arrays');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Array length:');
      expect(result.stdout).toContain('First element:');
    });
  });

  describe.skip('05-maps', () => {
    // TODO: Fix codegen issues with map operations
    it('should execute map operations', async () => {
      const result = await compileAndRun('05-maps');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Map size:');
    });
  });

  describe.skip('06-strings', () => {
    // TODO: Fix codegen issues with string operations
    it('should execute string operations', async () => {
      const result = await compileAndRun('06-strings');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Uppercase:');
      expect(result.stdout).toContain('Lowercase:');
    });
  });

  describe.skip('07-math', () => {
    // TODO: Fix codegen issues with math operations
    it('should execute math operations', async () => {
      const result = await compileAndRun('07-math');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Max:');
      expect(result.stdout).toContain('Min:');
    });
  });

  describe.skip('08-exceptions', () => {
    // TODO: Fix codegen issues with exception handling
    it('should execute and handle exceptions', async () => {
      const result = await compileAndRun('08-exceptions');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Error:');
      expect(result.stdout).toContain('Finally');
    });
  });

  describe.skip('09-async-await', () => {
    // TODO: Fix codegen issues with async/await
    it('should execute async functions', async () => {
      const result = await compileAndRun('09-async-await');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Async');
    });
  });

  describe.skip('10-file-io', () => {
    // TODO: Fix codegen issues with file I/O
    it('should execute file operations', async () => {
      const result = await compileAndRun('10-file-io');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('File');
    });
  });

  describe.skip('11-http-client', () => {
    // Skip: requires network connectivity
    it('should execute HTTP requests', async () => {
      const result = await compileAndRun('11-http-client');
      expect(result.exitCode).toBe(0);
    });
  });

  describe.skip('12-classes', () => {
    // TODO: Fix codegen - classes with constructors generate incorrect C++ code
    it('should execute class methods', async () => {
      const result = await compileAndRun('12-classes');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Person');
    });
  });
});
