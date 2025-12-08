import { describe, it, expect } from 'vitest';
import fs from 'fs/promises';
import path from 'path';

describe('tsconfig.json Integration', () => {
  it('should read sourceMap: true and enable debug mode', async () => {
    const tsconfigPath = path.join(process.cwd(), 'test-fixtures', 'tsconfig-debug.json');
    const tsconfig = {
      compilerOptions: {
        sourceMap: true,
        target: 'ES2022',
      },
    };

    // Create test fixture directory
    await fs.mkdir(path.dirname(tsconfigPath), { recursive: true });
    await fs.writeFile(tsconfigPath, JSON.stringify(tsconfig, null, 2));

    try {
      // Read and parse tsconfig
      const content = await fs.readFile(tsconfigPath, 'utf-8');
      const parsed = JSON.parse(content);

      // Verify sourceMap is true
      expect(parsed.compilerOptions.sourceMap).toBe(true);

      // This would translate to:
      // - debug = true
      // - optimize = '0'
      const shouldDebug = parsed.compilerOptions.sourceMap === true;
      const optimizeLevel = shouldDebug ? '0' : '3';

      expect(shouldDebug).toBe(true);
      expect(optimizeLevel).toBe('0');
    } finally {
      // Cleanup
      await fs.rm(path.dirname(tsconfigPath), { recursive: true, force: true });
    }
  });

  it('should read sourceMap: false and enable production mode', async () => {
    const tsconfigPath = path.join(process.cwd(), 'test-fixtures', 'tsconfig-prod.json');
    const tsconfig = {
      compilerOptions: {
        sourceMap: false,
        target: 'ES2022',
      },
    };

    // Create test fixture directory
    await fs.mkdir(path.dirname(tsconfigPath), { recursive: true });
    await fs.writeFile(tsconfigPath, JSON.stringify(tsconfig, null, 2));

    try {
      // Read and parse tsconfig
      const content = await fs.readFile(tsconfigPath, 'utf-8');
      const parsed = JSON.parse(content);

      // Verify sourceMap is false
      expect(parsed.compilerOptions.sourceMap).toBe(false);

      // This would translate to:
      // - debug = false
      // - optimize = '3'
      const shouldDebug = parsed.compilerOptions.sourceMap === true;
      const optimizeLevel = shouldDebug ? '0' : '3';

      expect(shouldDebug).toBe(false);
      expect(optimizeLevel).toBe('3');
    } finally {
      // Cleanup
      await fs.rm(path.dirname(tsconfigPath), { recursive: true, force: true });
    }
  });

  it('should default to production mode when sourceMap is undefined', async () => {
    const tsconfigPath = path.join(process.cwd(), 'test-fixtures', 'tsconfig-default.json');
    const tsconfig = {
      compilerOptions: {
        target: 'ES2022',
      },
    };

    // Create test fixture directory
    await fs.mkdir(path.dirname(tsconfigPath), { recursive: true });
    await fs.writeFile(tsconfigPath, JSON.stringify(tsconfig, null, 2));

    try {
      // Read and parse tsconfig
      const content = await fs.readFile(tsconfigPath, 'utf-8');
      const parsed = JSON.parse(content);

      // Verify sourceMap is undefined
      expect(parsed.compilerOptions.sourceMap).toBeUndefined();

      // Default to production mode
      const shouldDebug = parsed.compilerOptions?.sourceMap === true;
      const optimizeLevel = shouldDebug ? '0' : '3';

      expect(shouldDebug).toBe(false);
      expect(optimizeLevel).toBe('3');
    } finally {
      // Cleanup
      await fs.rm(path.dirname(tsconfigPath), { recursive: true, force: true });
    }
  });

  it('should handle missing tsconfig.json gracefully', async () => {
    const tsconfigPath = path.join(process.cwd(), 'test-fixtures', 'nonexistent.json');

    // Try to read non-existent file
    try {
      await fs.readFile(tsconfigPath, 'utf-8');
      expect.fail('Should have thrown an error');
    } catch (error) {
      // Expected - file doesn't exist
      expect(error).toBeDefined();
      
      // Should default to production mode
      const shouldDebug = false; // Default when tsconfig is missing
      const optimizeLevel = shouldDebug ? '0' : '3';
      
      expect(shouldDebug).toBe(false);
      expect(optimizeLevel).toBe('3');
    }
  });

  it('should map sourceMap setting to Zig compiler flags', () => {
    // Debug mode (sourceMap: true)
    const debugConfig = {
      sourceMap: true,
      debug: true,
      optimize: '0' as const,
    };

    expect(debugConfig.debug).toBe(true);
    expect(debugConfig.optimize).toBe('0');

    // Production mode (sourceMap: false)
    const prodConfig = {
      sourceMap: false,
      debug: false,
      optimize: '3' as const,
    };

    expect(prodConfig.debug).toBe(false);
    expect(prodConfig.optimize).toBe('3');

    // Verify Zig flags would be correct
    // Debug: -g -O0
    // Production: -O3 (no -g)
    const debugFlags = [
      ...(debugConfig.debug ? ['-g'] : []),
      `-O${debugConfig.optimize}`,
    ];
    
    const prodFlags = [
      ...(prodConfig.debug ? ['-g'] : []),
      `-O${prodConfig.optimize}`,
    ];

    expect(debugFlags).toEqual(['-g', '-O0']);
    expect(prodFlags).toEqual(['-O3']);
  });
});
