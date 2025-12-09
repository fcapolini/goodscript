/**
 * Tests for FileSystem built-in class
 * Phase 7b.2 Step 1: Built-in FileSystem support
 */

import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { IRLowering } from '../src/frontend/lowering.js';
import { CppCodegen } from '../src/backend/cpp/codegen.js';

function createProgram(source: string): ts.Program {
  const sourceFile = ts.createSourceFile(
    'test.ts',
    source,
    ts.ScriptTarget.Latest,
    true
  );

  const host: ts.CompilerHost = {
    getSourceFile: (fileName) => fileName === 'test.ts' ? sourceFile : undefined,
    writeFile: () => {},
    getCurrentDirectory: () => '',
    getDirectories: () => [],
    fileExists: () => true,
    readFile: () => '',
    getCanonicalFileName: (fileName) => fileName,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
    getDefaultLibFileName: (options) => ts.getDefaultLibFileName(options),
  };

  return ts.createProgram(['test.ts'], {}, host);
}

describe('FileSystem Built-in', () => {
  describe('Static method calls', () => {
    it('should generate code for FileSystem.exists()', () => {
      const source = `
        const fileExists = FileSystem.exists('test.txt');
      `;

      const program = createProgram(source);
      const lowering = new IRLowering();
      const ir = lowering.lower(program);

      const codegen = new CppCodegen('gc');
      const files = codegen.generate(ir);
      const code = Array.from(files.values()).join('\n');

      expect(code).toContain('gs::FileSystem::exists');
      expect(code).toContain('gs::String("test.txt")');
    });

    it('should generate code for FileSystem.readText()', () => {
      const source = `
        const content = FileSystem.readText('file.txt');
      `;

      const program = createProgram(source);
      const lowering = new IRLowering();
      const ir = lowering.lower(program);

      const codegen = new CppCodegen('gc');
      const files = codegen.generate(ir);
      const code = Array.from(files.values()).join('\n');

      expect(code).toContain('gs::FileSystem::readText');
      expect(code).toContain('gs::String("file.txt")');
    });

    it('should generate code for FileSystem.writeText()', () => {
      const source = `
        function writeFile(): void {
          FileSystem.writeText('output.txt', 'Hello, World!');
        }
      `;

      const program = createProgram(source);
      const lowering = new IRLowering();
      const ir = lowering.lower(program);

      const codegen = new CppCodegen('gc');
      const files = codegen.generate(ir);
      const code = Array.from(files.values()).join('\n');

      expect(code).toContain('gs::FileSystem::writeText');
      expect(code).toContain('gs::String("output.txt")');
      expect(code).toContain('gs::String("Hello, World!")');
    });

    it('should generate code for FileSystem.mkdir()', () => {
      const source = `
        function createDir(): void {
          FileSystem.mkdir('new-directory');
        }
      `;

      const program = createProgram(source);
      const lowering = new IRLowering();
      const ir = lowering.lower(program);

      const codegen = new CppCodegen('gc');
      const files = codegen.generate(ir);
      const code = Array.from(files.values()).join('\n');

      expect(code).toContain('gs::FileSystem::mkdir');
      expect(code).toContain('gs::String("new-directory")');
    });

    it('should generate code for FileSystem.readDir()', () => {
      const source = `
        const files = FileSystem.readDir('.');
      `;

      const program = createProgram(source);
      const lowering = new IRLowering();
      const ir = lowering.lower(program);

      const codegen = new CppCodegen('gc');
      const files = codegen.generate(ir);
      const code = Array.from(files.values()).join('\n');

      expect(code).toContain('gs::FileSystem::readDir');
      expect(code).toContain('gs::String(".")');
    });
  });

  describe('Async FileSystem methods', () => {
    it('should generate code for FileSystemAsync.readText()', () => {
      const source = `
        async function readConfig(): Promise<string> {
          return await FileSystemAsync.readText('config.json');
        }
      `;

      const program = createProgram(source);
      const lowering = new IRLowering();
      const ir = lowering.lower(program);

      const codegen = new CppCodegen('gc');
      const files = codegen.generate(ir);
      const code = Array.from(files.values()).join('\n');

      expect(code).toContain('gs::FileSystemAsync::readText');
      expect(code).toContain('co_await');
      expect(code).toContain('gs::String("config.json")');
      expect(code).toContain('cppcoro::task');
    });

    it('should generate code for FileSystemAsync.writeText()', () => {
      const source = `
        async function saveData(data: string): Promise<void> {
          await FileSystemAsync.writeText('data.txt', data);
        }
      `;

      const program = createProgram(source);
      const lowering = new IRLowering();
      const ir = lowering.lower(program);

      const codegen = new CppCodegen('gc');
      const files = codegen.generate(ir);
      const code = Array.from(files.values()).join('\n');

      expect(code).toContain('gs::FileSystemAsync::writeText');
      expect(code).toContain('co_await');
      expect(code).toContain('cppcoro::task');
    });

    it('should generate code for FileSystemAsync.exists()', () => {
      const source = `
        async function checkFile(path: string): Promise<boolean> {
          return await FileSystemAsync.exists(path);
        }
      `;

      const program = createProgram(source);
      const lowering = new IRLowering();
      const ir = lowering.lower(program);

      const codegen = new CppCodegen('gc');
      const files = codegen.generate(ir);
      const code = Array.from(files.values()).join('\n');

      expect(code).toContain('gs::FileSystemAsync::exists');
      expect(code).toContain('co_await');
      expect(code).toContain('cppcoro::task<bool>');
    });
  });

  describe('Combined sync and async usage', () => {
    it('should support both FileSystem and FileSystemAsync in same module', () => {
      const source = `
        const syncExists = FileSystem.exists('file.txt');
        
        async function asyncRead(): Promise<string> {
          return await FileSystemAsync.readText('file.txt');
        }
      `;

      const program = createProgram(source);
      const lowering = new IRLowering();
      const ir = lowering.lower(program);

      const codegen = new CppCodegen('gc');
      const files = codegen.generate(ir);
      const code = Array.from(files.values()).join('\n');

      expect(code).toContain('gs::FileSystem::exists');
      expect(code).toContain('gs::FileSystemAsync::readText');
      expect(code).toContain('co_await');
    });
  });
});
