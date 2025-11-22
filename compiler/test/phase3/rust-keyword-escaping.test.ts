import { describe, it, expect } from 'vitest';
import { RustCodegen } from '../../src/rust-codegen.js';
import * as ts from 'typescript';

describe('Rust Keyword Escaping', () => {
  const createSourceFile = (code: string) => {
    return ts.createSourceFile(
      'test.ts',
      code,
      ts.ScriptTarget.ES2020,
      true
    );
  };

  it('should escape parameter names that are Rust keywords', () => {
    const code = `
      const test = (type: string, async: boolean): void => {
        console.log(type, async);
      };
    `;
    const sourceFile = createSourceFile(code);
    const codegen = new RustCodegen();
    const result = codegen.generate(sourceFile);
    
    // Should escape 'type' and 'async' parameters
    expect(result).toContain('r#type: String');
    expect(result).toContain('r#async: bool');
  });

  it('should escape variable names that are Rust keywords', () => {
    const code = `
      const match = 42;
      const type = "hello";
      const async = true;
    `;
    const sourceFile = createSourceFile(code);
    const codegen = new RustCodegen();
    const result = codegen.generate(sourceFile);
    
    // Non-exported const become 'let' in the main function
    expect(result).toMatch(/let r#match/);
    expect(result).toMatch(/let r#type/);
    expect(result).toMatch(/let r#async/);
  });

  it('should escape field references that are Rust keywords', () => {
    const code = `
      class Test {
        type: string;
        
        constructor(type: string) {
          this.type = type;
        }
        
        getType(): string {
          return this.type;
        }
      }
    `;
    const sourceFile = createSourceFile(code);
    const codegen = new RustCodegen();
    const result = codegen.generate(sourceFile);
    
    // Field should be escaped in struct
    expect(result).toContain('r#type: String');
    // Parameter should be escaped
    expect(result).toMatch(/fn new\(.*r#type: String/);
    // Field access should be escaped
    expect(result).toContain('self.r#type');
  });

  it('should not escape self and Self keywords', () => {
    const code = `
      class Test {
        value: number;
        
        getValue(): number {
          return this.value;
        }
      }
    `;
    const sourceFile = createSourceFile(code);
    const codegen = new RustCodegen();
    const result = codegen.generate(sourceFile);
    
    // Should use 'self' (or &mut self), not 'r#self'
    expect(result).toMatch(/&mut self|&self/);
    expect(result).not.toContain('r#self');
  });

  it('should escape common Rust keywords used as parameters', () => {
    // Test Rust keywords that are valid TypeScript identifiers  
    // (excludes TypeScript keywords like break, const, if, etc.)
    const testKeywords = ['type', 'async', 'match', 'trait', 'impl', 'mod', 'mut', 'pub', 'unsafe', 'dyn'];
    
    for (const keyword of testKeywords) {
      const code = `const test = (${keyword}: number): void => {};`;
      const sourceFile = createSourceFile(code);
      const codegen = new RustCodegen();
      const result = codegen.generate(sourceFile);
      
      expect(result).toContain(`r#${keyword}`);
    }
  });
});
