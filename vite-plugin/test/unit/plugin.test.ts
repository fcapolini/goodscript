import { describe, it, expect } from 'vitest';
import goodscriptPlugin from '../../src/index';

describe('goodscriptPlugin', () => {
  it('should create a plugin with correct name', () => {
    const plugin = goodscriptPlugin();
    expect(plugin.name).toBe('vite-plugin-goodscript');
  });

  it('should enforce pre execution', () => {
    const plugin = goodscriptPlugin();
    expect(plugin.enforce).toBe('pre');
  });

  it('should accept custom options', () => {
    const plugin = goodscriptPlugin({
      level: 'dag',
      include: ['**/*.custom.ts'],
      exclude: ['custom/**']
    });
    expect(plugin.name).toBe('vite-plugin-goodscript');
  });

  it('should use default options when none provided', () => {
    const plugin = goodscriptPlugin();
    expect(plugin).toBeDefined();
    expect(plugin.name).toBe('vite-plugin-goodscript');
  });
});

describe('resolveId', () => {
  it('should resolve .gs imports to -gs.ts', () => {
    const plugin = goodscriptPlugin();
    const result = plugin.resolveId!('./file.gs', '/src/main.ts');
    expect(result).toBe('./file-gs.ts');
  });

  it('should not resolve -gs.ts files', () => {
    const plugin = goodscriptPlugin();
    const result = plugin.resolveId!('./file-gs.ts', '/src/main.ts');
    expect(result).toBeNull();
  });

  it('should not resolve regular .ts files', () => {
    const plugin = goodscriptPlugin();
    const result = plugin.resolveId!('./file.ts', '/src/main.ts');
    expect(result).toBeNull();
  });
});
