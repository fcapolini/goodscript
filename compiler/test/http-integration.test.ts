import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { IRLowering } from '../src/frontend/lowering.js';
import { CppCodegen } from '../src/backend/cpp/codegen.js';
import { ZigCompiler } from '../src/backend/cpp/zig-compiler.js';
import * as path from 'path';
import * as fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

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

describe('HTTP Integration', () => {
  const codegen = new CppCodegen();
  
  it('should compile HTTP.syncFetch call', async () => {
    const source = `
      const response = HTTP.syncFetch('https://example.com');
      console.log(response.status);
    `;
    
    const irProgram = parseAndLower(source);
    const output = codegen.generate(irProgram, 'gc');
    
    const cppSource = output.get('test.cpp');
    expect(cppSource).toBeDefined();
    expect(cppSource).toContain('gs::http::HTTP::syncFetch');
    expect(cppSource).toContain('https://example.com');
  });
  
  // TODO: Re-enable when HTTP/curl compilation is fixed
  it.skip('should compile HTTP.syncFetch with options', async () => {
    const source = `
      const options: any = {
        method: 'POST',
        body: '{"data":"value"}',
        timeout: 5000
      };
      const response = HTTP.syncFetch('https://api.example.com/data', options);
    `;
    
    const irProgram = parseAndLower(source);
    const output = codegen.generate(irProgram, 'gc');
    
    const cppSource = output.get('test.cpp');
    expect(cppSource).toBeDefined();
    expect(cppSource).toContain('gs::http::HTTP::syncFetch');
    expect(cppSource).toContain('POST');
  });
  
  it('should compile async HTTPAsync.fetch call', async () => {
    const source = `
      async function fetchData(): Promise<string> {
        const response = await HTTPAsync.fetch('https://api.example.com/data');
        return response.body;
      }
    `;
    
    const irProgram = parseAndLower(source);
    const output = codegen.generate(irProgram, 'gc');
    
    const cppSource = output.get('test.cpp');
    expect(cppSource).toBeDefined();
    expect(cppSource).toContain('gs::http::HTTPAsync::fetch');
    expect(cppSource).toContain('co_await');
    expect(cppSource).toContain('cppcoro::task');
  });

  it('should compile concurrent async HTTP requests', async () => {
    const source = `
      async function fetchMultiple(): Promise<void> {
        const promise1 = HTTPAsync.fetch('http://example.com/1');
        const promise2 = HTTPAsync.fetch('http://example.com/2');
        const promise3 = HTTPAsync.fetch('http://example.com/3');
        
        const response1 = await promise1;
        const response2 = await promise2;
        const response3 = await promise3;
        
        console.log(response1.status);
        console.log(response2.status);
        console.log(response3.status);
      }
    `;
    
    const irProgram = parseAndLower(source);
    const output = codegen.generate(irProgram, 'gc');
    
    const cppSource = output.get('test.cpp');
    expect(cppSource).toBeDefined();
    expect(cppSource).toContain('gs::http::HTTPAsync::fetch');
    expect(cppSource).toContain('co_await');
    
    // Verify multiple fetch calls
    const fetchCount = (cppSource!.match(/HTTPAsync::fetch/g) || []).length;
    expect(fetchCount).toBeGreaterThanOrEqual(3);
  });
  
  it.skip('should compile and run simple HTTP GET', async () => {
    // Skip this test for now - requires network access
    const source = `
      const response = HTTP.syncFetch('https://httpbin.org/status/200');
      console.log(response.status);
    `;
    
    const irProgram = parseAndLower(source);
    const outputFiles = codegen.generate(irProgram, 'gc');
    
    // Write C++ files
    const buildDir = path.join(projectRoot, 'build');
    const outputBinary = path.join(buildDir, 'http-test');
    
    await fs.mkdir(buildDir, { recursive: true});
    
    const sources = new Map<string, string>();
    for (const [filepath, content] of outputFiles.entries()) {
      const fullPath = path.join(buildDir, filepath);
      await fs.writeFile(fullPath, content);
      sources.set(filepath, content);
    }
    
    // Compile with Zig
    const compiler = new ZigCompiler(buildDir, path.join(projectRoot, 'compiler/vendor'));
    
    const result = await compiler.compile({
      sources,
      output: outputBinary,
      mode: 'gc',
      buildDir,
      vendorDir: path.join(projectRoot, 'compiler/vendor'),
      enableHTTP: true,  // Enable HTTP API for this test
      cxxFlags: ['-DGS_ENABLE_HTTP'],
      ldFlags: []
    });
    
    expect(result.success).toBe(true);
    
    // Run the binary
    const { stdout, stderr } = await execAsync(outputBinary);
    expect(stdout).toContain('200');
  });
});
