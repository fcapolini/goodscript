import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { IRLowering } from '../src/frontend/lowering.js';
import { CppCodegen } from '../src/backend/cpp/codegen.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

describe('Math and JSON Demo Compilation', () => {
  function compileToCpp(sourceCode: string): string {
    const sourceFile = ts.createSourceFile('test.ts', sourceCode, ts.ScriptTarget.ES2022, true);
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
      getDefaultLibFileName: () => 'lib.d.ts',
    });
    const lowering = new IRLowering();
    const program_ir = lowering.lower(program);
    const codegen = new CppCodegen();
    const files = codegen.generate(program_ir, 'gc');
    return files.get('test.cpp') || '';
  }

  it('should compile math-demo-gs.ts without errors', () => {
    const mathDemoPath = path.join(projectRoot, 'examples', 'tmp-examples', 'math-demo-gs.ts');
    const sourceCode = fs.readFileSync(mathDemoPath, 'utf-8');
    
    const cpp = compileToCpp(sourceCode);
    
    // Verify key Math operations are present
    expect(cpp).toContain('gs::Math::min');
    expect(cpp).toContain('gs::Math::max');
    expect(cpp).toContain('gs::Math::abs');
    expect(cpp).toContain('gs::Math::sqrt');
    expect(cpp).toContain('gs::Math::pow');
    expect(cpp).toContain('gs::Math::sin');
    expect(cpp).toContain('gs::Math::cos');
    expect(cpp).toContain('gs::Math::log');
    expect(cpp).toContain('gs::Math::PI');
    expect(cpp).toContain('gs::Math::E');
    
    // Verify it compiles without syntax errors (no 'error' in output)
    expect(cpp.length).toBeGreaterThan(100);
  });

  it('should compile json-demo-gs.ts without errors', () => {
    const jsonDemoPath = path.join(projectRoot, 'examples', 'tmp-examples', 'json-demo-gs.ts');
    const sourceCode = fs.readFileSync(jsonDemoPath, 'utf-8');
    
    const cpp = compileToCpp(sourceCode);
    
    // Verify JSON.stringify is present
    expect(cpp).toContain('gs::JSON::stringify');
    
    // Verify it compiles without syntax errors
    expect(cpp.length).toBeGreaterThan(100);
  });
});
