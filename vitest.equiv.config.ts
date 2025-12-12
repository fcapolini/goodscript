import { defineConfig } from 'vitest/config';
import os from 'os';

const cpuCount = os.cpus().length;

export default defineConfig({
  test: {
    // Run tests in parallel with all available CPU cores
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: cpuCount,
        minThreads: cpuCount,
      },
    },
    
    // Massively increase concurrent test execution to saturate all cores
    // Each test spawns 3 processes (node + gc + ownership), so we need high concurrency
    maxConcurrency: 10, // Balanced: proper isolation with --outDir, but limited by tsx/zig resource usage
    
    // File-level parallelism
    fileParallelism: true,
    
    // Test configuration
    testTimeout: 60000, // 60 seconds per test (C++ compilation can be slow)
    hookTimeout: 10000, // 10 seconds for setup/teardown
    
    // Include only equivalence tests
    include: ['equivalence/**/*.vitest.ts'],
    
    // Reporter configuration - use basic for less output overhead
    reporters: ['basic'],
    
    // Disable file watching
    watch: false,
    
    // Globals
    globals: true,
    
    // Isolation - disable to reduce overhead
    isolate: false,
  },
});
