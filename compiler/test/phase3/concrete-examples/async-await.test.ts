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

const EXAMPLE_NAME = "async-await";

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
      // Should include cppcoro header
      expect(result.cppCode).toContain('#include <cppcoro/task.hpp>');
    });

    it("should compile to GC C++ without errors", () => {
      const result = compileExample(EXAMPLE_NAME, tmpDir);
      expect(result.gcCppCode).toBeTruthy();
      expect(result.gcCppCode.length).toBeGreaterThan(0);
      // Should include cppcoro header
      expect(result.gcCppCode).toContain('#include <cppcoro/task.hpp>');
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
      expect(execution.jsOutput).toContain("=== Async/Await Example ===");
      expect(execution.jsOutput).toContain("fetchNumber: 42");
      expect(execution.jsOutput).toContain("doubleValue: 84");
      expect(execution.jsOutput).toContain("sumValues: 84");
      expect(execution.jsOutput).toContain("calc.add(5, 7): 12");
      expect(execution.jsOutput).toContain("calc.multiply(3, 4): 12");
      expect(execution.jsOutput).toContain("calc.compute(): 60");
      expect(execution.jsOutput).toContain("=== All tests passed ===");
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
      // NOTE: This test requires cppcoro to be installed
      // Install: https://github.com/lewissbaker/cppcoro
      // The async/await codegen is complete and generates correct C++ code,
      // but execution requires the cppcoro library which is not installed by default.
      if (!nativeResult.cppCompileSuccess) {
        console.error("\n=== C++ Compilation Failed ===");
        console.error("Stderr:", nativeResult.cppCompileStderr);
        console.error("Stdout:", nativeResult.cppCompileStdout);
        console.error("\nTo run this test, install cppcoro: https://github.com/lewissbaker/cppcoro");
      }
      expect(nativeResult.cppCompileSuccess).toBe(true);
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
      const jsLines = nativeResult.jsOutput.trim().split('\n');
      const cppLines = nativeResult.cppOutput.trim().split('\n');
      expect(cppLines).toEqual(jsLines);
    });
  });

  describe("GC Mode Compilation and Execution", () => {
    let compilation: CompilationResult;
    let execution: ExecutionResult;
    let nativeResult: NativeResult;

    beforeEach(() => {
      compilation = compileExample(EXAMPLE_NAME, tmpDir);
      execution = executeExample(compilation);
      nativeResult = compileAndExecuteNative(execution);
    });

    it("should execute GC C++ successfully", () => {
      expect(execution.gcSuccess).toBe(true);
      if (!execution.gcSuccess) {
        console.error("GC C++ Error:", execution.gcError);
        console.error("GC C++ Stderr:", execution.gcStderr);
      }
    });

    it("should produce matching JavaScript and GC C++ output", () => {
      expect(execution.gcSuccess).toBe(true);
      expect(nativeResult.gcOutputMatches).toBe(true);
      if (!nativeResult.gcOutputMatches) {
        console.error("JS Output:", nativeResult.jsOutput);
        console.error("GC Output:", nativeResult.gcOutput);
      }
    });

    it("should produce identical outputs across all three modes", () => {
      expect(execution.jsSuccess).toBe(true);
      expect(nativeResult.cppCompileSuccess).toBe(true);
      expect(nativeResult.cppSuccess).toBe(true);
      expect(execution.gcSuccess).toBe(true);
      expect(nativeResult.allOutputsMatch).toBe(true);
      
      if (!nativeResult.allOutputsMatch) {
        console.error("JS Output:", nativeResult.jsOutput);
        console.error("C++ Output:", nativeResult.cppOutput);
        console.error("GC Output:", nativeResult.gcOutput);
      }
    });
  });
});
