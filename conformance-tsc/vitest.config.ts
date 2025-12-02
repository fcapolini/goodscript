import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    include: ['src/suites/**/*.test.ts'],
    reporters: ['verbose'],
    // Limit concurrency to avoid overwhelming the system
    maxConcurrency: 10,
    // Run tests in sequence within each file to manage resources
    sequence: {
      concurrent: false,
    },
  },
});
