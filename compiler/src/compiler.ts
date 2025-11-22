/**
 * Compiler
 * Main entry point for the GoodScript compiler
 */

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { Parser } from './parser';
import { OwnershipAnalyzer } from './ownership-analyzer';
import { Validator } from './validator';
import { NullCheckAnalyzer } from './null-check-analyzer';
import { TypeScriptCodegen } from './ts-codegen';
import { CppCodegen } from './cpp-codegen';
import { Diagnostic } from './types';

export interface CompileOptions {
  files: string[];
  outDir?: string;
  target?: 'typescript' | 'native';  // Default: typescript
  emit?: 'js' | 'ts' | 'both';  // Default: js (ts+js, emit both intermediate .ts and final .js)
  skipOwnershipChecks?: boolean;  // Skip ownership analysis ("Clean TypeScript" mode)
  project?: string;  // Path to tsconfig.json
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
    // For C++ target, emit code even if there are TypeScript module resolution errors
    // (we're not actually running the code, just generating it)
    const shouldEmit = options.outDir && (
      !hasErrors || 
      (target === 'native' && allDiagnostics.every(d => 
        d.severity !== 'error' || 
        d.code === 'TS2307' ||  // Module not found
        d.code === 'TS2792' ||  // Cannot find module (ESM)
        d.code === 'TS2305'     // Module has no exported member
      ))
    );
    
    if (shouldEmit && options.outDir) {
      const emit = options.emit || 'js';  // Default to JS output
      
      if (target === 'typescript') {
        this.emitTypeScript(program, options.outDir, emit);
      } else if (target === 'native') {
        this.emitCpp(program, options.outDir);
      }
    }

    // For C++ target with only module resolution errors, consider it successful
    const isSuccessful = !hasErrors || (
      target === 'native' && allDiagnostics.every(d => 
        d.severity !== 'error' || 
        d.code === 'TS2307' ||  // Module not found
        d.code === 'TS2792' ||  // Cannot find module (ESM)
        d.code === 'TS2305'     // Module has no exported member
      )
    );

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
   */
  private emitTypeScript(
    program: ts.Program,
    outDir: string,
    emit: 'js' | 'ts' | 'both'
  ): void {
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
    if (emit === 'js' || emit === 'both') {
      // For JS compilation, we need to use outDir as rootDir since the .ts files
      // are already in the output directory structure we want
      this.compileTypeScriptToJS(tsFiles, outDir, outDir);
      
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
   */
  private compileTypeScriptToJS(tsFiles: string[], outDir: string, rootDir: string): void {
    // Create a temporary tsconfig for compilation
    const compilerOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
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
    
    if (jsDiagnostics.length > 0) {
      const formatHost: ts.FormatDiagnosticsHost = {
        getCurrentDirectory: () => ts.sys.getCurrentDirectory(),
        getCanonicalFileName: (fileName: string) => fileName,
        getNewLine: () => ts.sys.newLine,
      };
      const message = ts.formatDiagnosticsWithColorAndContext(jsDiagnostics, formatHost);
      console.error('TypeScript compilation errors:\n', message);
    }
  }

  /**
   * Emit C++ code from GoodScript source files
   */
  private emitCpp(program: ts.Program, outDir: string): void {
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
      }
    }
  }
}
