import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { AstCodegen as CppCodegen } from '../../../src/cpp/codegen.js';
import { OwnershipAnalyzer } from '../../../src/ownership-analyzer.js';

describe('Array set_unchecked optimization', () => {
  function compile(source: string): string {
    const sourceFile = ts.createSourceFile(
      'test.ts',
      source,
      ts.ScriptTarget.ES2020,
      true
    );

    const program = ts.createProgram(['test.ts'], {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
    }, {
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

    const checker = program.getTypeChecker();
    const ownershipAnalyzer = new OwnershipAnalyzer(checker);
    ownershipAnalyzer.analyze(sourceFile);

    const codegen = new CppCodegen(checker, ownershipAnalyzer);
    return codegen.generate(sourceFile);
  }

  it('should use set() for simple loop with known bounds', () => {
    const source = `
      function fill(arr: number[]): void {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = 42;
        }
      }
    `;

    const cpp = compile(source);
    // Optimization: use set_unchecked for array access in safe bounds (loop with known range)
    expect(cpp).toContain('arr.set_unchecked(static_cast<int>(i), 42)');
  });

  it('should use set() for arr[i+1] pattern', () => {
    const source = `
      function shift(arr: number[]): void {
        for (let i = 0; i < arr.length - 1; i++) {
          arr[i + 1] = arr[i];
        }
      }
    `;

    const cpp = compile(source);
    // Optimization: use set_unchecked for array access in safe bounds
    expect(cpp).toContain('.set_unchecked(');
  });

  it('should use set() for bubble sort pattern', () => {
    const source = `
      function bubbleSort(arr: number[]): void {
        const n = arr.length;
        for (let i = 0; i < n - 1; i++) {
          for (let j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
              const temp = arr[j];
              arr[j] = arr[j + 1];
              arr[j + 1] = temp;
            }
          }
        }
      }
    `;

    const cpp = compile(source);
    // Optimization: use set_unchecked for array access in safe bounds
    expect(cpp).toContain('.set_unchecked(');
  });

  it('should use set() for potentially out-of-bounds access', () => {
    const source = `
      function maybeOutOfBounds(arr: number[], idx: number): void {
        arr[idx] = 42;
      }
    `;

    const cpp = compile(source);
    // Not in safe bounds (arbitrary idx) - use set() method which handles bounds and resize
    expect(cpp).toMatch(/arr\.set\(.*idx.*42\)/);
  });
});
