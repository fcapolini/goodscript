#!/usr/bin/env node

/**
 * Performance benchmark runner
 * Runs benchmarks in triple-mode: Node.js, GC C++, and Ownership C++
 */

import { execSync } from 'child_process';
import { readdirSync, existsSync } from 'fs';
import { join, basename } from 'path';

const PERF_DIR = import.meta.dirname || __dirname;
const COMPILER_DIR = join(PERF_DIR, '..', 'compiler');
const GSC_BIN = join(COMPILER_DIR, 'bin', 'gsc');

interface BenchmarkResult {
  mode: 'node' | 'gc' | 'ownership';
  time: number;
  output: string;
}

function findBenchmarks(): string[] {
  return readdirSync(PERF_DIR)
    .filter(f => f.endsWith('-gs.ts') && f !== 'run-benchmark.ts')
    .map(f => join(PERF_DIR, f));
}

function runNodeBenchmark(file: string): BenchmarkResult {
  console.log('  Running in Node.js...');
  const start = Date.now();
  const output = execSync(`tsx ${file}`, {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
  const time = Date.now() - start;
  
  return { mode: 'node', time, output };
}

function runGCBenchmark(file: string): BenchmarkResult {
  const name = basename(file, '-gs.ts');
  const outBin = join(PERF_DIR, `${name}-gc`);
  
  console.log('  Compiling with GC mode...');
  execSync(`${GSC_BIN} --gsTarget cpp --gsMemory gc -o ${outBin} ${file}`, {
    encoding: 'utf-8',
    stdio: 'inherit'
  });
  
  console.log('  Running GC binary...');
  const start = Date.now();
  const output = execSync(outBin, {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
  const time = Date.now() - start;
  
  return { mode: 'gc', time, output };
}

function runOwnershipBenchmark(file: string): BenchmarkResult {
  const name = basename(file, '-gs.ts');
  const outBin = join(PERF_DIR, `${name}-ownership`);
  
  console.log('  Compiling with Ownership mode...');
  execSync(`${GSC_BIN} --gsTarget cpp --gsMemory ownership -o ${outBin} ${file}`, {
    encoding: 'utf-8',
    stdio: 'inherit'
  });
  
  console.log('  Running Ownership binary...');
  const start = Date.now();
  const output = execSync(outBin, {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
  const time = Date.now() - start;
  
  return { mode: 'ownership', time, output };
}

function formatResults(name: string, results: BenchmarkResult[]): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Benchmark: ${name}`);
  console.log('='.repeat(60));
  
  for (const result of results) {
    console.log(`\n${result.mode.toUpperCase()} (${result.time}ms):`);
    console.log('-'.repeat(60));
    console.log(result.output.trim());
  }
  
  // Compare results
  const nodeTime = results.find(r => r.mode === 'node')?.time ?? 0;
  const gcTime = results.find(r => r.mode === 'gc')?.time ?? 0;
  const ownershipTime = results.find(r => r.mode === 'ownership')?.time ?? 0;
  
  console.log('\n' + '='.repeat(60));
  console.log('Performance Comparison:');
  console.log('='.repeat(60));
  console.log(`Node.js:    ${nodeTime}ms (baseline)`);
  console.log(`GC C++:     ${gcTime}ms (${(gcTime / nodeTime).toFixed(2)}x)`);
  console.log(`Ownership:  ${ownershipTime}ms (${(ownershipTime / nodeTime).toFixed(2)}x)`);
  
  const fastest = Math.min(nodeTime, gcTime, ownershipTime);
  const fastestMode = 
    fastest === nodeTime ? 'Node.js' :
    fastest === gcTime ? 'GC C++' :
    'Ownership C++';
  console.log(`\nFastest: ${fastestMode}`);
}

function main(): void {
  const args = process.argv.slice(2);
  const mode = args.find(a => ['node', 'gc', 'ownership'].includes(a));
  const benchmarkName = args.find(a => !['node', 'gc', 'ownership'].includes(a));
  
  let benchmarks = findBenchmarks();
  
  if (benchmarkName) {
    benchmarks = benchmarks.filter(b => basename(b).includes(benchmarkName));
    if (benchmarks.length === 0) {
      console.error(`No benchmark found matching: ${benchmarkName}`);
      process.exit(1);
    }
  }
  
  console.log(`Running ${benchmarks.length} benchmark(s)...\n`);
  
  for (const benchmark of benchmarks) {
    const name = basename(benchmark, '-gs.ts');
    console.log(`\nBenchmark: ${name}`);
    console.log('-'.repeat(60));
    
    const results: BenchmarkResult[] = [];
    
    try {
      if (!mode || mode === 'node') {
        results.push(runNodeBenchmark(benchmark));
      }
      
      if (!mode || mode === 'gc') {
        results.push(runGCBenchmark(benchmark));
      }
      
      if (!mode || mode === 'ownership') {
        results.push(runOwnershipBenchmark(benchmark));
      }
      
      formatResults(name, results);
    } catch (error) {
      console.error(`\nError running benchmark ${name}:`, error);
    }
  }
}

main();
