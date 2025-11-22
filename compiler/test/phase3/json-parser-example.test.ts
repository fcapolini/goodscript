import { describe, it, expect } from 'vitest';
import { Compiler } from '../../src/compiler.js';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('JSON Parser Example', () => {
  const compiler = new Compiler();
  const exampleDir = join(__dirname, 'concrete-examples', 'json-parser');
  const srcFile = join(exampleDir, 'src', 'main.gs.ts');
  const tsconfigPath = join(exampleDir, 'tsconfig.json');
  const outDir = join(exampleDir, 'dist');

  it('should compile to TypeScript without errors', () => {
    const result = compiler.compile({
      files: [srcFile],
      outDir,
      target: 'typescript',
      project: tsconfigPath,
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      console.error('Compilation errors:', result.diagnostics);
    }
  });

  it('should compile to Rust without GoodScript errors', () => {
    const result = compiler.compile({
      files: [srcFile],
      outDir,
      target: 'rust',
      project: tsconfigPath,
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      console.error('Compilation errors:', result.diagnostics);
    }
  });

  it.todo('should generate Rust code that compiles with rustc', () => {
    // Known issues in Rust codegen:
    // 1. Parameter name 'type' is a Rust keyword - needs escaping
    // 2. Enum member access uses TokenType.EOF instead of TokenType::EOF
    // 3. Struct initialization with constructor parameters not fully working
    //
    // These need to be fixed in rust-codegen.ts:
    // - Add keyword escaping for parameter names
    // - Fix enum member access operator (. -> ::)
    // - Improve struct initialization with Box<T> fields
  });
});
