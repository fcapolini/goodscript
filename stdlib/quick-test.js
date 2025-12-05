#!/usr/bin/env node

/**
 * Quick GoodScript validation test for stdlib
 */

import { Compiler } from '../compiler/dist/index.js';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, join, dirname } from 'path';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node quick-test.js <file>');
  process.exit(1);
}

const filePath = resolve(file);
console.log(`📝 Validating: ${filePath}\n`);

try {
  const compiler = new Compiler();
  
  // Create temp output directory
  const outDir = join(dirname(filePath), '.gs-output');
  mkdirSync(outDir, { recursive: true });
  
  console.log('[1/3] Phase 1+2: Validation (restrictions + ownership)...');
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
  
  console.log('[3/3] Phase 3: C++ code generation...');
  
  // Find generated .cpp file(s)
  const { readdirSync } = await import('fs');
  const cppFiles = readdirSync(outDir).filter(f => f.endsWith('.cpp'));
  
  if (cppFiles.length > 0) {
    const cppFile = join(outDir, cppFiles[0]);
    const cppCode = readFileSync(cppFile, 'utf-8');
    console.log(`✅ Phase 3: PASS (${cppCode.length} bytes generated)\n`);
    console.log('🎉 All phases passed!\n');
    console.log(`Generated code: ${cppFile}`);
  } else {
    console.log('❌ No C++ code generated\n');
    console.log(`Expected files in: ${outDir}`);
    process.exit(1);
  }
  
} catch (error) {
  console.error('\n❌ Error:', error.message);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
}
