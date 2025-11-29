/**
 * String pool demonstrating:
 * - share<string> for shared string references (heap-allocated)
 * - String deduplication
 * - Map with share<T> values
 * 
 * KNOWN ISSUES (C++ codegen bugs to fix):
 * - share<string> should map to gs::shared_ptr<std::string> but needs proper construction
 * - Map.get() returns std::optional<V> but codegen doesn't handle it correctly
 * - String literals need wrapping when assigned to share<string>
 */

class StringPool {
  private strings: Map<string, share<string>>;
  private stats: Map<string, number>;

  constructor() {
    this.strings = new Map<string, share<string>>();
    this.stats = new Map<string, number>();
  }

  intern(value: string): share<string> {
    const existing = this.strings.get(value);
    if (existing !== undefined) {
      // Increment reference count
      const count = this.stats.get(value);
      if (count !== undefined) {
        this.stats.set(value, count + 1);
      }
      return existing;
    }

    // Create new shared string - explicitly typed to ensure proper wrapping
    const shared: share<string> = value;
    this.strings.set(value, shared);
    this.stats.set(value, 1);
    return shared;
  }

  getCount(value: string): number {
    const count = this.stats.get(value);
    if (count === undefined) {
      return 0;
    }
    return count;
  }

  size(): number {
    return this.strings.size;
  }

  uniqueStrings(): number {
    return this.strings.size;
  }

  totalReferences(): number {
    let total = 0;
    for (const [key, count] of this.stats) {
      total = total + count;
    }
    return total;
  }
}

// Test string pool
const pool = new StringPool();

console.log('Interning strings...');
const s1 = pool.intern('hello');
const s2 = pool.intern('world');
const s3 = pool.intern('hello');  // Should reuse s1
const s4 = pool.intern('hello');  // Should reuse s1 again
const s5 = pool.intern('world');  // Should reuse s2

console.log(`Unique strings: ${pool.uniqueStrings()}`);
console.log(`Total references: ${pool.totalReferences()}`);
console.log(`'hello' count: ${pool.getCount('hello')}`);
console.log(`'world' count: ${pool.getCount('world')}`);

// Test with multiple words
const words = 'the quick brown fox jumps over the lazy dog the fox'.split(' ');
console.log(`\nProcessing ${words.length} words...`);

for (let i = 0; i < words.length; i++) {
  pool.intern(words[i]);
}

console.log(`Unique strings: ${pool.uniqueStrings()}`);
console.log(`Total references: ${pool.totalReferences()}`);

// Show frequency of each unique string
console.log('\nWord frequencies:');
const seen = new Map<string, boolean>();
for (let i = 0; i < words.length; i++) {
  const word = words[i];
  const alreadySeen = seen.get(word);
  if (alreadySeen === undefined) {
    seen.set(word, true);
    console.log(`  '${word}': ${pool.getCount(word)}`);
  }
}
