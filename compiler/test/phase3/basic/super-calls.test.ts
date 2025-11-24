/**
 * Phase 3 Tests: super() calls in constructors
 * Tests that super() calls are properly translated to C++ base class initialization
 */

import { describe, it, expect } from 'vitest';
import { CppCodegen } from '../../../src/cpp-codegen';
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

describe('Phase 3: super() calls', () => {
  it('should generate base class initialization for super()', () => {
    const source = `
class Base {
  value: number;
  
  constructor(v: number) {
    this.value = v;
  }
}

class Derived extends Base {
  name: string;
  
  constructor(v: number, n: string) {
    super(v);
    this.name = n;
  }
}
    `;

    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('class Derived : public Base {');
    expect(cpp).toContain('Derived(double v, const gs::String& n) : Base(v) {');
    expect(cpp).toContain('this->name = n;');
    // Should NOT contain the super() call in the body
    expect(cpp).not.toMatch(/super\s*\(/);
  });

  it('should handle super() with multiple arguments', () => {
    const source = `
class Base {
  x: number;
  y: number;
  
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

class Derived extends Base {
  constructor(a: number, b: number) {
    super(a * 2, b * 2);
  }
}
    `;

    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('Derived(double a, double b) : Base(a * 2, b * 2) {');
  });

  it('should handle super() with expressions', () => {
    const source = `
class Base {
  value: number;
  
  constructor(v: number) {
    this.value = v;
  }
}

class Derived extends Base {
  constructor(x: number, y: number) {
    super(x + y);
  }
}
    `;

    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('Derived(double x, double y) : Base(x + y) {');
  });

  it('should handle super() with no arguments', () => {
    const source = `
class Base {
  constructor() {
    console.log("base");
  }
}

class Derived extends Base {
  constructor() {
    super();
  }
}
    `;

    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('Derived() : Base() {');
  });

  it('should handle constructor with super() and additional statements', () => {
    const source = `
class Base {
  value: number;
  
  constructor(v: number) {
    this.value = v;
  }
}

class Derived extends Base {
  name: string = "";
  
  constructor(v: number, n: string) {
    super(v);
    this.name = n;
    console.log("initialized");
  }
}
    `;

    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('Derived(double v, const gs::String& n) : Base(v) {');
    expect(cpp).toContain('this->name = n;');
    expect(cpp).toContain('gs::console::log');
  });

  it('should compile and run code with super()', () => {
    const source = `
class Base {
  value: number = 0;
  
  constructor(v: number) {
    this.value = v;
  }
  
  getValue(): number {
    return this.value;
  }
}

class Derived extends Base {
  name: string = "";
  
  constructor(v: number, n: string) {
    super(v * 10);
    this.name = n;
  }
  
  getName(): string {
    return this.name;
  }
}

const d = new Derived(4, "test");
console.log(d.getValue());
console.log(d.getName());
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
      expect(output).toContain('40');  // 4 * 10
      expect(output).toContain('test');
    } catch (error: any) {
      console.error('Compilation error:', error.stderr || error.message);
      throw error;
    }
  });

  it('should handle multi-level inheritance with super()', () => {
    const source = `
class GrandParent {
  a: number = 0;
  
  constructor(a: number) {
    this.a = a;
  }
}

class Parent extends GrandParent {
  b: number = 0;
  
  constructor(a: number, b: number) {
    super(a);
    this.b = b;
  }
}

class Child extends Parent {
  c: number = 0;
  
  constructor(a: number, b: number, c: number) {
    super(a, b);
    this.c = c;
  }
}

const child = new Child(1, 2, 3);
console.log(child.a);
console.log(child.b);
console.log(child.c);
    `;

    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('Parent(double a, double b) : GrandParent(a) {');
    expect(cpp).toContain('Child(double a, double b, double c) : Parent(a, b) {');
    
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
      expect(output).toContain('1');
      expect(output).toContain('2');
      expect(output).toContain('3');
    } catch (error: any) {
      console.error('Compilation error:', error.stderr || error.message);
      throw error;
    }
  });
});
