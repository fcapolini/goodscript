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
  
  /** Enable source maps (embeds #line directives in C++) */
  sourceMap?: boolean;
  
  /** Additional include paths */
  includePaths?: string[];
  
  /** Additional compiler flags */
  cxxFlags?: string[];
  
  /** Additional linker flags */
  ldFlags?: string[];
  
  /** Enable HTTP API (cpp-httplib) */
  enableHTTP?: boolean;
  
  /** Enable FileSystem API (std::filesystem) */
  enableFileSystem?: boolean;
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
      // Use vendorDir from options if provided, otherwise use constructor value
      const vendorDir = options.vendorDir || this.vendorDir;
      
      // Ensure directories exist
      await this.ensureDirectories(options);

      // Detect OpenSSL if HTTP is enabled
      let hasHTTPS = false;
      let useBearSSL = false;
      if (options.enableHTTP) {
        hasHTTPS = await this.detectOpenSSL(diagnostics);
        if (hasHTTPS) {
          diagnostics.push('HTTPS support: enabled (system OpenSSL detected)');
        } else {
          // Fall back to BearSSL
          diagnostics.push('HTTPS support: enabled (using vendored BearSSL)');
          diagnostics.push('  System OpenSSL not found - using BearSSL fallback');
          hasHTTPS = true;
          useBearSSL = true;
        }
      }

      // Write source files to disk
      await this.writeSources(options.sources);

      // Compile vendored dependencies (cached)
      if (options.mode === 'gc') {
        await this.compileVendoredDep('mps', vendorDir, options, diagnostics);
      }
      
      // Always compile cppcoro when using async/await
      await this.compileVendoredDep('cppcoro', vendorDir, options, diagnostics);
      
      // Compile BearSSL if using it for HTTPS
      if (useBearSSL) {
        await this.compileVendoredDep('bearssl', vendorDir, options, diagnostics);
      }
      
      // TODO: Compile PCRE2 only if RegExp is used
      // await this.compileVendoredDep('pcre2', options, diagnostics);

      // Compile GoodScript-generated C++ files
      const objectFiles = await this.compileGeneratedCode(options, hasHTTPS, useBearSSL, diagnostics);

      // Link everything into final binary
      await this.link(objectFiles, options, hasHTTPS, useBearSSL, diagnostics);

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
    vendorDir: string,
    _options: CompileOptions,
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
        sourceFile = path.join(vendorDir, 'mps/src/mps.c');
        // MPS uses __DATE__ and __TIME__ macros, which Zig treats as non-reproducible
        flags.push('-Wno-date-time');
        break;
      case 'cppcoro': {
        // cppcoro has multiple .cpp files - compile each separately
        const cppcoroDir = path.join(vendorDir, 'cppcoro/lib');
        const sourceFiles = [
          'lightweight_manual_reset_event.cpp',
          'spin_wait.cpp',
          'spin_mutex.cpp',
        ];
        
        flags.push(`-I${path.join(vendorDir, 'cppcoro/include')}`);
        flags.push('-std=c++20');
        flags.push('-Wno-everything'); // Suppress warnings for vendored code
        
        // Compile each file separately and collect object files
        const objectFiles: string[] = [];
        for (const file of sourceFiles) {
          const sourceFile = path.join(cppcoroDir, file);
          const objFile = path.join(path.dirname(outputPath), file.replace('.cpp', '.o'));
          
          await this.runZigCXX([
            ...flags,
            '-c',
            sourceFile,
            '-o', objFile,
          ]);
          
          objectFiles.push(objFile);
        }
        
        // For linking, we'll return the output path as a marker
        // Don't call saveCacheInfo with a directory - just touch the output file
        await fs.writeFile(outputPath, ''); // Create empty marker file
        
        // Store the list of object files so the linker can find them
        await fs.writeFile(outputPath + '.files', objectFiles.join('\n'));
        
        return outputPath;
      }
      case 'pcre2':
        sourceFile = path.join(vendorDir, 'pcre2/src/pcre2_all.c');
        flags.push('-DPCRE2_CODE_UNIT_WIDTH=8');
        break;
      case 'bearssl': {
        // BearSSL has many .c files - compile them all
        diagnostics.push('Compiling BearSSL (~277 files, may take 20-30 seconds)...');
        
        const bearSSLDir = path.join(vendorDir, 'bearssl');
        const srcDirs = [
          'src/ssl',
          'src/x509',
          'src/hash',
          'src/kdf',
          'src/mac',
          'src/codec',
          'src/ec',
          'src/rsa',
          'src/rand',
          'src/symcipher',
          'src/int',
        ];
        
        flags.push(`-I${path.join(bearSSLDir, 'inc')}`);
        flags.push('-Wno-everything'); // Suppress warnings for vendored code
        
        const objectFiles: string[] = [];
        for (const dir of srcDirs) {
          const dirPath = path.join(bearSSLDir, dir);
          try {
            const files = await fs.readdir(dirPath);
            for (const file of files) {
              if (file.endsWith('.c')) {
                const sourceFile = path.join(dirPath, file);
                const objFile = path.join(
                  path.dirname(outputPath),
                  `bearssl_${dir.replace(/\//g, '_')}_${file.replace('.c', '.o')}`
                );
                
                await this.runZigCC([
                  ...flags,
                  '-c',
                  sourceFile,
                  '-o', objFile,
                ]);
                
                objectFiles.push(objFile);
              }
            }
          } catch (err) {
            // Directory might not exist, skip it
            diagnostics.push(`  Skipping ${dir} (not found)`);
          }
        }
        
        // Create marker file and store object file list
        await fs.writeFile(outputPath, ''); // Create empty marker file
        await fs.writeFile(outputPath + '.files', objectFiles.join('\n'));
        
        diagnostics.push(`  Compiled ${objectFiles.length} BearSSL object files`);
        return outputPath;
      }
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
    hasHTTPS: boolean,
    useBearSSL: boolean,
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
      
      // Conditionally enable features
      if (options.enableFileSystem) {
        flags.push('-DGS_ENABLE_FILESYSTEM');  // Enable FileSystem API
      }
      if (options.enableHTTP) {
        flags.push('-DGS_ENABLE_HTTP');  // Enable HTTP API (cpp-httplib, header-only)
        if (hasHTTPS) {
          flags.push('-DGS_ENABLE_HTTPS');  // Enable HTTPS support
          if (useBearSSL) {
            flags.push('-DGS_USE_BEARSSL');  // Use BearSSL instead of OpenSSL
          }
        }
      }

      if (options.debug) {
        flags.push('-g');
      }

      // Add include paths
      flags.push('-I', this.buildDir); // For generated headers
      if (options.mode === 'gc') {
        flags.push('-I', path.join(this.vendorDir, 'mps/src'));
      }
      flags.push('-I', path.join(this.vendorDir, 'cpp-httplib')); // For httplib.h
      if (useBearSSL) {
        flags.push('-I', path.join(this.vendorDir, 'bearssl/inc')); // For BearSSL headers
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
    hasHTTPS: boolean,
    useBearSSL: boolean,
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
    
    // Always link cppcoro when using async/await
    // Read the list of cppcoro object files
    const cppcoroFilesPath = path.join(this.cacheDir, 'vendor', 'cppcoro.o.files');
    try {
      const cppcoroFiles = (await fs.readFile(cppcoroFilesPath, 'utf-8')).trim().split('\n');
      objectFiles.push(...cppcoroFiles);
    } catch {
      // Fallback if .files doesn't exist
      objectFiles.push(path.join(this.cacheDir, 'vendor', 'cppcoro.o'));
    }

    // Link BearSSL if using it
    if (useBearSSL) {
      const bearSSLFilesPath = path.join(this.cacheDir, 'vendor', 'bearssl.o.files');
      try {
        const bearSSLFiles = (await fs.readFile(bearSSLFilesPath, 'utf-8')).trim().split('\n');
        objectFiles.push(...bearSSLFiles);
        diagnostics.push(`  Linking ${bearSSLFiles.length} BearSSL object files`);
      } catch {
        // Fallback if .files doesn't exist
        objectFiles.push(path.join(this.cacheDir, 'vendor', 'bearssl.o'));
      }
    }

    // Target specification
    if (options.target) {
      flags.push('-target', options.target);
    }

    // Link OpenSSL libraries if HTTPS is enabled and not using BearSSL
    if (hasHTTPS && options.enableHTTP && !useBearSSL) {
      flags.push('-lssl', '-lcrypto');
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
   * Detect if OpenSSL is available on the system
   */
  private async detectOpenSSL(_diagnostics: string[]): Promise<boolean> {
    const cacheFile = path.join(this.cacheDir, 'openssl-detect.json');
    
    // Check cache first
    try {
      const cached = JSON.parse(await fs.readFile(cacheFile, 'utf-8'));
      if (cached.detected !== undefined) {
        return cached.detected;
      }
    } catch {
      // Cache miss, proceed with detection
    }

    try {
      const testFile = path.join(this.cacheDir, 'ssl-test.cpp');
      const testCode = `
#include <openssl/ssl.h>
#include <openssl/err.h>
int main() {
  SSL_library_init();
  return 0;
}
`;
      await fs.writeFile(testFile, testCode, 'utf-8');

      // Try to compile and link with OpenSSL
      await this.runZigCXX([
        '-std=c++20',
        testFile,
        '-lssl',
        '-lcrypto',
        '-o', path.join(this.cacheDir, 'ssl-test'),
      ]);

      // Success - OpenSSL found
      await fs.writeFile(cacheFile, JSON.stringify({ detected: true }), 'utf-8');
      return true;
    } catch (error) {
      // Failed - OpenSSL not found
      await fs.writeFile(cacheFile, JSON.stringify({ detected: false }), 'utf-8');
      return false;
    }
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
