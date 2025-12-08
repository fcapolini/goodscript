import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { File, Directory, Path } from '../src/index-gs.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

const TEST_DIR = path.join(process.cwd(), 'test-tmp');

describe('File', () => {
  beforeEach(() => {
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('readText/tryReadText', () => {
    it('should read text file', () => {
      const filePath = path.join(TEST_DIR, 'test.txt');
      fs.writeFileSync(filePath, 'Hello, World!', 'utf-8');
      
      expect(File.readText(filePath)).toBe('Hello, World!');
      expect(File.tryReadText(filePath)).toBe('Hello, World!');
    });

    it('should throw on missing file', () => {
      const filePath = path.join(TEST_DIR, 'missing.txt');
      expect(() => File.readText(filePath)).toThrow('Failed to read file');
    });

    it('should return null on missing file with tryReadText', () => {
      const filePath = path.join(TEST_DIR, 'missing.txt');
      expect(File.tryReadText(filePath)).toBeNull();
    });
  });

  describe('writeText/tryWriteText', () => {
    it('should write text file', () => {
      const filePath = path.join(TEST_DIR, 'output.txt');
      File.writeText(filePath, 'Test content');
      
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('Test content');
    });

    it('should return success status', () => {
      const filePath = path.join(TEST_DIR, 'output.txt');
      expect(File.tryWriteText(filePath, 'Test')).toBe(true);
    });
  });

  describe('readBytes/writeBytes', () => {
    it('should read and write bytes', () => {
      const filePath = path.join(TEST_DIR, 'binary.dat');
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      
      File.writeBytes(filePath, data);
      const read = File.readBytes(filePath);
      
      expect(read).toEqual(data);
    });
  });

  describe('appendText', () => {
    it('should append to file', () => {
      const filePath = path.join(TEST_DIR, 'append.txt');
      File.writeText(filePath, 'Line 1\n');
      File.appendText(filePath, 'Line 2\n');
      
      expect(File.readText(filePath)).toBe('Line 1\nLine 2\n');
    });
  });

  describe('exists', () => {
    it('should check file existence', () => {
      const filePath = path.join(TEST_DIR, 'exists.txt');
      expect(File.exists(filePath)).toBe(false);
      
      File.writeText(filePath, 'content');
      expect(File.exists(filePath)).toBe(true);
    });
  });

  describe('remove/tryRemove', () => {
    it('should remove file', () => {
      const filePath = path.join(TEST_DIR, 'remove.txt');
      File.writeText(filePath, 'content');
      
      File.remove(filePath);
      expect(File.exists(filePath)).toBe(false);
    });

    it('should return success status', () => {
      const filePath = path.join(TEST_DIR, 'remove.txt');
      File.writeText(filePath, 'content');
      
      expect(File.tryRemove(filePath)).toBe(true);
      expect(File.tryRemove(filePath)).toBe(false); // Already removed
    });
  });

  describe('size/trySize', () => {
    it('should get file size', () => {
      const filePath = path.join(TEST_DIR, 'size.txt');
      File.writeText(filePath, 'Hello'); // 5 bytes
      
      expect(File.size(filePath)).toBe(5);
      expect(File.trySize(filePath)).toBe(5);
    });

    it('should handle missing file', () => {
      const filePath = path.join(TEST_DIR, 'missing.txt');
      expect(() => File.size(filePath)).toThrow();
      expect(File.trySize(filePath)).toBeNull();
    });
  });
});

describe('Directory', () => {
  beforeEach(() => {
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('exists', () => {
    it('should check directory existence', () => {
      const dirPath = path.join(TEST_DIR, 'subdir');
      expect(Directory.exists(dirPath)).toBe(false);
      
      fs.mkdirSync(dirPath);
      expect(Directory.exists(dirPath)).toBe(true);
    });
  });

  describe('create/tryCreate', () => {
    it('should create directory', () => {
      const dirPath = path.join(TEST_DIR, 'newdir');
      Directory.create(dirPath);
      
      expect(Directory.exists(dirPath)).toBe(true);
    });

    it('should create nested directories', () => {
      const dirPath = path.join(TEST_DIR, 'a', 'b', 'c');
      Directory.create(dirPath);
      
      expect(Directory.exists(dirPath)).toBe(true);
    });
  });

  describe('remove/tryRemove', () => {
    it('should remove empty directory', () => {
      const dirPath = path.join(TEST_DIR, 'remove1');
      fs.mkdirSync(dirPath);
      
      Directory.remove(dirPath);
      expect(Directory.exists(dirPath)).toBe(false);
    });

    it('should remove directory recursively', () => {
      const dirPath = path.join(TEST_DIR, 'remove2');
      fs.mkdirSync(path.join(dirPath, 'subdir'), { recursive: true });
      
      Directory.remove(dirPath, true);
      expect(Directory.exists(dirPath)).toBe(false);
    });
  });

  describe('list/tryList', () => {
    it('should list directory contents', () => {
      const dirPath = TEST_DIR;
      fs.writeFileSync(path.join(dirPath, 'file1.txt'), '');
      fs.writeFileSync(path.join(dirPath, 'file2.txt'), '');
      
      const entries = Directory.list(dirPath);
      expect(entries).toContain('file1.txt');
      expect(entries).toContain('file2.txt');
    });

    it('should handle missing directory', () => {
      const dirPath = path.join(TEST_DIR, 'missing');
      expect(() => Directory.list(dirPath)).toThrow();
      expect(Directory.tryList(dirPath)).toBeNull();
    });
  });

  describe('listPaths', () => {
    it('should list with full paths', () => {
      const dirPath = TEST_DIR;
      fs.writeFileSync(path.join(dirPath, 'file.txt'), '');
      
      const paths = Directory.listPaths(dirPath);
      expect(paths[0]).toContain(TEST_DIR);
    });
  });

  describe('listFiles/listDirectories', () => {
    it('should filter files and directories', () => {
      const dirPath = TEST_DIR;
      fs.writeFileSync(path.join(dirPath, 'file.txt'), '');
      fs.mkdirSync(path.join(dirPath, 'subdir'));
      
      const files = Directory.listFiles(dirPath);
      const dirs = Directory.listDirectories(dirPath);
      
      expect(files.some(f => f.endsWith('file.txt'))).toBe(true);
      expect(dirs.some(d => d.endsWith('subdir'))).toBe(true);
    });
  });
});

describe('Path', () => {
  describe('join', () => {
    it('should join path segments', () => {
      expect(Path.join('a', 'b', 'c')).toContain('a');
      expect(Path.join('a', 'b', 'c')).toContain('b');
      expect(Path.join('a', 'b', 'c')).toContain('c');
    });
  });

  describe('dirname/basename', () => {
    it('should extract directory and basename', () => {
      const p = '/usr/local/bin/node';
      expect(Path.dirname(p)).toContain('bin');
      expect(Path.basename(p)).toBe('node');
    });
  });

  describe('extension', () => {
    it('should get extension', () => {
      expect(Path.extension('file.txt')).toBe('.txt');
      expect(Path.extension('file.tar.gz')).toBe('.gz');
      expect(Path.extension('noext')).toBe('');
    });
  });

  describe('isAbsolute', () => {
    it('should check if path is absolute', () => {
      expect(Path.isAbsolute('/usr/bin')).toBe(true);
      expect(Path.isAbsolute('relative/path')).toBe(false);
    });
  });

  describe('stem', () => {
    it('should get filename without extension', () => {
      expect(Path.stem('file.txt')).toBe('file');
      expect(Path.stem('archive.tar.gz')).toBe('archive.tar');
    });
  });

  describe('withExtension', () => {
    it('should replace extension', () => {
      const result = Path.withExtension('/path/file.txt', '.md');
      expect(result).toContain('file.md');
    });

    it('should handle extension without dot', () => {
      const result = Path.withExtension('/path/file.txt', 'md');
      expect(result).toContain('file.md');
    });
  });

  describe('segments', () => {
    it('should split path into segments', () => {
      const segments = Path.segments('/usr/local/bin');
      expect(segments).toContain('usr');
      expect(segments).toContain('local');
      expect(segments).toContain('bin');
    });
  });
});
