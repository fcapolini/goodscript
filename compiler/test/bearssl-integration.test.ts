import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { IRLowering } from '../src/frontend/lowering.js';
import { CppCodegen } from '../src/backend/cpp/codegen.js';

function parseAndLower(source: string) {
  const sourceFile = ts.createSourceFile(
    'test.ts',
    source,
    ts.ScriptTarget.ES2022,
    true
  );

  const program = ts.createProgram(['test.ts'], {}, {
    getSourceFile: (fileName) => fileName === 'test.ts' ? sourceFile : undefined,
    writeFile: () => {},
    getCurrentDirectory: () => '',
    getDirectories: () => [],
    fileExists: () => true,
    readFile: () => '',
    getCanonicalFileName: (fileName) => fileName,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
    getDefaultLibFileName: () => 'lib.d.ts',
  });

  const lowering = new IRLowering();
  return lowering.lower(program);
}

describe('BearSSL Integration', () => {
  const codegen = new CppCodegen();

  it('should compile HTTPS fetch with BearSSL shim compatibility', async () => {
    const source = `
      async function main(): Promise<void> {
        const response = await HTTPAsync.fetch('https://example.com');
        console.log(response.statusCode);
      }
    `;

    const irProgram = parseAndLower(source);
    const output = codegen.generate(irProgram, 'gc');
    
    const headerFile = output.get('test.hpp');
    const sourceFile = output.get('test.cpp');
    
    expect(headerFile).toBeDefined();
    expect(sourceFile).toBeDefined();
    
    // Should include the GC runtime (which includes HTTP support)
    expect(headerFile).toContain('gs_gc_runtime.hpp');
    // Should compile successfully with HTTPAsync calls
    expect(sourceFile).toContain('HTTPAsync');
    expect(sourceFile).toContain('https://example.com');
  });

  it('should support HTTPS URLs in fetch calls', async () => {
    const source = `
      async function test(): Promise<void> {
        const response = await HTTPAsync.fetch('https://api.github.com/users/github');
        console.log(response.body);
      }
    `;

    const irProgram = parseAndLower(source);
    const output = codegen.generate(irProgram, 'gc');
    
    const sourceFile = output.get('test.cpp');
    expect(sourceFile).toBeDefined();
    
    // HTTPS URLs should be preserved
    expect(sourceFile).toContain('https://');
  });

  it('should compile HTTPS with custom headers', async () => {
    const source = `
      async function request(): Promise<void> {
        const headers = new Map<string, string>();
        headers.set('User-Agent', 'GoodScript/1.0');
        const response = await HTTPAsync.fetch('https://example.com', {
          headers: headers
        });
        console.log(response.statusCode);
      }
    `;

    const irProgram = parseAndLower(source);
    const output = codegen.generate(irProgram, 'gc');
    
    const sourceFile = output.get('test.cpp');
    expect(sourceFile).toBeDefined();
    expect(sourceFile).toContain('HTTPAsync');
    expect(sourceFile).toContain('User-Agent');
  });

  it('should handle HTTPS errors with try-catch', async () => {
    const source = `
      async function handleError(): Promise<void> {
        try {
          const response = await HTTPAsync.fetch('https://invalid.example.com');
          console.log(response.body);
        } catch (e) {
          console.log('Request failed');
        }
      }
    `;

    const irProgram = parseAndLower(source);
    const output = codegen.generate(irProgram, 'gc');
    
    const sourceFile = output.get('test.cpp');
    expect(sourceFile).toBeDefined();
    
    // Should compile with exception handling
    expect(sourceFile).toContain('try');
    expect(sourceFile).toContain('catch');
  });
});
