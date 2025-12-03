/**
 * End-to-End RegExp Tests with C++ Compilation
 * 
 * Tests that verify regex literals compile to C++ and produce correct output.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { CppCodegen } from '../../src/cpp/codegen';
import ts from 'typescript';

describe('RegExp End-to-End C++ Tests', () => {
  let tempDir: string;
  
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(__dirname, '../regexp-e2e-'));
  });
  
  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
  
  /**
   * Compile GoodScript to C++ and run it
   */
  function compileAndRun(code: string): { cpp: string; output: string } {
    // Parse TypeScript
    const sourceFile = ts.createSourceFile(
      'test.ts',
      code,
      ts.ScriptTarget.ES2020,
      true
    );
    
    // Generate C++
    const codegen = new CppCodegen();
    const cpp = codegen.generate(sourceFile);
    
    // Write C++ source
    const cppFile = path.join(tempDir, 'test.cpp');
    fs.writeFileSync(cppFile, cpp);
    
    // Copy runtime headers
    const runtimeDir = path.join(__dirname, '../../runtime');
    const headers = [
      'gs_string.hpp',
      'gs_string_builder.hpp',
      'gs_array.hpp',
      'gs_array_impl.hpp',
      'gs_map.hpp',
      'gs_property.hpp',
      'gs_json.hpp',
      'gs_console.hpp',
      'gs_math.hpp',
      'gs_number.hpp',
      'gs_object.hpp',
      'gs_tuple.hpp',
      'gs_date.hpp',
      'gs_regexp.hpp',
      'gs_regexp_impl.hpp',
      'gs_error.hpp',
      'gs_runtime.hpp'
    ];
    
    for (const header of headers) {
      const src = path.join(runtimeDir, header);
      const dest = path.join(tempDir, header);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
      }
    }
    
    // Try to compile with Zig (GoodScript standard) or g++
    const binary = path.join(tempDir, 'test');
    let compiler = 'zig c++';
    let pcre2Flags = '';
    
    // Check if Zig is available
    try {
      execSync('zig version', { stdio: 'pipe' });
    } catch {
      // Fall back to g++
      console.warn('Zig not found, falling back to g++');
      compiler = 'g++';
    }
    
    // Try to find PCRE2
    try {
      const brewPrefix = execSync('brew --prefix pcre2 2>/dev/null', {
        encoding: 'utf-8',
        stdio: 'pipe'
      }).trim();
      pcre2Flags = `-I${brewPrefix}/include -L${brewPrefix}/lib -lpcre2-8`;
    } catch {
      try {
        pcre2Flags = execSync('pkg-config --cflags --libs libpcre2-8', {
          encoding: 'utf-8',
          stdio: 'pipe'
        }).trim();
      } catch {
        throw new Error('PCRE2 library not found. Install with: brew install pcre2');
      }
    }
    
    try {
      execSync(`${compiler} -std=c++20 -DGS_ENABLE_REGEXP -I. ${pcre2Flags} ${cppFile} -o ${binary}`, {
        cwd: tempDir,
        stdio: 'pipe'
      });
    } catch (error: any) {
      throw new Error(`C++ compilation failed:\n${error.stderr?.toString() || error.message}\n\nGenerated C++:\n${cpp}`);
    }
    
    // Run the binary
    const output = execSync(binary, {
      cwd: tempDir,
      encoding: 'utf-8',
      stdio: 'pipe'
    }).trim();
    
    return { cpp, output };
  }
  
  it('should compile and run basic regex test', () => {
    const code = `
const pattern = /hello/;
console.log(pattern.test("hello world"));
console.log(pattern.test("goodbye"));
    `.trim();
    
    const { output } = compileAndRun(code);
    
    expect(output.split('\n')).toEqual([
      'true',
      'false'
    ]);
  });
  
  it('should compile and run case-insensitive regex', () => {
    const code = `
const pattern = /HELLO/i;
console.log(pattern.test("hello"));
console.log(pattern.test("HELLO"));
    `.trim();
    
    const { output } = compileAndRun(code);
    
    expect(output.split('\n')).toEqual([
      'true',
      'true'
    ]);
  });
  
  it('should compile and run regex with global flag', () => {
    const code = `
const pattern = /\\d+/g;
console.log(pattern.global);
    `.trim();
    
    const { output } = compileAndRun(code);
    
    expect(output).toBe('true');
  });
  
  it('should compile and run string.replace() with regex (simple test)', () => {
    const code = `
const text = "hello world";
const pattern = /world/;
const result = text.replace(pattern, "GoodScript");
console.log(result);
    `.trim();
    
    const { output } = compileAndRun(code);
    
    expect(output).toBe('hello GoodScript');
  });
  
  it('should compile and run string.replace() with global regex', () => {
    const code = `
const text = "1 2 3";
const pattern = /\\d/g;
const result = text.replace(pattern, "X");
console.log(result);
    `.trim();
    
    const { output } = compileAndRun(code);
    
    expect(output).toBe('X X X');
  });
  
  it('should compile and run string.search() with regex', () => {
    const code = `
const text = "The quick brown fox";
const pattern = /brown/;
const index = text.search(pattern);
console.log(index);
    `.trim();
    
    const { output } = compileAndRun(code);
    
    expect(output).toBe('10');
  });
});
