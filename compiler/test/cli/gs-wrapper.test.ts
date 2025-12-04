/**
 * CLI Tests: gs wrapper command
 * Tests for the unified gs toolchain wrapper
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const GS_BIN = path.join(__dirname, '../../dist/gs.js');

describe('CLI: gs wrapper', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gs-wrapper-test-'));
  });

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe('Help and version', () => {
    it('should show help with --help', () => {
      const output = execSync(`node ${GS_BIN} --help`, { encoding: 'utf-8' });
      
      expect(output).toContain('GoodScript');
      expect(output).toContain('Usage: gs <command>');
      expect(output).toContain('Commands:');
      expect(output).toContain('compile');
    });

    it('should show help with -h', () => {
      const output = execSync(`node ${GS_BIN} -h`, { encoding: 'utf-8' });
      
      expect(output).toContain('GoodScript');
      expect(output).toContain('Commands:');
    });

    it('should show help with no arguments', () => {
      const output = execSync(`node ${GS_BIN}`, { encoding: 'utf-8' });
      
      expect(output).toContain('GoodScript');
      expect(output).toContain('Commands:');
    });

    it('should show version with --version', () => {
      const output = execSync(`node ${GS_BIN} --version`, { encoding: 'utf-8' });
      
      expect(output.trim()).toMatch(/^\d+\.\d+\.\d+/);
    });

    it('should show version with -v', () => {
      const output = execSync(`node ${GS_BIN} -v`, { encoding: 'utf-8' });
      
      expect(output.trim()).toMatch(/^\d+\.\d+\.\d+/);
    });
  });

  describe('compile command', () => {
    it('should delegate to gsc for compile command', () => {
      const sourceFile = path.join(tmpDir, 'test-gs.ts');
      const outDir = path.join(tmpDir, 'dist');
      
      fs.writeFileSync(sourceFile, 'const x = 42;\nexport { x };');
      
      execSync(`node ${GS_BIN} compile -o ${outDir} ${sourceFile}`, {
        encoding: 'utf-8'
      });
      
      expect(fs.existsSync(path.join(outDir, 'test.js'))).toBe(true);
    });

    it('should pass all flags to gsc', () => {
      const sourceFile = path.join(tmpDir, 'test-gs.ts');
      const outDir = path.join(tmpDir, 'dist');
      
      fs.writeFileSync(sourceFile, 'const x = 42;');
      
      execSync(`node ${GS_BIN} compile -t native -o ${outDir} ${sourceFile}`, {
        encoding: 'utf-8'
      });
      
      expect(fs.existsSync(path.join(outDir, 'test.cpp'))).toBe(true);
    });

    it('should handle multiple files', () => {
      const file1 = path.join(tmpDir, 'file1-gs.ts');
      const file2 = path.join(tmpDir, 'file2-gs.ts');
      const outDir = path.join(tmpDir, 'dist');
      
      fs.writeFileSync(file1, 'const x = 1;');
      fs.writeFileSync(file2, 'const y = 2;');
      
      execSync(`node ${GS_BIN} compile -o ${outDir} ${file1} ${file2}`, {
        encoding: 'utf-8'
      });
      
      expect(fs.existsSync(path.join(outDir, 'file1.js'))).toBe(true);
      expect(fs.existsSync(path.join(outDir, 'file2.js'))).toBe(true);
    });
  });

  describe('Future commands', () => {
    it('should show not implemented for run command', () => {
      try {
        execSync(`node ${GS_BIN} run test-gs.ts`, {
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        const output = error.stderr || error.stdout || '';
        expect(output).toContain('not yet implemented');
        expect(output).toContain('run');
      }
    });

    it('should show not implemented for build command', () => {
      try {
        execSync(`node ${GS_BIN} build`, {
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        const output = error.stderr || error.stdout || '';
        expect(output).toContain('not yet implemented');
        expect(output).toContain('build');
      }
    });

    it('should show not implemented for test command', () => {
      try {
        execSync(`node ${GS_BIN} test`, {
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        const output = error.stderr || error.stdout || '';
        expect(output).toContain('not yet implemented');
        expect(output).toContain('test');
      }
    });

    it('should show not implemented for fmt command', () => {
      try {
        execSync(`node ${GS_BIN} fmt`, {
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        const output = error.stderr || error.stdout || '';
        expect(output).toContain('not yet implemented');
        expect(output).toContain('fmt');
      }
    });

    it('should show not implemented for init command', () => {
      try {
        execSync(`node ${GS_BIN} init`, {
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        const output = error.stderr || error.stdout || '';
        expect(output).toContain('not yet implemented');
        expect(output).toContain('init');
      }
    });
  });

  describe('Unknown commands', () => {
    it('should show error for unknown command', () => {
      try {
        execSync(`node ${GS_BIN} unknown-command`, {
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        const output = error.stderr || error.stdout || '';
        expect(output).toContain('Unknown command');
        expect(output).toContain('unknown-command');
      }
    });

    it('should suggest running --help for unknown command', () => {
      try {
        execSync(`node ${GS_BIN} invalid`, {
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        const output = error.stderr || error.stdout || '';
        expect(output).toContain('--help');
      }
    });
  });
});
