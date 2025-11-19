import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      // Map test imports like '../parser' to '../src/parser'
      '../ownership-analyzer': path.resolve(__dirname, './src/ownership-analyzer.ts'),
      '../null-check-analyzer': path.resolve(__dirname, './src/null-check-analyzer.ts'),
      '../parser': path.resolve(__dirname, './src/parser.ts'),
      '../validator': path.resolve(__dirname, './src/validator.ts'),
      '../compiler': path.resolve(__dirname, './src/compiler.ts'),
      '../ts-codegen': path.resolve(__dirname, './src/ts-codegen.ts'),
      '../types': path.resolve(__dirname, './src/types.ts'),
    },
  },
});
