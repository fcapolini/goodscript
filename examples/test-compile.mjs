#!/usr/bin/env node

/**
 * Test full compilation pipeline: TypeScript → C++ → Native Binary
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import ts from 'typescript';
import { IRLowering } from '../compiler/dist/frontend/lowering.js';
import { CppCodegen } from '../compiler/dist/backend/cpp/codegen.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log('🔨 Full Compilation Test: TypeScript → C++ → Native\n');

  // Get input file from command line or use default
  const inputFile = process.argv[2] || 'simple-gs.ts';
  const basename = inputFile.replace(/-gs\.ts$/, '').replace(/^.*\//, '');

  // Read the example file
  const examplePath = join(__dirname, inputFile);
  const sourceCode = await readFile(examplePath, 'utf-8');

  // Create TypeScript program
  const compilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
  };

  const host = ts.createCompilerHost(compilerOptions);
  const originalGetSourceFile = host.getSourceFile;
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
    if (fileName === inputFile) {
      return ts.createSourceFile(fileName, sourceCode, languageVersion, true);
    }
    return originalGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
  };

  const program = ts.createProgram([inputFile], compilerOptions, host);
  
  console.log('✅ TypeScript program created');

  // Lower to IR
  const lowering = new IRLowering();
  const ir = lowering.lower(program);
  console.log('✅ Lowered to IR');

  // Generate C++
  const codegen = new CppCodegen();
  const cppFiles = codegen.generate(ir, 'ownership', false);
  console.log('✅ Generated C++ code\n');

  // Write C++ files to build directory
  const buildDir = join(__dirname, '..', 'build');
  await mkdir(buildDir, { recursive: true });

  for (const [filepath, content] of cppFiles) {
    const fullPath = join(buildDir, filepath);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, content, 'utf-8');
    console.log(`📝 Wrote ${filepath}`);
  }

  // Create main entry point
  const mainCpp = `#include "${basename}.hpp"

int main() {
  goodscript::${basename.replace(/-/g, '_')}::main();
  return 0;
}
`;
  await writeFile(join(buildDir, 'main.cpp'), mainCpp, 'utf-8');
  console.log(`📝 Wrote main.cpp (entry point)`);

  console.log('\n🔧 Attempting Zig compilation...');
  
  try {
    // Try to compile with zig
    const zigCmd = `zig c++ -std=c++20 -I${join(__dirname, '..')} ${join(buildDir, basename + '.cpp')} ${join(buildDir, 'main.cpp')} -o ${join(buildDir, basename)}`;
    console.log(`Running: ${zigCmd}\n`);
    
    const output = execSync(zigCmd, { 
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    
    console.log(output);
    console.log('✅ Compilation successful!');
    
    // Try to run it
    console.log('\n🚀 Running the compiled binary...\n');
    const runOutput = execSync(join(buildDir, basename), { encoding: 'utf-8' });
    console.log(runOutput);
    
  } catch (err) {
    console.error('❌ Compilation failed:');
    console.error(err.stderr || err.message);
    console.log('\n📋 Generated C++ code for inspection:');
    for (const [filepath, content] of cppFiles) {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`File: ${filepath}`);
      console.log(`${'='.repeat(70)}\n`);
      console.log(content);
    }
  }
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
