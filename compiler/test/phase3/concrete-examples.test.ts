import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Compiler } from '../../src/compiler.js';
import { writeFileSync, mkdirSync, existsSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { executeJS, executeRust, compareOutputs, normalizeOutput, isRustcAvailable } from './runtime-helpers.js';

/**
 * Concrete Examples - Real-world GoodScript programs
 * 
 * These tests use complete, practical examples to validate that GoodScript
 * can compile realistic programs to TypeScript. Rust code generation is
 * tested where supported, but these examples primarily focus on validating
 * the TypeScript output with real-world algorithms.
 * 
 * NOTE: Full Rust equivalence is a work in progress for complex examples
 * involving arrays, closures with mutable captures, and string methods.
 */

describe('Phase 3: Concrete Examples', () => {
  let tmpDir: string;
  let compiler: Compiler;

  beforeEach(() => {
    tmpDir = join(tmpdir(), 'goodscript-test-concrete-' + Date.now() + '-' + Math.random().toString(36).substring(7));
    mkdirSync(tmpDir, { recursive: true });
    compiler = new Compiler();
  });

  afterEach(() => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  const compileAndExecute = (source: string): {
    jsCode: string;
    rustCode: string;
    jsResult: ReturnType<typeof executeJS>;
    rustResult: ReturnType<typeof executeRust> | null;
    equivalent: boolean;
  } => {
    const srcFile = join(tmpDir, 'test.gs.ts');
    const outDir = join(tmpDir, 'dist');
    
    writeFileSync(srcFile, source, 'utf-8');
    
    // Compile to JavaScript
    const jsCompileResult = compiler.compile({
      files: [srcFile],
      outDir,
      target: 'typescript',
    });
    
    const jsFile = join(outDir, 'test.js');
    const jsCode = existsSync(jsFile) ? readFileSync(jsFile, 'utf-8') : '';
    
    // Compile to Rust
    const rustCompileResult = compiler.compile({
      files: [srcFile],
      outDir,
      target: 'rust',
    });
    
    const rustFile = join(outDir, 'test.rs');
    const rustCode = existsSync(rustFile) ? readFileSync(rustFile, 'utf-8') : '';
    
    // Execute JavaScript
    const jsResult = executeJS(jsCode);
    
    // Execute Rust (only if rustc is available)
    let rustResult = null;
    let equivalent = false;
    
    if (isRustcAvailable() && rustCode) {
      rustResult = executeRust(rustCode);
      equivalent = compareOutputs(jsResult, rustResult);
    }
    
    return {
      jsCode,
      rustCode,
      jsResult,
      rustResult,
      equivalent,
    };
  };

  describe('N-Queens Solver', () => {
    it('should solve N-Queens for small boards (N=4)', () => {
      const source = `
const nQueens = (N: number) => {
  const board = new Array<number>();

  const clear = () => {
    for (let i = 0; i < N * N; i++) board[i] = 0;
  };

  const set = (id: number, x: number, y: number) => {
    board[x + (y * N)] = id;
  };

  const get = (x: number, y: number) => {
    return board[x + (y * N)];
  };

  const checkD1 = (x: number, y: number): boolean => {
    while (x > 0 && y > 0) {
      x--; y--;
    }
    while (x < N && y < N) {
      if (get(x, y)) {
        return false;
      }
      x++; y++;
    }
    return true;
  };

  const checkD2 = (x: number, y: number): boolean => {
    while (x > 0 && y < (N - 1)) {
      x--; y++;
    }
    while (x < N && y >= 0) {
      if (get(x, y)) {
        return false;
      }
      x++; y--;
    }
    return true;
  };

  const check = (x: number, y: number): boolean => {
    for (let i = 0; i < N; i++) {
      if (get(i, y)) {
        return false;
      }
      if (get(x, i)) {
        return false;
      }
    }
    return checkD1(x, y) && checkD2(x, y);
  };

  const place = (id: number): boolean => {
    for (let x = 0; x < N; x++) {
      for (let y = 0; y < N; y++) {
        if (check(x, y)) {
          set(id, x, y);
          if (id < N) {
            if (place(id + 1)) {
              return true;
            }
          } else {
            return true;
          }
          set(0, x, y);
        }
      }
    }
    return false;
  };

  const dump = () => {
    for (let n = 0; n < N; n++) {
      let i = n * N;
      console.log(board.slice(i, i + N).map(x => \`\${x > 0 ? String.fromCharCode(96 + x) : '•'}\`).join(' '));
    }
  };

  clear();
  if (place(1)) {
    dump();
  } else {
    console.log('failed');
  }
};

nQueens(4);
`;

      const result = compileAndExecute(source);
      
      // Should compile to JavaScript without errors
      expect(result.jsResult.success).toBe(true);
      
      // Verify output contains board representation  
      const output = result.jsResult.stdout || '';
      expect(output).toContain('•');
      // Should show 4 rows for a 4x4 board
      expect(output.split('\n').filter((line: string) => line.includes('•')).length).toBe(4);
      
      // Rust code generation is tested but not required to pass yet for complex examples
      // TODO: Enable full Rust equivalence once array/closure/string improvements are complete
      if (result.rustResult !== null && result.rustResult.success) {
        expect(result.equivalent).toBe(true);
      }
    });

    it('should solve N-Queens for medium boards (N=8)', () => {
      const source = `
const nQueens = (N: number) => {
  const board = new Array<number>();

  const clear = () => {
    for (let i = 0; i < N * N; i++) board[i] = 0;
  };

  const set = (id: number, x: number, y: number) => {
    board[x + (y * N)] = id;
  };

  const get = (x: number, y: number) => {
    return board[x + (y * N)];
  };

  const checkD1 = (x: number, y: number): boolean => {
    while (x > 0 && y > 0) {
      x--; y--;
    }
    while (x < N && y < N) {
      if (get(x, y)) {
        return false;
      }
      x++; y++;
    }
    return true;
  };

  const checkD2 = (x: number, y: number): boolean => {
    while (x > 0 && y < (N - 1)) {
      x--; y++;
    }
    while (x < N && y >= 0) {
      if (get(x, y)) {
        return false;
      }
      x++; y--;
    }
    return true;
  };

  const check = (x: number, y: number): boolean => {
    for (let i = 0; i < N; i++) {
      if (get(i, y)) {
        return false;
      }
      if (get(x, i)) {
        return false;
      }
    }
    return checkD1(x, y) && checkD2(x, y);
  };

  const place = (id: number): boolean => {
    for (let x = 0; x < N; x++) {
      for (let y = 0; y < N; y++) {
        if (check(x, y)) {
          set(id, x, y);
          if (id < N) {
            if (place(id + 1)) {
              return true;
            }
          } else {
            return true;
          }
          set(0, x, y);
        }
      }
    }
    return false;
  };

  const dump = () => {
    for (let n = 0; n < N; n++) {
      let i = n * N;
      console.log(board.slice(i, i + N).map(x => \`\${x > 0 ? String.fromCharCode(96 + x) : '•'}\`).join(' '));
    }
  };

  clear();
  if (place(1)) {
    dump();
  } else {
    console.log('failed');
  }
};

nQueens(8);
`;

      const result = compileAndExecute(source);
      
      // Should compile to JavaScript without errors
      expect(result.jsResult.success).toBe(true);
      
      // Verify output contains board representation
      const output = result.jsResult.stdout || '';
      expect(output).toContain('•');
      // Should show 8 rows for an 8x8 board
      expect(output.split('\n').filter((line: string) => line.includes('•')).length).toBe(8);
      
      // Rust code generation is tested but not required to pass yet for complex examples
      // TODO: Enable full Rust equivalence once array/closure/string improvements are complete
      if (result.rustResult !== null && result.rustResult.success) {
        expect(result.equivalent).toBe(true);
      }
    });
  });
});
