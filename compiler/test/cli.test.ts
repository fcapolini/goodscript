/**
 * CLI Tests
 */

import { describe, it, expect } from 'vitest';
import { parseArguments, validateOptions, applyDefaults, loadTsConfig } from '../src/cli/options.js';

describe('CLI Options Parser', () => {
  it('should parse basic file arguments', () => {
    const { options, errors } = parseArguments(['src/main-gs.ts', 'src/utils-gs.ts']);
    
    expect(errors).toEqual([]);
    expect(options.files).toEqual(['src/main-gs.ts', 'src/utils-gs.ts']);
  });
  
  it('should parse --help flag', () => {
    const { options } = parseArguments(['--help']);
    
    expect(options.help).toBe(true);
  });
  
  it('should parse --version flag', () => {
    const { options } = parseArguments(['-v']);
    
    expect(options.version).toBe(true);
  });
  
  it('should parse --project flag', () => {
    const { options, errors } = parseArguments(['--project', 'tsconfig.json']);
    
    expect(errors).toEqual([]);
    expect(options.project).toBe('tsconfig.json');
  });
  
  it('should parse --outDir flag', () => {
    const { options, errors } = parseArguments(['--outDir', 'dist', 'src/main-gs.ts']);
    
    expect(errors).toEqual([]);
    expect(options.outDir).toBe('dist');
  });
  
  it('should parse --watch flag', () => {
    const { options } = parseArguments(['--watch', 'src/main-gs.ts']);
    
    expect(options.watch).toBe(true);
  });
  
  it('should parse --noEmit flag', () => {
    const { options } = parseArguments(['--noEmit', 'src/main-gs.ts']);
    
    expect(options.noEmit).toBe(true);
  });
  
  it('should parse --sourceMap flag', () => {
    const { options } = parseArguments(['--sourceMap', 'src/main-gs.ts']);
    
    expect(options.sourceMap).toBe(true);
  });
  
  it('should parse --gsTarget flag', () => {
    const { options, errors } = parseArguments(['--gsTarget', 'cpp', 'src/main-gs.ts']);
    
    expect(errors).toEqual([]);
    expect(options.gsTarget).toBe('cpp');
  });
  
  it('should reject invalid --gsTarget', () => {
    const { errors } = parseArguments(['--gsTarget', 'invalid']);
    
    expect(errors).toContain('--gsTarget must be one of: cpp, js, ts, haxe');
  });
  
  it('should parse --gsMemory flag', () => {
    const { options, errors } = parseArguments(['--gsMemory', 'ownership', 'src/main-gs.ts']);
    
    expect(errors).toEqual([]);
    expect(options.gsMemory).toBe('ownership');
  });
  
  it('should parse --gsCompile flag', () => {
    const { options } = parseArguments(['--gsCompile', 'src/main-gs.ts']);
    
    expect(options.gsCompile).toBe(true);
  });
  
  it('should parse --gsOptimize flag', () => {
    const { options, errors } = parseArguments(['--gsOptimize', '3', 'src/main-gs.ts']);
    
    expect(errors).toEqual([]);
    expect(options.gsOptimize).toBe('3');
  });
  
  it('should parse --gsTriple flag', () => {
    const { options, errors } = parseArguments(['--gsTriple', 'wasm32-wasi', 'src/main-gs.ts']);
    
    expect(errors).toEqual([]);
    expect(options.gsTriple).toBe('wasm32-wasi');
  });
  
  it('should parse -o flag for binary output', () => {
    const { options, errors } = parseArguments(['-o', 'myapp', 'src/main-gs.ts']);
    
    expect(errors).toEqual([]);
    expect(options.output).toBe('myapp');
  });
  
  it('should parse --gsDebug flag', () => {
    const { options } = parseArguments(['--gsDebug', 'src/main-gs.ts']);
    
    expect(options.gsDebug).toBe(true);
  });
  
  it('should parse --gsShowIR flag', () => {
    const { options } = parseArguments(['--gsShowIR', 'src/main-gs.ts']);
    
    expect(options.gsShowIR).toBe(true);
  });
  
  it('should parse --gsValidateOnly flag', () => {
    const { options } = parseArguments(['--gsValidateOnly', 'src/main-gs.ts']);
    
    expect(options.gsValidateOnly).toBe(true);
  });
  
  it('should parse --gsSkipValidation flag', () => {
    const { options } = parseArguments(['--gsSkipValidation', 'src/main-gs.ts']);
    
    expect(options.gsSkipValidation).toBe(true);
  });
  
  it('should parse multiple flags together', () => {
    const { options, errors } = parseArguments([
      '--gsTarget', 'cpp',
      '--gsMemory', 'ownership',
      '--gsCompile',
      '--gsOptimize', '3',
      '-o', 'myapp',
      'src/main-gs.ts'
    ]);
    
    expect(errors).toEqual([]);
    expect(options.gsTarget).toBe('cpp');
    expect(options.gsMemory).toBe('ownership');
    expect(options.gsCompile).toBe(true);
    expect(options.gsOptimize).toBe('3');
    expect(options.output).toBe('myapp');
    expect(options.files).toEqual(['src/main-gs.ts']);
  });
  
  it('should report unknown flags', () => {
    const { errors } = parseArguments(['--unknownFlag', 'src/main-gs.ts']);
    
    expect(errors).toContain('Unknown option: --unknownFlag');
  });
});

describe('Option Validation', () => {
  it('should reject conflicting --gsValidateOnly and --gsSkipValidation', () => {
    const options = {
      files: ['test.ts'],
      gsValidateOnly: true,
      gsSkipValidation: true,
    };
    
    const errors = validateOptions(options);
    
    expect(errors).toContain('Cannot use --gsValidateOnly and --gsSkipValidation together');
  });
  
  it('should reject --gsCompile without --gsTarget cpp', () => {
    const options = {
      files: ['test.ts'],
      gsTarget: 'js' as const,
      gsCompile: true,
    };
    
    const errors = validateOptions(options);
    
    expect(errors).toContain('--gsCompile requires --gsTarget cpp');
  });
  
  it('should reject --gsMemory without --gsTarget cpp', () => {
    const options = {
      files: ['test.ts'],
      gsTarget: 'js' as const,
      gsMemory: 'ownership' as const,
    };
    
    const errors = validateOptions(options);
    
    expect(errors).toContain('--gsMemory only applies to --gsTarget cpp');
  });
  
  it('should reject --gsTriple without --gsCompile', () => {
    const options = {
      files: ['test.ts'],
      gsTriple: 'wasm32-wasi',
    };
    
    const errors = validateOptions(options);
    
    expect(errors).toContain('--gsTriple requires --gsCompile');
  });
  
  it('should reject -o without --gsCompile', () => {
    const options = {
      files: ['test.ts'],
      output: 'myapp',
    };
    
    const errors = validateOptions(options);
    
    expect(errors).toContain('-o requires --gsCompile');
  });
  
  it('should reject --watch with --gsCompile', () => {
    const options = {
      files: ['test.ts'],
      watch: true,
      gsCompile: true,
      gsTarget: 'cpp' as const,
    };
    
    const errors = validateOptions(options);
    
    expect(errors).toContain('--watch mode is not compatible with --gsCompile (yet)');
  });
  
  it('should require input files or tsconfig.json', () => {
    const options = {
      files: [],
    };
    
    const errors = validateOptions(options);
    
    expect(errors).toContain('No input files specified and no tsconfig.json found');
  });
  
  it('should allow missing files with --help', () => {
    const options = {
      files: [],
      help: true,
    };
    
    const errors = validateOptions(options);
    
    expect(errors).toEqual([]);
  });
  
  it('should allow valid C++ compilation options', () => {
    const options = {
      files: ['test.ts'],
      gsTarget: 'cpp' as const,
      gsMemory: 'ownership' as const,
      gsCompile: true,
      gsOptimize: '3' as const,
      gsTriple: 'x86_64-linux-gnu',
      output: 'myapp',
    };
    
    const errors = validateOptions(options);
    
    expect(errors).toEqual([]);
  });
});

describe('Apply Defaults', () => {
  it('should set default gsTarget to js', () => {
    const options = applyDefaults({ files: ['test.ts'] });
    
    expect(options.gsTarget).toBe('js');
  });
  
  it('should set default gsMemory to gc for cpp target', () => {
    const options = applyDefaults({ 
      files: ['test.ts'],
      gsTarget: 'cpp',
    });
    
    expect(options.gsMemory).toBe('gc');
  });
  
  it('should not set gsMemory for non-cpp targets', () => {
    const options = applyDefaults({ files: ['test.ts'] });
    
    expect(options.gsMemory).toBeUndefined();
  });
  
  it('should set default outDir to dist', () => {
    const options = applyDefaults({ files: ['test.ts'] });
    
    expect(options.outDir).toBe('dist');
  });
  
  it('should set gsOptimize to 0 when sourceMap is true', () => {
    const options = applyDefaults({ 
      files: ['test.ts'],
      sourceMap: true,
    });
    
    expect(options.gsOptimize).toBe('0');
  });
  
  it('should set gsOptimize to 3 when sourceMap is false', () => {
    const options = applyDefaults({ 
      files: ['test.ts'],
      sourceMap: false,
    });
    
    expect(options.gsOptimize).toBe('3');
  });
  
  it('should not override explicit values', () => {
    const options = applyDefaults({ 
      files: ['test.ts'],
      gsTarget: 'cpp' as const,
      gsMemory: 'ownership' as const,
      outDir: 'build',
      gsOptimize: '2' as const,
    });
    
    expect(options.gsTarget).toBe('cpp');
    expect(options.gsMemory).toBe('ownership');
    expect(options.outDir).toBe('build');
    expect(options.gsOptimize).toBe('2');
  });
});

describe('tsconfig.json Integration', () => {
  it('should load include/exclude patterns from tsconfig.json', () => {
    // Note: This test uses the actual tsconfig.json in the compiler directory
    const config = loadTsConfig();
    
    // The compiler's tsconfig.json has include: ["src/**/*"]
    expect(config.include).toBeDefined();
    expect(config.configPath).toBeDefined();
  });
  
  it('should not require files when tsconfig.json exists with include', () => {
    const options = applyDefaults({
      files: [],
      configPath: './tsconfig.json',
      include: ['src/**/*'],
    });
    
    const errors = validateOptions(options);
    
    // Should not error because we have a config with include patterns
    expect(errors).toEqual([]);
  });
  
  it('should error when no files and no tsconfig.json', () => {
    const options = applyDefaults({
      files: [],
    });
    
    const errors = validateOptions(options);
    
    expect(errors).toContain('No input files specified and no tsconfig.json found');
  });
});

