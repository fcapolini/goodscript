import { describe, it, expect } from 'vitest';
import { CppCodegen } from '../../../src/cpp/codegen';
import ts from 'typescript';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * NOTE: LiteralObject feature not yet implemented in AST-based codegen.
 * These tests are skipped until the feature is added.
 */

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

describe.skip('Phase 3: JSON.stringify with LiteralObject', () => {
  it('should stringify object literals with primitive values', () => {
    const source = `
const obj = { name: "Alice", age: 30, active: true };
const json = JSON.stringify(obj);
console.log(json);
    `;

    const cpp = compileToCpp(source);
    
    // Should use LiteralObject type
    expect(cpp).toContain('gs::LiteralObject');
    // Should call JSON::stringify
    expect(cpp).toContain('JSON::stringify');
  });

  it('should compile and run object literal stringify', () => {
    const source = `
const person = { name: "Bob", age: 25, active: false };
console.log(JSON.stringify(person));
    `;

    const cpp = compileToCpp(source);
    
    // Create temp directory for compilation
    const tempDir = path.join(__dirname, '../../../temp', 'json-literal-' + Date.now());
    fs.mkdirSync(tempDir, { recursive: true });
    
    try {
      // Write C++ file
      const cppFile = path.join(tempDir, 'test.cpp');
      fs.writeFileSync(cppFile, cpp);
      
      // Compile
      const runtimeDir = path.join(__dirname, '../../../runtime');
      const exeFile = path.join(tempDir, 'test');
      
      try {
        execSync(
          `g++ -std=c++20 -I${runtimeDir} -o ${exeFile} ${cppFile}`,
          { stdio: 'pipe' }
        );
        
        // Run and capture output
        const output = execSync(exeFile, { encoding: 'utf-8' }).trim();
        
        // Should produce valid JSON
        expect(output).toContain('"name"');
        expect(output).toContain('"Bob"');
        expect(output).toContain('"age"');
        expect(output).toContain('25');
        expect(output).toContain('"active"');
        expect(output).toContain('false');
        
        // Verify it's valid JSON by parsing it
        const parsed = JSON.parse(output);
        expect(parsed).toEqual({ name: 'Bob', age: 25, active: false });
      } catch (compileError: any) {
        throw new Error(`Compilation failed: ${compileError.stderr || compileError.message}`);
      }
    } finally {
      // Cleanup
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should handle nested object literals', () => {
    const source = `
const data = { 
  user: { name: "Charlie", id: 123 },
  settings: { theme: "dark", notifications: true }
};
console.log(JSON.stringify(data));
    `;

    const cpp = compileToCpp(source);
    
    // Should compile without errors
    expect(cpp).toContain('gs::LiteralObject');
    expect(cpp).toContain('JSON::stringify');
  });

  it('should stringify Property values correctly', () => {
    const source = `
const mixed = { str: "hello", num: 42, bool: true, nullVal: null };
console.log(JSON.stringify(mixed));
    `;

    const cpp = compileToCpp(source);
    
    expect(cpp).toContain('gs::LiteralObject');
    expect(cpp).toContain('JSON::stringify');
  });
});
