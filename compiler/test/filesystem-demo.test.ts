/**
 * Test that filesystem-simple-demo compiles to C++ and executes
 */

import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { IRLowering } from '../src/frontend/lowering.js';
import { CppCodegen } from '../src/backend/cpp/codegen.js';
import { ZigCompiler } from '../src/backend/cpp/zig-compiler.js';
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';
import { execSync } from 'child_process';

describe('FileSystem Simple Demo', () => {
  it('should compile filesystem-simple-demo to C++', () => {
    // Read the demo file
    const source = readFileSync(path.join(__dirname, '../../examples/filesystem-simple-demo-gs.ts'), 'utf-8');
    
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
    expect(cppCode).toContain('gs::FileSystem::writeText');
    expect(cppCode).toContain('gs::FileSystem::readText');
    expect(cppCode).toContain('gs::FileSystem::exists');
    expect(cppCode).toContain('gs::FileSystem::stat');
  });

  it('should compile and execute filesystem-simple-demo', async () => {
    // Check if Zig is available
    const zigAvailable = await ZigCompiler.checkZigAvailable();
    if (!zigAvailable) {
      console.log('Skipping execution test: Zig not available');
      return;
    }

    // Read the demo file
    const demoPath = path.join(__dirname, '../../examples/filesystem-simple-demo-gs.ts');
    const source = readFileSync(demoPath, 'utf-8');
    
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

    // Generate C++
    const codegen = new CppCodegen('gc');
    const sources = codegen.generate(ir);

    // Add C++ main() that calls testBasicOperations()
    // The generated files use the module name without -gs suffix
    const mainCpp = sources.get('filesystem-simple-demo.cpp');
    if (!mainCpp) {
      throw new Error(`Could not find filesystem-simple-demo.cpp in: ${Array.from(sources.keys()).join(', ')}`);
    }
    
    const mainWithEntry = mainCpp + `\n\nint main() {\n  goodscript::filesystem_simple_demo::testBasicOperations();\n  return 0;\n}\n`;
    sources.set('filesystem-simple-demo.cpp', mainWithEntry);

    // Write C++ files to build directory
    const buildDir = path.join(__dirname, '../../build');
    await fs.mkdir(buildDir, { recursive: true });
    
    for (const [filename, content] of sources.entries()) {
      await fs.writeFile(path.join(buildDir, filename), content);
    }

    // Compile with Zig
    const zig = new ZigCompiler(buildDir, path.join(__dirname, '../vendor'));
    const binaryPath = path.join(buildDir, 'filesystem-simple-demo-test');
    
    const compileResult = await zig.compile({
      sources,
      output: binaryPath,
      mode: 'gc',
      optimize: '0',
      includePaths: [path.join(__dirname, '../..')],
      cxxFlags: ['-DGS_ENABLE_FILESYSTEM'],
    });

    if (!compileResult.success) {
      console.log('Compilation failed:', compileResult.diagnostics);
    }
    expect(compileResult.success).toBe(true);

    // Execute the binary
    const output = execSync(binaryPath, { 
      encoding: 'utf-8',
      cwd: buildDir, // Run in build dir so files are created there
    });

    // Verify console output
    expect(output).toContain('FileSystem Demo Starting');
    expect(output).toContain('Basic File Operations');
    expect(output).toContain('Wrote test.txt');
    expect(output).toContain('Read content:');
    expect(output).toContain('Hello from GoodScript!');
    expect(output).toContain('File exists:');
    expect(output).toContain('Got file info');
    expect(output).toContain('test.txt');
    expect(output).toContain('Demo complete!');

    // Verify files were created
    expect(existsSync(path.join(buildDir, 'test.txt'))).toBe(true);

    // Verify file contents
    const testContent = readFileSync(path.join(buildDir, 'test.txt'), 'utf-8');
    expect(testContent).toBe('Hello from GoodScript!');

    // Clean up test files
    await fs.unlink(path.join(buildDir, 'test.txt')).catch(() => {});
    await fs.unlink(binaryPath).catch(() => {});
  }, 60000); // 60 second timeout for compilation + execution
});