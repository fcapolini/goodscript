#!/usr/bin/env node

/**
 * Quick GoodScript validation test for stdlib
 * Validates Phase 1+2, generates C++, compiles, and executes natively
 */

import { Compiler } from '../compiler/dist/index.js';
import { readFileSync, mkdirSync, existsSync, writeFileSync, readdirSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { execSync } from 'child_process';
import { tmpdir } from 'os';

const file = process.argv[2];
const skipNative = process.argv.includes('--skip-native');

if (!file) {
  console.error('Usage: node quick-test.js <file> [--skip-native]');
  process.exit(1);
}

const filePath = resolve(file);
console.log(`📝 Validating: ${filePath}\n`);

try {
  const compiler = new Compiler();
  
  // Create temp output directory
  const outDir = join(dirname(filePath), '.gs-output');
  mkdirSync(outDir, { recursive: true });
  
  console.log('[1/4] Phase 1+2: Validation (restrictions + ownership)...');
  const result = compiler.compile({ 
    files: [filePath],
    outDir: outDir,
    target: 'native',
    mode: 'gc'
  });
  
  if (!result.success) {
    console.log('❌ Validation failed:\n');
    result.diagnostics.filter(d => d.severity === 'error').forEach(d => {
      console.log(`  ${d.message}`);
      if (d.location) {
        console.log(`    at ${d.location.fileName}:${d.location.line}:${d.location.column}`);
      }
    });
    process.exit(1);
  }
  
  // Show all diagnostics for debugging
  if (result.diagnostics && result.diagnostics.length > 0) {
    console.log(`\n📊 Diagnostics: ${result.diagnostics.length} total`);
    result.diagnostics.forEach(d => {
      console.log(`  [${d.severity}] ${d.message}`);
    });
  }
  
  console.log('✅ Phase 1+2: PASS\n');
  
  console.log('[2/4] Phase 3: C++ code generation...');
  
  // Find generated .cpp file(s)
  const cppFiles = readdirSync(outDir).filter(f => f.endsWith('.cpp'));
  
  if (cppFiles.length === 0) {
    console.log('❌ No C++ code generated\n');
    console.log(`Expected files in: ${outDir}`);
    process.exit(1);
  }
  
  // Find the .cpp file matching our input filename
  const baseName = filePath.split('/').pop().replace(/-gs\.ts$/, '');
  const targetCppFile = cppFiles.find(f => f.includes(baseName));
  const cppFile = targetCppFile ? join(outDir, targetCppFile) : join(outDir, cppFiles[0]);
  
  const cppCode = readFileSync(cppFile, 'utf-8');
  console.log(`✅ Phase 3: PASS (${cppCode.length} bytes generated)\n`);
  
  if (skipNative) {
    console.log('⏭️  Skipping native compilation (--skip-native)\n');
    console.log('🎉 Validation complete!\n');
    console.log(`Generated code: ${cppFile}`);
    process.exit(0);
  }
  
  // Native compilation and execution
  console.log('[3/4] Native compilation (C++ → binary)...');
  
  const testDir = join(tmpdir(), `goodscript-stdlib-${Date.now()}`);
  mkdirSync(testDir, { recursive: true });
  
  try {
    // Paths - find project root (contains both stdlib/ and compiler/)
    // filePath is in stdlib/collection/src/xxx-gs.ts
    const projectRoot = resolve(dirname(filePath), '../../..');
    const runtimePath = join(projectRoot, 'compiler/runtime');
    const mpsSourcePath = join(projectRoot, 'compiler/vendor/mps/src');
    const exePath = join(testDir, 'test_binary');
    
    // Compile MPS if needed (on-the-fly compilation)
    const mpsObj = join(testDir, 'mps.o');
    console.log(`  Compiling MPS GC (${mpsSourcePath}/mps.c)...`);
    try {
      execSync(`cc -O2 -c ${join(mpsSourcePath, 'mps.c')} -o ${mpsObj}`, {
        stdio: 'pipe',
        cwd: testDir
      });
    } catch (error) {
      throw new Error(`MPS compilation failed: ${error.message}`);
    }
    
    // Compile C++ code
    console.log(`  Compiling C++ code with zig...`);
    try {
      execSync(
        `zig c++ -std=c++20 -O2 -I${runtimePath} -I${mpsSourcePath} ${cppFile} ${mpsObj} -o ${exePath}`,
        { stdio: 'pipe', cwd: testDir }
      );
    } catch (error) {
      // Try to extract useful error message
      const stderr = error.stderr ? error.stderr.toString() : error.message;
      throw new Error(`C++ compilation failed:\n${stderr}`);
    }
    
    console.log('✅ Compilation: PASS\n');
    
    console.log('[4/4] Native execution...');
    
    try {
      const output = execSync(exePath, {
        encoding: 'utf-8',
        timeout: 5000,  // 5s timeout
        cwd: testDir
      });
      
      console.log('✅ Execution: PASS\n');
      
      if (output && output.trim().length > 0) {
        console.log('📤 Program output:');
        console.log('─'.repeat(50));
        console.log(output);
        console.log('─'.repeat(50));
        console.log();
      }
      
      console.log('🎉 All phases passed!\n');
      console.log(`Generated C++: ${cppFile}`);
      console.log(`Compiled binary: ${exePath}`);
      
    } catch (error) {
      const stderr = error.stderr ? error.stderr.toString() : '';
      const stdout = error.stdout ? error.stdout.toString() : '';
      throw new Error(`Execution failed:\nstdout: ${stdout}\nstderr: ${stderr}`);
    }
    
  } finally {
    // Cleanup (best effort)
    try {
      execSync(`rm -rf ${testDir}`, { stdio: 'ignore' });
    } catch {
      // Ignore cleanup errors
    }
  }
  
} catch (error) {
  console.error('\n❌ Error:', error.message);
  if (error.stack && !error.message.includes('compilation failed')) {
    console.error(error.stack);
  }
  process.exit(1);
}
