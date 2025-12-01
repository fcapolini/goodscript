import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  compileExample,
  executeExample,
  compileAndExecuteNative,
  createTmpDir,
  cleanupTmpDir,
  compareOutputs,
  type CompilationResult,
  type ExecutionResult,
  type NativeResult,
} from "../concrete-examples-helpers.js";

const EXAMPLE_NAME = "error-handling";

describe(`Concrete Example: ${EXAMPLE_NAME}`, () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTmpDir();
  });

  afterEach(() => {
    cleanupTmpDir(tmpDir);
  });

  describe("Compilation", () => {
    it("should compile to JavaScript without errors", () => {
      const result = compileExample(EXAMPLE_NAME, tmpDir);
      expect(result.jsCode).toBeTruthy();
      expect(result.jsCode.length).toBeGreaterThan(0);
    });

    it("should compile to C++ without errors", () => {
      const result = compileExample(EXAMPLE_NAME, tmpDir);
      expect(result.cppCode).toBeTruthy();
      expect(result.cppCode.length).toBeGreaterThan(0);
    });
  });

  describe("JavaScript Execution", () => {
    let compilation: CompilationResult;
    let execution: ExecutionResult;

    beforeEach(() => {
      compilation = compileExample(EXAMPLE_NAME, tmpDir);
      execution = executeExample(compilation);
    });

    it("should execute JavaScript successfully", () => {
      expect(execution.jsSuccess).toBe(true);
      if (!execution.jsSuccess) {
        console.error("JS Error:", execution.jsError);
        console.error("JS Stderr:", execution.jsStderr);
      }
    });

    it("should produce expected JavaScript output", () => {
      expect(execution.jsSuccess).toBe(true);
      expect(execution.jsOutput).toBeTruthy();
    });
  });

  describe("C++ Compilation and Execution", () => {
    let compilation: CompilationResult;
    let execution: ExecutionResult;
    let nativeResult: NativeResult;

    beforeEach(() => {
      compilation = compileExample(EXAMPLE_NAME, tmpDir);
      execution = executeExample(compilation);
      nativeResult = compileAndExecuteNative(execution);
    });

    it("should compile C++ successfully", () => {
      expect(nativeResult.cppCompileSuccess).toBe(true);
      if (!nativeResult.cppCompileSuccess) {
        console.error("C++ Compile Stderr:", nativeResult.cppCompileStderr);
      }
    });

    it("should execute C++ successfully", () => {
      expect(nativeResult.cppCompileSuccess).toBe(true);
      expect(nativeResult.cppSuccess).toBe(true);
      if (!nativeResult.cppSuccess) {
        console.error("C++ Error:", nativeResult.cppError);
        console.error("C++ Stderr:", nativeResult.cppStderr);
      }
    });

    it("should produce matching JavaScript and C++ output", () => {
      expect(nativeResult.cppCompileSuccess).toBe(true);
      expect(nativeResult.cppSuccess).toBe(true);
      expect(nativeResult.outputMatches).toBe(true);
      if (!nativeResult.outputMatches) {
        console.error("JS Output:", nativeResult.jsOutput);
        console.error("C++ Output:", nativeResult.cppOutput);
      }
    });

    it("should produce identical JavaScript and C++ output", () => {
      expect(nativeResult.cppCompileSuccess).toBe(true);
      expect(nativeResult.cppSuccess).toBe(true);
      expect(nativeResult.jsOutput).toBe(nativeResult.cppOutput);
    });
  });

  describe("GC Mode Compilation and Execution", () => {
    let compilation: CompilationResult;
    let execution: ExecutionResult;

    beforeEach(() => {
      compilation = compileExample(EXAMPLE_NAME, tmpDir);
      execution = executeExample(compilation);
    });

    it("should compile GC C++ successfully", () => {
      expect(compilation.gcCppCode).toBeTruthy();
      expect(compilation.gcCppCode.length).toBeGreaterThan(0);
    });

    it("should execute GC C++ successfully", () => {
      expect(execution.gcSuccess).toBe(true);
      if (!execution.gcSuccess) {
        console.error("GC Error:", execution.gcError);
        console.error("GC Stderr:", execution.gcStderr);
      }
    });

    it("should produce matching JavaScript and GC C++ output", () => {
      expect(execution.jsSuccess).toBe(true);
      expect(execution.gcSuccess).toBe(true);
      
      const gcMatches = compareOutputs(
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
        },
      );

      expect(gcMatches).toBe(true);
      if (!gcMatches) {
        console.error("JS Output:", execution.jsOutput);
        console.error("GC Output:", execution.gcOutput);
      }
    });

    it("should produce identical JavaScript and GC C++ output", () => {
      expect(execution.jsSuccess).toBe(true);
      expect(execution.gcSuccess).toBe(true);
      expect(execution.jsOutput).toBe(execution.gcOutput);
    });
  });

  describe("All Modes Equivalence", () => {
    let compilation: CompilationResult;
    let execution: ExecutionResult;
    let nativeResult: NativeResult;

    beforeEach(() => {
      compilation = compileExample(EXAMPLE_NAME, tmpDir);
      execution = executeExample(compilation);
      nativeResult = compileAndExecuteNative(execution);
    });

    it("should have all three modes produce identical output", () => {
      expect(nativeResult.cppCompileSuccess).toBe(true);
      expect(nativeResult.cppSuccess).toBe(true);
      expect(nativeResult.gcSuccess).toBe(true);
      expect(nativeResult.allOutputsMatch).toBe(true);
      
      if (!nativeResult.allOutputsMatch) {
        console.error("JS Output:", nativeResult.jsOutput);
        console.error("Ownership C++ Output:", nativeResult.cppOutput);
        console.error("GC C++ Output:", nativeResult.gcOutput);
      }
    });
  });
});
