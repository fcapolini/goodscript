import { describe, it, expect } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import ts from 'typescript';
import { Validator } from '../src/frontend/validator.js';
import { IRLowering } from '../src/frontend/lowering.js';
import { CppCodegen } from '../src/backend/cpp/codegen.js';

const EXAMPLES_DIR = path.join(__dirname, '../../examples');

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
    it('should compile to C++', () => {
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
      
      const cppContent = Array.from(cppFiles.values()).join('\n');
      expect(cppContent).toContain('HTTPAsync::fetch');
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
