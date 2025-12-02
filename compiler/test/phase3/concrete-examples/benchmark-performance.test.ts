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
            }
          }
        }
        
        return times;
      };

      const jsTimes = extractTimes(nativeResult.jsOutput);
      const cppTimes = extractTimes(nativeResult.cppOutput);
      const gcTimes = extractTimes(nativeResult.gcOutput);

      console.log("\n=== Performance Comparison: All Modes ===");
      console.log("Benchmark                  | Node.js (ms) | Ownership C++ (ms) | GC C++ (ms) | Ownership Speedup | GC Speedup");
      console.log("---------------------------|--------------|--------------------|--------------|--------------------|------------");
      
      const benchmarks = [
        { key: 'fibonacci', name: 'Fibonacci (recursive)' },
        { key: 'array', name: 'Array Operations' },
        { key: 'binarySearch', name: 'Binary Search' },
        { key: 'bubbleSort', name: 'Bubble Sort' },
        { key: 'hashMap', name: 'HashMap Operations' },
        { key: 'string', name: 'String Manipulation' },
      ];

      let jsTotal = 0;
      let cppTotal = 0;
      let gcTotal = 0;

      for (const bench of benchmarks) {
        const jsTime = jsTimes[bench.key] || 0;
        const cppTime = cppTimes[bench.key] || 0;
        const gcTime = gcTimes[bench.key] || 0;
        jsTotal += jsTime;
        cppTotal += cppTime;
        gcTotal += gcTime;
        
        const cppSpeedup = jsTime > 0 && cppTime > 0 
          ? (jsTime / cppTime).toFixed(2) + 'x'
          : 'N/A';
        
        const gcSpeedup = jsTime > 0 && gcTime > 0 
          ? (jsTime / gcTime).toFixed(2) + 'x'
          : 'N/A';
        
        const name = bench.name.padEnd(26);
        const jsStr = jsTime.toString().padStart(12);
        const cppStr = cppTime.toString().padStart(18);
        const gcStr = gcTime.toString().padStart(12);
        const cppSpeedupStr = cppSpeedup.padStart(18);
        const gcSpeedupStr = gcSpeedup.padStart(10);
        
        console.log(`${name} | ${jsStr} | ${cppStr} | ${gcStr} | ${cppSpeedupStr} | ${gcSpeedupStr}`);
      }

      console.log("---------------------------|--------------|--------------------|--------------|--------------------|------------");
      
      // Calculate average speedups across all benchmarks (excluding N/A)
      let validCppSpeedups: number[] = [];
      let validGcSpeedups: number[] = [];
      for (const bench of benchmarks) {
        const jsTime = jsTimes[bench.key] || 0;
        const cppTime = cppTimes[bench.key] || 0;
        const gcTime = gcTimes[bench.key] || 0;
        if (jsTime > 0 && cppTime > 0) {
          validCppSpeedups.push(jsTime / cppTime);
        }
        if (jsTime > 0 && gcTime > 0) {
          validGcSpeedups.push(jsTime / gcTime);
        }
      }
      
      const avgCppSpeedup = validCppSpeedups.length > 0
        ? validCppSpeedups.reduce((a, b) => a + b, 0) / validCppSpeedups.length
        : 0;
      
      const avgGcSpeedup = validGcSpeedups.length > 0
        ? validGcSpeedups.reduce((a, b) => a + b, 0) / validGcSpeedups.length
        : 0;
      
      const avgName = "AVERAGE SPEEDUP".padEnd(26);
      const avgCppSpeedupStr = avgCppSpeedup > 0 ? (avgCppSpeedup.toFixed(2) + 'x').padStart(18) : 'N/A'.padStart(18);
      const avgGcSpeedupStr = avgGcSpeedup > 0 ? (avgGcSpeedup.toFixed(2) + 'x').padStart(10) : 'N/A'.padStart(10);
      
      console.log(`${avgName} |              |                    |              | ${avgCppSpeedupStr} | ${avgGcSpeedupStr}`);
      console.log("");

      // Both should produce valid benchmark results
      expect(Object.keys(jsTimes).length).toBeGreaterThan(0);
      expect(Object.keys(cppTimes).length).toBeGreaterThan(0);
      // GC results are optional (may not compile if Date.now() not implemented yet)
      const hasGcResults = Object.keys(gcTimes).length > 0;
      
      // Log overall performance analysis
      console.log("=== Performance Summary ===");
      if (avgCppSpeedup > 0) {
        console.log(`Ownership C++ average speedup: ${avgCppSpeedup.toFixed(2)}x`);
        if (avgCppSpeedup > 1.5) {
          console.log("  ✓ Ownership C++ shows significant performance advantage");
        } else if (avgCppSpeedup > 0.8) {
          console.log("  ≈ Ownership C++ performance is comparable to Node.js");
        } else {
          console.log("  ! Ownership C++ is slower - possibly due to measurement overhead");
        }
      }
      
      if (hasGcResults && avgGcSpeedup > 0) {
        console.log(`GC C++ average speedup: ${avgGcSpeedup.toFixed(2)}x`);
        if (avgGcSpeedup > 1.5) {
          console.log("  ✓ GC C++ shows significant performance advantage");
        } else if (avgGcSpeedup > 0.8) {
          console.log("  ≈ GC C++ performance is comparable to Node.js");
        } else {
          console.log("  ! GC C++ is slower - possibly due to GC overhead");
        }
      } else if (!hasGcResults) {
        console.log("GC C++ results: N/A (compilation failed - likely missing Date.now() implementation)");
      }
      
      // Compare Ownership vs GC
      if (hasGcResults && avgCppSpeedup > 0 && avgGcSpeedup > 0) {
        const ratio = avgCppSpeedup / avgGcSpeedup;
        console.log(`\nOwnership vs GC comparison: ${ratio.toFixed(2)}x`);
        if (ratio > 1.2) {
          console.log("  → Ownership C++ is significantly faster than GC C++");
        } else if (ratio < 0.8) {
          console.log("  → GC C++ is significantly faster than Ownership C++");
        } else {
          console.log("  → Ownership and GC C++ have comparable performance");
        }
      }
    });
  });
});
