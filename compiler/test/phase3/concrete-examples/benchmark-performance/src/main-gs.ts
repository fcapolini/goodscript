/**
 * Performance Benchmark Suite
 * 
 * Tests various computational workloads to compare
 * GoodScript C++ vs Node.js performance.
 * 
 * Benchmarks included:
 * 1. Fibonacci (recursive) - function call overhead
 * 2. Array operations - memory allocation and iteration
 * 3. Binary search - algorithm performance
 * 4. Bubble sort - nested loops and array access
 * 5. Hash map operations - data structure performance
 * 6. String manipulation - string operations
 */

// Get current timestamp in milliseconds
const now = (): number => {
  return Date.now();
};

// Benchmark 1: Recursive Fibonacci
const fibonacci = (n: number): number => {
  if (n <= 1) {
    return n;
  }
  return fibonacci(n - 1) + fibonacci(n - 2);
};

const benchFibonacci = (n: number): number => {
  const start = now();
  const result = fibonacci(n);
  const elapsed = now() - start;
  console.log('Fibonacci(' + n.toString() + ') = ' + result.toString() + ', time: ' + elapsed.toString() + 'ms');
  return elapsed;
};

// Benchmark 2: Array Operations (increased size)
const benchArrayOps = (size: number): number => {
  const start = now();
  
  const arr = new Array<number>();
  for (let i = 0; i < size; i++) {
    arr.push(i);
  }
  
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    sum = sum + arr[i];
  }
  
  const filtered = new Array<number>();
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] % 2 === 0) {
      filtered.push(arr[i]);
    }
  }
  
  const elapsed = now() - start;
  console.log('Array ops (' + size.toString() + ' elements): sum=' + sum.toString() + ', filtered=' + filtered.length.toString() + ', time: ' + elapsed.toString() + 'ms');
  return elapsed;
};

// Benchmark 3: Binary Search (repeated searches)
const binarySearch = (arr: number[], target: number): number => {
  let left = 0;
  let right = arr.length - 1;
  
  while (left <= right) {
    const mid = left + ((right - left) / 2);
    const midIdx = mid - (mid % 1);  // floor
    const midVal = arr[midIdx];
    
    if (midVal === target) {
      return midIdx;
    } else if (midVal < target) {
      left = midIdx + 1;
    } else {
      right = midIdx - 1;
    }
  }
  
  return -1;
};

const benchBinarySearch = (size: number, searches: number): number => {
  const start = now();
  
  // Create sorted array
  const arr = new Array<number>();
  for (let i = 0; i < size; i++) {
    arr.push(i);
  }
  
  // Perform multiple searches
  let found = 0;
  for (let i = 0; i < searches; i++) {
    const target = i % size;
    const idx = binarySearch(arr, target);
    if (idx >= 0) {
      found = found + 1;
    }
  }
  
  const elapsed = now() - start;
  console.log('Binary search (' + searches.toString() + ' searches in ' + size.toString() + ' elements): found=' + found.toString() + ', time: ' + elapsed.toString() + 'ms');
  return elapsed;
};

// Benchmark 4: Bubble Sort
const bubbleSort = (arr: number[]): void => {
  const n = arr.length;
  
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        const temp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = temp;
      }
    }
  }
};

// Optimized version using set_unchecked (bounds are proven safe)
const bubbleSortOptimized = (arr: number[]): void => {
  const n = arr.length;
  
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      const val1 = arr[j];
      const val2 = arr[j + 1];
      if (val1 > val2) {
        arr[j] = val2;
        arr[j + 1] = val1;
      }
    }
  }
};

const benchBubbleSort = (size: number): number => {
  const start = now();
  
  // Create reverse-sorted array
  const arr = new Array<number>();
  for (let i = size - 1; i >= 0; i--) {
    arr.push(i);
  }
  
  bubbleSortOptimized(arr);
  
  const elapsed = now() - start;
  console.log('Bubble sort (' + size.toString() + ' elements): first=' + arr[0].toString() + ', last=' + arr[arr.length - 1].toString() + ', time: ' + elapsed.toString() + 'ms');
  return elapsed;
};

// Benchmark 5: Hash Map Operations
const benchHashMap = (operations: number): number => {
  const start = now();
  
  const map = new Map<string, number>();
  
  // Insert operations
  for (let i = 0; i < operations; i++) {
    const key = 'key' + i.toString();
    map.set(key, i);
  }
  
  // Lookup operations
  let sum = 0;
  for (let i = 0; i < operations; i++) {
    const key = 'key' + i.toString();
    const val = map.get(key);
    if (val !== null && val !== undefined) {
      sum = sum + val;
    }
  }
  
  // Delete operations
  let deleted = 0;
  for (let i = 0; i < operations; i = i + 2) {
    const key = 'key' + i.toString();
    if (map.delete(key)) {
      deleted = deleted + 1;
    }
  }
  
  const elapsed = now() - start;
  console.log('HashMap ops (' + operations.toString() + ' operations): sum=' + sum.toString() + ', deleted=' + deleted.toString() + ', time: ' + elapsed.toString() + 'ms');
  return elapsed;
};

// Benchmark 6: String Manipulation
const benchStringOps = (iterations: number): number => {
  const start = now();
  
  // Test 1: String building with concatenation (tests move optimizations)
  let result = '';
  for (let i = 0; i < iterations / 1000; i++) {
    result = result + 'test';
  }
  
  // Test 2: Substring operations
  const base = 'The quick brown fox jumps over the lazy dog';
  let substringCount = 0;
  for (let i = 0; i < iterations / 100; i++) {
    const sub = base.substring(4, 19);  // 'quick brown fox'
    if (sub.length === 15) {
      substringCount = substringCount + 1;
    }
  }
  
  // Test 3: Character scanning (optimized with charCodeAt)
  const text = 'abcdefghijklmnopqrstuvwxyz0123456789'.repeat(50);  // 1800 chars
  let charCount = 0;
  const aCode = 'a'.charCodeAt(0);
  const zCode = 'z'.charCodeAt(0);
  for (let i = 0; i < iterations / 10; i++) {
    for (let j = 0; j < text.length; j++) {
      const code = text.charCodeAt(j);
      if (code >= aCode && code <= zCode) {
        charCount = charCount + 1;
      }
    }
  }
  
  // Test 4: String searching
  const searchText = 'Lorem ipsum dolor sit amet consectetur adipiscing elit'.repeat(10);
  let findCount = 0;
  for (let i = 0; i < iterations / 100; i++) {
    if (searchText.indexOf('dolor') >= 0) {
      findCount = findCount + 1;
    }
    if (searchText.indexOf('missing') < 0) {
      findCount = findCount + 1;
    }
  }
  
  const elapsed = now() - start;
  console.log('String ops (' + iterations.toString() + ' iterations): built=' + result.length.toString() + ', substrings=' + substringCount.toString() + ', chars=' + charCount.toString() + ', searches=' + findCount.toString() + ', time: ' + elapsed.toString() + 'ms');
  return elapsed;
};

// Run all benchmarks
console.log('=== GoodScript Performance Benchmark Suite ===');
console.log('');

console.log('--- Benchmark 1: Recursive Fibonacci ---');
const fibTime = benchFibonacci(40);  // Increased from 38 for more significant timing

console.log('');
console.log('--- Benchmark 2: Array Operations ---');
const arrayTime = benchArrayOps(5000000);  // Increased from 2M for more significant timing

console.log('');
console.log('--- Benchmark 3: Binary Search ---');
const binarySearchTime = benchBinarySearch(1000000, 1000000);  // Increased 10x for more significant timing

console.log('');
console.log('--- Benchmark 4: Bubble Sort ---');
const bubbleSortTime = benchBubbleSort(10000);  // Increased from 6k for more significant timing

console.log('');
console.log('--- Benchmark 5: HashMap Operations ---');
const hashMapTime = benchHashMap(500000);  // Increased from 150k for more significant timing

console.log('');
console.log('--- Benchmark 6: String Manipulation ---');
const stringTime = benchStringOps(2000000);  // Increased from 500k for more significant timing

console.log('');
console.log('=== Summary ===');
const totalTime = fibTime + arrayTime + binarySearchTime + bubbleSortTime + hashMapTime + stringTime;
console.log('Total time: ' + totalTime.toString() + 'ms');
