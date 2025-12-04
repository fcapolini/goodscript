import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { build, InlineConfig } from 'vite';
import * as path from 'path';
import * as fs from 'fs';

const fixturesDir = path.resolve(__dirname, '../fixtures');

describe('Integration: Vanilla TypeScript', () => {
  const fixtureDir = path.join(fixturesDir, 'vanilla-ts');
  const outDir = path.join(fixtureDir, 'dist');

  afterAll(() => {
    // Cleanup build output
    if (fs.existsSync(outDir)) {
      fs.rmSync(outDir, { recursive: true });
    }
  });

  it('should build vanilla TS project with -gs.ts files', async () => {
    const config: InlineConfig = {
      root: fixtureDir,
      build: {
        outDir,
        minify: false,
        write: true
      },
      logLevel: 'silent'
    };

    const result = await build(config);
    expect(result).toBeDefined();
    expect(fs.existsSync(outDir)).toBe(true);
  });

  it('should generate valid JavaScript output', async () => {
    const jsFiles = fs.readdirSync(path.join(outDir, 'assets'))
      .filter(f => f.endsWith('.js'));
    
    expect(jsFiles.length).toBeGreaterThan(0);
    
    // Check that the output contains our exported functions
    const jsContent = fs.readFileSync(
      path.join(outDir, 'assets', jsFiles[0]),
      'utf-8'
    );
    
    expect(jsContent).toContain('greet');
    expect(jsContent).toContain('sum');
    expect(jsContent).toContain('isEqual');
  });

  it('should remove GoodScript-specific syntax', async () => {
    const jsFiles = fs.readdirSync(path.join(outDir, 'assets'))
      .filter(f => f.endsWith('.js'));
    
    const jsContent = fs.readFileSync(
      path.join(outDir, 'assets', jsFiles[0]),
      'utf-8'
    );
    
    // Should not contain TypeScript type annotations
    expect(jsContent).not.toContain(': string');
    expect(jsContent).not.toContain(': number');
    expect(jsContent).not.toContain(': boolean');
  });
});
