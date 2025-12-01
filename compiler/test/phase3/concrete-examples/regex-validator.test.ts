/**
 * Tests for regex-validator concrete example
 */

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

const EXAMPLE_NAME = "regex-validator";

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
      expect(result.cppCode).toContain("gs::RegExp");
      expect(result.cppCode).toContain('R"('); // Raw string literals for regex
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
      expect(execution.jsOutput).toContain("=== Email Validation ===");
      expect(execution.jsOutput).toContain("=== Password Strength ===");
      expect(execution.jsOutput).toContain("=== Hashtags ===");
    });

    it("should have correct email validation output", () => {
      expect(execution.jsSuccess).toBe(true);
      const lines = execution.jsOutput.trim().split("\n");
      
      // Email validation
      expect(lines[1]).toBe("true"); // user@example.com
      expect(lines[2]).toBe("false"); // invalid.email
      expect(lines[3]).toBe("company.org");
    });

    it("should have correct regex pattern matching", () => {
      expect(execution.jsSuccess).toBe(true);
      const output = execution.jsOutput;
      
      // Phone extraction works
      expect(output).toContain("555-123-4567");
      expect(output).toContain("555.987.6543");
      
      // Password strength works
      expect(output).toContain("weak");
      expect(output).toContain("medium");
      expect(output).toContain("strong");
      
      // Credit card masking works
      expect(output).toContain("****-****-****-****");
      
      // Hashtag extraction works
      expect(output).toContain("#coding");
      expect(output).toContain("#typescript");
      expect(output).toContain("#regex");
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
      if (!nativeResult.cppCompileSuccess) {
        console.error("C++ Compile Stderr:", nativeResult.cppCompileStderr);
        console.error("C++ Compile Stdout:", nativeResult.cppCompileStdout);
      }
      expect(nativeResult.cppCompileSuccess).toBe(true);
    });

    it("should execute C++ successfully", () => {
      if (!nativeResult.cppSuccess) {
        console.error("C++ Error:", nativeResult.cppError);
        console.error("C++ Stderr:", nativeResult.cppStderr);
        console.error("C++ Output:", nativeResult.cppOutput);
      }
      expect(nativeResult.cppSuccess).toBe(true);
    });

    it("should produce matching JavaScript and C++ output", () => {
      expect(nativeResult.jsSuccess).toBe(true);
      expect(nativeResult.cppSuccess).toBe(true);
      expect(nativeResult.outputMatches).toBe(true);
      
      if (!nativeResult.outputMatches) {
        console.log("JS Output:\n", nativeResult.jsOutput);
        console.log("C++ Output:\n", nativeResult.cppOutput);
      }
    });
  });
});
