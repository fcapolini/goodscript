# Phase 3 Tests

Tests for Rust code generation (Phase 3).

## Test Structure

- `basic-types.test.ts` - Primitive type translation
- `ownership-types.test.ts` - Unique/Shared/Weak type translation
- `functions.test.ts` - Function and arrow function translation
- `classes.test.ts` - Class to struct+impl translation
- `control-flow.test.ts` - If/else, loops, etc.
- `collections.test.ts` - Array, Map, Set translation
- `expressions.test.ts` - Binary expressions, literals, etc.

## Testing Strategy

Each test:
1. Compiles GoodScript source to Rust
2. Verifies Rust code is syntactically correct
3. Optionally compiles with rustc to ensure it's valid
4. Checks for expected ownership type mappings
5. Verifies imports are generated correctly

## Example Test Pattern

```typescript
import { describe, it, expect } from 'vitest';
import { Compiler } from '../src/compiler';
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('Rust Code Generation - Basic Types', () => {
  const compile = (source: string): string => {
    const tmpDir = join(tmpdir(), 'goodscript-test-' + Date.now());
    const srcFile = join(tmpDir, 'test.gs.ts');
    const outDir = join(tmpDir, 'dist');
    
    mkdirSync(tmpDir, { recursive: true });
    writeFileSync(srcFile, source, 'utf-8');
    
    const compiler = new Compiler();
    const result = compiler.compile({
      files: [srcFile],
      outDir,
      target: 'rust',
    });
    
    // Clean up
    unlinkSync(srcFile);
    
    return result;
  };
  
  it('should translate number to f64', () => {
    const result = compile(`
      const x: number = 42;
    `);
    
    expect(result.success).toBe(true);
    expect(result.output).toContain('let x: f64 = 42.0;');
  });
});
```
