/**
 * GoodScript/TypeScript Interoperability Tests
 * 
 * Tests that -gs.ts and .ts files can seamlessly import from each other
 */

import { describe, it, expect } from 'vitest';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { Compiler } from '../../src/compiler';

describe('GoodScript/TypeScript Interoperability', () => {
  
  /**
   * Helper to compile multiple files together
   */
  function compileMultipleFiles(files: { name: string; content: string }[]): { success: boolean; errors: string[] } {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'goodscript-interop-'));
    
    try {
      // Write all files
      const filePaths = files.map(file => {
        const filePath = path.join(tmpDir, file.name);
        fs.writeFileSync(filePath, file.content);
        return filePath;
      });
      
      // Create tsconfig.json for module resolution
      const tsconfig = {
        compilerOptions: {
          target: 'ES2020',
          module: 'commonjs',
          strict: true,
          lib: ['ES2020'],
          skipLibCheck: true,
          outDir: 'out'  // Don't output to dist/ to avoid overwriting compiler files
        }
      };
      fs.writeFileSync(path.join(tmpDir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));
      
      // Compile all files
      const compiler = new Compiler();
      const result = compiler.compile({
        files: filePaths,
        skipOwnershipChecks: true,
        project: path.join(tmpDir, 'tsconfig.json'),
        outDir: path.join(tmpDir, 'out')  // Output to tmpDir/out to avoid conflicts
      });
      
      const errors = result.diagnostics
        .filter(d => d.severity === 'error')
        .map(d => `${d.code}: ${d.message}`);
      
      return {
        success: result.success,
        errors
      };
    } finally {
      // Cleanup
      try {
        const files = fs.readdirSync(tmpDir);
        for (const file of files) {
          fs.unlinkSync(path.join(tmpDir, file));
        }
        fs.rmdirSync(tmpDir);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  describe('TypeScript importing from GoodScript', () => {
    it('should import type from -gs.ts', () => {
      const result = compileMultipleFiles([
        {
          name: 'node-gs.ts',
          content: `
export interface Node {
  id: number;
  name: string;
}

export const createNode = (id: number, name: string): Node => ({
  id,
  name
});
`
        },
        {
          name: 'main.ts',
          content: `
import { Node } from './node-gs';

const node: Node = {
  id: 1,
  name: 'test'
};
`
        }
      ]);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should import function from -gs.ts', () => {
      const result = compileMultipleFiles([
        {
          name: 'utils-gs.ts',
          content: `
export const add = (a: number, b: number): number => a + b;
export const multiply = (a: number, b: number): number => a * b;
`
        },
        {
          name: 'calculator.ts',
          content: `
import { add, multiply } from './utils-gs';

const result = add(2, 3);
const product = multiply(4, 5);
`
        }
      ]);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should import class from -gs.ts', () => {
      const result = compileMultipleFiles([
        {
          name: 'config-gs.ts',
          content: `
export class Config {
  constructor(public name: string) {}
  
  getName = (): string => this.name;
}
`
        },
        {
          name: 'app.ts',
          content: `
import { Config } from './config-gs';

const config = new Config('myapp');
const name = config.getName();
`
        }
      ]);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('GoodScript importing from TypeScript', () => {
    it('should import type from .ts file', () => {
      const result = compileMultipleFiles([
        {
          name: 'types.ts',
          content: `
export interface User {
  id: number;
  email: string;
}
`
        },
        {
          name: 'service-gs.ts',
          content: `
import { User } from './types';

const createUser = (id: number, email: string): User => ({
  id,
  email
});
`
        }
      ]);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should import function from .ts file', () => {
      const result = compileMultipleFiles([
        {
          name: 'logger.ts',
          content: `
export function log(message: string): void {
  console.log(message);
}
`
        },
        {
          name: 'main-gs.ts',
          content: `
import { log } from './logger';

const greet = (name: string): void => {
  log('Hello ' + name);
};
`
        }
      ]);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should import class from .ts file', () => {
      const result = compileMultipleFiles([
        {
          name: 'database.ts',
          content: `
export class Database {
  constructor(private connectionString: string) {}
  
  connect(): void {
    console.log('Connecting to ' + this.connectionString);
  }
}
`
        },
        {
          name: 'app-gs.ts',
          content: `
import { Database } from './database';

const db = new Database('localhost:5432');
`
        }
      ]);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Bidirectional imports', () => {
    it('should allow -gs.ts and .ts files to import from each other', () => {
      const result = compileMultipleFiles([
        {
          name: 'types.ts',
          content: `
export interface Config {
  port: number;
}
`
        },
        {
          name: 'parser-gs.ts',
          content: `
import { Config } from './types';

export const parseConfig = (data: string): Config => ({
  port: parseInt(data, 10)
});
`
        },
        {
          name: 'server.ts',
          content: `
import { parseConfig } from './parser-gs';

const config = parseConfig('8080');
`
        }
      ]);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle circular dependencies between -gs.ts and .ts', () => {
      const result = compileMultipleFiles([
        {
          name: 'a-gs.ts',
          content: `
import { BType } from './b';

export interface AType {
  b: BType;
}

export const createA = (): AType => ({
  b: { value: 42 }
});
`
        },
        {
          name: 'b.ts',
          content: `
import { AType } from './a-gs';

export interface BType {
  value: number;
}

export function processA(a: AType): number {
  return a.b.value;
}
`
        }
      ]);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Mixed file extensions', () => {
    it('should import -gs.ts files using -gs suffix', () => {
      const result = compileMultipleFiles([
        {
          name: 'module-gs.ts',
          content: `
export const VERSION = '1.0.0';
`
        },
        {
          name: 'app.ts',
          content: `
// Import -gs.ts files using -gs suffix
import { VERSION } from './module-gs';

console.log(VERSION);
`
        }
      ]);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should work with multiple -gs.ts files importing each other', () => {
      const result = compileMultipleFiles([
        {
          name: 'base-gs.ts',
          content: `
export interface Base {
  id: number;
}
`
        },
        {
          name: 'derived-gs.ts',
          content: `
import { Base } from './base-gs';

export interface Derived extends Base {
  name: string;
}
`
        },
        {
          name: 'consumer-gs.ts',
          content: `
import { Derived } from './derived-gs';

const item: Derived = {
  id: 1,
  name: 'test'
};
`
        }
      ]);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Re-exports', () => {
    it('should support re-exporting from -gs.ts in .ts file', () => {
      const result = compileMultipleFiles([
        {
          name: 'core-gs.ts',
          content: `
export interface CoreType {
  value: string;
}
`
        },
        {
          name: 'index.ts',
          content: `
export { CoreType } from './core-gs';
export type { CoreType as Core } from './core-gs';
`
        },
        {
          name: 'app.ts',
          content: `
import { CoreType, Core } from './index';

const item: CoreType = { value: 'test' };
const another: Core = { value: 'test2' };
`
        }
      ]);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should support re-exporting from .ts in -gs.ts file', () => {
      const result = compileMultipleFiles([
        {
          name: 'utils.ts',
          content: `
export function format(s: string): string {
  return s.toUpperCase();
}
`
        },
        {
          name: 'index-gs.ts',
          content: `
export { format } from './utils';
export { format as formatString } from './utils';
`
        },
        {
          name: 'app-gs.ts',
          content: `
import { format, formatString } from './index-gs';

const result = format('hello');
const result2 = formatString('world');
`
        }
      ]);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('GoodScript restrictions only apply to -gs.ts files', () => {
    it('should allow var in .ts but not in -gs.ts', () => {
      const result = compileMultipleFiles([
        {
          name: 'legacy.ts',
          content: `
// var is allowed in regular .ts files
export var counter = 0;

export function increment() {
  counter++;
}
`
        },
        {
          name: 'modern-gs.ts',
          content: `
import { counter, increment } from './legacy';

// Using the imported var from .ts file is fine
const value = counter;
`
        }
      ]);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow == in .ts but not in -gs.ts', () => {
      const result = compileMultipleFiles([
        {
          name: 'legacy.ts',
          content: `
// == is allowed in .ts files
export function isEqual(a: any, b: any): boolean {
  return a == b;
}
`
        },
        {
          name: 'modern-gs.ts',
          content: `
import { isEqual } from './legacy';

// Can use the function from .ts, just can't use == ourselves
const result = isEqual(1, '1');
`
        }
      ]);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow function declarations in .ts but not in -gs.ts', () => {
      const result = compileMultipleFiles([
        {
          name: 'legacy.ts',
          content: `
// Function declarations allowed in .ts
export function oldStyle(x: number): number {
  return x * 2;
}
`
        },
        {
          name: 'modern-gs.ts',
          content: `
import { oldStyle } from './legacy';

// Must use arrow functions in -gs.ts
const newStyle = (x: number): number => oldStyle(x);
`
        }
      ]);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
