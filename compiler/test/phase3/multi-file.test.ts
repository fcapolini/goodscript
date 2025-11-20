import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Compiler } from '../../src/compiler';
import { writeFileSync, mkdirSync, existsSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

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
