import { describe, it, expect } from 'vitest';
import { Compiler } from '../../src/compiler';
import { writeFileSync, mkdirSync, existsSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { execSync } from 'child_process';
import { executeJS, executeRustWithCargo, isCargoAvailable, normalizeOutput } from './runtime-helpers';

describe('Phase 3 - Class Inheritance', () => {
  let tmpDir: string;
  let compiler: Compiler;

  const setupTest = () => {
    tmpDir = join(tmpdir(), 'goodscript-test-inheritance-' + Date.now() + '-' + Math.random().toString(36).substring(7));
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
  
  const isRustcAvailable = (): boolean => {
    try {
      execSync('rustc --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  };
  
  const validateRustCode = (rustCode: string): { valid: boolean; errors?: string } => {
    const testFile = join(tmpDir, 'test_validation.rs');
    writeFileSync(testFile, rustCode, 'utf-8');
    
    try {
      execSync(`rustc --crate-type lib ${testFile}`, {
        cwd: tmpDir,
        stdio: 'pipe',
      });
      return { valid: true };
    } catch (error: any) {
      return { valid: false, errors: error.stderr?.toString() || error.message };
    }
  };
  
  it('should handle simple class inheritance - runtime equivalence', () => {
    if (!isCargoAvailable()) {
      console.log('Skipping runtime test: cargo not available');
      return;
    }
    
    setupTest();
    
    const source = `
      class Animal {
        name: string = "Unknown";
        
        speak(): void {
          console.log(this.name + " says hello");
        }
      }
      
      class Dog extends Animal {
        breed: string = "Mixed";
        
        bark(): void {
          console.log(this.name + " barks!");
        }
      }
      
      const dog = new Dog();
      dog.speak();
      dog.bark();
      console.log(dog.breed);
    `;
    
    const { jsCode, rustCode } = compile(source);
    
    // Execute both
    const jsResult = executeJS(jsCode);
    const rustResult = executeRustWithCargo(rustCode);
    
    // Compare outputs
    expect(jsResult.success).toBe(true);
    expect(rustResult.success).toBe(true);
    expect(normalizeOutput(jsResult.stdout)).toBe(normalizeOutput(rustResult.stdout));
    
    cleanup();
  });
  
  it('should handle method overriding - runtime equivalence', () => {
    if (!isCargoAvailable()) {
      console.log('Skipping runtime test: cargo not available');
      return;
    }
    
    setupTest();
    
    const source = `
      class Animal {
        name: string = "Generic";
        
        speak(): void {
          console.log("...");
        }
        
        identify(): void {
          console.log("I am " + this.name);
        }
      }
      
      class Dog extends Animal {
        speak(): void {
          console.log("Woof!");
        }
      }
      
      const dog = new Dog();
      dog.speak();
      dog.identify();
    `;
    
    const { jsCode, rustCode } = compile(source);
    
    const jsResult = executeJS(jsCode);
    const rustResult = executeRustWithCargo(rustCode);
    
    expect(jsResult.success).toBe(true);
    expect(rustResult.success).toBe(true);
    expect(normalizeOutput(jsResult.stdout)).toBe(normalizeOutput(rustResult.stdout));
    
    cleanup();
  });
  
  it('should handle multi-level inheritance - runtime equivalence', () => {
    if (!isCargoAvailable()) {
      console.log('Skipping runtime test: cargo not available');
      return;
    }
    
    setupTest();
    
    const source = `
      class LivingThing {
        alive: boolean = true;
        
        isAlive(): boolean {
          return this.alive;
        }
      }
      
      class Animal extends LivingThing {
        name: string = "Unknown";
        
        getName(): string {
          return this.name;
        }
      }
      
      class Dog extends Animal {
        breed: string = "Mixed";
      }
      
      const dog = new Dog();
      console.log(dog.isAlive());
      console.log(dog.getName());
      console.log(dog.breed);
    `;
    
    const { jsCode, rustCode } = compile(source);
    
    const jsResult = executeJS(jsCode);
    const rustResult = executeRustWithCargo(rustCode);
    
    expect(jsResult.success).toBe(true);
    expect(rustResult.success).toBe(true);
    expect(normalizeOutput(jsResult.stdout)).toBe(normalizeOutput(rustResult.stdout));
    
    cleanup();
  });
  
  it('should handle constructor with inherited fields - runtime equivalence', () => {
    if (!isCargoAvailable()) {
      console.log('Skipping runtime test: cargo not available');
      return;
    }
    
    setupTest();
    
    const source = `
      class Animal {
        name: string = "DefaultName";
        age: number = 5;
      }
      
      class Dog extends Animal {
        breed: string = "Labrador";
      }
      
      const dog = new Dog();
      console.log(dog.name);
      console.log(dog.age);
      console.log(dog.breed);
    `;
    
    const { jsCode, rustCode } = compile(source);
    
    const jsResult = executeJS(jsCode);
    const rustResult = executeRustWithCargo(rustCode);
    
    expect(jsResult.success).toBe(true);
    expect(rustResult.success).toBe(true);
    expect(normalizeOutput(jsResult.stdout)).toBe(normalizeOutput(rustResult.stdout));
    
    cleanup();
  });
  
  it('should handle accessing inherited fields - runtime equivalence', () => {
    if (!isCargoAvailable()) {
      console.log('Skipping runtime test: cargo not available');
      return;
    }
    
    setupTest();
    
    const source = `
      class Animal {
        name: string = "Buddy";
        age: number = 3;
      }
      
      class Dog extends Animal {
        getInfo(): string {
          return this.name + " is " + this.age.toString() + " years old";
        }
      }
      
      const dog = new Dog();
      console.log(dog.getInfo());
    `;
    
    const { jsCode, rustCode } = compile(source);
    
    const jsResult = executeJS(jsCode);
    const rustResult = executeRustWithCargo(rustCode);
    
    expect(jsResult.success).toBe(true);
    expect(rustResult.success).toBe(true);
    expect(normalizeOutput(jsResult.stdout)).toBe(normalizeOutput(rustResult.stdout));
    
    cleanup();
  });
  
  it('should handle calling inherited methods - runtime equivalence', () => {
    if (!isCargoAvailable()) {
      console.log('Skipping runtime test: cargo not available');
      return;
    }
    
    setupTest();
    
    const source = `
      class Animal {
        name: string = "Rex";
        
        speak(): void {
          console.log(this.name + " makes a sound");
        }
      }
      
      class Dog extends Animal {
        bark(): void {
          this.speak();
          console.log("Woof!");
        }
      }
      
      const dog = new Dog();
      dog.bark();
    `;
    
    const { jsCode, rustCode } = compile(source);
    
    const jsResult = executeJS(jsCode);
    const rustResult = executeRustWithCargo(rustCode);
    
    expect(jsResult.success).toBe(true);
    expect(rustResult.success).toBe(true);
    expect(normalizeOutput(jsResult.stdout)).toBe(normalizeOutput(rustResult.stdout));
    
    cleanup();
  });
  
  it('should handle multi-level inheritance with all features - runtime equivalence', () => {
    if (!isCargoAvailable()) {
      console.log('Skipping runtime test: cargo not available');
      return;
    }
    
    setupTest();
    
    const source = `
      class Animal {
        name: string = "Buddy";
        age: number = 3;
        
        speak(): void {
          console.log(this.name);
        }
        
        getAge(): number {
          return this.age;
        }
      }
      
      class Dog extends Animal {
        breed: string = "Labrador";
        
        speak(): void {
          console.log("Woof! I am " + this.name);
        }
        
        bark(): void {
          this.speak();
        }
      }
      
      class Puppy extends Dog {
        isCute: boolean = true;
        
        playful(): boolean {
          return this.isCute;
        }
      }
      
      const puppy = new Puppy();
      puppy.bark();
      console.log(puppy.getAge());
      console.log(puppy.playful());
    `;
    
    const { jsCode, rustCode } = compile(source);
    
    const jsResult = executeJS(jsCode);
    const rustResult = executeRustWithCargo(rustCode);
    
    expect(jsResult.success).toBe(true);
    expect(rustResult.success).toBe(true);
    expect(normalizeOutput(jsResult.stdout)).toBe(normalizeOutput(rustResult.stdout));
    
    cleanup();
  });
});
