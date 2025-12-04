import { describe, it, expect } from 'vitest';
import * as ts from 'typescript';
import { AstCodegen } from '../../../src/cpp/codegen';
import { render } from '../../../src/cpp/renderer';

describe('Async/Await Code Generation', () => {
  function compile(code: string): string {
    const sourceFile = ts.createSourceFile(
      'test.ts',
      code,
      ts.ScriptTarget.ES2020,
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
      getDefaultLibFileName: () => 'lib.d.ts'
    });
    
    const checker = program.getTypeChecker();
    const codegen = new AstCodegen(checker);
    return codegen.generate(sourceFile);
  }
  
  it('should generate cppcoro::task for async function', () => {
    const code = `
      async function fetchValue(): number {
        return 42;
      }
    `;
    
    const result = compile(code);
    expect(result).toContain('#include <cppcoro/task.hpp>');
    expect(result).toContain('cppcoro::task<double> fetchValue()');
    expect(result).toContain('co_return 42');
  });
  
  it('should handle async function with Promise return type', () => {
    const code = `
      async function getValue(): Promise<string> {
        return "hello";
      }
    `;
    
    const result = compile(code);
    expect(result).toContain('cppcoro::task<gs::String> getValue()');
    expect(result).toContain('co_return gs::String("hello")');
  });
  
  it('should generate co_await for await expressions', () => {
    const code = `
      async function main() {
        const value = await fetchValue();
        return value;
      }
      
      async function fetchValue(): number {
        return 42;
      }
    `;
    
    const result = compile(code);
    expect(result).toContain('co_await fetchValue()');
    expect(result).toContain('co_return value');
  });
  
  it('should handle async methods in classes', () => {
    const code = `
      class DataFetcher {
        async fetch(): Promise<number> {
          return 100;
        }
      }
    `;
    
    const result = compile(code);
    expect(result).toContain('cppcoro::task<double> fetch()');
    expect(result).toContain('co_return 100');
  });
  
  it('should handle async function with void return type', () => {
    const code = `
      async function doSomething(): Promise<void> {
        console.log("doing something");
      }
    `;
    
    const result = compile(code);
    expect(result).toContain('cppcoro::task<void> doSomething()');
    // Void async functions don't need explicit co_return in C++
  });
  
  it('should handle multiple await expressions', () => {
    const code = `
      async function sumValues() {
        const a = await fetchValue();
        const b = await fetchValue();
        return a + b;
      }
      
      async function fetchValue(): number {
        return 42;
      }
    `;
    
    const result = compile(code);
    expect(result).toContain('co_await fetchValue()');
    expect(result).toContain('co_return a + b');
  });
  
  it('should not include cppcoro header when no async/await', () => {
    const code = `
      function regularFunction(): number {
        return 42;
      }
    `;
    
    const result = compile(code);
    expect(result).not.toContain('cppcoro');
    expect(result).toContain('double regularFunction()');
    expect(result).toContain('return 42');
  });
  
  it('should handle async arrow functions', () => {
    const code = `
      const fetchData = async (): Promise<string> => {
        return "data";
      };
    `;
    
    const result = compile(code);
    // Arrow functions at top level should be hoisted
    expect(result).toContain('cppcoro::task');
    expect(result).toContain('co_return');
  });
});
