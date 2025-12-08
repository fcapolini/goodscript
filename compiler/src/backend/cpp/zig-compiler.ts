/**
 * Zig C++ Compiler Integration
 * 
 * Compiles generated C++ code to native binaries using Zig
 */

import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

export interface CompileOptions {
  /** Input C++ files (generated code) */
  sources: Map<string, string>;
  
  /** Output binary path */
  output: string;
  
  /** Memory mode: 'gc' or 'ownership' */
  mode: 'gc' | 'ownership';
  
  /** Target triple (e.g., 'x86_64-linux-gnu', 'wasm32-wasi') */
  target?: string;
  
  /** Optimization level: 0-3 or 's' (size) or 'z' (size aggressive) */
  optimize?: '0' | '1' | '2' | '3' | 's' | 'z';
  
  /** Build directory */
  buildDir?: string;
  
  /** Vendor directory (for dependencies) */
  vendorDir?: string;
  
  /** Enable debug symbols */
  debug?: boolean;
  
  /** Additional include paths */
  includePaths?: string[];
  
  /** Additional compiler flags */
  cxxFlags?: string[];
  
  /** Additional linker flags */
  ldFlags?: string[];
}

export interface CompileResult {
  success: boolean;
  outputPath?: string;
  diagnostics: string[];
  buildTime?: number;
}

export class ZigCompiler {
  private buildDir: string;
  private vendorDir: string;
  private cacheDir: string;

  constructor(buildDir = 'build', vendorDir = 'vendor') {
    this.buildDir = buildDir;
    this.vendorDir = vendorDir;
    this.cacheDir = path.join(buildDir, '.cache');
  }

  async compile(options: CompileOptions): Promise<CompileResult> {
    const startTime = Date.now();
    const diagnostics: string[] = [];

    try {
      // Ensure directories exist
      await this.ensureDirectories(options);

      // Write source files to disk
      await this.writeSources(options.sources);

      // Compile vendored dependencies (cached)
      if (options.mode === 'gc') {
        await this.compileVendoredDep('mps', options, diagnostics);
      }
      
      // TODO: Compile PCRE2 only if RegExp is used
      // await this.compileVendoredDep('pcre2', options, diagnostics);

      // Compile GoodScript-generated C++ files
      const objectFiles = await this.compileGeneratedCode(options, diagnostics);

      // Link everything into final binary
      await this.link(objectFiles, options, diagnostics);

      const buildTime = Date.now() - startTime;

      return {
        success: true,
        outputPath: options.output,
        diagnostics,
        buildTime,
      };
    } catch (error) {
      diagnostics.push(error instanceof Error ? error.message : String(error));
      return {
        success: false,
        diagnostics,
        buildTime: Date.now() - startTime,
      };
    }
  }

  private async ensureDirectories(options: CompileOptions): Promise<void> {
    const dirs = [
      this.buildDir,
      this.cacheDir,
      path.join(this.cacheDir, 'vendor'),
      path.dirname(options.output),
    ];

    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  private async writeSources(sources: Map<string, string>): Promise<void> {
    for (const [filepath, content] of sources) {
      const fullPath = path.join(this.buildDir, filepath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');
    }
  }

  private async compileVendoredDep(
    name: string,
    options: CompileOptions,
    diagnostics: string[]
  ): Promise<string> {
    const outputPath = path.join(this.cacheDir, 'vendor', `${name}.o`);

    // Check if already compiled and cached
    if (await this.isCached(name, outputPath)) {
      diagnostics.push(`Using cached ${name}.o`);
      return outputPath;
    }

    diagnostics.push(`Compiling ${name}...`);

    let sourceFile: string;
    let flags: string[] = ['-O2', '-c'];

    switch (name) {
      case 'mps':
        sourceFile = path.join(this.vendorDir, 'mps/src/mps.c');
        // MPS uses __DATE__ and __TIME__ macros, which Zig treats as non-reproducible
        flags.push('-Wno-date-time');
        break;
      case 'pcre2':
        sourceFile = path.join(this.vendorDir, 'pcre2/src/pcre2_all.c');
        flags.push('-DPCRE2_CODE_UNIT_WIDTH=8');
        break;
      default:
        throw new Error(`Unknown vendored dependency: ${name}`);
    }

    await this.runZigCC([
      ...flags,
      sourceFile,
      '-o', outputPath,
    ]);

    // Save cache info
    await this.saveCacheInfo(name, sourceFile);

    return outputPath;
  }

  private async compileGeneratedCode(
    options: CompileOptions,
    diagnostics: string[]
  ): Promise<string[]> {
    const objectFiles: string[] = [];
    const optimize = options.optimize ?? '3';

    // Find all .cpp files in build directory
    const cppFiles = Array.from(options.sources.keys())
      .filter(f => f.endsWith('.cpp'))
      .map(f => path.join(this.buildDir, f));

    for (const cppFile of cppFiles) {
      const basename = path.basename(cppFile, '.cpp');
      const objFile = path.join(this.buildDir, `${basename}.o`);

      diagnostics.push(`Compiling ${path.basename(cppFile)}...`);

      const flags = [
        '-std=c++20',
        `-O${optimize}`,
        '-c',
      ];

      if (options.debug) {
        flags.push('-g');
      }

      // Add include paths
      flags.push('-I', this.buildDir); // For generated headers
      if (options.mode === 'gc') {
        flags.push('-I', path.join(this.vendorDir, 'mps/src'));
      }
      
      for (const includePath of options.includePaths ?? []) {
        flags.push('-I', includePath);
      }

      // Add custom flags
      if (options.cxxFlags) {
        flags.push(...options.cxxFlags);
      }

      await this.runZigCXX([
        ...flags,
        cppFile,
        '-o', objFile,
      ]);

      objectFiles.push(objFile);
    }

    return objectFiles;
  }

  private async link(
    objectFiles: string[],
    options: CompileOptions,
    diagnostics: string[]
  ): Promise<void> {
    diagnostics.push('Linking...');

    const flags: string[] = [];

    if (options.debug) {
      flags.push('-g');
    }

    // Add vendored dependencies
    if (options.mode === 'gc') {
      objectFiles.push(path.join(this.cacheDir, 'vendor', 'mps.o'));
    }

    // Target specification
    if (options.target) {
      flags.push('-target', options.target);
    }

    // Custom linker flags
    if (options.ldFlags) {
      flags.push(...options.ldFlags);
    }

    await this.runZigCXX([
      ...flags,
      ...objectFiles,
      '-o', options.output,
    ]);
  }

  private async isCached(depName: string, outputPath: string): Promise<boolean> {
    try {
      // Check if object file exists
      await fs.access(outputPath);

      // Check if cache info matches
      const cacheInfoPath = path.join(this.cacheDir, `${depName}.cache.json`);
      const cacheInfo = JSON.parse(await fs.readFile(cacheInfoPath, 'utf-8'));
      
      // Verify source file hasn't changed
      const sourceHash = await this.hashFile(cacheInfo.sourcePath);
      return sourceHash === cacheInfo.sourceHash;
    } catch {
      return false;
    }
  }

  private async saveCacheInfo(depName: string, sourcePath: string): Promise<void> {
    const cacheInfoPath = path.join(this.cacheDir, `${depName}.cache.json`);
    const sourceHash = await this.hashFile(sourcePath);
    
    await fs.writeFile(
      cacheInfoPath,
      JSON.stringify({ sourcePath, sourceHash }, null, 2),
      'utf-8'
    );
  }

  private async hashFile(filepath: string): Promise<string> {
    const content = await fs.readFile(filepath);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private async runZigCC(args: string[]): Promise<void> {
    return this.runCommand('zig', ['cc', ...args]);
  }

  private async runZigCXX(args: string[]): Promise<void> {
    return this.runCommand('zig', ['c++', ...args]);
  }

  private async runCommand(command: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(
            `Command failed: ${command} ${args.join(' ')}\n` +
            `Exit code: ${code}\n` +
            `stderr: ${stderr}\n` +
            `stdout: ${stdout}`
          ));
        }
      });

      proc.on('error', (err) => {
        reject(new Error(`Failed to spawn ${command}: ${err.message}`));
      });
    });
  }

  /**
   * Check if Zig is available on the system
   */
  static async checkZigAvailable(): Promise<boolean> {
    try {
      await new Promise<void>((resolve, reject) => {
        const proc = spawn('zig', ['version'], {
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        
        proc.on('close', (code) => {
          code === 0 ? resolve() : reject(new Error('Zig not found'));
        });
        
        proc.on('error', reject);
      });
      
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get Zig version
   */
  static async getZigVersion(): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn('zig', ['version'], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      
      let stdout = '';
      
      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      proc.on('close', (code) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error('Failed to get Zig version'));
        }
      });
      
      proc.on('error', reject);
    });
  }
}
