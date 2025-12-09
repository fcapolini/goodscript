#!/usr/bin/env node

/**
 * Test script for C++ code generation
 * Compiles hello-gs.ts to C++ and displays the output
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import ts from 'typescript';
import { IRLowering } from '../../compiler/dist/frontend/lowering.js';
import { CppCodegen } from '../../compiler/dist/backend/cpp/codegen.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log('🔨 Testing C++ code generation...\n');

  // Read the example file
  const examplePath = join(__dirname, 'hello-gs.ts');
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
    if (fileName === 'hello-gs.ts') {
      return ts.createSourceFile(fileName, sourceCode, languageVersion, true);
    }
    return originalGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
  };

  const program = ts.createProgram(['hello-gs.ts'], compilerOptions, host);
  
  console.log('TypeScript program created');
  console.log('Source files:', program.getSourceFiles().length);
  console.log('Files:', program.getSourceFiles().map(f => f.fileName).filter(f => !f.includes('node_modules')));

  // Lower to IR
  console.log('📝 Lowering TypeScript → IR...');
  const lowering = new IRLowering();
  const ir = lowering.lower(program);

  // Generate C++
  console.log('🔧 Generating C++ code...\n');
  const codegen = new CppCodegen();
  const cppFiles = codegen.generate(ir, 'ownership', true);

  // Display generated files
  if (cppFiles.size === 0) {
    console.log('⚠️  No C++ files generated - IR might be empty');
    console.log('IR modules:', ir.modules.length);
    if (ir.modules.length > 0) {
      console.log('First module:', ir.modules[0].path);
      console.log('Declarations:', ir.modules[0].declarations.length);
    }
  } else {
    for (const [filepath, content] of cppFiles) {
      console.log(`${'='.repeat(70)}`);
      console.log(`File: ${filepath}`);
      console.log(`${'='.repeat(70)}\n`);
      console.log(content);
      console.log('\n');
    }
    console.log('✅ C++ code generation successful!');
  }
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
