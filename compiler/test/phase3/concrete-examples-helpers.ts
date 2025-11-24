/**
 * Shared helpers for concrete examples tests
 */

import { Compiler } from "../../src/compiler.js";
import {
  writeFileSync,
  mkdirSync,
  existsSync,
  readFileSync,
  rmSync,
} from "fs";
import { tmpdir } from "os";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import {
  executeJS,
  executeCpp,
  compareOutputs,
} from "./runtime-helpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export const EXAMPLES_DIR = join(__dirname, "concrete-examples");
export const RUNTIME_DIR = join(__dirname, "../../runtime");

export interface CompilationResult {
  exampleName: string;
  srcFile: string;
  outDir: string;
  jsCode: string;
  cppCode: string;
}

export interface ExecutionResult extends CompilationResult {
  jsOutput: string;
  jsStderr: string;
  jsSuccess: boolean;
  jsError?: string;
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
  const srcFile = join(exampleDir, "src", "main.gs.ts");
  const outDir = join(exampleDir, "dist");

  if (!existsSync(srcFile)) {
    throw new Error(`Example ${exampleName} missing src/main.gs.ts`);
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
  compiler.compile({
    files: [srcFile],
    outDir,
    target: "typescript",
    project: tsconfigPath,
  });

  const jsFile = join(outDir, "main.js");
  const jsCode = existsSync(jsFile) ? readFileSync(jsFile, "utf-8") : "";

  // Compile to C++
  compiler.compile({
    files: [srcFile],
    outDir,
    target: "native",
    project: tsconfigPath,
  });

  const cppFile = join(outDir, "main.cpp");
  const cppCode = existsSync(cppFile) ? readFileSync(cppFile, "utf-8") : "";

  return {
    exampleName,
    srcFile,
    outDir,
    jsCode,
    cppCode,
  };
}

/**
 * Execute JavaScript
 */
export function executeExample(
  compilation: CompilationResult
): ExecutionResult {
  const jsResult = executeJS(compilation.jsCode);

  return {
    ...compilation,
    jsOutput: jsResult.stdout,
    jsStderr: jsResult.stderr,
    jsSuccess: jsResult.success,
    jsError: jsResult.error,
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

  // Compile C++ to binary (with O2 optimization)
  try {
    const output = execSync(
      `zig c++ -std=c++20 -O2 -I${RUNTIME_DIR} ${cppFile} -o ${binFile} 2>&1`,
      { encoding: "utf-8", timeout: 30000 }
    );
    cppCompileSuccess = true;
    cppCompileStdout = output;
  } catch (error: any) {
    cppCompileStderr = error.stdout || error.stderr || error.message;
  }

  // Execute C++ binary
  let cppOutput = "";
  let cppStderr = "";
  let cppSuccess = false;
  let cppError: string | undefined = undefined;

  if (cppCompileSuccess) {
    const cppResult = executeCpp(execution.cppCode, binFile);
    cppOutput = cppResult.stdout;
    cppStderr = cppResult.stderr;
    cppSuccess = cppResult.success;
    cppError = cppResult.error;
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
  };
}
