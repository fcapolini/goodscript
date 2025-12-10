/**
 * CLI Command Handlers
 */

import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import ts from 'typescript';
import { CliOptions } from './options.js';
import { Validator } from '../frontend/validator.js';
import { IRLowering } from '../frontend/lowering.js';
import { CppCodegen } from '../backend/cpp/codegen.js';
import { ZigCompiler } from '../backend/cpp/zig-compiler.js';
import type { CompileOptions as ZigCompileOptions } from '../backend/cpp/zig-compiler.js';

// Get the package root directory (where vendor/ and runtime/ are located)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(__dirname, '../..');

export interface CommandResult {
  success: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Main compilation command
 */
export async function compileCommand(options: CliOptions): Promise<CommandResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  try {
    // Resolve input files (from CLI args or tsconfig.json)
    const files = await resolveFiles(options);
    if (files.length === 0) {
      errors.push('No input files found');
      return { success: false, errors, warnings };
    }
    
    console.log(`📦 Compiling ${files.length} file(s)...`);
    
    // Create TypeScript program
    const program = createProgram(files, options);
    
    // Process each file
    const generatedFiles = new Map<string, string>();
    
    for (const file of files) {
      const sourceFile = program.getSourceFile(file);
      if (!sourceFile) {
        errors.push(`Could not load source file: ${file}`);
        continue;
      }
      
      // Phase 1: Validate
      if (!options.gsSkipValidation) {
        const validator = new Validator();
        const diagnostics = validator.validate(sourceFile);
        
        for (const diag of diagnostics) {
          if (diag.severity === 'error') {
            errors.push(formatDiagnostic(diag, file));
          } else if (diag.severity === 'warning') {
            warnings.push(formatDiagnostic(diag, file));
          }
        }
        
        if (options.gsValidateOnly) {
          continue;
        }
        
        if (diagnostics.some(d => d.severity === 'error')) {
          continue; // Skip this file
        }
      }
      
      // Phase 2-3: Lower to IR
      if (options.gsShowIR || options.gsTarget === 'cpp') {
        const lowering = new IRLowering();
        let irProgram = lowering.lower(program);
        
        // Phase 4: Optimize (if not disabled)
        const optimizeLevel = options.gsOptimize || '3';
        if (optimizeLevel !== '0') {
          const { Optimizer } = await import('../optimizer/optimizer.js');
          const optimizer = new Optimizer();
          const level = parseInt(optimizeLevel, 10);
          irProgram = optimizer.optimize(irProgram, level);
        }
        
        if (options.gsShowIR) {
          console.log('\n--- IR for', file, '---');
          console.log(JSON.stringify(irProgram, null, 2));
        }
        
        // Phase 5: Generate C++
        if (options.gsTarget === 'cpp') {
          const codegen = new CppCodegen();
          const cppFiles = codegen.generate(
            irProgram,
            options.gsMemory || 'gc',
            options.sourceMap || options.gsDebug || false
          );
          
          // Add all generated files
          for (const [fileName, content] of cppFiles) {
            generatedFiles.set(fileName, content);
          }
        }
      }
    }
    
    // Validation-only mode
    if (options.gsValidateOnly) {
      if (errors.length === 0) {
        console.log('✅ All files passed validation');
      }
      return { success: errors.length === 0, errors, warnings };
    }
    
    // Use TypeScript's own compiler for js/ts targets
    if ((options.gsTarget === 'js' || options.gsTarget === 'ts') && generatedFiles.size === 0) {
      await compileWithTypeScript(program, options, errors, warnings);
    }
    
    // Write generated C++ files to dist/build/ (or dist/ if only generating code)
    if (generatedFiles.size > 0 && options.outDir) {
      const cppOutDir = options.gsCodegen || options.gsTarget !== 'cpp'
        ? options.outDir
        : path.join(options.outDir, 'build');
      await fs.mkdir(cppOutDir, { recursive: true });
      
      for (const [fileName, content] of generatedFiles) {
        // Extract just the basename (codegen returns full paths)
        const basename = path.basename(fileName);
        const outputPath = path.join(cppOutDir, basename);
        await fs.writeFile(outputPath, content, 'utf-8');
        console.log(`  ✓ ${basename}`);
      }
    }
    
    // Phase 6: Compile to binary (default for C++ target unless --gsCodegen)
    if (options.gsTarget === 'cpp' && !options.gsCodegen) {
      await compileToBinary(generatedFiles, files, options, errors, warnings);
    }
    
    if (errors.length === 0) {
      console.log('✅ Compilation successful');
    }
    
    return { success: errors.length === 0, errors, warnings };
    
  } catch (err) {
    errors.push(`Fatal error: ${err instanceof Error ? err.message : String(err)}`);
    return { success: false, errors, warnings };
  }
}

/**
 * Compile with TypeScript's own compiler (for js/ts targets)
 */
async function compileWithTypeScript(
  program: ts.Program,
  options: CliOptions,
  errors: string[],
  _warnings: string[]
): Promise<void> {
  const outDir = options.outDir || 'dist';
  await fs.mkdir(outDir, { recursive: true });
  
  const emitResult = program.emit(
    undefined, // emit all files
    (fileName, data) => {
      // Write file callback (synchronous)
      const relativePath = path.relative(process.cwd(), fileName);
      fsSync.writeFileSync(fileName, data, 'utf-8');
      console.log(`  ✓ ${relativePath}`);
    },
    undefined, // cancellation token
    false, // emit only .d.ts files
    {
      before: [],
      after: [],
    }
  );
  
  // Collect diagnostics
  const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
  
  for (const diagnostic of allDiagnostics) {
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
    
    if (diagnostic.file && diagnostic.start !== undefined) {
      const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
      const fileName = path.relative(process.cwd(), diagnostic.file.fileName);
      errors.push(`${fileName}:${line + 1}:${character + 1} - ${message}`);
    } else {
      errors.push(message);
    }
  }
}

/**
 * Compile C++ to native binary using Zig
 */
async function compileToBinary(
  sources: Map<string, string>,
  sourceFiles: string[],
  options: CliOptions,
  errors: string[],
  _warnings: string[]
): Promise<void> {
  console.log('\n🔨 Compiling to native binary...');
  
  const buildDir = path.join(options.outDir || 'dist', 'build');
  const distDir = options.outDir || 'dist';
  const vendorDir = path.join(PACKAGE_ROOT, 'vendor');
  const runtimeDir = path.join(PACKAGE_ROOT, 'runtime/cpp');
  const cppcoroDir = path.join(PACKAGE_ROOT, 'vendor/cppcoro/include');
  
  // Determine output path (binary goes to dist/, not dist/build/)
  let outputPath: string;
  if (options.output) {
    // User specified output (via -o or tsconfig.json goodscript.outFile)
    // If relative path, make it relative to distDir; if absolute, use as-is
    outputPath = path.isAbsolute(options.output) 
      ? options.output 
      : path.join(distDir, options.output);
  } else if (sourceFiles.length > 0) {
    // Default: use first TypeScript source file for binary name
    // Example: src/main-gs.ts -> main, src/app-gs.ts -> app
    const firstSourceFile = sourceFiles[0];
    const basename = path.basename(firstSourceFile)
      .replace(/-gs\.(tsx?)$/, '')  // Remove -gs.ts or -gs.tsx
      .replace(/\.(ts|tsx|js|jsx)$/, '');  // Remove .ts, .tsx, .js, .jsx
    outputPath = path.join(distDir, basename);
  } else {
    // Fallback
    outputPath = path.join(distDir, 'a.out');
  }
  
  const compiler = new ZigCompiler(buildDir, vendorDir);
  
  // Detect which features are used in the generated code
  const cppCode = Array.from(sources.values()).join('\n');
  const usesHTTP = cppCode.includes('gs::http::HTTP') || cppCode.includes('gs::http::HTTPAsync');
  const usesFileSystem = cppCode.includes('gs::filesystem::FileSystem') || cppCode.includes('gs::filesystem::FileSystemAsync');
  
  const compileOptions: ZigCompileOptions = {
    sources,
    output: outputPath,
    mode: options.gsMemory || 'gc',
    target: options.gsTriple,
    optimize: options.gsOptimize || (options.sourceMap ? '0' : '3'),
    buildDir,
    vendorDir,
    includePaths: [PACKAGE_ROOT, runtimeDir, cppcoroDir], // Add all necessary include paths
    debug: options.gsDebug || options.sourceMap || false,
    sourceMap: options.sourceMap || options.gsDebug || false,
    enableHTTP: usesHTTP,
    enableFileSystem: usesFileSystem,
  };
  
  const result = await compiler.compile(compileOptions);
  
  if (result.success) {
    console.log(`✅ Binary compiled: ${result.outputPath}`);
    console.log(`   Build time: ${result.buildTime}ms`);
  } else {
    errors.push('Binary compilation failed');
    for (const diag of result.diagnostics) {
      errors.push(`  ${diag}`);
    }
  }
}

/**
 * Watch mode (future implementation)
 */
export async function watchCommand(_options: CliOptions): Promise<CommandResult> {
  console.log('👀 Watch mode not implemented yet');
  return { success: false, errors: ['Watch mode not implemented'], warnings: [] };
}

/**
 * Create TypeScript program
 */
function createProgram(files: string[], options: CliOptions): ts.Program {
  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
    outDir: options.outDir || 'dist',
    sourceMap: options.sourceMap,
    skipLibCheck: true, // Skip type checking of declaration files
  };
  
  return ts.createProgram(files, compilerOptions);
}

/**
 * Resolve files from CLI args or tsconfig.json
 */
async function resolveFiles(options: CliOptions): Promise<string[]> {
  // If explicit files provided, use those
  if (options.files.length > 0) {
    const files: string[] = [];
    for (const file of options.files) {
      try {
        const stat = await fs.stat(file);
        if (stat.isFile()) {
          files.push(path.resolve(file));
        }
      } catch {
        // File doesn't exist, skip
      }
    }
    return files;
  }
  
  // Otherwise, use tsconfig.json
  if (options.configPath) {
    const configFile = ts.readConfigFile(options.configPath, ts.sys.readFile);
    if (configFile.error) {
      return [];
    }
    
    const configDir = path.dirname(options.configPath);
    const parsedConfig = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      configDir,
      undefined,
      options.configPath
    );
    
    return parsedConfig.fileNames;
  }
  
  return [];
}

/**
 * Format diagnostic message
 */
function formatDiagnostic(diag: any, file: string): string {
  const location = diag.location 
    ? `${file}:${diag.location.line}:${diag.location.column}`
    : file;
  
  return `${location} - ${diag.code}: ${diag.message}`;
}
