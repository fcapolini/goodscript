import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { File, Directory, Path } from '../src/index-gs.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

const TEST_DIR = path.join(process.cwd(), 'test-tmp');

describe('File (Async)', () => {
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
    it('should read text file', async () => {
      const filePath = path.join(TEST_DIR, 'test.txt');
      fs.writeFileSync(filePath, 'Hello, World!', 'utf-8');
      
      expect(await File.readText(filePath)).toBe('Hello, World!');
      expect(await File.tryReadText(filePath)).toBe('Hello, World!');
    });

    it('should reject on missing file', async () => {
      const filePath = path.join(TEST_DIR, 'missing.txt');
      await expect(File.readText(filePath)).rejects.toThrow('Failed to read file');
    });

    it('should return null on missing file with tryReadText', async () => {
      const filePath = path.join(TEST_DIR, 'missing.txt');
      expect(await File.tryReadText(filePath)).toBeNull();
    });
  });

  describe('writeText/tryWriteText', () => {
    it('should write text file', async () => {
      const filePath = path.join(TEST_DIR, 'output.txt');
      await File.writeText(filePath, 'Test content');
      
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('Test content');
    });

    it('should return success status', async () => {
      const filePath = path.join(TEST_DIR, 'output.txt');
      expect(await File.tryWriteText(filePath, 'Test')).toBe(true);
    });
  });

  describe('readBytes/writeBytes', () => {
    it('should read and write bytes', async () => {
      const filePath = path.join(TEST_DIR, 'binary.dat');
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      
      await File.writeBytes(filePath, data);
      const read = await File.readBytes(filePath);
      
      expect(read).toEqual(data);
    });
  });

  describe('appendText', () => {
    it('should append to file', async () => {
      const filePath = path.join(TEST_DIR, 'append.txt');
      await File.writeText(filePath, 'Line 1\n');
      await File.appendText(filePath, 'Line 2\n');
      
      expect(await File.readText(filePath)).toBe('Line 1\nLine 2\n');
    });
  });

  describe('exists', () => {
    it('should check file existence', async () => {
      const filePath = path.join(TEST_DIR, 'exists.txt');
      expect(File.exists(filePath)).toBe(false);
      
      await File.writeText(filePath, 'content');
      expect(File.exists(filePath)).toBe(true);
    });
  });

  describe('remove/tryRemove', () => {
    it('should remove file', async () => {
      const filePath = path.join(TEST_DIR, 'remove.txt');
      await File.writeText(filePath, 'content');
      
      await File.remove(filePath);
      expect(File.exists(filePath)).toBe(false);
    });

    it('should return success status', async () => {
      const filePath = path.join(TEST_DIR, 'remove.txt');
      await File.writeText(filePath, 'content');
      
      expect(await File.tryRemove(filePath)).toBe(true);
      expect(await File.tryRemove(filePath)).toBe(false); // Already removed
    });
  });

  describe('size/trySize', () => {
    it('should get file size', async () => {
      const filePath = path.join(TEST_DIR, 'size.txt');
      await File.writeText(filePath, 'Hello'); // 5 bytes
      
      expect(await File.size(filePath)).toBe(5);
      expect(await File.trySize(filePath)).toBe(5);
    });

    it('should handle missing file', async () => {
      const filePath = path.join(TEST_DIR, 'missing.txt');
      await expect(File.size(filePath)).rejects.toThrow();
      expect(await File.trySize(filePath)).toBeNull();
    });
  });
});

describe('File (Sync)', () => {
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

  describe('syncReadText/trySyncReadText', () => {
    it('should read text file', () => {
      const filePath = path.join(TEST_DIR, 'test.txt');
      fs.writeFileSync(filePath, 'Hello, World!', 'utf-8');
      
      expect(File.syncReadText(filePath)).toBe('Hello, World!');
      expect(File.trySyncReadText(filePath)).toBe('Hello, World!');
    });

    it('should throw on missing file', () => {
      const filePath = path.join(TEST_DIR, 'missing.txt');
      expect(() => File.syncReadText(filePath)).toThrow('Failed to read file');
    });

    it('should return null on missing file with trySyncReadText', () => {
      const filePath = path.join(TEST_DIR, 'missing.txt');
      expect(File.trySyncReadText(filePath)).toBeNull();
    });
  });

  describe('syncWriteText/trySyncWriteText', () => {
    it('should write text file', () => {
      const filePath = path.join(TEST_DIR, 'output.txt');
      File.syncWriteText(filePath, 'Test content');
      
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('Test content');
    });

    it('should return success status', () => {
      const filePath = path.join(TEST_DIR, 'output.txt');
      expect(File.trySyncWriteText(filePath, 'Test')).toBe(true);
    });
  });

  describe('syncReadBytes/syncWriteBytes', () => {
    it('should read and write bytes', () => {
      const filePath = path.join(TEST_DIR, 'binary.dat');
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      
      File.syncWriteBytes(filePath, data);
      const read = File.syncReadBytes(filePath);
      
      expect(read).toEqual(data);
    });
  });

  describe('syncAppendText', () => {
    it('should append to file', () => {
      const filePath = path.join(TEST_DIR, 'append.txt');
      File.syncWriteText(filePath, 'Line 1\n');
      File.syncAppendText(filePath, 'Line 2\n');
      
      expect(File.syncReadText(filePath)).toBe('Line 1\nLine 2\n');
    });
  });

  describe('syncRemove/trySyncRemove', () => {
    it('should remove file', () => {
      const filePath = path.join(TEST_DIR, 'remove.txt');
      File.syncWriteText(filePath, 'content');
      
      File.syncRemove(filePath);
      expect(File.exists(filePath)).toBe(false);
    });

    it('should return success status', () => {
      const filePath = path.join(TEST_DIR, 'remove.txt');
      File.syncWriteText(filePath, 'content');
      
      expect(File.trySyncRemove(filePath)).toBe(true);
      expect(File.trySyncRemove(filePath)).toBe(false); // Already removed
    });
  });

  describe('syncSize/trySyncSize', () => {
    it('should get file size', () => {
      const filePath = path.join(TEST_DIR, 'size.txt');
      File.syncWriteText(filePath, 'Hello'); // 5 bytes
      
      expect(File.syncSize(filePath)).toBe(5);
      expect(File.trySyncSize(filePath)).toBe(5);
    });

    it('should handle missing file', () => {
      const filePath = path.join(TEST_DIR, 'missing.txt');
      expect(() => File.syncSize(filePath)).toThrow();
      expect(File.trySyncSize(filePath)).toBeNull();
    });
  });
});

describe('Directory (Async)', () => {
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
    it('should create directory', async () => {
      const dirPath = path.join(TEST_DIR, 'newdir');
      await Directory.create(dirPath);
      
      expect(Directory.exists(dirPath)).toBe(true);
    });

    it('should create nested directories', async () => {
      const dirPath = path.join(TEST_DIR, 'a', 'b', 'c');
      await Directory.create(dirPath);
      
      expect(Directory.exists(dirPath)).toBe(true);
    });
  });

  describe('remove/tryRemove', () => {
    it('should remove empty directory', async () => {
      const dirPath = path.join(TEST_DIR, 'remove1');
      fs.mkdirSync(dirPath);
      
      await Directory.remove(dirPath);
      expect(Directory.exists(dirPath)).toBe(false);
    });

    it('should remove directory recursively', async () => {
      const dirPath = path.join(TEST_DIR, 'remove2');
      fs.mkdirSync(path.join(dirPath, 'subdir'), { recursive: true });
      
      await Directory.remove(dirPath, true);
      expect(Directory.exists(dirPath)).toBe(false);
    });
  });

  describe('list/tryList', () => {
    it('should list directory contents', async () => {
      const dirPath = TEST_DIR;
      fs.writeFileSync(path.join(dirPath, 'file1.txt'), '');
      fs.writeFileSync(path.join(dirPath, 'file2.txt'), '');
      
      const entries = await Directory.list(dirPath);
      expect(entries).toContain('file1.txt');
      expect(entries).toContain('file2.txt');
    });

    it('should handle missing directory', async () => {
      const dirPath = path.join(TEST_DIR, 'missing');
      await expect(Directory.list(dirPath)).rejects.toThrow();
      expect(await Directory.tryList(dirPath)).toBeNull();
    });
  });

  describe('listPaths', () => {
    it('should list with full paths', async () => {
      const dirPath = TEST_DIR;
      fs.writeFileSync(path.join(dirPath, 'file.txt'), '');
      
      const paths = await Directory.listPaths(dirPath);
      expect(paths[0]).toContain(TEST_DIR);
    });
  });

  describe('listFiles/listDirectories', () => {
    it('should filter files and directories', async () => {
      const dirPath = TEST_DIR;
      fs.writeFileSync(path.join(dirPath, 'file.txt'), '');
      fs.mkdirSync(path.join(dirPath, 'subdir'));
      
      const files = await Directory.listFiles(dirPath);
      const dirs = await Directory.listDirectories(dirPath);
      
      expect(files.some(f => f.endsWith('file.txt'))).toBe(true);
      expect(dirs.some(d => d.endsWith('subdir'))).toBe(true);
    });
  });
});

describe('Directory (Sync)', () => {
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

  describe('syncCreate/trySyncCreate', () => {
    it('should create directory', () => {
      const dirPath = path.join(TEST_DIR, 'newdir');
      Directory.syncCreate(dirPath);
      
      expect(Directory.exists(dirPath)).toBe(true);
    });

    it('should create nested directories', () => {
      const dirPath = path.join(TEST_DIR, 'a', 'b', 'c');
      Directory.syncCreate(dirPath);
      
      expect(Directory.exists(dirPath)).toBe(true);
    });
  });

  describe('syncRemove/trySyncRemove', () => {
    it('should remove empty directory', () => {
      const dirPath = path.join(TEST_DIR, 'remove1');
      fs.mkdirSync(dirPath);
      
      Directory.syncRemove(dirPath);
      expect(Directory.exists(dirPath)).toBe(false);
    });

    it('should remove directory recursively', () => {
      const dirPath = path.join(TEST_DIR, 'remove2');
      fs.mkdirSync(path.join(dirPath, 'subdir'), { recursive: true });
      
      Directory.syncRemove(dirPath, true);
      expect(Directory.exists(dirPath)).toBe(false);
    });
  });

  describe('syncList/trySyncList', () => {
    it('should list directory contents', () => {
      const dirPath = TEST_DIR;
      fs.writeFileSync(path.join(dirPath, 'file1.txt'), '');
      fs.writeFileSync(path.join(dirPath, 'file2.txt'), '');
      
      const entries = Directory.syncList(dirPath);
      expect(entries).toContain('file1.txt');
      expect(entries).toContain('file2.txt');
    });

    it('should handle missing directory', () => {
      const dirPath = path.join(TEST_DIR, 'missing');
      expect(() => Directory.syncList(dirPath)).toThrow();
      expect(Directory.trySyncList(dirPath)).toBeNull();
    });
  });

  describe('syncListPaths', () => {
    it('should list with full paths', () => {
      const dirPath = TEST_DIR;
      fs.writeFileSync(path.join(dirPath, 'file.txt'), '');
      
      const paths = Directory.syncListPaths(dirPath);
      expect(paths[0]).toContain(TEST_DIR);
    });
  });

  describe('syncListFiles/syncListDirectories', () => {
    it('should filter files and directories', () => {
      const dirPath = TEST_DIR;
      fs.writeFileSync(path.join(dirPath, 'file.txt'), '');
      fs.mkdirSync(path.join(dirPath, 'subdir'));
      
      const files = Directory.syncListFiles(dirPath);
      const dirs = Directory.syncListDirectories(dirPath);
      
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
