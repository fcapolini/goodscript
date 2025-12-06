/**
 * Iterator Protocol Tests
 * 
 * Tests TypeScript iterator protocol support in GoodScript
 * - Symbol.iterator method declarations
 * - IteratorResult<T> return types
 * - for-of loops with custom iterables
 * - Iterator state management
 */

import { describe, it, expect } from 'vitest';
import { Compiler } from '../../../src/compiler';
import { Diagnostic } from '../../../src/types';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

function compileSource(source: string): { cpp: string; diagnostics: Diagnostic[] } {
  // Create a temporary directory and file
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'goodscript-test-'));
  const fileName = 'test-gs.ts';
  const filePath = path.join(tmpDir, fileName);
  
  // Create tsconfig.json with GoodScript configuration
  const tsconfigPath = path.join(tmpDir, 'tsconfig.json');
  const tsconfig = {
    compilerOptions: {
      target: 'ES2020',
      module: 'commonjs',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      lib: ['ES2020']
    },
    goodscript: {
      level: 'clean'
    }
  };
  fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
  
  try {
    // Write source code to file
    fs.writeFileSync(filePath, source);
    
    // Compile with GoodScript compiler
    const compiler = new Compiler();
    const result = compiler.compile({
      files: [filePath],
      project: tsconfigPath,
      target: 'native',  // Generate C++ code
      mode: 'gc',  // Use GC mode
      outDir: path.join(tmpDir, 'dist')  // Output to dist/ in tmp dir
    });
    
    // Read the generated C++ if it exists
    let cpp = '';
    const cppFilePath = path.join(tmpDir, 'dist', 'test.cpp');  // -gs.ts -> .cpp
    if (fs.existsSync(cppFilePath)) {
      cpp = fs.readFileSync(cppFilePath, 'utf-8');
    }
    
    return { cpp, diagnostics: result.diagnostics };
  } finally {
    // Cleanup temporary directory
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

function hasError(diagnostics: Diagnostic[], code: string): boolean {
  return diagnostics.some(d => d.code === code);
}

describe('Iterator Protocol', () => {
  
  describe('Basic Iterator', () => {
    it('should compile simple iterator class', () => {
      const code = `
class Counter implements Iterator<number> {
  private current: number = 0;
  private max: number;
  
  constructor(max: number) {
    this.max = max;
  }
  
  next(): IteratorResult<number> {
    if (this.current < this.max) {
      const value = this.current;
      this.current = this.current + 1;
      return { done: false, value: value };
    } else {
      return { done: true, value: 0 };
    }
  }
}

function main(): void {
  const counter = new Counter(3);
  let result = counter.next();
  while (!result.done) {
    console.log(result.value);
    result = counter.next();
  }
}
`;
      
      const result = compileSource(code);
      
      expect(result.diagnostics.length).toBe(0);
      expect(result.cpp).toContain('class Counter');
      expect(result.cpp).toContain('gs::IteratorResult<double> next()');
      expect(result.cpp).toContain('public Iterator<double>');  // Inherits from Iterator (gs:: not needed inside namespace)
    });
  });
  
  describe('Iterable Class', () => {
    it('should compile class with [Symbol.iterator] method', () => {
      const code = `
class Range implements Iterable<number> {
  private start: number;
  private end: number;
  
  constructor(start: number, end: number) {
    this.start = start;
    this.end = end;
  }
  
  [Symbol.iterator](): Iterator<number> {
    return new RangeIterator(this.start, this.end);
  }
}

class RangeIterator implements Iterator<number> {
  private current: number;
  private end: number;
  
  constructor(start: number, end: number) {
    this.current = start;
    this.end = end;
  }
  
  next(): IteratorResult<number> {
    if (this.current < this.end) {
      const value = this.current;
      this.current = this.current + 1;
      return { done: false, value: value };
    } else {
      return { done: true, value: 0 };
    }
  }
}
`;
      
      const result = compileSource(code);
      expect(result.diagnostics.length).toBe(0);
      expect(result.cpp).toContain('class Range');
      expect(result.cpp).toContain('class RangeIterator');
      expect(result.cpp).toContain('__iterator()');  // [Symbol.iterator] → __iterator
      expect(result.cpp).toContain('public Iterator<double>');  // RangeIterator inherits Iterator
    });
  });
  
  describe('Error Cases', () => {
    it('should reject non-iterator Symbol usage', () => {
      const code = `
function main(): void {
  const sym = Symbol.for("test");
  console.log(sym);
}
`;
      
      const result = compileSource(code);
      expect(hasError(result.diagnostics, 'GS125')).toBe(true);
    });
    
    it('should accept Symbol.iterator usage', () => {
      const code = `
class MyIterable implements Iterable<number> {
  [Symbol.iterator](): Iterator<number> {
    return new MyIterator();
  }
}

class MyIterator implements Iterator<number> {
  next(): IteratorResult<number> {
    return { done: true, value: 0 };
  }
}
`;
      
      const result = compileSource(code);
      expect(result.diagnostics.length).toBe(0);  // Should compile without GS125 error
      expect(result.cpp).toContain('__iterator');
    });
  });
  
});
