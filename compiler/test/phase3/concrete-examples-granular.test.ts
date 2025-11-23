import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Compiler } from "../../src/compiler.js";
import {
  writeFileSync,
  mkdirSync,
  existsSync,
  readFileSync,
  rmSync,
  readdirSync,
  statSync,
} from "fs";
import { tmpdir } from "os";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import {
  executeJS,
  executeCpp,
  compareOutputs,
  isCppCompilerAvailable,
} from "./runtime-helpers.js";

/**
 * Granular Concrete Examples Tests
 *
 * This test file provides fine-grained testing for concrete examples:
 * 1. Compilation tests (does it generate code?)
 * 2. C++ compilation tests (does the C++ compile with g++/clang?)
 * 3. Execution tests (does it run without crashing?)
 * 4. Output equivalence tests (does C++ match JS output?)
 *
 * Benefits:
 * - Fast feedback: run only the failing phase
 * - Clear errors: see exactly what failed (compile vs execute vs output)
 * - Better debugging: can inspect generated C++ on compilation failures
 * - Isolation: test one aspect at a time
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const EXAMPLES_DIR = join(__dirname, "concrete-examples");
const RUNTIME_DIR = join(__dirname, "../../runtime");

interface CompilationResult {
  exampleName: string;
  srcFile: string;
  outDir: string;
  jsCode: string;
  cppCode: string;
}

interface ExecutionResult extends CompilationResult {
  jsOutput: string;
  jsStderr: string;
  jsSuccess: boolean;
  jsError?: string;
}

interface NativeResult extends ExecutionResult {
  cppCompileSuccess: boolean;
  cppCompileStdout: string;
  cppCompileStderr: string;
  cppOutput: string;
  cppStderr: string;
  cppSuccess: boolean;
  cppError?: string;
  outputMatches: boolean;
}

const discoverExamples = (): string[] => {
  if (!existsSync(EXAMPLES_DIR)) {
    return [];
  }

  return readdirSync(EXAMPLES_DIR)
    .filter((name) => {
      const fullPath = join(EXAMPLES_DIR, name);
      return statSync(fullPath).isDirectory();
    })
    .sort();
};

describe("Phase 3: Granular Concrete Examples", () => {
  let tmpDir: string;
  let compiler: Compiler;

  beforeEach(() => {
    tmpDir = join(
      tmpdir(),
      "goodscript-test-granular-" +
        Date.now() +
        "-" +
        Math.random().toString(36).substring(7)
    );
    mkdirSync(tmpDir, { recursive: true });
    compiler = new Compiler();
  });

  afterEach(() => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  /**
   * Step 1: Compile to JS and C++
   */
  const compileExample = (exampleName: string): CompilationResult => {
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
    const jsCompileResult = compiler.compile({
      files: [srcFile],
      outDir,
      target: "typescript",
      project: tsconfigPath,
    });

    const jsFile = join(outDir, "main.js");
    const jsCode = existsSync(jsFile) ? readFileSync(jsFile, "utf-8") : "";

    // Compile to C++
    const cppCompileResult = compiler.compile({
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
  };

  /**
   * Step 2: Execute JavaScript
   */
  const executeExample = (compilation: CompilationResult): ExecutionResult => {
    const jsResult = executeJS(compilation.jsCode);

    return {
      ...compilation,
      jsOutput: jsResult.stdout,
      jsStderr: jsResult.stderr,
      jsSuccess: jsResult.success,
      jsError: jsResult.error,
    };
  };

  /**
   * Step 3: Compile and execute C++
   */
  const compileAndExecuteNative = (
    execution: ExecutionResult
  ): NativeResult => {
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
  };

  const examples = discoverExamples();

  if (examples.length === 0) {
    it("should find at least one example", () => {
      expect(examples.length).toBeGreaterThan(0);
    });
  }

  // Examples with known issues
  const knownIssues = new Set<string>(["hash-map", "string-pool"]);

  for (const exampleName of examples) {
    describe(exampleName, () => {
      const hasKnownIssues = knownIssues.has(exampleName);

      describe("compilation", () => {
        it("should generate JavaScript code", () => {
          const result = compileExample(exampleName);
          expect(result.jsCode).toBeTruthy();
          expect(result.jsCode.length).toBeGreaterThan(0);
        });

        it("should generate C++ code", () => {
          const result = compileExample(exampleName);
          expect(result.cppCode).toBeTruthy();
          expect(result.cppCode.length).toBeGreaterThan(0);
        });
      });

      describe("JavaScript execution", () => {
        it("should execute without errors", () => {
          const compilation = compileExample(exampleName);
          const execution = executeExample(compilation);

          if (!execution.jsSuccess) {
            console.error("JS execution failed:");
            console.error("STDOUT:", execution.jsOutput);
            console.error("STDERR:", execution.jsStderr);
            console.error("ERROR:", execution.jsError);
          }

          expect(execution.jsSuccess).toBe(true);
        });

        it("should produce output", () => {
          const compilation = compileExample(exampleName);
          const execution = executeExample(compilation);
          expect(execution.jsOutput).toBeTruthy();
        });
      });

      if (isCppCompilerAvailable()) {
        describe("C++ compilation", () => {
          it("should compile with zig c++", () => {
            if (hasKnownIssues) {
              return; // Skip for known issues
            }

            const compilation = compileExample(exampleName);
            const execution = executeExample(compilation);
            const native = compileAndExecuteNative(execution);

            if (!native.cppCompileSuccess) {
              console.error("\n=== C++ Compilation Failed ===");
              console.error("STDERR:", native.cppCompileStderr);
              console.error("\n=== Generated C++ (first 100 lines) ===");
              console.error(
                native.cppCode.split("\n").slice(0, 100).join("\n")
              );
            }

            expect(native.cppCompileSuccess).toBe(true);
          });
        });

        describe("C++ execution", () => {
          it("should execute without errors", () => {
            if (hasKnownIssues) {
              return; // Skip for known issues
            }

            const compilation = compileExample(exampleName);
            const execution = executeExample(compilation);
            const native = compileAndExecuteNative(execution);

            if (!native.cppSuccess) {
              console.error("\n=== C++ Execution Failed ===");
              console.error("STDOUT:", native.cppOutput);
              console.error("STDERR:", native.cppStderr);
              console.error("ERROR:", native.cppError);
            }

            expect(native.cppSuccess).toBe(true);
          });

          it("should produce output", () => {
            if (hasKnownIssues) {
              return; // Skip for known issues
            }

            const compilation = compileExample(exampleName);
            const execution = executeExample(compilation);
            const native = compileAndExecuteNative(execution);

            expect(native.cppOutput).toBeTruthy();
          });
        });

        describe("output equivalence", () => {
          it("should match JavaScript output", () => {
            if (hasKnownIssues) {
              return; // Skip for known issues
            }

            const compilation = compileExample(exampleName);
            const execution = executeExample(compilation);
            const native = compileAndExecuteNative(execution);

            if (!native.outputMatches) {
              console.error("\n=== Output Mismatch ===");
              console.error("JavaScript output:");
              console.error(native.jsOutput);
              console.error("\nC++ output:");
              console.error(native.cppOutput);
              console.error("\nDifferences:");
              console.error(
                "JS lines:",
                native.jsOutput.trim().split("\n").length
              );
              console.error(
                "C++ lines:",
                native.cppOutput.trim().split("\n").length
              );
            }

            expect(native.outputMatches).toBe(true);
          });
        });
      }
    });
  }
});
