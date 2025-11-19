#!/usr/bin/env node

/**
 * GoodScript CLI
 */

import * as fs from 'fs';
import * as path from 'path';
import { Compiler, CompileOptions } from './compiler';
import { Parser } from './parser';

// Read version from package.json
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8')
);
const VERSION = packageJson.version;

interface CliOptions {
  files: string[];
  outDir?: string;
  target?: 'typescript' | 'rust';
  emit?: 'js' | 'ts' | 'both';
  skipOwnershipChecks?: boolean;
  verbose?: boolean;
  help?: boolean;
  project?: string;
  jsonOutput?: boolean;
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    files: [],
    target: 'typescript', // Default to TypeScript
    emit: 'js',  // Default to JavaScript output
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--version' || arg === '-V') {
      console.log(VERSION);
      process.exit(0);
    } else if (arg === '--out-dir' || arg === '-o') {
      options.outDir = args[++i];
    } else if (arg === '--target' || arg === '-t') {
      const targetValue = args[++i];
      if (targetValue === 'typescript' || targetValue === 'ts') {
        options.target = 'typescript';
      } else if (targetValue === 'rust' || targetValue === 'rs') {
        options.target = 'rust';
      } else {
        console.error(`Error: Invalid target '${targetValue}'. Use 'typescript' or 'rust'`);
        process.exit(1);
      }
    } else if (arg === '--emit' || arg === '-e') {
      const emitValue = args[++i];
      if (emitValue === 'js' || emitValue === 'ts' || emitValue === 'both') {
        options.emit = emitValue;
      } else {
        console.error(`Error: Invalid emit value '${emitValue}'. Use 'js', 'ts', or 'both'`);
        process.exit(1);
      }
    } else if (arg === '--project' || arg === '-p') {
      options.project = args[++i];
    } else if (arg === '--no-ownership-checks') {
      options.skipOwnershipChecks = true;
    } else if (arg === '--json-output') {
      options.jsonOutput = true;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (!arg.startsWith('-')) {
      options.files.push(arg);
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
GoodScript Compiler v${VERSION}
Rust performance for the rest of us

Usage: gsc [options] [files...]

✨ Drop-in replacement for tsc:
  - Compiles .gs.ts files as GoodScript (with ownership checking)
  - Compiles .ts files as regular TypeScript (tsc compatible)
  - Supports mixed projects with both file types
  - Use tsconfig.json when no files specified (like tsc)

Options:
  -h, --help                  Show this help message
  -V, --version               Show version number
  -o, --out-dir <dir>         Output directory for compiled files
  -p, --project <file>        Path to tsconfig.json (auto-detected from input files if not specified)
  -t, --target <target>       Target language: 'typescript' (default) or 'rust'
  -e, --emit <format>         Output format: 'js' (default), 'ts', or 'both'
  --no-ownership-checks       Skip ownership analysis ("Clean TypeScript" mode)
  --json-output               Output diagnostics in JSON format (for IDE integration)
  -v, --verbose               Verbose output

File Extensions:
  .gs.ts (recommended)        GoodScript with TypeScript IDE support
  .gs (legacy)                Original GoodScript extension
  .ts                         Regular TypeScript (processed like tsc)

Examples:
  gsc                                 Compile using tsconfig.json (like tsc)
  gsc -p tsconfig.json                Use specific tsconfig.json
  gsc main.gs.ts                      Compile GoodScript with ownership checks
  gsc main.ts                         Compile TypeScript (like tsc)
  gsc src/**/*.ts                     Compile mixed .ts and .gs.ts files
  gsc -o dist main.gs.ts              Compile to JavaScript in dist/
  gsc -e ts -o dist main.gs.ts        Compile to TypeScript only
  gsc -e both -o dist main.gs.ts      Emit both .ts and .js files
  gsc --no-ownership-checks -o dist main.gs.ts   Skip ownership checks
  gsc -t rust -o dist main.gs.ts      Compile to Rust (Phase 3)
  `);
}

function formatDiagnostic(diagnostic: any): string {
  const severity = diagnostic.severity.toUpperCase();
  const location = `${diagnostic.location.fileName}:${diagnostic.location.line}:${diagnostic.location.column}`;
  const code = diagnostic.code ? `[${diagnostic.code}]` : '';
  return `${severity} ${code} ${location}\n  ${diagnostic.message}`;
}

function main(): void {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  // If no files provided, try to use tsconfig.json (like tsc)
  if (options.files.length === 0) {
    const configInfo = Parser.getTsConfigInfo(options.project);
    if (configInfo && configInfo.fileNames.length > 0) {
      options.files = configInfo.fileNames;
      // Use outDir from tsconfig if not provided via CLI
      if (!options.outDir && configInfo.options.outDir) {
        options.outDir = configInfo.options.outDir;
      }
    } else if (args.length === 0) {
      // Show help only if truly no arguments at all
      printHelp();
      process.exit(0);
    } else {
      // Had some args (like -o) but no files and no tsconfig
      console.error('Error: No input files specified and no tsconfig.json found');
      printHelp();
      process.exit(1);
    }
  }

  // Verify files exist
  for (const file of options.files) {
    if (!fs.existsSync(file)) {
      console.error(`Error: File not found: ${file}`);
      process.exit(1);
    }
  }

  if (options.verbose) {
    console.log('GoodScript Compiler');
    console.log('Input files:', options.files);
    console.log('Target:', options.target);
    console.log('Emit:', options.emit);
    if (options.project) {
      console.log('TypeScript config:', options.project);
    }
    if (options.skipOwnershipChecks) {
      console.log('Mode: Clean TypeScript (ownership checks disabled)');
    }
    if (options.outDir) {
      console.log('Output directory:', options.outDir);
    }
    console.log();
  }

  // Compile
  const compiler = new Compiler();
  const compileOptions: CompileOptions = {
    files: options.files,
    outDir: options.outDir,
    target: options.target,
    emit: options.emit,
    skipOwnershipChecks: options.skipOwnershipChecks,
    project: options.project,
  };

  const result = compiler.compile(compileOptions);

  // Output in JSON format for IDE integration
  if (options.jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
    return;
  }

  // Print diagnostics
  if (result.diagnostics.length > 0) {
    console.log('\nDiagnostics:\n');
    for (const diagnostic of result.diagnostics) {
      console.log(formatDiagnostic(diagnostic));
      console.log();
    }
  }

  // Print summary
  const errors = result.diagnostics.filter(d => d.severity === 'error').length;
  const warnings = result.diagnostics.filter(d => d.severity === 'warning').length;

  if (result.success) {
    let message = '✓ Compilation successful';
    if (result.fileStats && (result.fileStats.goodscript > 0 || result.fileStats.typescript > 0)) {
      const parts = [];
      if (result.fileStats.goodscript > 0) {
        parts.push(`${result.fileStats.goodscript} GoodScript`);
      }
      if (result.fileStats.typescript > 0) {
        parts.push(`${result.fileStats.typescript} TypeScript`);
      }
      message += ` (${parts.join(', ')} file${result.fileStats.total !== 1 ? 's' : ''})`;
    }
    if (warnings > 0) {
      message += ` - ${warnings} warning${warnings !== 1 ? 's' : ''}`;
    }
    console.log(message);    process.exit(0);
  } else {
    console.log(`✗ Compilation failed (${errors} error${errors !== 1 ? 's' : ''}, ${warnings} warning${warnings !== 1 ? 's' : ''})`);
    process.exit(1);
  }
}

main();
