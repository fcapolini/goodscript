import { describe, it, expect, afterAll } from 'vitest';
import { build, InlineConfig } from 'vite';
import * as path from 'path';
import * as fs from 'fs';

const fixturesDir = path.resolve(__dirname, '../fixtures');

describe('Integration: React App', () => {
  const fixtureDir = path.join(fixturesDir, 'react-app');
  const outDir = path.join(fixtureDir, 'dist');

  afterAll(() => {
    if (fs.existsSync(outDir)) {
      fs.rmSync(outDir, { recursive: true });
    }
  });

  it('should build React app with .gs.tsx files', async () => {
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

  it('should compile JSX/TSX correctly', async () => {
    const jsFiles = fs.readdirSync(path.join(outDir, 'assets'))
      .filter(f => f.endsWith('.js'));
    
    expect(jsFiles.length).toBeGreaterThan(0);
    
    const jsContent = fs.readFileSync(
      path.join(outDir, 'assets', jsFiles[0]),
      'utf-8'
    );
    
    // Should contain React.createElement or JSX runtime
    expect(
      jsContent.includes('React.createElement') || 
      jsContent.includes('jsx')
    ).toBe(true);
  });

  it('should include React component code', async () => {
    const jsFiles = fs.readdirSync(path.join(outDir, 'assets'))
      .filter(f => f.endsWith('.js'));
    
    const jsContent = fs.readFileSync(
      path.join(outDir, 'assets', jsFiles[0]),
      'utf-8'
    );
    
    // Should contain our component logic
    expect(jsContent).toContain('Button');
    expect(jsContent).toContain('onClick');
  });
});

describe('Integration: Vue App', () => {
  const fixtureDir = path.join(fixturesDir, 'vue-app');
  const outDir = path.join(fixtureDir, 'dist');

  afterAll(() => {
    if (fs.existsSync(outDir)) {
      fs.rmSync(outDir, { recursive: true });
    }
  });

  it('should build Vue app with .gs.ts utility files', async () => {
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

  it('should include GoodScript utility functions', async () => {
    const jsFiles = fs.readdirSync(path.join(outDir, 'assets'))
      .filter(f => f.endsWith('.js'));
    
    expect(jsFiles.length).toBeGreaterThan(0);
    
    const jsContent = fs.readFileSync(
      path.join(outDir, 'assets', jsFiles[0]),
      'utf-8'
    );
    
    // Should contain our utility functions
    expect(jsContent).toContain('formatCount');
    expect(jsContent).toContain('calculateSum');
  });
});
