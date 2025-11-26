/**
 * Phase 3 Tests: Class Inheritance
 * Tests that TypeScript class inheritance compiles to C++ inheritance
 */

import { describe, it, expect } from 'vitest';
import { CppCodegen } from '../../../src/cpp-codegen';
import { AstCodegen } from '../../../src/cpp/codegen';
import { writeFileSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import ts from 'typescript';

const USE_AST_CODEGEN = true;

function compileToCpp(source: string): string {
  const sourceFile = ts.createSourceFile(
    'test.ts',
    source,
    ts.ScriptTarget.ES2020,
    true
  );
  
  const codegen = USE_AST_CODEGEN ? new AstCodegen() : new CppCodegen();
  return codegen.generate(sourceFile);
}

describe('Phase 3: Class Inheritance', () => {
  it('should generate simple extends clause', () => {
    const source = `
class Base {
  value: number = 0;
}

class Derived extends Base {
  name: string = "";
}
    `;

    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('class Base {');
    expect(cpp).toContain('class Derived : public Base {');
  });

  it('should handle multiple levels of inheritance', () => {
    const source = `
class GrandParent {
  a: number = 0;
}

class Parent extends GrandParent {
  b: number = 0;
}

class Child extends Parent {
  c: number = 0;
}
    `;

    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('class GrandParent {');
    expect(cpp).toContain('class Parent : public GrandParent {');
    expect(cpp).toContain('class Child : public Parent {');
  });

  it('should handle implements clause for interfaces', () => {
    const source = `
interface IFoo {
  x: number;
}

class MyClass implements IFoo {
  x: number = 0;
}
    `;

    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('struct IFoo {');
    expect(cpp).toContain('class MyClass : public IFoo {');
  });

  it('should handle both extends and implements', () => {
    const source = `
class Base {
  value: number = 0;
}

interface IFoo {
  x: number;
}

class Derived extends Base implements IFoo {
  x: number = 0;
}
    `;

    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('class Derived : public Base, public IFoo {');
  });

  it('should handle multiple interface implementations', () => {
    const source = `
interface IFoo {
  x: number;
}

interface IBar {
  y: number;
}

class MyClass implements IFoo, IBar {
  x: number = 0;
  y: number = 0;
}
    `;

    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('class MyClass : public IFoo, public IBar {');
  });

  it('should escape base class names that are keywords', () => {
    const source = `
class namespace {
  value: number = 0;
}

class Derived extends namespace {
  name: string = "";
}
    `;

    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('class namespace_ {');
    expect(cpp).toContain('class Derived : public namespace_ {');
  });

  it('should handle inheritance with methods', () => {
    const source = `
class Base {
  value: number = 0;
  
  getValue(): number {
    return this.value;
  }
}

class Derived extends Base {
  name: string = "";
  
  getName(): string {
    return this.name;
  }
}
    `;

    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('class Derived : public Base {');
    expect(cpp).toContain('gs::String getName()');
  });

  it('should compile and run inherited fields', () => {
    const source = `
class Base {
  value: number = 0;
  
  getValue(): number {
    return this.value;
  }
}

class Derived extends Base {
  name: string = "";
  
  getName(): string {
    return this.name;
  }
}

const d = new Derived();
d.value = 42;
d.name = "test";
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
      expect(output).toContain('42');
      expect(output).toContain('test');
    } catch (error: any) {
      console.error('Compilation error:', error.stderr || error.message);
      throw error;
    }
  });

  it('should handle generic base classes', () => {
    const source = `
class Container<T> {
  items: T[] = [];
}

class StringContainer extends Container {
  addString(s: string): void {
    this.items.push(s);
  }
}
    `;

    const cpp = compileToCpp(source);
    
    // Generic base without type arguments becomes non-template base
    // (This is a limitation - fully generic inheritance would need type parameters)
    expect(cpp).toContain('template<typename T>');
    expect(cpp).toContain('class Container {');
    expect(cpp).toContain('class StringContainer : public Container {');
  });

  it('should handle abstract base classes', () => {
    const source = `
abstract class Base {
  abstract getValue(): number;
  
  process(): void {
    console.log(this.getValue());
  }
}

class Derived extends Base {
  value: number = 42;
  
  getValue(): number {
    return this.value;
  }
}
    `;

    const cpp = compileToCpp(source);
    
    // C++ doesn't have 'abstract' keyword, but should still generate inheritance
    expect(cpp).toContain('class Base {');
    expect(cpp).toContain('class Derived : public Base {');
    // Methods are generated normally
    expect(cpp).toContain('double getValue()');
  });
});
