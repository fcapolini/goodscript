/**
 * Test that filesystem-simple-demo compiles to C++
 */

import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { IRLowering } from '../src/frontend/lowering.js';
import { CppCodegen } from '../src/backend/cpp/codegen.js';
import { readFileSync } from 'fs';

describe('FileSystem Simple Demo', () => {
  it('should compile filesystem-simple-demo to C++', () => {
    // Read the demo file
    const source = readFileSync('../examples/filesystem-simple-demo-gs.ts', 'utf-8');
    
    // Create TypeScript program
    const sourceFile = ts.createSourceFile(
      'filesystem-simple-demo-gs.ts',
      source,
      ts.ScriptTarget.Latest,
      true
    );

    const host: ts.CompilerHost = {
      getSourceFile: (fileName) => fileName === 'filesystem-simple-demo-gs.ts' ? sourceFile : undefined,
      writeFile: () => {},
      getCurrentDirectory: () => '',
      getDirectories: () => [],
      fileExists: () => true,
      readFile: () => '',
      getCanonicalFileName: (fileName) => fileName,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => '\n',
      getDefaultLibFileName: (options) => ts.getDefaultLibFileName(options),
    };

    const program = ts.createProgram(['filesystem-simple-demo-gs.ts'], {}, host);

    // Lower to IR
    const lowering = new IRLowering();
    const ir = lowering.lower(program);

    // Verify IR structure
    expect(ir.modules).toHaveLength(1);
    expect(ir.modules[0].declarations.length).toBeGreaterThan(0);

    // Generate C++
    const codegen = new CppCodegen('gc');
    const files = codegen.generate(ir);

    // Verify C++ generation
    expect(files.size).toBeGreaterThan(0);
    
    const cppCode = Array.from(files.values()).join('\n');
    
    // Verify FileSystem calls are generated
    expect(cppCode).toContain('gs::FileSystem::exists');
    expect(cppCode).toContain('gs::FileSystem::writeText');
    expect(cppCode).toContain('gs::FileSystem::readText');
    expect(cppCode).toContain('gs::FileSystem::stat');
    
    // Verify FileSystemAsync calls are generated  
    expect(cppCode).toContain('gs::FileSystemAsync::writeText');
    expect(cppCode).toContain('gs::FileSystemAsync::readText');
    expect(cppCode).toContain('gs::FileSystemAsync::exists');
    
    // Verify async functions use co_await and co_return
    expect(cppCode).toContain('co_await');
    expect(cppCode).toContain('cppcoro::task');
  });
});
