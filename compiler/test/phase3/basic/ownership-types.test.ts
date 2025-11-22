/**
 * Phase 3 Tests: Ownership Types
 * 
 * Tests C++ code generation for Unique, Shared, and Weak ownership qualifiers.
 */

import { describe, it, expect } from 'vitest';
import { CppCodegen } from '../../../src/cpp-codegen';
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

describe('Phase 3: Ownership - Unique<T>', () => {
  it('should generate std::unique_ptr for Unique<T>', () => {
    const source = `
      class Node {
        value: number;
        constructor(value: number) {
          this.value = value;
        }
      }
      
      const node: Unique<Node> = new Node(42);
    `;
    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('std::unique_ptr<Node>');
  });
  
  it('should generate class with Unique<T> field', () => {
    const source = `
      class Box {
        value: Unique<number>;
      }
    `;
    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('std::unique_ptr<double> value;');
  });
});

describe('Phase 3: Ownership - Shared<T>', () => {
  it('should generate std::shared_ptr for Shared<T>', () => {
    const source = `
      class Data {
        count: number;
      }
      
      const data: Shared<Data> = new Data();
    `;
    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('std::shared_ptr<Data>');
  });
  
  it('should generate class with Shared<T> field', () => {
    const source = `
      class Container {
        items: Shared<string>[];
      }
    `;
    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('std::vector<std::shared_ptr<std::string>>');
  });
});

describe('Phase 3: Ownership - Weak<T>', () => {
  it('should generate std::weak_ptr for Weak<T>', () => {
    const source = `
      class Node {
        parent: Weak<Node>;
      }
    `;
    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('std::weak_ptr<Node>');
  });
});

describe('Phase 3: Nullable Types', () => {
  it('should handle nullable types', () => {
    const source = `
      interface User {
        email: string | null;
      }
    `;
    const cpp = compileToCpp(source);
    
    // For now, just verify it compiles - we'll refine nullable handling later
    expect(cpp).toContain('struct User');
    expect(cpp).toContain('email');
  });
  
  it('should convert null to std::nullopt', () => {
    const source = `
      const x: string | null = null;
    `;
    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('std::nullopt');
  });
});

describe('Phase 3: Collection Types', () => {
  it('should generate std::unordered_map for Map<K,V>', () => {
    const source = `
      const cache: Map<string, number> = new Map();
    `;
    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('#include <unordered_map>');
    expect(cpp).toContain('std::unordered_map<std::string, double>');
  });
  
  it('should generate std::unordered_set for Set<T>', () => {
    const source = `
      const visited: Set<number> = new Set();
    `;
    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('#include <unordered_set>');
    expect(cpp).toContain('std::unordered_set<double>');
  });
  
  it('should handle Map with Shared<T> values', () => {
    const source = `
      class Data {
        value: number;
      }
      
      const cache: Map<string, Shared<Data>> = new Map();
    `;
    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('std::unordered_map<std::string, std::shared_ptr<Data>>');
  });
});
