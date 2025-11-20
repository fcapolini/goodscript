import { describe, it, expect } from 'vitest';
import { Compiler } from '../../src/compiler';
import { writeFileSync, mkdirSync, existsSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { execSync } from 'child_process';

describe('Phase 3 - Generics', () => {
  let tmpDir: string;
  let compiler: Compiler;

  const setupTest = () => {
    tmpDir = join(tmpdir(), 'goodscript-test-generics-' + Date.now() + '-' + Math.random().toString(36).substring(7));
    mkdirSync(tmpDir, { recursive: true });
    compiler = new Compiler();
  };

  const cleanup = () => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  };

  const compile = (source: string): { jsCode: string; rustCode: string } => {
    const srcFile = join(tmpDir, 'test.gs.ts');
    const outDir = join(tmpDir, 'dist');
    
    writeFileSync(srcFile, source, 'utf-8');
    
    // Compile to JavaScript
    compiler.compile({
      files: [srcFile],
      outDir,
      target: 'typescript',
    });
    
    const jsFile = join(outDir, 'test.js');
    const jsCode = existsSync(jsFile) ? readFileSync(jsFile, 'utf-8') : '';
    
    // Compile to Rust
    compiler.compile({
      files: [srcFile],
      outDir,
      target: 'rust',
    });
    
    const rsFile = join(outDir, 'test.rs');
    const rustCode = existsSync(rsFile) ? readFileSync(rsFile, 'utf-8') : '';
    
    return { jsCode, rustCode };
  };

  const executeJS = (jsCode: string): { success: boolean; output: string } => {
    try {
      // Write code to temp file and execute
      const scriptFile = join(tmpDir, 'temp.js');
      writeFileSync(scriptFile, jsCode, 'utf-8');
      const output = execSync(`node "${scriptFile}"`, { encoding: 'utf-8', timeout: 5000 });
      return { success: true, output };
    } catch (error: any) {
      return { success: false, output: error.message };
    }
  };

  describe('Generic Functions', () => {
    it('should handle generic identity function', () => {
      setupTest();
      const source = `
        const identity = <T>(value: T): T => {
          return value;
        };
        
        // Runtime check
        const num = identity<number>(42);
        const str = identity<string>("hello");
        console.log(\`\${num},\${str}\`);
      `;
      
      const { jsCode, rustCode } = compile(source);
      
      // Verify Rust code has generic function
      expect(rustCode).toContain('fn identity');
      expect(rustCode).toContain('<T>');
      
      // Runtime check: Verify JavaScript works
      const jsResult = executeJS(jsCode);
      expect(jsResult.success).toBe(true);
      expect(jsResult.output.trim()).toBe('42,hello');
      
      cleanup();
    });

    it('should handle generic function with constraints', () => {
      setupTest();
      const source = `
        interface Named {
          name: string;
        }
        
        const getName = <T extends Named>(item: T): string => {
          return item.name;
        };
        
        // Runtime check
        const person = { name: "Alice", age: 30 };
        const result = getName(person);
        console.log(result);
      `;
      
      const { jsCode, rustCode } = compile(source);
      
      // Verify Rust code has constrained generic
      expect(rustCode).toContain('fn getName');
      expect(rustCode).toContain('<T');
      
      // Runtime check
      const jsResult = executeJS(jsCode);
      expect(jsResult.success).toBe(true);
      expect(jsResult.output.trim()).toBe('Alice');
      
      cleanup();
    });

    it('should handle multiple type parameters', () => {
      setupTest();
      const source = `
        const makePair = <T, U>(first: T, second: U): string => {
          return \`\${first},\${second}\`;
        };
        
        // Runtime check
        const result = makePair<number, string>(42, "answer");
        console.log(result);
      `;
      
      const { jsCode, rustCode } = compile(source);
      
      // Verify Rust code has multiple type parameters
      expect(rustCode).toContain('fn makePair');
      expect(rustCode).toContain('<T');
      expect(rustCode).toContain('U>');
      
      // Runtime check
      const jsResult = executeJS(jsCode);
      expect(jsResult.success).toBe(true);
      expect(jsResult.output.trim()).toBe('42,answer');
      
      cleanup();
    });
  });

  describe('Generic Classes', () => {
    it('should handle generic class', () => {
      setupTest();
      const source = `
        class Box<T> {
          value: T;
          
          constructor(value: T) {
            this.value = value;
          }
          
          getValue(): T {
            return this.value;
          }
        }
        
        // Runtime check
        const numBox = new Box<number>(42);
        const strBox = new Box<string>("hello");
        console.log(\`\${numBox.getValue()},\${strBox.getValue()}\`);
      `;
      
      const { jsCode, rustCode } = compile(source);
      
      // Verify Rust code has generic struct and impl
      expect(rustCode).toContain('struct Box<T>');
      expect(rustCode).toContain('impl<T> Box<T>');
      expect(rustCode).toContain('fn getValue');
      
      // Runtime check
      const jsResult = executeJS(jsCode);
      expect(jsResult.success).toBe(true);
      expect(jsResult.output.trim()).toBe('42,hello');
      
      cleanup();
    });

    it('should handle generic class with multiple parameters', () => {
      setupTest();
      const source = `
        class Pair<T, U> {
          first: T;
          second: U;
          
          constructor(first: T, second: U) {
            this.first = first;
            this.second = second;
          }
          
          swap(): Pair<U, T> {
            return new Pair<U, T>(this.second, this.first);
          }
        }
        
        // Runtime check
        const pair = new Pair<number, string>(1, "one");
        const swapped = pair.swap();
        console.log(\`\${pair.first},\${pair.second}\`);
        console.log(\`\${swapped.first},\${swapped.second}\`);
      `;
      
      const { jsCode, rustCode } = compile(source);
      
      // Verify Rust code has multiple type parameters
      expect(rustCode).toContain('struct Pair<T, U>');
      expect(rustCode).toContain('impl<T, U> Pair<T, U>');
      
      // Runtime check
      const jsResult = executeJS(jsCode);
      expect(jsResult.success).toBe(true);
      const lines = jsResult.output.trim().split('\n');
      expect(lines[0]).toBe('1,one');
      expect(lines[1]).toBe('one,1');
      
      cleanup();
    });

    it('should handle generic class with methods', () => {
      setupTest();
      const source = `
        class Container<T> {
          items: T[] = [];
          
          add(item: T): void {
            this.items.push(item);
          }
          
          get(index: number): T | undefined {
            return this.items[index];
          }
          
          size(): number {
            return this.items.length;
          }
        }
        
        // Runtime check
        const nums = new Container<number>();
        nums.add(1);
        nums.add(2);
        nums.add(3);
        console.log(\`\${nums.size()},\${nums.get(0)},\${nums.get(1)},\${nums.get(2)}\`);
      `;
      
      const { jsCode, rustCode } = compile(source);
      
      // Verify Rust code
      expect(rustCode).toContain('struct Container<T>');
      expect(rustCode).toContain('impl<T> Container<T>');
      expect(rustCode).toContain('fn add');
      expect(rustCode).toContain('fn get');
      expect(rustCode).toContain('fn size');
      
      // Runtime check
      const jsResult = executeJS(jsCode);
      expect(jsResult.success).toBe(true);
      expect(jsResult.output.trim()).toBe('3,1,2,3');
      
      cleanup();
    });
  });

  describe('Generic Interfaces', () => {
    it('should handle generic interface', () => {
      setupTest();
      const source = `
        interface Result<T> {
          success: boolean;
          value: T;
        }
        
        const createSuccess = <T>(value: T): Result<T> => {
          return { success: true, value: value };
        };
        
        // Runtime check
        const numResult = createSuccess<number>(42);
        const strResult = createSuccess<string>("ok");
        console.log(\`\${numResult.success},\${numResult.value}\`);
        console.log(\`\${strResult.success},\${strResult.value}\`);
      `;
      
      const { jsCode, rustCode } = compile(source);
      
      // Verify Rust code has generic struct
      expect(rustCode).toContain('struct Result<T>');
      expect(rustCode).toContain('fn createSuccess');
      
      // Runtime check
      const jsResult = executeJS(jsCode);
      expect(jsResult.success).toBe(true);
      const lines = jsResult.output.trim().split('\n');
      expect(lines[0]).toBe('true,42');
      expect(lines[1]).toBe('true,ok');
      
      cleanup();
    });

    it('should handle generic interface with multiple parameters', () => {
      setupTest();
      const source = `
        interface KeyValue<K, V> {
          key: K;
          value: V;
        }
        
        const makeKV = <K, V>(key: K, value: V): KeyValue<K, V> => {
          return { key: key, value: value };
        };
        
        // Runtime check
        const kv = makeKV<string, number>("age", 30);
        console.log(\`\${kv.key},\${kv.value}\`);
      `;
      
      const { jsCode, rustCode } = compile(source);
      
      // Verify Rust code
      expect(rustCode).toContain('struct KeyValue<K, V>');
      expect(rustCode).toContain('fn makeKV');
      
      // Runtime check
      const jsResult = executeJS(jsCode);
      expect(jsResult.success).toBe(true);
      expect(jsResult.output.trim()).toBe('age,30');
      
      cleanup();
    });
  });

  describe('Generic Type Aliases', () => {
    it('should handle generic type alias', () => {
      setupTest();
      const source = `
        type Option<T> = T | null;
        
        const wrapValue = <T>(value: T): Option<T> => {
          return value;
        };
        
        const unwrapValue = <T>(opt: Option<T>, defaultVal: T): T => {
          return opt === null ? defaultVal : opt;
        };
        
        // Runtime check
        const wrapped = wrapValue<number>(42);
        const unwrapped = unwrapValue<number>(wrapped, 0);
        console.log(unwrapped);
      `;
      
      const { jsCode, rustCode } = compile(source);
      
      // Verify Rust code has type alias
      expect(rustCode).toContain('fn wrapValue');
      expect(rustCode).toContain('fn unwrapValue');
      
      // Runtime check
      const jsResult = executeJS(jsCode);
      expect(jsResult.success).toBe(true);
      expect(jsResult.output.trim()).toBe('42');
      
      cleanup();
    });
  });

  describe('Generic Arrays and Collections', () => {
    it('should handle generic array operations', () => {
      setupTest();
      const source = `
        const first = <T>(items: T[]): T | undefined => {
          return items[0];
        };
        
        const last = <T>(items: T[]): T | undefined => {
          return items[items.length - 1];
        };
        
        // Runtime check
        const nums = [1, 2, 3, 4, 5];
        const strs = ["a", "b", "c"];
        console.log(\`\${first(nums)},\${last(nums)}\`);
        console.log(\`\${first(strs)},\${last(strs)}\`);
      `;
      
      const { jsCode, rustCode } = compile(source);
      
      // Verify Rust code
      expect(rustCode).toContain('fn first');
      expect(rustCode).toContain('fn last');
      expect(rustCode).toContain('Vec<');
      
      // Runtime check
      const jsResult = executeJS(jsCode);
      expect(jsResult.success).toBe(true);
      const lines = jsResult.output.trim().split('\n');
      expect(lines[0]).toBe('1,5');
      expect(lines[1]).toBe('a,c');
      
      cleanup();
    });

    it('should handle generic map operation', () => {
      setupTest();
      const source = `
        const mapArray = <T, U>(items: T[], fn: (item: T) => U): U[] => {
          return items.map(fn);
        };
        
        // Runtime check
        const nums = [1, 2, 3];
        const doubled = mapArray(nums, (x: number): number => x * 2);
        const strings = mapArray(nums, (x: number): string => \`num\${x}\`);
        console.log(doubled.join(','));
        console.log(strings.join(','));
      `;
      
      const { jsCode, rustCode } = compile(source);
      
      // Verify Rust code
      expect(rustCode).toContain('fn mapArray');
      expect(rustCode).toContain('<T');
      expect(rustCode).toContain('U>');
      
      // Runtime check
      const jsResult = executeJS(jsCode);
      expect(jsResult.success).toBe(true);
      const lines = jsResult.output.trim().split('\n');
      expect(lines[0]).toBe('2,4,6');
      expect(lines[1]).toBe('num1,num2,num3');
      
      cleanup();
    });
  });

  describe('Nested Generics', () => {
    it('should handle nested generic types', () => {
      setupTest();
      const source = `
        class Wrapper<T> {
          value: T;
          
          constructor(value: T) {
            this.value = value;
          }
        }
        
        // Runtime check
        const wrapped = new Wrapper<Wrapper<number>>(new Wrapper<number>(42));
        console.log(wrapped.value.value);
      `;
      
      const { jsCode, rustCode } = compile(source);
      
      // Verify Rust code
      expect(rustCode).toContain('struct Wrapper<T>');
      
      // Runtime check
      const jsResult = executeJS(jsCode);
      expect(jsResult.success).toBe(true);
      expect(jsResult.output.trim()).toBe('42');
      
      cleanup();
    });

    it('should handle generic array of generic type', () => {
      setupTest();
      const source = `
        interface Box<T> {
          item: T;
        }
        
        const makeBoxes = <T>(items: T[]): Box<T>[] => {
          return items.map((item: T): Box<T> => ({ item: item }));
        };
        
        // Runtime check
        const boxes = makeBoxes<number>([1, 2, 3]);
        const values = boxes.map((box: Box<number>): number => box.item);
        console.log(values.join(','));
      `;
      
      const { jsCode, rustCode } = compile(source);
      
      // Verify Rust code
      expect(rustCode).toContain('struct Box<T>');
      expect(rustCode).toContain('fn makeBoxes');
      
      // Runtime check
      const jsResult = executeJS(jsCode);
      expect(jsResult.success).toBe(true);
      expect(jsResult.output.trim()).toBe('1,2,3');
      
      cleanup();
    });
  });
});
