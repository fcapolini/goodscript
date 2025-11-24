/**
 * Compiler
 * Main entry point for the GoodScript compiler
 */

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { Parser } from './parser';
import { OwnershipAnalyzer } from './ownership-analyzer';
import { Validator } from './validator';
import { NullCheckAnalyzer } from './null-check-analyzer';
import { TypeScriptCodegen } from './ts-codegen';
import { CppCodegen } from './cpp-codegen';
import { Diagnostic, SourceLocation } from './types';

export interface CompileOptions {
  files: string[];
  outDir?: string;
  target?: 'typescript' | 'native';  // Default: typescript
  emit?: 'js' | 'ts' | 'both';  // Default: js (ts+js, emit both intermediate .ts and final .js)
  skipOwnershipChecks?: boolean;  // Skip ownership analysis ("Clean TypeScript" mode)
  project?: string;  // Path to tsconfig.json
  compileBinary?: boolean;  // Compile C++ to native binary (requires Zig)
  arch?: string;  // Target architecture (e.g., 'x86_64-linux', 'aarch64-macos', 'wasm32-wasi')
}

export interface CompileResult {
  success: boolean;
  diagnostics: Diagnostic[];
  fileStats?: {
    goodscript: number;  // Count of .gs.ts files
    typescript: number;  // Count of .ts files
    total: number;
  };
}

export class Compiler {
  private parser: Parser;
  private ownershipAnalyzer: OwnershipAnalyzer;
  private nullCheckAnalyzer: NullCheckAnalyzer;
  private validator: Validator;
  private tsCodegen: TypeScriptCodegen;
  private cppCodegen: CppCodegen;

  constructor() {
    this.parser = new Parser();
    this.ownershipAnalyzer = new OwnershipAnalyzer();
    this.nullCheckAnalyzer = new NullCheckAnalyzer();
    this.validator = new Validator();
    this.tsCodegen = new TypeScriptCodegen();
    this.cppCodegen = new CppCodegen();
  }

  /**
   * Determine if a file is a GoodScript file based on extension
   */
  private isGoodScriptFile(fileName: string): boolean {
    return fileName.endsWith('.gs.ts') || fileName.endsWith('.gs.tsx') || fileName.endsWith('.gs');
  }

  /**
   * Compile GoodScript and TypeScript files
   */
  compile(options: CompileOptions): CompileResult {
    const allDiagnostics: Diagnostic[] = [];
    let goodscriptFileCount = 0;
    let typescriptFileCount = 0;

    // Reset ownership analyzer for new compilation
    this.ownershipAnalyzer.reset();

    // Create TypeScript program (with optional tsconfig.json)
    this.parser.createProgram(options.files, undefined, options.project);
    const program = this.parser.getProgram();
    const checker = this.parser.getTypeChecker();
    
    // Merge goodscript config from tsconfig.json with CLI options
    // CLI options take precedence over tsconfig.json
    const goodscriptConfig = this.parser.getGoodScriptConfig();
    const target = options.target || 'typescript';
    
    // Determine language level
    // - For TypeScript target: default to 'clean' (Phase 1 only)
    // - For C++ target: default to 'native' (full validation)
    const defaultLevel = target === 'native' ? 'native' : 'clean';
    const level = goodscriptConfig?.level ?? defaultLevel;
    
    // For backwards compatibility, check deprecated skipOwnership flag
    const explicitSkipOwnership = options.skipOwnershipChecks ?? goodscriptConfig?.skipOwnership;
    
    // Determine if ownership analysis should run based on level
    // - 'clean': no ownership analysis (Phase 1 only)
    // - 'dag': ownership + DAG validation (Phase 2)
    // - 'native': full validation (Phase 3)
    const shouldAnalyzeOwnership = level === 'dag' || level === 'native';
    const effectiveSkipOwnership = explicitSkipOwnership ?? !shouldAnalyzeOwnership;

    // Get TypeScript diagnostics
    const tsDiagnostics = ts.getPreEmitDiagnostics(program);
    
    // Filter out TypeScript's null/undefined checking errors for weak references
    // GoodScript treats null and undefined as synonyms, so TS's strict distinction doesn't apply
    const filteredTsDiagnostics = tsDiagnostics.filter(diag => {
      // TS18047: Object is possibly 'null'
      // TS18048: Object is possibly 'undefined'
      // TS18049: Object is possibly 'null' or 'undefined'
      // TS2532: Object is possibly 'undefined'
      // TS2533: Object is possibly 'null' or 'undefined'
      // TS2322: Type 'X | undefined' not assignable to 'X | null' (and vice versa)
      // TS2345: Argument of type 'X | undefined' not assignable to parameter 'X | null'
      // These are handled by GoodScript's own null-check analyzer
      if (diag.code === 18047 || diag.code === 18048 || diag.code === 18049 ||
          diag.code === 2532 || diag.code === 2533 || diag.code === 2322 || diag.code === 2345) {
        return false;  // Suppress these - we handle null checking ourselves
      }
      return true;
    });
    
    allDiagnostics.push(...Parser.convertDiagnostics(filteredTsDiagnostics));

    // Process each source file
    for (const sourceFile of program.getSourceFiles()) {
      if (!sourceFile.isDeclarationFile) {
        const isGoodScript = this.isGoodScriptFile(sourceFile.fileName);
        
        if (isGoodScript) {
          goodscriptFileCount++;
          
          // Validate GoodScript restrictions
          const validationResult = this.validator.validate(sourceFile, checker);
          allDiagnostics.push(...validationResult.diagnostics);

          // Analyze ownership (unless skipped)
          if (!effectiveSkipOwnership) {
            this.ownershipAnalyzer.analyze(sourceFile, checker);
          }
        } else {
          // Regular TypeScript file - just count it
          typescriptFileCount++;
          // TypeScript diagnostics already included above
        }
      }
    }

    // Finalize ownership analysis for GoodScript files (detect cross-file cycles)
    if (!effectiveSkipOwnership && goodscriptFileCount > 0) {
      this.ownershipAnalyzer.finalizeAnalysis();
      allDiagnostics.push(...this.ownershipAnalyzer.getDiagnostics());

      // Analyze null-check requirements for usage references
      for (const sourceFile of program.getSourceFiles()) {
        if (!sourceFile.isDeclarationFile) {
          this.nullCheckAnalyzer.analyze(sourceFile, checker);
        }
      }
      allDiagnostics.push(...this.nullCheckAnalyzer.getDiagnostics());
    }

    // Check if compilation succeeded
    const hasErrors = allDiagnostics.some(d => d.severity === 'error');

    // If successful and outDir specified, generate code
    // For TypeScript target, emit code even if there are ownership type errors
    // (we inject the type declarations in the generated code)
    // For C++ target, emit code even if there are ownership type errors or module resolution errors
    // (ownership types are compile-time only, and we're generating C++ not running TypeScript)
    const isAllowedError = (d: Diagnostic) => {
      if (d.severity !== 'error') return true;
      
      // Allow ownership type errors for both TypeScript and native targets
      if (d.code === 'TS2552') {
        // "Cannot find name 'X'" - check if it's an ownership type
        const message = d.message.toLowerCase();
        if (message.includes("'own'") || message.includes("'share'") || message.includes("'use'")) {
          return true;
        }
      }
      
      // Allow module resolution errors for native target only
      if (target === 'native') {
        return d.code === 'TS2307' ||  // Module not found
               d.code === 'TS2792' ||  // Cannot find module (ESM)
               d.code === 'TS2305';    // Module has no exported member
      }
      
      return false;
    };
    
    const shouldEmit = options.outDir && (!hasErrors || allDiagnostics.every(isAllowedError));
    
    if (shouldEmit && options.outDir) {
      const emit = options.emit || 'js';  // Default to JS output
      
      if (target === 'typescript') {
        const tsDiagnostics = this.emitTypeScript(program, options.outDir, emit);
        // Add TypeScript→JavaScript compilation errors
        allDiagnostics.push(...tsDiagnostics);
      } else if (target === 'native') {
        try {
          this.emitCpp(program, options.outDir, options.compileBinary, options.arch);
        } catch (error: any) {
          allDiagnostics.push({
            severity: 'error',
            message: error.message,
            location: { fileName: '', line: 0, column: 0 },
          });
        }
      }
    }

    // Determine if compilation was successful
    // Allow ownership type errors for TypeScript target (we inject declarations)
    // Allow module resolution errors for native C++ target
    const finalHasErrors = allDiagnostics.some(d => d.severity === 'error');
    const isSuccessful = !finalHasErrors || allDiagnostics.every(isAllowedError);

    return {
      success: isSuccessful,
      diagnostics: allDiagnostics,
      fileStats: {
        goodscript: goodscriptFileCount,
        typescript: typescriptFileCount,
        total: goodscriptFileCount + typescriptFileCount,
      },
    };
  }

  /**
   * Get the ownership analyzer (for testing/debugging)
   */
  getOwnershipAnalyzer(): OwnershipAnalyzer {
    return this.ownershipAnalyzer;
  }

  /**
   * Get the validator (for testing/debugging)
   */
  getValidator(): Validator {
    return this.validator;
  }

  /**
   * Emit TypeScript code by removing ownership annotations,
   * then optionally compile to JavaScript
   * Returns diagnostics from the TS→JS compilation phase
   */
  private emitTypeScript(
    program: ts.Program,
    outDir: string,
    emit: 'js' | 'ts' | 'both'
  ): Diagnostic[] {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const tsFiles: string[] = [];
    
    // Get the common source directory from TypeScript program
    // This is what tsc uses to determine the output structure
    const compilerOptions = program.getCompilerOptions();
    const rootDir = compilerOptions.rootDir || this.getCommonSourceDirectory(program);

    // Process each source file
    for (const sourceFile of program.getSourceFiles()) {
      if (!sourceFile.isDeclarationFile) {
        const sourceFilePath = path.resolve(sourceFile.fileName);
        
        if (this.isGoodScriptFile(sourceFile.fileName)) {
          // Generate TypeScript from GoodScript
          const tsCode = this.tsCodegen.generate(sourceFile);
          
          // Compute relative path from root directory
          const relativePath = path.relative(rootDir, sourceFilePath);
          
          // Convert .gs.ts or .gs to .ts extension
          let outputPath = relativePath;
          if (outputPath.endsWith('.gs.ts')) {
            outputPath = outputPath.slice(0, -6) + '.ts';  // .gs.ts -> .ts
          } else if (outputPath.endsWith('.gs')) {
            outputPath = outputPath.slice(0, -3) + '.ts';  // .gs -> .ts
          }
          
          const tsPath = path.join(outDir, outputPath);
          
          // Create directory structure if needed
          const tsDir = path.dirname(tsPath);
          if (!fs.existsSync(tsDir)) {
            fs.mkdirSync(tsDir, { recursive: true });
          }
          
          // Write TS file
          fs.writeFileSync(tsPath, tsCode, 'utf-8');
          tsFiles.push(tsPath);
        } else if (sourceFile.fileName.endsWith('.ts')) {
          // Handle regular .ts files
          const relativePath = path.relative(rootDir, sourceFilePath);
          const tsPath = path.join(outDir, relativePath);
          
          // Create directory structure if needed
          const tsDir = path.dirname(tsPath);
          if (!fs.existsSync(tsDir)) {
            fs.mkdirSync(tsDir, { recursive: true });
          }
          
          // For emit='ts' or emit='both', we already copy the file
          // For emit='js', we also need to copy it to compile it
          if (emit === 'ts' || emit === 'both' || emit === 'js') {
            const tsCode = fs.readFileSync(sourceFile.fileName, 'utf-8');
            fs.writeFileSync(tsPath, tsCode, 'utf-8');
            tsFiles.push(tsPath);
          }
        }
      }
    }

    // Compile TypeScript to JavaScript if requested
    const tsDiagnostics: Diagnostic[] = [];
    if (emit === 'js' || emit === 'both') {
      // For JS compilation, we need to use outDir as rootDir since the .ts files
      // are already in the output directory structure we want
      const jsCompileDiagnostics = this.compileTypeScriptToJS(tsFiles, outDir, outDir);
      tsDiagnostics.push(...jsCompileDiagnostics);
      
      // Remove .ts files if only JS was requested
      if (emit === 'js') {
        for (const tsFile of tsFiles) {
          if (fs.existsSync(tsFile)) {
            fs.unlinkSync(tsFile);
          }
        }
      }
    }
    // If emit === 'ts', we already wrote the files above
    
    return tsDiagnostics;
  }

  /**
   * Get the common source directory for all source files
   * This mimics TypeScript's behavior for determining output structure
   */
  private getCommonSourceDirectory(program: ts.Program): string {
    const sourceFiles = program.getSourceFiles().filter(
      sf => !sf.isDeclarationFile && (this.isGoodScriptFile(sf.fileName) || sf.fileName.endsWith('.ts'))
    );
    
    if (sourceFiles.length === 0) {
      return process.cwd();
    }
    
    if (sourceFiles.length === 1) {
      return path.dirname(path.resolve(sourceFiles[0].fileName));
    }
    
    // Find common directory
    const paths = sourceFiles.map(sf => path.dirname(path.resolve(sf.fileName)));
    let commonPath = paths[0];
    
    for (let i = 1; i < paths.length; i++) {
      while (!paths[i].startsWith(commonPath + path.sep) && paths[i] !== commonPath) {
        commonPath = path.dirname(commonPath);
        if (commonPath === path.dirname(commonPath)) {
          // Reached root
          break;
        }
      }
    }
    
    return commonPath;
  }

  /**
   * Compile TypeScript files to JavaScript using tsc
   * Returns diagnostics from the compilation
   */
  private compileTypeScriptToJS(tsFiles: string[], outDir: string, rootDir: string): Diagnostic[] {
    // Create a temporary tsconfig for compilation
    const compilerOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      lib: ['lib.es2020.d.ts'],  // Exclude DOM types to avoid conflicts with user code
      outDir: outDir,
      rootDir: rootDir,  // Use the provided rootDir to preserve structure
      skipLibCheck: true,
      esModuleInterop: true,
      strict: false,  // Don't enforce strict mode on generated code
    };

    const host = ts.createCompilerHost(compilerOptions);
    const jsProgram = ts.createProgram(tsFiles, compilerOptions, host);
    const emitResult = jsProgram.emit();

    // Check for compilation errors
    const jsDiagnostics = ts.getPreEmitDiagnostics(jsProgram).concat(emitResult.diagnostics);
    
    const diagnostics: Diagnostic[] = [];
    if (jsDiagnostics.length > 0) {
      const formatHost: ts.FormatDiagnosticsHost = {
        getCurrentDirectory: () => ts.sys.getCurrentDirectory(),
        getCanonicalFileName: (fileName: string) => fileName,
        getNewLine: () => ts.sys.newLine,
      };
      const message = ts.formatDiagnosticsWithColorAndContext(jsDiagnostics, formatHost);
      console.error('TypeScript compilation errors:\n', message);
      
      // Convert TypeScript diagnostics to our Diagnostic format
      for (const tsDiag of jsDiagnostics) {
        // Skip diagnostics without file location (e.g., global config errors)
        if (!tsDiag.file || tsDiag.start === undefined) {
          continue;
        }
        
        const location: SourceLocation = {
          fileName: tsDiag.file.fileName,
          line: ts.getLineAndCharacterOfPosition(tsDiag.file, tsDiag.start).line + 1,
          column: ts.getLineAndCharacterOfPosition(tsDiag.file, tsDiag.start).character + 1,
        };
        
        diagnostics.push({
          severity: tsDiag.category === ts.DiagnosticCategory.Error ? 'error' : 'warning',
          message: ts.flattenDiagnosticMessageText(tsDiag.messageText, '\n'),
          location,
          code: `TS${tsDiag.code}`,
        });
      }
    }
    
    return diagnostics;
  }

  /**
   * Check if Zig C++ compiler is available
   */
  private isZigAvailable(): boolean {
    try {
      execSync('zig version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Compile C++ file to native binary using Zig
   */
  private compileCppToBinary(cppFile: string, outFile: string, targetArch?: string): void {
    if (!this.isZigAvailable()) {
      throw new Error(
        'Zig compiler not found. To compile C++ to native binaries, please install Zig:\n' +
        '\n' +
        'macOS:   brew install zig\n' +
        'Linux:   https://ziglang.org/download/\n' +
        'Windows: https://ziglang.org/download/\n' +
        '\n' +
        'Zig provides a cross-platform C++ compiler with zero additional dependencies.\n' +
        'Alternatively, use --target native without --compile-binary to generate C++ source only.'
      );
    }

    try {
      // Locate the runtime directory (contains gs_runtime.hpp and other headers)
      const runtimeDir = path.join(__dirname, '..', 'runtime');
      
      // Build compilation command
      let cmd = 'zig c++ -std=c++20';
      
      // Add target architecture if specified (for cross-compilation)
      if (targetArch) {
        cmd += ` -target ${targetArch}`;
        // When cross-compiling, don't use -march=native
        cmd += ' -O3 -DNDEBUG -ffast-math -funroll-loops';
      } else {
        // Native compilation: use -march=native for optimal performance
        cmd += ' -O3 -march=native -DNDEBUG -ffast-math -funroll-loops';
      }
      
      // Add include path for runtime headers
      cmd += ` -I"${runtimeDir}"`;
      
      cmd += ` "${cppFile}" -o "${outFile}"`;
      
      execSync(cmd, { encoding: 'utf-8', stdio: 'inherit' });
    } catch (error: any) {
      throw new Error(`Failed to compile C++ to binary: ${error.message}`);
    }
  }

  /**
   * Emit C++ code from GoodScript source files
   */
  private emitCpp(program: ts.Program, outDir: string, compileBinary: boolean = false, arch?: string): void {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const compilerOptions = program.getCompilerOptions();
    const rootDir = compilerOptions.rootDir || this.getCommonSourceDirectory(program);
    const checker = program.getTypeChecker();

    // Process each GoodScript source file
    for (const sourceFile of program.getSourceFiles()) {
      if (!sourceFile.isDeclarationFile && this.isGoodScriptFile(sourceFile.fileName)) {
        const sourceFilePath = path.resolve(sourceFile.fileName);
        
        // Generate C++ code with type checker for type inference
        const cppCode = this.cppCodegen.generate(sourceFile, checker);
        
        // Compute relative path from root directory
        const relativePath = path.relative(rootDir, sourceFilePath);
        
        // Convert .gs.ts or .gs to .cpp extension
        let outputPath = relativePath;
        if (outputPath.endsWith('.gs.ts')) {
          outputPath = outputPath.slice(0, -6) + '.cpp';  // .gs.ts -> .cpp
        } else if (outputPath.endsWith('.gs.tsx')) {
          outputPath = outputPath.slice(0, -7) + '.cpp';  // .gs.tsx -> .cpp
        } else if (outputPath.endsWith('.gs')) {
          outputPath = outputPath.slice(0, -3) + '.cpp';  // .gs -> .cpp
        }
        
        const cppPath = path.join(outDir, outputPath);
        
        // Create directory structure if needed
        const cppDir = path.dirname(cppPath);
        if (!fs.existsSync(cppDir)) {
          fs.mkdirSync(cppDir, { recursive: true });
        }
        
        // Write C++ file
        fs.writeFileSync(cppPath, cppCode, 'utf-8');

        // Compile to binary if requested
        if (compileBinary) {
          const binPath = cppPath.replace(/\.cpp$/, '');
          this.compileCppToBinary(cppPath, binPath, arch);
        }
      }
    }
  }
}
