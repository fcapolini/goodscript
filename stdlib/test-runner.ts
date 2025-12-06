#!/usr/bin/env node

/**
 * Triple-Mode Test Runner for GoodScript stdlib
 * 
 * Tests each library in three modes:
 * 1. TypeScript/Node.js execution (reference behavior)
 * 2. GoodScript GC mode (C++ with MPS garbage collection)
 * 3. GoodScript Ownership mode (C++ with ownership qualifiers)
 * 
 * All three must produce identical output.
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync, readdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface TestResult {
  mode: 'typescript' | 'gc-native' | 'ownership-native';
  passed: boolean;
  output?: string;
  error?: string;
  duration: number;
}

interface TestSuite {
  name: string;
  file: string;
  results: TestResult[];
}

class TripleTestRunner {
  private suites: TestSuite[] = [];
  private distDir: string;
  private libPath: string;
  
  constructor(libPath: string) {
    // Resolve to absolute path
    this.libPath = resolve(libPath);
    this.distDir = join(this.libPath, 'dist');
  }
  
  async runAllTests(): Promise<void> {
    console.log('🧪 GoodScript Triple-Mode Test Runner\n');
    console.log('Testing library:', this.libPath);
    console.log('=' .repeat(60));
    
    // Find all test files
    const testFiles = this.findTestFiles();
    
    for (const testFile of testFiles) {
      await this.runTestSuite(testFile);
    }
    
    this.printSummary();
  }
  
  private findTestFiles(): string[] {
    const testDir = join(this.libPath, 'test');
    if (!existsSync(testDir)) {
      throw new Error(`Test directory not found: ${testDir}`);
    }
    
    // For now, just find .test.ts files
    return readdirSync(testDir)
      .filter((f: string) => f.endsWith('.test.ts'))
      .map((f: string) => join(testDir, f));
  }
  
  private async runTestSuite(testFile: string): Promise<void> {
    const suiteName = testFile.split('/').pop()!.replace('.test.ts', '');
    console.log(`\n📦 Test Suite: ${suiteName}`);
    console.log('-'.repeat(60));
    
    const suite: TestSuite = {
      name: suiteName,
      file: testFile,
      results: []
    };
    
    // Mode 1: TypeScript/Node.js (reference implementation)
    console.log('  [1/3] TypeScript mode...');
    suite.results.push(await this.runTypeScriptTest(testFile));
    
    // Mode 2: GC Native (C++ with MPS GC)
    console.log('  [2/3] GC Native mode...');
    suite.results.push(await this.runGCNativeTest(testFile));
    
    // Mode 3: Ownership Native (C++ with ownership)
    console.log('  [3/3] Ownership Native mode...');
    suite.results.push(await this.runOwnershipNativeTest(testFile));
    
    this.suites.push(suite);
    this.validateOutputMatch(suite);
  }
  
  private async runTypeScriptTest(testFile: string): Promise<TestResult> {
    const start = Date.now();
    try {
      // Use relative path from libPath
      const relativeTestFile = testFile.replace(this.libPath + '/', '');
      const output = execSync(`npx vitest run ${relativeTestFile}`, {
        cwd: this.libPath,
        encoding: 'utf-8',
        stdio: 'pipe'
      });
      
      return {
        mode: 'typescript',
        passed: true,
        output: output.trim(),
        duration: Date.now() - start
      };
    } catch (error: any) {
      return {
        mode: 'typescript',
        passed: false,
        error: error.message,
        output: error.stdout?.toString(),
        duration: Date.now() - start
      };
    }
  }
  
  private async runGCNativeTest(testFile: string): Promise<TestResult> {
    const start = Date.now();
    
    try {
      // Step 1: Compile test with GoodScript (GC mode)
      const srcFile = testFile.replace('.test.ts', '.gs.ts').replace('/test/', '/src/');
      const cppDir = join(this.distDir, 'gc-native');
      
      if (!existsSync(cppDir)) {
        mkdirSync(cppDir, { recursive: true });
      }
      
      // Compile GoodScript -> C++ (GC mode)
      const compileCmd = `node ${join(__dirname, '../../compiler/dist/cli.js')} ` +
        `--mode gc --output ${cppDir} ${srcFile}`;
      
      execSync(compileCmd, { cwd: this.libPath, stdio: 'pipe' });
      
      // Step 2: Compile C++ with g++
      const cppFile = join(cppDir, 'main.cpp');
      const exeFile = join(cppDir, 'test-runner');
      
      const buildCmd = `g++ -std=c++20 -I${join(__dirname, '../../compiler/runtime')} ` +
        `-o ${exeFile} ${cppFile} -lmps`;
      
      execSync(buildCmd, { stdio: 'pipe' });
      
      // Step 3: Run the executable
      const output = execSync(exeFile, {
        encoding: 'utf-8',
        stdio: 'pipe'
      });
      
      return {
        mode: 'gc-native',
        passed: true,
        output: output.trim(),
        duration: Date.now() - start
      };
    } catch (error: any) {
      return {
        mode: 'gc-native',
        passed: false,
        error: error.message,
        output: error.stdout?.toString(),
        duration: Date.now() - start
      };
    }
  }
  
  private async runOwnershipNativeTest(testFile: string): Promise<TestResult> {
    const start = Date.now();
    
    try {
      // Step 1: Compile test with GoodScript (Ownership mode)
      const srcFile = testFile.replace('.test.ts', '.gs.ts').replace('/test/', '/src/');
      const cppDir = join(this.distDir, 'ownership-native');
      
      if (!existsSync(cppDir)) {
        mkdirSync(cppDir, { recursive: true });
      }
      
      // Compile GoodScript -> C++ (Ownership mode)
      const compileCmd = `node ${join(__dirname, '../../compiler/dist/cli.js')} ` +
        `--mode ownership --output ${cppDir} ${srcFile}`;
      
      execSync(compileCmd, { cwd: this.libPath, stdio: 'pipe' });
      
      // Step 2: Compile C++ with g++
      const cppFile = join(cppDir, 'main.cpp');
      const exeFile = join(cppDir, 'test-runner');
      
      const buildCmd = `g++ -std=c++20 -I${join(__dirname, '../../compiler/runtime')} ` +
        `-o ${exeFile} ${cppFile}`;
      
      execSync(buildCmd, { stdio: 'pipe' });
      
      // Step 3: Run the executable
      const output = execSync(exeFile, {
        encoding: 'utf-8',
        stdio: 'pipe'
      });
      
      return {
        mode: 'ownership-native',
        passed: true,
        output: output.trim(),
        duration: Date.now() - start
      };
    } catch (error: any) {
      return {
        mode: 'ownership-native',
        passed: false,
        error: error.message,
        output: error.stdout?.toString(),
        duration: Date.now() - start
      };
    }
  }
  
  private validateOutputMatch(suite: TestSuite): void {
    const tsResult = suite.results.find(r => r.mode === 'typescript');
    const gcResult = suite.results.find(r => r.mode === 'gc-native');
    const ownResult = suite.results.find(r => r.mode === 'ownership-native');
    
    if (!tsResult?.passed) {
      console.log('  ❌ TypeScript tests failed - skipping comparison');
      if (tsResult?.error) {
        console.log('     Error:', tsResult.error.substring(0, 200));
      }
      if (tsResult?.output) {
        console.log('     Output:', tsResult.output.substring(0, 200));
      }
      return;
    }
    
    let allMatch = true;
    
    // Compare GC mode output
    if (gcResult?.passed) {
      if (this.normalizeOutput(gcResult.output!) === this.normalizeOutput(tsResult.output!)) {
        console.log('  ✅ GC Native output matches TypeScript');
      } else {
        console.log('  ❌ GC Native output DIFFERS from TypeScript');
        allMatch = false;
      }
    } else {
      console.log('  ❌ GC Native compilation/execution failed');
      allMatch = false;
    }
    
    // Compare Ownership mode output
    if (ownResult?.passed) {
      if (this.normalizeOutput(ownResult.output!) === this.normalizeOutput(tsResult.output!)) {
        console.log('  ✅ Ownership Native output matches TypeScript');
      } else {
        console.log('  ❌ Ownership Native output DIFFERS from TypeScript');
        allMatch = false;
      }
    } else {
      console.log('  ❌ Ownership Native compilation/execution failed');
      allMatch = false;
    }
    
    if (allMatch) {
      console.log('  🎉 All three modes produce identical output!');
    }
  }
  
  private normalizeOutput(output: string): string {
    // Normalize whitespace, line endings, etc.
    return output
      .replace(/\r\n/g, '\n')
      .replace(/\s+$/gm, '')
      .trim();
  }
  
  private printSummary(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Summary\n');
    
    let totalSuites = this.suites.length;
    let passedSuites = 0;
    
    for (const suite of this.suites) {
      const tsPass = suite.results.find(r => r.mode === 'typescript')?.passed ?? false;
      const gcPass = suite.results.find(r => r.mode === 'gc-native')?.passed ?? false;
      const ownPass = suite.results.find(r => r.mode === 'ownership-native')?.passed ?? false;
      
      const allPass = tsPass && gcPass && ownPass;
      if (allPass) passedSuites++;
      
      const icon = allPass ? '✅' : '❌';
      console.log(`${icon} ${suite.name}: TS=${tsPass ? '✓' : '✗'} GC=${gcPass ? '✓' : '✗'} Own=${ownPass ? '✓' : '✗'}`);
    }
    
    console.log(`\n${passedSuites}/${totalSuites} test suites passed all three modes`);
    
    if (passedSuites === totalSuites) {
      console.log('\n🎉 SUCCESS! All tests pass in all modes!\n');
      process.exit(0);
    } else {
      console.log('\n❌ FAILURE: Some tests failed\n');
      process.exit(1);
    }
  }
}

// CLI
const libPath = process.argv[2] || process.cwd();
const runner = new TripleTestRunner(libPath);
runner.runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
