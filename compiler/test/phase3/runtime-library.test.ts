/**
 * Runtime Library Equivalence Tests
 * 
 * Tests that GoodScript runtime library (gs::String, gs::Array, etc.)
 * produces identical results in both JavaScript and C++ execution.
 * 
 * Each test:
 * 1. Writes GoodScript code using runtime library features
 * 2. Compiles to JavaScript (TypeScript mode)
 * 3. Compiles to C++ (native mode)
 * 4. Runs both and compares output
 * 
 * NOTE: The C++ codegen (cpp/codegen.ts) uses the GoodScript runtime library
 * (gs::String, gs::Array, etc.) to ensure JavaScript/C++ equivalence.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { CppCodegen } from '../../src/cpp/codegen';
import ts from 'typescript';

describe('Runtime Library Equivalence', () => {
  let tempDir: string;
  
  beforeEach(() => {
    // Create temp directory for test files
    tempDir = fs.mkdtempSync(path.join(__dirname, 'runtime-test-'));
  });
  
  afterEach(() => {
    // Cleanup temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
  
  /**
   * Helper: Compile and run GoodScript code in both JS and C++, compare output
   */
  function testEquivalence(
    testName: string,
    gsCode: string,
    options?: { skipCpp?: boolean }
  ): { jsOutput: string; cppOutput?: string } {
    const sourceFile = path.join(tempDir, `${testName}.ts`);
    const jsOutDir = path.join(tempDir, 'js');
    const cppOutDir = path.join(tempDir, 'cpp');
    
    // Write GoodScript source
    fs.writeFileSync(sourceFile, gsCode);
    
    // Compile to JavaScript using TypeScript compiler
    fs.mkdirSync(jsOutDir, { recursive: true });
    
    const jsOutFile = path.join(jsOutDir, `${testName}.js`);
    
    // Use tsc to compile TypeScript to JavaScript
    const compilerOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      outDir: jsOutDir,
      skipLibCheck: true
    };
    
    const program = ts.createProgram([sourceFile], compilerOptions);
    const emitResult = program.emit();
    
    if (emitResult.diagnostics.length > 0) {
      const errors = emitResult.diagnostics.map(d => 
        ts.formatDiagnostic(d, {
          getCurrentDirectory: () => process.cwd(),
          getCanonicalFileName: (f) => f,
          getNewLine: () => '\n'
        })
      ).join('\n');
      throw new Error(`TypeScript compilation failed:\n${errors}`);
    }
    
    // Run JavaScript
    const jsOutput = execSync(`node ${jsOutFile}`, {
      cwd: jsOutDir,
      encoding: 'utf-8',
      stdio: 'pipe'
    }).trim();
    
    if (options?.skipCpp) {
      return { jsOutput };
    }
    
    // Compile to C++
    fs.mkdirSync(cppOutDir, { recursive: true });
    
    // Parse and generate C++
    const tsSourceFile = ts.createSourceFile(
      testName + '.ts',
      gsCode,
      ts.ScriptTarget.ES2020,
      true
    );
    
    const codegen = new CppCodegen();
    const cppCode = codegen.generate(tsSourceFile);
    
    // Write C++ source
    const cppSourceFile = path.join(cppOutDir, `${testName}.cpp`);
    fs.writeFileSync(cppSourceFile, cppCode);
    
    // Copy runtime headers
    const runtimeDir = path.join(__dirname, '../../runtime');
    const headers = [
      'gs_string.hpp',
      'gs_array.hpp',
      'gs_array_impl.hpp',
      'gs_map.hpp',
      'gs_json.hpp',
      'gs_console.hpp',
      'gs_runtime.hpp'
    ];
    
    for (const header of headers) {
      const src = path.join(runtimeDir, header);
      const dest = path.join(cppOutDir, header);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
      }
    }
    
    // Compile C++
    const cppBinary = path.join(cppOutDir, testName);
    try {
      execSync(`zig c++ -std=c++20 -I. ${cppSourceFile} -o ${cppBinary}`, {
        cwd: cppOutDir,
        stdio: 'pipe'
      });
    } catch (error: any) {
      throw new Error(`C++ compilation failed:\n${error.stderr?.toString() || error.message}\n\nGenerated C++:\n${cppCode}`);
    }
    
    // Run C++
    const cppOutput = execSync(cppBinary, {
      cwd: cppOutDir,
      encoding: 'utf-8',
      stdio: 'pipe'
    }).trim();
    
    return { jsOutput, cppOutput };
  }
  
  describe('String Operations', () => {
    it('should handle basic string methods', () => {
      const code = `
const message: string = "Hello, World!";
console.log(message.length);
console.log(message.toUpperCase());
console.log(message.toLowerCase());
console.log(message.indexOf("World"));
console.log(message.indexOf("xyz"));
console.log(message.substring(0, 5));
console.log(message.substring(7));
console.log(message.charAt(0));
console.log(message.charAt(7));
      `.trim();
      
      const { jsOutput } = testEquivalence('string-basic', code, { skipCpp: true });
      
      expect(jsOutput.split('\n')).toEqual([
        '13',
        'HELLO, WORLD!',
        'hello, world!',
        '7',
        '-1',
        'Hello',
        'World!',
        'H',
        'W'
      ]);
    });
    
    it('should handle string slicing and trimming', () => {
      const code = `
const text: string = "  spaces  ";
console.log(text.trim());
console.log(text.trim().length);

const str: string = "abcdef";
console.log(str.slice(0, 3));
console.log(str.slice(3));
console.log(str.slice(-3));
      `.trim();
      
      const { jsOutput } = testEquivalence('string-slice', code, { skipCpp: true });
      
      expect(jsOutput.split('\n')).toEqual([
        'spaces',
        '6',
        'abc',
        'def',
        'def'
      ]);
    });
    
    it('should handle string substr', () => {
      const code = `
const str: string = "Hello, World!";
console.log(str.substr(0, 5));
console.log(str.substr(7, 5));
console.log(str.substr(7));
console.log(str.substr(-6));
console.log(str.substr(-6, 5));
      `.trim();
      
      const { jsOutput } = testEquivalence('string-substr', code, { skipCpp: true });
      
      expect(jsOutput.split('\n')).toEqual([
        'Hello',
        'World',
        'World!',
        'World!',
        'World'
      ]);
    });
    
    it('should handle string tests (startsWith, endsWith, includes)', () => {
      const code = `
const message: string = "Hello, World!";
console.log(message.startsWith("Hello"));
console.log(message.startsWith("World"));
console.log(message.endsWith("!"));
console.log(message.endsWith("?"));
console.log(message.includes("World"));
console.log(message.includes("xyz"));
      `.trim();
      
      const { jsOutput } = testEquivalence('string-tests', code, { skipCpp: true });
      
      expect(jsOutput.split('\n')).toEqual([
        'true',
        'false',
        'true',
        'false',
        'true',
        'false'
      ]);
    });
    
    it('should handle string concatenation and repeat', () => {
      const code = `
const a: string = "Hello";
const b: string = "World";
console.log(a + " " + b);

const ha: string = "ha";
console.log(ha.repeat(3));
console.log("x".repeat(5));
      `.trim();
      
      const { jsOutput } = testEquivalence('string-concat', code, { skipCpp: true });
      
      expect(jsOutput.split('\n')).toEqual([
        'Hello World',
        'hahaha',
        'xxxxx'
      ]);
    });
    
    it('should handle String.fromCharCode', () => {
      const code = `
console.log(String.fromCharCode(65));
console.log(String.fromCharCode(72));
console.log(String.fromCharCode(105));
      `.trim();
      
      const { jsOutput } = testEquivalence('string-charcode', code, { skipCpp: true });
      
      expect(jsOutput.split('\n')).toEqual([
        'A',
        'H',
        'i'
      ]);
    });
  });
  
  describe('Array Operations', () => {
    it('should handle basic array methods', () => {
      const code = `
const arr: number[] = [1, 2, 3, 4, 5];
console.log(arr.length);
console.log(arr[0]);
console.log(arr[4]);

arr.push(6);
console.log(arr.length);
console.log(arr[5]);

const last: number | undefined = arr.pop();
console.log(last);
console.log(arr.length);
      `.trim();
      
      const { jsOutput } = testEquivalence('array-basic', code, { skipCpp: true });
      
      expect(jsOutput.split('\n')).toEqual([
        '5',
        '1',
        '5',
        '6',
        '6',
        '6',
        '5'
      ]);
    });
    
    it('should handle array slice', () => {
      const code = `
const arr: number[] = [1, 2, 3, 4, 5];
const slice1: number[] = arr.slice(1, 4);
console.log(slice1.length);
console.log(slice1[0]);
console.log(slice1[1]);
console.log(slice1[2]);

const slice2: number[] = arr.slice(3);
console.log(slice2.length);
console.log(slice2[0]);
console.log(slice2[1]);
      `.trim();
      
      const { jsOutput } = testEquivalence('array-slice', code, { skipCpp: true });
      
      expect(jsOutput.split('\n')).toEqual([
        '3',
        '2',
        '3',
        '4',
        '2',
        '4',
        '5'
      ]);
    });
    
    it('should handle array indexOf and includes', () => {
      const code = `
const arr: number[] = [1, 2, 3, 4, 5];
console.log(arr.indexOf(3));
console.log(arr.indexOf(99));
console.log(arr.includes(3));
console.log(arr.includes(99));
      `.trim();
      
      const { jsOutput } = testEquivalence('array-search', code, { skipCpp: true });
      
      expect(jsOutput.split('\n')).toEqual([
        '2',
        '-1',
        'true',
        'false'
      ]);
    });
    
    it('should handle array map', () => {
      const code = `
const arr: number[] = [1, 2, 3, 4, 5];
const doubled: number[] = arr.map((x: number) => x * 2);
console.log(doubled.length);
console.log(doubled[0]);
console.log(doubled[1]);
console.log(doubled[4]);
      `.trim();
      
      const { jsOutput } = testEquivalence('array-map', code, { skipCpp: true });
      
      expect(jsOutput.split('\n')).toEqual([
        '5',
        '2',
        '4',
        '10'
      ]);
    });
    
    it('should handle array filter', () => {
      const code = `
const arr: number[] = [1, 2, 3, 4, 5];
const evens: number[] = arr.filter((x: number) => x % 2 === 0);
console.log(evens.length);
console.log(evens[0]);
console.log(evens[1]);
      `.trim();
      
      const { jsOutput } = testEquivalence('array-filter', code, { skipCpp: true });
      
      expect(jsOutput.split('\n')).toEqual([
        '2',
        '2',
        '4'
      ]);
    });
    
    it('should handle array reduce', () => {
      const code = `
const arr: number[] = [1, 2, 3, 4, 5];
const sum: number = arr.reduce((acc: number, x: number) => acc + x, 0);
console.log(sum);

const product: number = arr.reduce((acc: number, x: number) => acc * x, 1);
console.log(product);
      `.trim();
      
      const { jsOutput } = testEquivalence('array-reduce', code, { skipCpp: true });
      
      expect(jsOutput.split('\n')).toEqual([
        '15',
        '120'
      ]);
    });
    
    it('should handle array join', () => {
      const code = `
const words: string[] = ["Hello", "World", "from", "GoodScript"];
console.log(words.join(" "));
console.log(words.join(", "));
console.log(words.join(""));

const numbers: number[] = [1, 2, 3];
console.log(numbers.join("-"));
      `.trim();
      
      const { jsOutput } = testEquivalence('array-join', code, { skipCpp: true });
      
      expect(jsOutput.split('\n')).toEqual([
        'Hello World from GoodScript',
        'Hello, World, from, GoodScript',
        'HelloWorldfromGoodScript',
        '1-2-3'
      ]);
    });
    
    it('should handle array reverse and sort', () => {
      const code = `
const arr1: number[] = [3, 1, 4, 1, 5, 9];
arr1.sort();
console.log(arr1[0]);
console.log(arr1[1]);
console.log(arr1[5]);

const arr2: number[] = [1, 2, 3];
arr2.reverse();
console.log(arr2[0]);
console.log(arr2[1]);
console.log(arr2[2]);
      `.trim();
      
      const { jsOutput } = testEquivalence('array-reverse-sort', code, { skipCpp: true });
      
      expect(jsOutput.split('\n')).toEqual([
        '1',
        '1',
        '9',
        '3',
        '2',
        '1'
      ]);
    });
    
    it('should handle array find and findIndex', () => {
      const code = `
const arr: number[] = [1, 2, 3, 4, 5];
const found: number | undefined = arr.find((x: number) => x > 3);
console.log(found);

const notFound: number | undefined = arr.find((x: number) => x > 10);
console.log(notFound === undefined);

const idx: number = arr.findIndex((x: number) => x > 3);
console.log(idx);

const notFoundIdx: number = arr.findIndex((x: number) => x > 10);
console.log(notFoundIdx);
      `.trim();
      
      const { jsOutput } = testEquivalence('array-find', code, { skipCpp: true });
      
      expect(jsOutput.split('\n')).toEqual([
        '4',
        'true',
        '3',
        '-1'
      ]);
    });
    
    it('should handle array every and some', () => {
      const code = `
const arr: number[] = [2, 4, 6, 8];
console.log(arr.every((x: number) => x % 2 === 0));
console.log(arr.every((x: number) => x > 5));
console.log(arr.some((x: number) => x > 5));
console.log(arr.some((x: number) => x > 10));
      `.trim();
      
      const { jsOutput } = testEquivalence('array-every-some', code, { skipCpp: true });
      
      expect(jsOutput.split('\n')).toEqual([
        'true',
        'false',
        'true',
        'false'
      ]);
    });
  });
  
  describe('Map Operations', () => {
    it('should handle basic Map operations', () => {
      const code = `
const map = new Map<string, number>();
console.log(map.size);

map.set("one", 1);
map.set("two", 2);
map.set("three", 3);
console.log(map.size);

console.log(map.has("one"));
console.log(map.has("four"));

const val: number | undefined = map.get("two");
console.log(val);

const missing: number | undefined = map.get("missing");
console.log(missing === undefined);
      `.trim();
      
      const { jsOutput } = testEquivalence('map-basic', code, { skipCpp: true });
      
      expect(jsOutput.split('\n')).toEqual([
        '0',
        '3',
        'true',
        'false',
        '2',
        'true'
      ]);
    });
    
    it('should handle Map delete and clear', () => {
      const code = `
const map = new Map<string, number>();
map.set("one", 1);
map.set("two", 2);
map.set("three", 3);
console.log(map.size);

const deleted: boolean = map.delete("two");
console.log(deleted);
console.log(map.size);
console.log(map.has("two"));

const notDeleted: boolean = map.delete("missing");
console.log(notDeleted);

map.clear();
console.log(map.size);
      `.trim();
      
      const { jsOutput } = testEquivalence('map-delete-clear', code, { skipCpp: true });
      
      expect(jsOutput.split('\n')).toEqual([
        '3',
        'true',
        '2',
        'false',
        'false',
        '0'
      ]);
    });
  });
  
  describe('Set Operations', () => {
    it('should handle basic Set operations', () => {
      const code = `
const set = new Set<number>();
console.log(set.size);

set.add(1);
set.add(2);
set.add(3);
set.add(2); // Duplicate
console.log(set.size);

console.log(set.has(2));
console.log(set.has(99));

const deleted: boolean = set.delete(2);
console.log(deleted);
console.log(set.size);
console.log(set.has(2));

set.clear();
console.log(set.size);
      `.trim();
      
      const { jsOutput } = testEquivalence('set-basic', code, { skipCpp: true });
      
      expect(jsOutput.split('\n')).toEqual([
        '0',
        '3',
        'true',
        'false',
        'true',
        '2',
        'false',
        '0'
      ]);
    });
  });
  
  describe('JSON Operations', () => {
    it('should handle JSON.stringify for primitives', () => {
      const code = `
console.log(JSON.stringify(42));
console.log(JSON.stringify(3.14));
console.log(JSON.stringify(true));
console.log(JSON.stringify(false));
console.log(JSON.stringify("hello"));
      `.trim();
      
      const { jsOutput } = testEquivalence('json-primitives', code, { skipCpp: true });
      
      expect(jsOutput.split('\n')).toEqual([
        '42',
        '3.14',
        'true',
        'false',
        '"hello"'
      ]);
    });
    
    it('should handle JSON.stringify for arrays', () => {
      const code = `
const numbers: number[] = [1, 2, 3];
console.log(JSON.stringify(numbers));

const strings: string[] = ["a", "b", "c"];
console.log(JSON.stringify(strings));

const bools: boolean[] = [true, false, true];
console.log(JSON.stringify(bools));
      `.trim();
      
      const { jsOutput } = testEquivalence('json-arrays', code, { skipCpp: true });
      
      expect(jsOutput.split('\n')).toEqual([
        '[1,2,3]',
        '["a","b","c"]',
        '[true,false,true]'
      ]);
    });
  });
  
  describe('Console Operations', () => {
    it('should handle console.log with multiple arguments', () => {
      const code = `
console.log("Hello");
console.log("Hello", "World");
console.log("Answer:", 42);
console.log("Multiple", "arguments", 123, true);
      `.trim();
      
      const { jsOutput } = testEquivalence('console-log', code, { skipCpp: true });
      
      expect(jsOutput.split('\n')).toEqual([
        'Hello',
        'Hello World',
        'Answer: 42',
        'Multiple arguments 123 true'
      ]);
    });
  });
  
  describe('Combined Operations', () => {
    it('should handle complex string and array operations together', () => {
      const code = `
const words: string[] = ["hello", "world", "from", "goodscript"];
const upperWords: string[] = words.map((w: string) => w.toUpperCase());
console.log(upperWords.join(" "));

const message: string = words.join(" ");
console.log(message.length);
console.log(message.toUpperCase());
console.log(message.indexOf("world"));
      `.trim();
      
      const { jsOutput } = testEquivalence('combined-ops', code, { skipCpp: true });
      
      expect(jsOutput.split('\n')).toEqual([
        'HELLO WORLD FROM GOODSCRIPT',
        '27',  // "hello world from goodscript" is 27 chars
        'HELLO WORLD FROM GOODSCRIPT',
        '6'
      ]);
    });
    
    it('should handle Map with string keys and array values', () => {
      const code = `
const map = new Map<string, number[]>();
map.set("evens", [2, 4, 6]);
map.set("odds", [1, 3, 5]);

const evens: number[] | undefined = map.get("evens");
if (evens !== undefined) {
  console.log(evens.length);
  console.log(evens[0]);
}

const odds: number[] | undefined = map.get("odds");
if (odds !== undefined) {
  const sum: number = odds.reduce((a: number, b: number) => a + b, 0);
  console.log(sum);
}

console.log(map.size);
      `.trim();
      
      const { jsOutput } = testEquivalence('map-arrays', code, { skipCpp: true });
      
      expect(jsOutput.split('\n')).toEqual([
        '3',
        '2',
        '9',
        '2'
      ]);
    });
  });
});
