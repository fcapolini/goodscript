/**
 * HashMap operations demonstrating:
 * - Map<K, V> usage
 * - Iteration over keys/values
 * - String manipulation
 * - Control flow
 * 
 * KNOWN ISSUES (C++ codegen bugs to fix):
 * - Map.get() returns std::optional<V> but codegen doesn't unwrap it for arithmetic
 * - for-of with Map entries doesn't generate proper destructuring [key, value]
 * - Tuple types in return values (e.g., [string, number][]) need proper std::tuple mapping
 */

class Counter {
  private counts: Map<string, number>;

  constructor() {
    this.counts = new Map<string, number>();
  }

  increment(key: string): void {
    const current = this.counts.get(key);
    if (current === undefined) {
      this.counts.set(key, 1);
    } else {
      this.counts.set(key, current + 1);
    }
  }

  get(key: string): number {
    const value = this.counts.get(key);
    if (value === undefined) {
      return 0;
    }
    return value;
  }

  total(): number {
    let sum = 0;
    for (const [key, value] of this.counts) {
      sum = sum + value;
    }
    return sum;
  }

  keys(): string[] {
    const result: string[] = [];
    for (const [key, value] of this.counts) {
      result.push(key);
    }
    return result;
  }

  sortedEntries(): [string, number][] {
    const entries: [string, number][] = [];
    for (const [key, value] of this.counts) {
      entries.push([key, value]);
    }
    
    // Simple bubble sort by value (descending)
    for (let i = 0; i < entries.length; i++) {
      for (let j = 0; j < entries.length - i - 1; j++) {
        if (entries[j][1] < entries[j + 1][1]) {
          const temp = entries[j];
          entries[j] = entries[j + 1];
          entries[j + 1] = temp;
        }
      }
    }
    
    return entries;
  }
}

const countWords = (text: string): Counter => {
  const counter = new Counter();
  const words = text.split(' ');
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i].toLowerCase();
    if (word.length > 0) {
      counter.increment(word);
    }
  }
  
  return counter;
};

// Test word counting
const text = 'the quick brown fox jumps over the lazy dog the fox was quick';
console.log(`Text: "${text}"`);

const counter = countWords(text);
console.log(`Total words: ${counter.total()}`);

console.log('\nWord frequencies (sorted by count):');
const sorted = counter.sortedEntries();
for (let i = 0; i < sorted.length; i++) {
  const entry = sorted[i];
  console.log(`  ${entry[0]}: ${entry[1]}`);
}

// Test specific word counts
console.log('\nSpecific counts:');
console.log(`  "the": ${counter.get('the')}`);
console.log(`  "fox": ${counter.get('fox')}`);
console.log(`  "quick": ${counter.get('quick')}`);
console.log(`  "missing": ${counter.get('missing')}`);
