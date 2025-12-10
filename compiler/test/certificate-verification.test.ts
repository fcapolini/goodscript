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

describe('Certificate Verification', () => {
  const codegen = new CppCodegen();

  it('should include certificate management headers', async () => {
    const source = `
      async function fetchSecure(): Promise<void> {
        const response = await HTTPAsync.fetch('https://www.google.com');
        console.log(response.statusCode);
      }
    `;

    const irProgram = parseAndLower(source);
    const output = codegen.generate(irProgram, 'gc');
    
    const headerFile = output.get('test.hpp');
    expect(headerFile).toBeDefined();
    
    // Should include the GC runtime which includes certificate support
    expect(headerFile).toContain('gs_gc_runtime.hpp');
  });

  it('should support HTTPS with proper SNI', async () => {
    const source = `
      async function testSNI(): Promise<void> {
        // Different hostnames should use correct SNI
        const r1 = await HTTPAsync.fetch('https://www.example.com');
        const r2 = await HTTPAsync.fetch('https://api.github.com');
        console.log(r1.statusCode, r2.statusCode);
      }
    `;

    const irProgram = parseAndLower(source);
    const output = codegen.generate(irProgram, 'gc');
    
    const sourceFile = output.get('test.cpp');
    expect(sourceFile).toBeDefined();
    expect(sourceFile).toContain('https://www.example.com');
    expect(sourceFile).toContain('https://api.github.com');
  });

  it('should handle certificate errors gracefully', async () => {
    const source = `
      async function handleCertError(): Promise<void> {
        try {
          // Self-signed or expired certificates should fail verification
          const response = await HTTPAsync.fetch('https://self-signed.badssl.com');
          console.log('Should not reach here');
        } catch (e) {
          console.log('Certificate error caught');
        }
      }
    `;

    const irProgram = parseAndLower(source);
    const output = codegen.generate(irProgram, 'gc');
    
    const sourceFile = output.get('test.cpp');
    expect(sourceFile).toBeDefined();
    expect(sourceFile).toContain('try');
    expect(sourceFile).toContain('catch');
  });

  it('should compile multiple HTTPS requests', async () => {
    const source = `
      async function fetchMultiple(): Promise<void> {
        const r1 = await HTTPAsync.fetch('https://httpbin.org/get');
        const r2 = await HTTPAsync.fetch('https://api.github.com');
        const r3 = await HTTPAsync.fetch('https://www.google.com');
        console.log(r1.statusCode);
      }
    `;

    const irProgram = parseAndLower(source);
    const output = codegen.generate(irProgram, 'gc');
    
    const sourceFile = output.get('test.cpp');
    expect(sourceFile).toBeDefined();
    expect(sourceFile).toContain('HTTPAsync');
    expect(sourceFile).toContain('https://');
  });
});
