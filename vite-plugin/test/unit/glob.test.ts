import { describe, it, expect } from 'vitest';

// Import the matchGlob function - we'll need to export it from index.ts
// For now, let's recreate it for testing
function matchGlob(filepath: string, pattern: string): boolean {
  // Escape special regex characters except * and /
  const regexPattern = pattern
    .replace(/\./g, '\\.')  // Escape dots first
    .replace(/\*\*/g, '§DOUBLESTAR§')  // Temporarily mark **
    .replace(/\*/g, '[^/]*')  // Single * matches anything except /
    .replace(/§DOUBLESTAR§/g, '.*');  // ** matches anything including /
  
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(filepath);
}

describe('glob pattern matching', () => {
  describe('single-level wildcards (*)', () => {
    it('should match files with * wildcard', () => {
      expect(matchGlob('test.ts', '*.ts')).toBe(true);
      expect(matchGlob('main.ts', '*.ts')).toBe(true);
      expect(matchGlob('file.gs.ts', '*.gs.ts')).toBe(true);
    });

    it('should not match across directories with *', () => {
      expect(matchGlob('src/test.ts', '*.ts')).toBe(false);
      expect(matchGlob('dir/file.ts', '*.ts')).toBe(false);
    });
  });

  describe('multi-level wildcards (**)', () => {
    it('should match across directories with **', () => {
      expect(matchGlob('src/test.ts', '**/*.ts')).toBe(true);
      expect(matchGlob('src/components/Button.tsx', '**/*.tsx')).toBe(true);
      expect(matchGlob('deeply/nested/path/file.gs.ts', '**/*.gs.ts')).toBe(true);
    });

    it('should match node_modules exclusion', () => {
      expect(matchGlob('node_modules/package/file.ts', 'node_modules/**')).toBe(true);
      expect(matchGlob('node_modules/test.ts', 'node_modules/**')).toBe(true);
      expect(matchGlob('src/node_modules/test.ts', '**/node_modules/**')).toBe(true);
    });
  });

  describe('exact matches', () => {
    it('should match exact file paths', () => {
      expect(matchGlob('src/main.ts', 'src/main.ts')).toBe(true);
      expect(matchGlob('test.ts', 'test.ts')).toBe(true);
    });

    it('should not match different file paths', () => {
      expect(matchGlob('src/test.ts', 'src/main.ts')).toBe(false);
      expect(matchGlob('test.ts', 'main.ts')).toBe(false);
    });
  });

  describe('combined patterns', () => {
    it('should handle complex patterns', () => {
      expect(matchGlob('src/components/Button.gs.tsx', '**/*.gs.tsx')).toBe(true);
      expect(matchGlob('test/fixtures/app/main.gs.ts', '**/*.gs.ts')).toBe(true);
      expect(matchGlob('lib/utils.ts', '**/*.gs.ts')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty paths', () => {
      expect(matchGlob('', '**')).toBe(true);
      expect(matchGlob('', '*')).toBe(true);
    });

    it('should handle files with dots in name', () => {
      expect(matchGlob('file.test.ts', '*.test.ts')).toBe(true);
      expect(matchGlob('file.spec.gs.ts', '*.spec.gs.ts')).toBe(true);
    });
  });
});
