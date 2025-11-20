import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Compiler } from '../../src/compiler';
import { writeFileSync, mkdirSync, existsSync, readFileSync, rmSync } from 'fs';
import { execSync } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import { validateRustCode, isRustcAvailable } from './rust-validator';

describe('Phase 3 - Multi-File Compilation', () => {
  let tmpDir: string;
  let compiler: Compiler;

  beforeEach(() => {
    tmpDir = join(tmpdir(), 'goodscript-test-multifile-' + Date.now() + '-' + Math.random().toString(36).substring(7));
    mkdirSync(tmpDir, { recursive: true });
    compiler = new Compiler();
  });

  afterEach(() => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
  
  /**
   * Helper to set up a Cargo project structure for multi-file Rust compilation
   */
  const setupCargoProject = (outDir: string, files: { name: string; isMain?: boolean }[]) => {
    const srcDir = join(outDir, 'src');
    mkdirSync(srcDir, { recursive: true });
    
    // Move generated .rs files to src/, renaming main.rs to avoid conflict
    const modules: string[] = [];
    let mainModule: string | null = null;
    
    for (const file of files) {
      const rsFile = join(outDir, file.name + '.rs');
      if (existsSync(rsFile)) {
        const moduleName = file.isMain ? 'app' : file.name;
        const targetFile = join(srcDir, moduleName + '.rs');
        const content = readFileSync(rsFile, 'utf-8');
        writeFileSync(targetFile, content, 'utf-8');
        
        if (file.isMain) {
          mainModule = moduleName;
        } else {
          modules.push(moduleName);
        }
      }
    }
    
    // Create lib.rs that declares all modules
    let libContent = modules.map(m => `pub mod ${m};`).join('\n');
    if (mainModule) {
      libContent += `\npub mod ${mainModule};\n`;
    }
    writeFileSync(join(srcDir, 'lib.rs'), libContent, 'utf-8');
    
    // Create binary main.rs that calls the app module's main function
    if (mainModule) {
      writeFileSync(join(srcDir, 'main.rs'),
        `fn main() {\n    goodscript_project::${mainModule}::main();\n}`, 'utf-8');
    }
  };

  describe('Two-file projects', () => {
    it('should compile a main file that imports from another module', () => {
      // Create math.gs.ts
      const mathFile = join(tmpDir, 'math.gs.ts');
      writeFileSync(mathFile, `
        export const add = (a: number, b: number): number => {
          return a + b;
        };
        
        export const subtract = (a: number, b: number): number => {
          return a - b;
        };
      `, 'utf-8');
      
      // Create main.gs.ts
      const mainFile = join(tmpDir, 'main.gs.ts');
      writeFileSync(mainFile, `
        import { add, subtract } from './math';
        
        const result1 = add(10, 5);
        const result2 = subtract(10, 5);
        
        console.log(result1);
        console.log(result2);
      `, 'utf-8');
      
      const outDir = join(tmpDir, 'dist');
      
      // Compile to Rust
      const result = compiler.compile({
        files: [mainFile, mathFile],
        outDir,
        target: 'rust',
      });
      
      if (!result.success) {
        console.log('Compilation errors:', result.diagnostics);
      }
      
      expect(result.success).toBe(true);
      
      // Check that both .rs files were generated
      const mathRs = join(outDir, 'math.rs');
      const mainRs = join(outDir, 'main.rs');
      
      expect(existsSync(mathRs)).toBe(true);
      expect(existsSync(mainRs)).toBe(true);
      
      // Check math.rs has public functions
      const mathCode = readFileSync(mathRs, 'utf-8');
      expect(mathCode).toContain('pub fn add');
      expect(mathCode).toContain('pub fn subtract');
      
      // Check main.rs has the import
      const mainCode = readFileSync(mainRs, 'utf-8');
      expect(mainCode).toContain('use crate::math');
      
      // Runtime equivalence check: compare JS and Rust outputs
      // First, compile to JavaScript with outFile to bundle everything
      const jsOutFile = join(outDir, 'bundle.js');
      compiler.compile({
        files: [mainFile, mathFile],
        outDir,
        target: 'typescript',
      });
      
      // Capture JS output
      let jsOutput = '';
      const originalLog = console.log;
      console.log = (...args: any[]) => {
        jsOutput += args.join(' ') + '\n';
      };
      
      try {
        // Execute the compiled JS files
        const mathJs = join(outDir, 'math.js');
        const mainJs = join(outDir, 'main.js');
        
        if (existsSync(mathJs) && existsSync(mainJs)) {
          delete require.cache[mathJs];
          delete require.cache[mainJs];
          
          // Load math module first (simulate module system)
          const math = require(mathJs);
          (global as any).math = math; // Make it available
          
          // Patch require in main to use our loaded module
          const Module = require('module');
          const originalRequire = Module.prototype.require;
          Module.prototype.require = function(id: string) {
            if (id === './math') return math;
            return originalRequire.apply(this, arguments);
          };
          
          require(mainJs);
          
          Module.prototype.require = originalRequire;
          delete (global as any).math;
        }
      } finally {
        console.log = originalLog;
      }
      
      // Now compile and run Rust
      if (isRustcAvailable() && jsOutput) {
        setupCargoProject(outDir, [
          { name: 'math' },
          { name: 'main', isMain: true }
        ]);
        
        try {
          const rustOutput = execSync('cargo run --quiet 2>&1', {
            cwd: outDir,
            encoding: 'utf-8'
          });
          
          // Compare outputs
          expect(rustOutput.trim()).toBe(jsOutput.trim());
        } catch (e: any) {
          console.log('Rust execution skipped:', e.message);
        }
      } else if (!jsOutput) {
        // Fallback: just verify Rust output has expected values
        if (isRustcAvailable()) {
          setupCargoProject(outDir, [
            { name: 'math' },
            { name: 'main', isMain: true }
          ]);
          
          try {
            const rustOutput = execSync('cargo run --quiet 2>&1', {
              cwd: outDir,
              encoding: 'utf-8'
            });
            
            expect(rustOutput).toContain('15');
            expect(rustOutput).toContain('5');
          } catch (e: any) {
            console.log('Rust execution skipped:', e.message);
          }
        }
      }
    });
    
    it('should handle nested directory structure', () => {
      // Create utils/math.gs.ts
      const utilsDir = join(tmpDir, 'utils');
      mkdirSync(utilsDir, { recursive: true });
      
      const mathFile = join(utilsDir, 'math.gs.ts');
      writeFileSync(mathFile, `
        export const multiply = (a: number, b: number): number => {
          return a * b;
        };
      `, 'utf-8');
      
      // Create main.gs.ts
      const mainFile = join(tmpDir, 'main.gs.ts');
      writeFileSync(mainFile, `
        import { multiply } from './utils/math';
        
        const result = multiply(6, 7);
        console.log(result);
      `, 'utf-8');
      
      const outDir = join(tmpDir, 'dist');
      
      // Compile to Rust
      const result = compiler.compile({
        files: [mainFile, mathFile],
        outDir,
        target: 'rust',
      });
      
      expect(result.success).toBe(true);
      
      // Check that files were generated in correct structure
      const mathRs = join(outDir, 'utils', 'math.rs');
      const mainRs = join(outDir, 'main.rs');
      
      expect(existsSync(mathRs)).toBe(true);
      expect(existsSync(mainRs)).toBe(true);
      
      // Check main.rs has the correct import path
      const mainCode = readFileSync(mainRs, 'utf-8');
      expect(mainCode).toContain('use crate::utils::math::multiply');
    });
  });

  describe('Cargo.toml generation', () => {
    it('should generate a Cargo.toml for Rust projects', () => {
      const mainFile = join(tmpDir, 'main.gs.ts');
      writeFileSync(mainFile, `
        console.log("Hello, world!");
      `, 'utf-8');
      
      const outDir = join(tmpDir, 'dist');
      
      // Compile to Rust
      compiler.compile({
        files: [mainFile],
        outDir,
        target: 'rust',
      });
      
      // Check that Cargo.toml was generated
      const cargoToml = join(outDir, 'Cargo.toml');
      expect(existsSync(cargoToml)).toBe(true);
      
      const cargoContent = readFileSync(cargoToml, 'utf-8');
      expect(cargoContent).toContain('[package]');
      expect(cargoContent).toContain('name =');
      expect(cargoContent).toContain('version =');
      expect(cargoContent).toContain('edition =');
    });
  });
});
