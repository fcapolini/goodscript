/**
 * CLI Option Parser
 * 
 * Parses command-line arguments compatible with tsc, plus GoodScript-specific --gs* flags
 */

import * as path from 'path';
import * as fs from 'fs';

export interface CliOptions {
  // tsc-compatible flags
  files: string[];
  project?: string;        // -p, --project
  outDir?: string;
  outFile?: string;
  watch?: boolean;         // -w, --watch
  noEmit?: boolean;
  sourceMap?: boolean;
  help?: boolean;          // -h, --help
  version?: boolean;       // -v, --version
  
  // GoodScript-specific flags (--gs* prefix)
  gsTarget?: 'cpp' | 'js' | 'ts' | 'haxe';
  gsMemory?: 'gc' | 'ownership';
  gsCompile?: boolean;
  gsOptimize?: '0' | '1' | '2' | '3' | 's' | 'z';
  gsTriple?: string;
  gsShowIR?: boolean;
  gsValidateOnly?: boolean;
  gsSkipValidation?: boolean;
  gsDebug?: boolean;
  
  // Output path for binary (when gsCompile=true)
  output?: string;         // -o
}

export interface ParsedOptions {
  options: CliOptions;
  errors: string[];
}

/**
 * Parse command-line arguments
 */
export function parseArguments(args: string[]): ParsedOptions {
  const options: CliOptions = {
    files: [],
  };
  const errors: string[] = [];
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    // Help flags
    if (arg === '--help' || arg === '-h' || arg === '-?') {
      options.help = true;
      continue;
    }
    
    // Version flag
    if (arg === '--version' || arg === '-v') {
      options.version = true;
      continue;
    }
    
    // Project flag
    if (arg === '--project' || arg === '-p') {
      options.project = args[++i];
      if (!options.project) {
        errors.push('--project requires a path to tsconfig.json');
      }
      continue;
    }
    
    // Output directory
    if (arg === '--outDir') {
      options.outDir = args[++i];
      if (!options.outDir) {
        errors.push('--outDir requires a directory path');
      }
      continue;
    }
    
    // Output file
    if (arg === '--outFile') {
      options.outFile = args[++i];
      if (!options.outFile) {
        errors.push('--outFile requires a file path');
      }
      continue;
    }
    
    // Binary output path
    if (arg === '-o') {
      options.output = args[++i];
      if (!options.output) {
        errors.push('-o requires an output path');
      }
      continue;
    }
    
    // Watch mode
    if (arg === '--watch' || arg === '-w') {
      options.watch = true;
      continue;
    }
    
    // No emit (type-check only)
    if (arg === '--noEmit') {
      options.noEmit = true;
      continue;
    }
    
    // Source maps
    if (arg === '--sourceMap') {
      options.sourceMap = true;
      continue;
    }
    
    // GoodScript-specific flags
    if (arg === '--gsTarget') {
      const target = args[++i];
      if (!target || !['cpp', 'js', 'ts', 'haxe'].includes(target)) {
        errors.push('--gsTarget must be one of: cpp, js, ts, haxe');
      } else {
        options.gsTarget = target as 'cpp' | 'js' | 'ts' | 'haxe';
      }
      continue;
    }
    
    if (arg === '--gsMemory') {
      const mode = args[++i];
      if (!mode || !['gc', 'ownership'].includes(mode)) {
        errors.push('--gsMemory must be one of: gc, ownership');
      } else {
        options.gsMemory = mode as 'gc' | 'ownership';
      }
      continue;
    }
    
    if (arg === '--gsCompile') {
      options.gsCompile = true;
      continue;
    }
    
    if (arg === '--gsOptimize') {
      const level = args[++i];
      if (!level || !['0', '1', '2', '3', 's', 'z'].includes(level)) {
        errors.push('--gsOptimize must be one of: 0, 1, 2, 3, s, z');
      } else {
        options.gsOptimize = level as '0' | '1' | '2' | '3' | 's' | 'z';
      }
      continue;
    }
    
    if (arg === '--gsTriple') {
      options.gsTriple = args[++i];
      if (!options.gsTriple) {
        errors.push('--gsTriple requires a target triple (e.g., x86_64-linux-gnu)');
      }
      continue;
    }
    
    if (arg === '--gsShowIR') {
      options.gsShowIR = true;
      continue;
    }
    
    if (arg === '--gsValidateOnly') {
      options.gsValidateOnly = true;
      continue;
    }
    
    if (arg === '--gsSkipValidation') {
      options.gsSkipValidation = true;
      continue;
    }
    
    if (arg === '--gsDebug') {
      options.gsDebug = true;
      continue;
    }
    
    // Unknown flag
    if (arg.startsWith('-')) {
      errors.push(`Unknown option: ${arg}`);
      continue;
    }
    
    // Input file
    options.files.push(arg);
  }
  
  return { options, errors };
}

/**
 * Load and merge tsconfig.json settings
 */
export function loadTsConfig(projectPath?: string): Partial<CliOptions> {
  const configPath = projectPath || findTsConfig();
  if (!configPath) {
    return {};
  }
  
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(content);
    
    const result: Partial<CliOptions> = {};
    
    // Standard TypeScript options
    if (config.compilerOptions) {
      const opts = config.compilerOptions;
      if (opts.outDir) result.outDir = opts.outDir;
      if (opts.outFile) result.outFile = opts.outFile;
      if (opts.sourceMap !== undefined) result.sourceMap = opts.sourceMap;
    }
    
    // GoodScript-specific options
    if (config.goodscript) {
      const gs = config.goodscript;
      if (gs.target) result.gsTarget = gs.target;
      if (gs.memory) result.gsMemory = gs.memory;
      if (gs.compile !== undefined) result.gsCompile = gs.compile;
      if (gs.optimize !== undefined) result.gsOptimize = String(gs.optimize) as any;
      if (gs.triple) result.gsTriple = gs.triple;
      if (gs.outFile) result.output = gs.outFile;
    }
    
    return result;
  } catch (err) {
    // Ignore errors, just return empty config
    return {};
  }
}

/**
 * Find tsconfig.json in current or parent directories
 */
function findTsConfig(dir: string = process.cwd()): string | undefined {
  const configPath = path.join(dir, 'tsconfig.json');
  if (fs.existsSync(configPath)) {
    return configPath;
  }
  
  const parent = path.dirname(dir);
  if (parent === dir) {
    return undefined; // Reached root
  }
  
  return findTsConfig(parent);
}

/**
 * Merge CLI options with tsconfig.json (CLI takes precedence)
 */
export function mergeOptions(cliOptions: CliOptions, configPath?: string): CliOptions {
  const tsConfigOptions = loadTsConfig(configPath || cliOptions.project);
  
  return {
    ...tsConfigOptions,
    ...cliOptions,
    // Files are only from CLI, not tsconfig
    files: cliOptions.files,
  };
}

/**
 * Validate and normalize options
 */
export function validateOptions(options: CliOptions): string[] {
  const errors: string[] = [];
  
  // Check for conflicting options
  if (options.gsValidateOnly && options.gsSkipValidation) {
    errors.push('Cannot use --gsValidateOnly and --gsSkipValidation together');
  }
  
  if (options.gsCompile && options.gsTarget !== 'cpp') {
    errors.push('--gsCompile requires --gsTarget cpp');
  }
  
  if (options.gsMemory && options.gsTarget !== 'cpp' && options.gsTarget !== undefined) {
    errors.push('--gsMemory only applies to --gsTarget cpp');
  }
  
  if (options.gsTriple && !options.gsCompile) {
    errors.push('--gsTriple requires --gsCompile');
  }
  
  if (options.output && !options.gsCompile) {
    errors.push('-o requires --gsCompile');
  }
  
  if (options.watch && options.gsCompile) {
    errors.push('--watch mode is not compatible with --gsCompile (yet)');
  }
  
  // Require input files unless showing help/version
  if (!options.help && !options.version && options.files.length === 0 && !options.project) {
    errors.push('No input files specified');
  }
  
  return errors;
}

/**
 * Get default values for unspecified options
 */
export function applyDefaults(options: CliOptions): CliOptions {
  const target = options.gsTarget || 'js';
  
  return {
    ...options,
    gsTarget: target,
    gsMemory: target === 'cpp' ? (options.gsMemory || 'gc') : options.gsMemory,
    gsOptimize: options.gsOptimize || (options.sourceMap ? '0' : '3'),
    outDir: options.outDir || 'dist',
  };
}
