import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Text Encoding Support', () => {
  const buildDir = path.join(__dirname, '../../build');

  beforeAll(() => {
    // Ensure build directory exists
    if (!fs.existsSync(buildDir)) {
      fs.mkdirSync(buildDir, { recursive: true });
    }
  });

  it('should handle UTF-8 encoding (default)', () => {
    // Test that UTF-8 is the default and works correctly
    const testContent = 'Hello, 世界! 你好 🌍';
    const testFile = path.join(buildDir, 'test-utf8.txt');

    fs.writeFileSync(testFile, testContent, 'utf-8');
    const readBack = fs.readFileSync(testFile, 'utf-8');

    expect(readBack).toBe(testContent);
  });

  it('should handle ASCII encoding', () => {
    // Test ASCII validation
    const asciiContent = 'ASCII only text!';
    const testFile = path.join(buildDir, 'test-ascii.txt');

    fs.writeFileSync(testFile, asciiContent, 'ascii');
    const readBack = fs.readFileSync(testFile, 'ascii');

    expect(readBack).toBe(asciiContent);

    // Verify all characters are in ASCII range
    for (let i = 0; i < readBack.length; i++) {
      expect(readBack.charCodeAt(i)).toBeLessThanOrEqual(127);
    }
  });

  it('should handle Latin-1 encoding', () => {
    // Test Latin-1 (ISO-8859-1)
    const latin1Content = 'Café résumé naïve';
    const testFile = path.join(buildDir, 'test-latin1.txt');

    fs.writeFileSync(testFile, latin1Content, 'latin1');
    const readBack = fs.readFileSync(testFile, 'latin1');

    expect(readBack).toBe(latin1Content);
  });

  it('should handle UTF-16LE encoding', () => {
    // Test UTF-16 Little Endian
    const utf16Content = 'UTF-16LE: 日本語 한글';
    const testFile = path.join(buildDir, 'test-utf16le.txt');

    fs.writeFileSync(testFile, utf16Content, 'utf16le');
    const readBack = fs.readFileSync(testFile, 'utf16le');

    expect(readBack).toBe(utf16Content);
  });

  it('should convert between encodings', () => {
    // Test encoding conversion
    const content = 'Conversion test: Café';
    const latin1File = path.join(buildDir, 'test-convert-latin1.txt');
    const utf8File = path.join(buildDir, 'test-convert-utf8.txt');

    // Write as Latin-1
    fs.writeFileSync(latin1File, content, 'latin1');

    // Read as Latin-1, write as UTF-8
    const readContent = fs.readFileSync(latin1File, 'latin1');
    fs.writeFileSync(utf8File, readContent, 'utf-8');

    // Read back as UTF-8
    const utf8Content = fs.readFileSync(utf8File, 'utf-8');

    expect(utf8Content).toBe(content);
  });

  it('should reject non-ASCII in ASCII mode', () => {
    // Verify that writing non-ASCII content to ASCII file doesn't corrupt data
    const testFile = path.join(buildDir, 'test-ascii-invalid.txt');
    const nonAsciiContent = 'Café'; // Contains é (not ASCII)

    // Node.js will write it but replace non-ASCII chars
    fs.writeFileSync(testFile, nonAsciiContent, 'ascii');
    const readBack = fs.readFileSync(testFile, 'ascii');

    // The é will be corrupted in ASCII mode
    expect(readBack).not.toBe(nonAsciiContent);
  });

  it('should handle append with consistent encoding', () => {
    // Test that appending with same encoding works
    const testFile = path.join(buildDir, 'test-append-encoding.txt');

    fs.writeFileSync(testFile, 'Line 1\n', 'utf-8');
    fs.appendFileSync(testFile, 'Line 2\n', 'utf-8');
    fs.appendFileSync(testFile, 'Line 3\n', 'utf-8');

    const content = fs.readFileSync(testFile, 'utf-8');
    const lines = content.trim().split('\n');

    expect(lines).toEqual(['Line 1', 'Line 2', 'Line 3']);
  });
});
