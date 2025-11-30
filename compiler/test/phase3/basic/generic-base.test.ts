/**
 * Phase 3 Tests: Generic base classes
 * Tests that TypeScript generic base classes with type arguments compile correctly
 */

import { describe, it, expect } from 'vitest';
import { CppCodegen } from '../../../src/cpp/codegen';
import { writeFileSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import ts from 'typescript';

function compileToCpp(source: string): string {
  const sourceFile = ts.createSourceFile(
    'test.ts',
    source,
    ts.ScriptTarget.ES2020,
    true
  );
  
  const codegen = new CppCodegen();
  return codegen.generate(sourceFile);
}

describe('Phase 3: Generic base classes', () => {
  it('should generate generic base class with single type argument', () => {
    const source = `
class Container<T> {
  items: T[] = [];
}

class StringContainer extends Container<string> {
  addString(s: string): void {
    this.items.push(s);
  }
}
    `;

    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('template<typename T>');
    expect(cpp).toContain('class Container {');
    expect(cpp).toContain('class StringContainer : public Container<gs::String> {');
  });

  it('should generate generic base class with multiple type arguments', () => {
    const source = `
class Pair<K, V> {
  key: K;
  value: V;
}

class StringNumberPair extends Pair<string, number> {
  constructor(k: string, v: number) {
    super();
    this.key = k;
    this.value = v;
  }
}
    `;

    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('template<typename K, typename V>');
    expect(cpp).toContain('class Pair {');
    expect(cpp).toContain('class StringNumberPair : public Pair<gs::String, double> {');
  });

  it('should handle primitive type arguments', () => {
    const source = `
class Box<T> {
  value: T;
}

class NumberBox extends Box<number> {
  getValue(): number {
    return this.value;
  }
}
    `;

    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('class NumberBox : public Box<double> {');
  });

  it('should handle array type arguments', () => {
    const source = `
class Container<T> {
  items: T;
}

class ArrayContainer extends Container<string[]> {
  getItems(): string[] {
    return this.items;
  }
}
    `;

    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('class ArrayContainer : public Container<gs::Array<gs::String>> {');
  });

  it('should handle custom class type arguments', () => {
    const source = `
class Item {
  name: string = "";
}

class Container<T> {
  items: T[] = [];
}

class ItemContainer extends Container<Item> {
  addItem(item: Item): void {
    this.items.push(item);
  }
}
    `;

    const cpp = compileToCpp(source);
    
    // Custom classes used as type arguments are namespaced in C++
    expect(cpp).toContain('class Container {');
    expect(cpp).toContain('class ItemContainer : public Container<gs::Item> {');
  });

  it('should handle nested generic types', () => {
    const source = `
class Box<T> {
  value: T;
}

class IntBox extends Box<number> {
  getValue(): number {
    return this.value;
  }
}
    `;

    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('class IntBox : public Box<double> {');
  });

  it('should compile and run generic base class code', () => {
    const source = `
class Container<T> {
  items: T[] = [];
  
  add(item: T): void {
    this.items.push(item);
  }
  
  getCount(): number {
    return this.items.length;
  }
}

class StringContainer extends Container<string> {
  addMultiple(items: string[]): void {
    for (let i = 0; i < items.length; i = i + 1) {
      this.add(items[i]);
    }
  }
}

const container = new StringContainer();
container.add("hello");
container.add("world");
console.log(container.getCount());
    `;

    const cpp = compileToCpp(source);
    
    // Create temp directory for test
    const tempDir = join(tmpdir(), `gs-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    
    // Write C++ file
    const cppPath = join(tempDir, 'test.cpp');
    writeFileSync(cppPath, cpp);
    
    // Compile with g++
    const exePath = join(tempDir, 'test');
    try {
      execSync(
        `g++ -std=c++20 -I${process.cwd()}/runtime -o ${exePath} ${cppPath}`,
        { cwd: tempDir, encoding: 'utf-8', stdio: 'pipe' }
      );
      
      // Run and check output
      const output = execSync(exePath, { cwd: tempDir, encoding: 'utf-8' });
      expect(output).toContain('2');
    } catch (error: any) {
      console.error('Compilation error:', error.stderr || error.message);
      throw error;
    }
  });

  it('should handle generic base class with super()', () => {
    const source = `
class Container<T> {
  count: number = 0;
  
  constructor(c: number) {
    this.count = c;
  }
  
  getCount(): number {
    return this.count;
  }
}

class NumberContainer extends Container<number> {
  constructor() {
    super(3);
  }
}

const container = new NumberContainer();
console.log(container.getCount());
    `;

    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('class NumberContainer : public Container<double> {');
    expect(cpp).toContain('NumberContainer() : Container<double>');
    
    // Compile and run
    const tempDir = join(tmpdir(), `gs-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    const cppPath = join(tempDir, 'test.cpp');
    writeFileSync(cppPath, cpp);
    const exePath = join(tempDir, 'test');
    
    try {
      execSync(
        `g++ -std=c++20 -I${process.cwd()}/runtime -o ${exePath} ${cppPath}`,
        { cwd: tempDir, encoding: 'utf-8', stdio: 'pipe' }
      );
      
      const output = execSync(exePath, { cwd: tempDir, encoding: 'utf-8' });
      expect(output).toContain('3');
    } catch (error: any) {
      console.error('Compilation error:', error.stderr || error.message);
      throw error;
    }
  });

  it('should handle Map and other built-in generic types', () => {
    const source = `
class Container<T> {
  data: T;
}

class MapContainer extends Container<Map<string, number>> {
  getData(): Map<string, number> {
    return this.data;
  }
}
    `;

    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('class MapContainer : public Container<gs::Map<gs::String, double>> {');
  });
});
