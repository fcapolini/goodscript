/**
 * Shared helpers for concrete examples tests
 */

import { Compiler } from "../../src/compiler.js";
import {
  writeFileSync,
  mkdirSync,
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "fs";
import { tmpdir } from "os";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import {
  executeJS,
  executeCpp,
  executeGcCpp,
  compareOutputs,
} from "./runtime-helpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export const EXAMPLES_DIR = join(__dirname, "concrete-examples");
export const RUNTIME_DIR = join(__dirname, "../../runtime");

// Re-export helpers from runtime-helpers
export { compareOutputs } from "./runtime-helpers.js";

export interface CompilationResult {
  exampleName: string;
  srcFile: string;
  outDir: string;
  jsCode: string;
  cppCode: string;
  gcCppCode: string;
}

export interface ExecutionResult extends CompilationResult {
  jsOutput: string;
  jsStderr: string;
  jsSuccess: boolean;
  jsError?: string;
  gcOutput: string;
  gcStderr: string;
  gcSuccess: boolean;
  gcError?: string;
}

export interface NativeResult extends ExecutionResult {
  cppCompileSuccess: boolean;
  cppCompileStdout: string;
  cppCompileStderr: string;
  cppOutput: string;
  cppStderr: string;
  cppSuccess: boolean;
  cppError?: string;
  outputMatches: boolean;
  gcOutputMatches: boolean;
  allOutputsMatch: boolean;
}

export function createTmpDir(): string {
  const tmpDir = join(
    tmpdir(),
    "goodscript-test-" +
      Date.now() +
      "-" +
      Math.random().toString(36).substring(7)
  );
  mkdirSync(tmpDir, { recursive: true });
  return tmpDir;
}

export function cleanupTmpDir(tmpDir: string): void {
  if (existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

/**
 * Compile an example to JS and C++
 */
export function compileExample(
  exampleName: string,
  tmpDir: string
): CompilationResult {
  const compiler = new Compiler();
  const exampleDir = join(EXAMPLES_DIR, exampleName);
  const srcFile = join(exampleDir, "src", "main-gs.ts");
  const outDir = join(exampleDir, "dist");

  if (!existsSync(srcFile)) {
    throw new Error(`Example ${exampleName} missing src/main-gs.ts`);
  }

  mkdirSync(outDir, { recursive: true });

  const exampleTsconfigPath = join(exampleDir, "tsconfig.json");
  const tsconfigPath = existsSync(exampleTsconfigPath)
    ? exampleTsconfigPath
    : join(tmpDir, exampleName, "tsconfig.json");

  if (!existsSync(exampleTsconfigPath)) {
    mkdirSync(join(tmpDir, exampleName), { recursive: true });
    writeFileSync(
      tsconfigPath,
      JSON.stringify(
        {
          compilerOptions: {
            target: "ES2020",
            module: "commonjs",
            lib: ["ES2020"],
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            forceConsistentCasingInFileNames: true,
            outDir: "./dist",
          },
          goodscript: {
            level: "native",
          },
          include: [join(exampleDir, "src/**/*")],
        },
        null,
        2
      ),
      "utf-8"
    );
  }

  // Compile to JavaScript
  const jsResult = compiler.compile({
    files: [srcFile],
    outDir,
    target: "typescript",
    project: tsconfigPath,
  });

  const jsFile = join(outDir, "main.js");
  let jsCode = existsSync(jsFile) ? readFileSync(jsFile, "utf-8") : "";
  
  // Debug compilation result
  console.error(`\n[${exampleName}] JS: success=${jsResult.success}, diagnostics=${jsResult.diagnostics.length}, fileStats=${JSON.stringify(jsResult.fileStats)}`);
  if (jsResult.diagnostics.length > 0) {
    jsResult.diagnostics.slice(0, 3).forEach(d => {
      console.error(`  - [${d.severity}] [${d.code}] ${d.message.substring(0, 80)}`);
    });
  }

  // Compile to C++ (ownership mode)
  const cppResult = compiler.compile({
    files: [srcFile],
    outDir,
    target: "native",
    mode: "ownership",
    project: tsconfigPath,
  });

  const cppFile = join(outDir, "main.cpp");
  let cppCode = existsSync(cppFile) ? readFileSync(cppFile, "utf-8") : "";
  
  // Debug compilation result
  console.error(`[${exampleName}] C++: success=${cppResult.success}, diagnostics=${cppResult.diagnostics.length}, file exists at main.cpp: ${existsSync(cppFile)}`);
  if (cppResult.diagnostics.length > 0) {
    cppResult.diagnostics.slice(0, 3).forEach(d => {
      console.error(`  - [${d.severity}] [${d.code}] ${d.message.substring(0, 80)}`);
    });
  }
  
  // Check if cpp file was generated in a subdirectory
  if (!cppCode) {
    const altCppFile = join(outDir, "src", "main.cpp");
    if (existsSync(altCppFile)) {
      cppCode = readFileSync(altCppFile, "utf-8");
      console.error(`[${exampleName}] Found C++ at src/main.cpp (${cppCode.length} bytes)`);
    } else {
      // List what's actually in the dist directory
      if (existsSync(outDir)) {
        const files = readdirSync(outDir, { recursive: true, withFileTypes: true });
        const fileList = files.map(f => (f.isDirectory() ? f.name + '/' : f.name)).join(', ');
        console.error(`[${exampleName}] Dist contents: ${fileList || '(empty)'}`);
      }
    }
  }

  // Compile to C++ (GC mode)
  const gcOutDir = join(outDir, "gc");
  mkdirSync(gcOutDir, { recursive: true });
  
  const gcCppResult = compiler.compile({
    files: [srcFile],
    outDir: gcOutDir,
    target: "native",
    mode: "gc",
    project: tsconfigPath,
  });

  const gcCppFile = join(gcOutDir, "main.cpp");
  let gcCppCode = existsSync(gcCppFile) ? readFileSync(gcCppFile, "utf-8") : "";
  
  // Debug compilation result
  console.error(`[${exampleName}] GC C++: success=${gcCppResult.success}, diagnostics=${gcCppResult.diagnostics.length}, file exists: ${existsSync(gcCppFile)}`);
  if (gcCppResult.diagnostics.length > 0) {
    gcCppResult.diagnostics.slice(0, 3).forEach(d => {
      console.error(`  - [${d.severity}] [${d.code}] ${d.message.substring(0, 80)}`);
    });
  }
  
  // Check subdirectory for GC C++
  if (!gcCppCode) {
    const altGcCppFile = join(gcOutDir, "src", "main.cpp");
    if (existsSync(altGcCppFile)) {
      gcCppCode = readFileSync(altGcCppFile, "utf-8");
      console.error(`[${exampleName}] Found GC C++ at gc/src/main.cpp (${gcCppCode.length} bytes)`);
    }
  }

  return {
    exampleName,
    srcFile,
    outDir,
    jsCode,
    cppCode,
    gcCppCode,
  };
}

/**
 * Execute JavaScript and GC C++
 */
export function executeExample(
  compilation: CompilationResult
): ExecutionResult {
  const jsResult = executeJS(compilation.jsCode);

  // Execute GC C++ too
  const gcResult = executeGcCpp(compilation.gcCppCode, compilation.outDir);

  return {
    ...compilation,
    jsOutput: jsResult.stdout,
    jsStderr: jsResult.stderr,
    jsSuccess: jsResult.success,
    jsError: jsResult.error,
    gcOutput: gcResult.stdout,
    gcStderr: gcResult.stderr,
    gcSuccess: gcResult.success,
    gcError: gcResult.error,
  };
}

/**
 * Compile and execute C++
 */
export function compileAndExecuteNative(
  execution: ExecutionResult
): NativeResult {
  const cppFile = join(execution.outDir, "main.cpp");
  const binFile = join(execution.outDir, execution.exampleName);

  let cppCompileSuccess = false;
  let cppCompileStdout = "";
  let cppCompileStderr = "";

  // Check if the code uses RegExp (needs PCRE2)
  const needsRegExp = execution.cppCode.includes('#ifdef GS_ENABLE_REGEXP') ||
                      execution.cppCode.includes('gs::RegExp');
  
  let compileCmd = `zig c++ -std=c++20 -O3 -I${RUNTIME_DIR} ${cppFile} -o ${binFile}`;
  
  // Add PCRE2 support if needed
  if (needsRegExp) {
    try {
      // Try to find PCRE2 via brew (macOS)
      const brewPrefix = execSync('brew --prefix pcre2 2>/dev/null', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore']
      }).trim();
      compileCmd += ` -DGS_ENABLE_REGEXP -I${brewPrefix}/include -L${brewPrefix}/lib -lpcre2-8`;
    } catch {
      try {
        // Try pkg-config
        const pcre2Flags = execSync('pkg-config --cflags --libs libpcre2-8 2>/dev/null', {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore']
        }).trim();
        compileCmd += ` -DGS_ENABLE_REGEXP ${pcre2Flags}`;
      } catch {
        // PCRE2 not available - compilation will fail
        cppCompileStderr = 'PCRE2 library not found. Install with: brew install pcre2';
        return {
          ...execution,
          cppCompileSuccess: false,
          cppCompileStdout: '',
          cppCompileStderr,
          cppOutput: '',
          cppStderr: '',
          cppSuccess: false,
          cppError: 'PCRE2 not available',
          outputMatches: false,
        };
      }
    }
  }

  // Compile C++ to binary (with O2 optimization)
  try {
    const output = execSync(
      `${compileCmd} 2>&1`,
      { encoding: "utf-8", timeout: 30000 }
    );
    cppCompileSuccess = true;
    cppCompileStdout = output;
  } catch (error: any) {
    cppCompileStderr = error.stdout || error.stderr || error.message;
  }

  // Execute C++ binary (already compiled above, just run it)
  let cppOutput = "";
  let cppStderr = "";
  let cppSuccess = false;
  let cppError: string | undefined = undefined;

  if (cppCompileSuccess) {
    try {
      const result = execSync(binFile, {
        encoding: 'utf-8',
        timeout: 5000,
        maxBuffer: 1024 * 1024
      });
      cppOutput = result;
      cppSuccess = true;
    } catch (error: any) {
      cppStderr = error.stderr || error.stdout || error.message;
      cppError = error.message;
    }
  }

  const outputMatches =
    cppCompileSuccess && cppSuccess
      ? compareOutputs(
          {
            stdout: execution.jsOutput,
            stderr: execution.jsStderr,
            success: execution.jsSuccess,
            error: execution.jsError,
            exitCode: 0,
          },
          {
            stdout: cppOutput,
            stderr: cppStderr,
            success: cppSuccess,
            error: cppError,
            exitCode: 0,
          }
        )
      : false;

  // Check if GC output matches JS output
  const gcOutputMatches = execution.gcSuccess
    ? compareOutputs(
        {
          stdout: execution.jsOutput,
          stderr: execution.jsStderr,
          success: execution.jsSuccess,
          error: execution.jsError,
          exitCode: 0,
        },
        {
          stdout: execution.gcOutput,
          stderr: execution.gcStderr,
          success: execution.gcSuccess,
          error: execution.gcError,
          exitCode: 0,
        }
      )
    : false;

  // All three outputs must match
  const allOutputsMatch = outputMatches && gcOutputMatches && execution.gcSuccess;

  return {
    ...execution,
    cppCompileSuccess,
    cppCompileStdout,
    cppCompileStderr,
    cppOutput,
    cppStderr,
    cppSuccess,
    cppError,
    outputMatches,
    gcOutputMatches,
    allOutputsMatch,
  };
}
