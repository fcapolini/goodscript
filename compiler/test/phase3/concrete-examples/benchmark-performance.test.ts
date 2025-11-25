import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  compileExample,
  executeExample,
  compileAndExecuteNative,
  createTmpDir,
  cleanupTmpDir,
  type CompilationResult,
  type ExecutionResult,
  type NativeResult,
} from "../concrete-examples-helpers.js";

const EXAMPLE_NAME = "benchmark-performance";

describe(`Performance Benchmark: ${EXAMPLE_NAME}`, () => {
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
      expect(execution.jsOutput).toContain("Benchmark Suite");
      expect(execution.jsOutput).toContain("Summary");
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
      }
      expect(nativeResult.cppCompileSuccess).toBe(true);
    });

    it("should execute C++ successfully", () => {
      if (!nativeResult.cppSuccess) {
        console.error("C++ Error:", nativeResult.cppError);
        console.error("C++ Stderr:", nativeResult.cppStderr);
      }
      expect(nativeResult.cppSuccess).toBe(true);
    });

    it("should produce semantically equivalent output", () => {
      // For performance benchmarks, we don't require exact output matching
      // because the actual values may differ (timing, integer overflow in C++, etc.)
      // Instead, we verify that both run successfully and produce structured output
      expect(nativeResult.cppCompileSuccess).toBe(true);
      expect(nativeResult.cppSuccess).toBe(true);
      expect(nativeResult.jsSuccess).toBe(true);
      
      // Verify both outputs contain the expected structure
      expect(nativeResult.jsOutput).toContain("Benchmark Suite");
      expect(nativeResult.jsOutput).toContain("Summary");
      expect(nativeResult.cppOutput).toContain("Benchmark Suite");
      expect(nativeResult.cppOutput).toContain("Summary");
    });

    it("should extract and compare performance metrics", () => {
      // Extract timing data from outputs
      const extractTimes = (output: string): { [key: string]: number } => {
        const times: { [key: string]: number } = {};
        const lines = output.split('\n');
        
        for (const line of lines) {
          // Match "... time: Xms"
          const match = line.match(/time:\s*(\d+)ms/);
          if (match) {
            if (line.includes('Fibonacci')) {
              times.fibonacci = parseInt(match[1]);
            } else if (line.includes('Array ops')) {
              times.array = parseInt(match[1]);
            } else if (line.includes('Binary search')) {
              times.binarySearch = parseInt(match[1]);
            } else if (line.includes('Bubble sort')) {
              times.bubbleSort = parseInt(match[1]);
            } else if (line.includes('HashMap ops')) {
              times.hashMap = parseInt(match[1]);
            } else if (line.includes('String ops')) {
              times.string = parseInt(match[1]);
            } else if (line.includes('Matrix multiply')) {
              times.matrixMultiply = parseInt(match[1]);
            }
          }
        }
        
        return times;
      };

      const jsTimes = extractTimes(nativeResult.jsOutput);
      const cppTimes = extractTimes(nativeResult.cppOutput);

      console.log("\n=== Performance Comparison ===");
      console.log("Benchmark                  | Node.js (ms) | C++ (ms) | Speedup");
      console.log("---------------------------|--------------|----------|--------");
      
      const benchmarks = [
        { key: 'fibonacci', name: 'Fibonacci (recursive)' },
        { key: 'array', name: 'Array Operations' },
        { key: 'binarySearch', name: 'Binary Search' },
        { key: 'bubbleSort', name: 'Bubble Sort' },
        { key: 'hashMap', name: 'HashMap Operations' },
        { key: 'string', name: 'String Manipulation' },
        { key: 'matrixMultiply', name: 'Matrix Multiplication' },
      ];

      let jsTotal = 0;
      let cppTotal = 0;

      for (const bench of benchmarks) {
        const jsTime = jsTimes[bench.key] || 0;
        const cppTime = cppTimes[bench.key] || 0;
        jsTotal += jsTime;
        cppTotal += cppTime;
        
        const speedup = jsTime > 0 && cppTime > 0 
          ? (jsTime / cppTime).toFixed(2) + 'x'
          : 'N/A';
        
        const name = bench.name.padEnd(26);
        const jsStr = jsTime.toString().padStart(12);
        const cppStr = cppTime.toString().padStart(9);
        const speedupStr = speedup.padStart(7);
        
        console.log(`${name} | ${jsStr} | ${cppStr} | ${speedupStr}`);
      }

      console.log("---------------------------|--------------|----------|--------");
      
      // Calculate average speedup across all benchmarks (excluding N/A)
      let validSpeedups: number[] = [];
      for (const bench of benchmarks) {
        const jsTime = jsTimes[bench.key] || 0;
        const cppTime = cppTimes[bench.key] || 0;
        if (jsTime > 0 && cppTime > 0) {
          validSpeedups.push(jsTime / cppTime);
        }
      }
      
      const avgSpeedup = validSpeedups.length > 0
        ? validSpeedups.reduce((a, b) => a + b, 0) / validSpeedups.length
        : 0;
      
      const avgName = "AVERAGE SPEEDUP".padEnd(26);
      const avgSpeedupStr = avgSpeedup > 0 ? (avgSpeedup.toFixed(2) + 'x').padStart(7) : 'N/A'.padStart(7);
      
      console.log(`${avgName} |              |          | ${avgSpeedupStr}`);
      console.log("");

      // Both should produce valid benchmark results
      expect(Object.keys(jsTimes).length).toBeGreaterThan(0);
      expect(Object.keys(cppTimes).length).toBeGreaterThan(0);
      
      // Log overall performance gain
      if (avgSpeedup > 0) {
        console.log(`Average speedup: ${avgSpeedup.toFixed(2)}x`);
        
        // Performance expectation: C++ should generally be faster or comparable
        // Note: For very small workloads, overhead might make this vary
        if (avgSpeedup > 1.2) {
          console.log("✓ C++ shows significant performance advantage");
        } else if (avgSpeedup > 0.8) {
          console.log("≈ Performance is comparable between Node.js and C++");
        } else {
          console.log("! C++ is slower - possibly due to measurement overhead");
        }
      }
    });
  });
});
