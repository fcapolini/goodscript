/**
 * GoodScript Parser
 * Uses TypeScript compiler API to parse source code
 */

import * as ts from 'typescript';
import { Diagnostic, SourceLocation, GoodScriptConfig } from './types';

export class Parser {
  private program: ts.Program | null = null;
  private checker: ts.TypeChecker | null = null;
  private goodscriptConfig: GoodScriptConfig | undefined;
  private compilerOptions: ts.CompilerOptions = {};

  /**
   * Check if a file should have JSX enabled
   */
  private isJsxFile(fileName: string): boolean {
    return fileName.endsWith('.tsx') || fileName.endsWith('-gs.tsx');
  }

  /**
   * Parse a GoodScript source file
   */
  parseFile(fileName: string, sourceCode: string): ts.SourceFile {
    const sourceFile = ts.createSourceFile(
      fileName,
      sourceCode,
      ts.ScriptTarget.ES2020,
      true
    );

    return sourceFile;
  }

  /**
   * Create a TypeScript program from files
   * @param configPath - Path to tsconfig.json. Pass undefined for auto-detection, null to disable, or a string path for explicit config.
   */
  createProgram(fileNames: string[], options?: ts.CompilerOptions, configPath?: string | null): void {
    const path = require('path');
    
    // Add GoodScript standard library definitions
    const libPath = path.join(__dirname, '../lib/goodscript.d.ts');
    const allFiles = [...fileNames, libPath];
    
    // Load compiler options from tsconfig.json
    let tsConfigOptions: ts.CompilerOptions = {};
    if (configPath !== undefined && configPath !== null) {
      // Explicit path provided via --project flag
      const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
      if (!configFile.error) {
        const parsedConfig = ts.parseJsonConfigFileContent(
          configFile.config,
          ts.sys,
          path.dirname(configPath)
        );
        tsConfigOptions = parsedConfig.options;
        
        // Extract GoodScript-specific config
        if (configFile.config.goodscript) {
          this.goodscriptConfig = configFile.config.goodscript as GoodScriptConfig;
        }
      }
    } else if (configPath === undefined) {
      // Auto-detect tsconfig.json (only when configPath is undefined, not null)
      const searchPath = fileNames.length > 0 
        ? path.dirname(path.resolve(fileNames[0]))
        : process.cwd();
      const foundConfig = ts.findConfigFile(searchPath, ts.sys.fileExists, 'tsconfig.json');
      if (foundConfig) {
        const configFile = ts.readConfigFile(foundConfig, ts.sys.readFile);
        if (configFile.error) {
          throw new Error(ts.formatDiagnostic(configFile.error, {
            getCurrentDirectory: ts.sys.getCurrentDirectory,
            getCanonicalFileName: fileName => fileName,
            getNewLine: () => '\n',
          }));
        } else {
          const parsedConfig = ts.parseJsonConfigFileContent(
            configFile.config,
            ts.sys,
            path.dirname(foundConfig)
          );
          tsConfigOptions = parsedConfig.options;
          
          // Extract GoodScript-specific config
          if (configFile.config.goodscript) {
            this.goodscriptConfig = configFile.config.goodscript as GoodScriptConfig;
          }
        }
      }
    }
    // If configPath === null, auto-detection is explicitly disabled
    
    // Check if any file requires JSX support
    const needsJsx = allFiles.some(f => this.isJsxFile(f));
    
    const defaultOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      strict: true,
      noImplicitAny: true,
      skipDefaultLibCheck: true,  // Skip lib.dom.d.ts type checking
      lib: [],                    // Don't include DOM libs
      ...tsConfigOptions,         // Load from tsconfig.json
      ...options,                 // Override with explicit options
      // Enable JSX if needed
      ...(needsJsx ? { jsx: ts.JsxEmit.Preserve } : {}),
      // Override rootDir to prevent conflicts when compiling files outside compiler's src/
      // This ensures we can compile files anywhere without rootDir validation errors
      rootDir: undefined,
      // These must be preserved for GoodScript to work correctly
      allowNonTsExtensions: true,
      skipLibCheck: true,
    };

    // Custom compiler host to handle -gs.ts, -gs.tsx and .gs files
    const compilerHost = ts.createCompilerHost(defaultOptions);
    const originalGetSourceFile = compilerHost.getSourceFile;
    
    // GoodScript built-in type definitions (injected as virtual file)
    const goodscriptTypes = `
/**
 * GoodScript built-in type definitions
 */

/**
 * Exclusive ownership qualifier - indicates a variable exclusively owns a value
 * Maps to std::unique_ptr<T> in C++
 */
declare type own<T> = T;

/**
 * Shared ownership qualifier - indicates a variable shares a value with others
 * This contributes to reference counting
 * Maps to std::shared_ptr<T> in C++
 */
declare type share<T> = T;

/**
 * Non-owning reference qualifier - indicates a variable uses a value it doesn't own
 * use references are implicitly nullable (can be null or undefined)
 * GoodScript treats null and undefined as synonyms
 * Maps to std::weak_ptr<T> in C++
 */
declare type use<T> = T | null | undefined;
`;
    
    compilerHost.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
      // Inject GoodScript type definitions as a virtual file
      if (fileName === libPath) {
        return ts.createSourceFile(fileName, goodscriptTypes, languageVersion, true);
      }
      
      // Treat -gs.ts, -gs.tsx and .gs files as TypeScript files
      if (fileName.endsWith('-gs.ts') || fileName.endsWith('-gs.tsx') || fileName.endsWith('.gs')) {
        const fs = require('fs');
        if (fs.existsSync(fileName)) {
          const sourceCode = fs.readFileSync(fileName, 'utf8');
          return ts.createSourceFile(fileName, sourceCode, languageVersion, true);
        }
      }
      return originalGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
    };

    this.program = ts.createProgram(allFiles, defaultOptions, compilerHost);
    this.checker = this.program.getTypeChecker();
    this.compilerOptions = defaultOptions;
  }

  /**
   * Get the compiler options (includes outDir from tsconfig if present)
   */
  getCompilerOptions(): ts.CompilerOptions {
    return this.compilerOptions;
  }

  /**
   * Get the type checker
   */
  getTypeChecker(): ts.TypeChecker {
    if (!this.checker) {
      throw new Error('Program not created. Call createProgram() first.');
    }
    return this.checker;
  }

  /**
   * Get GoodScript-specific configuration from tsconfig.json
   */
  getGoodScriptConfig(): GoodScriptConfig | undefined {
    return this.goodscriptConfig;
  }

  /**
   * Get file list from tsconfig.json
   * Returns null if no tsconfig found or error reading it
   */
  static getFilesFromTsConfig(configPath?: string): string[] | null {
    const configInfo = Parser.getTsConfigInfo(configPath);
    return configInfo ? configInfo.fileNames : null;
  }

  /**
   * Get complete tsconfig information including files and compiler options
   * Returns null if no tsconfig found or error reading it
   */
  static getTsConfigInfo(configPath?: string): { fileNames: string[], options: ts.CompilerOptions } | null {
    const path = require('path');
    
    // Find tsconfig.json
    let tsConfigPath = configPath;
    if (!tsConfigPath) {
      tsConfigPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists, 'tsconfig.json');
      if (!tsConfigPath) {
        return null;
      }
    }

    // Read and parse tsconfig.json
    const configFile = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
    if (configFile.error) {
      return null;
    }

    // Parse the config file content to get file names and options
    const parsedConfig = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      path.dirname(tsConfigPath)
    );

    return {
      fileNames: parsedConfig.fileNames,
      options: parsedConfig.options
    };
  }

  /**
   * Get the program
   */
  getProgram(): ts.Program {
    if (!this.program) {
      throw new Error('Program not created. Call createProgram() first.');
    }
    return this.program;
  }

  /**
   * Extract source location from a node
   */
  static getLocation(node: ts.Node, sourceFile: ts.SourceFile): SourceLocation {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    return {
      fileName: sourceFile.fileName,
      line: line + 1, // 1-indexed
      column: character + 1,
    };
  }

  /**
   * Convert TypeScript diagnostics to GoodScript diagnostics
   */
  static convertDiagnostics(tsDiagnostics: readonly ts.Diagnostic[]): Diagnostic[] {
    return tsDiagnostics.map(diag => {
      const message = ts.flattenDiagnosticMessageText(diag.messageText, '\n');
      
      let location: SourceLocation = {
        fileName: 'unknown',
        line: 0,
        column: 0,
      };

      if (diag.file && diag.start !== undefined) {
        const { line, character } = diag.file.getLineAndCharacterOfPosition(diag.start);
        location = {
          fileName: diag.file.fileName,
          line: line + 1,
          column: character + 1,
        };
      }

      return {
        severity: diag.category === ts.DiagnosticCategory.Error ? 'error' : 'warning',
        message,
        location,
        code: `TS${diag.code}`,
      };
    });
  }
}
