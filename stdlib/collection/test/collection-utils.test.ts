/**
 * Tests for collection utility functions
 */

import { describe, it, expect } from 'vitest';
import { groupBy, lastBy, minBy, maxBy, mergeMaps } from '../src/collection-utils-gs';

describe('groupBy', () => {
  it('groups numbers by parity', () => {
    const numbers = [1, 2, 3, 4, 5, 6];
    const grouped = groupBy(numbers, n => n % 2);
    
    expect(grouped.size).toBe(2);
    expect(grouped.get(1)).toEqual([1, 3, 5]);
    expect(grouped.get(0)).toEqual([2, 4, 6]);
  });
  
  it('groups objects by property', () => {
    const people = [
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
      { name: 'Charlie', age: 30 },
      { name: 'David', age: 25 }
    ];
    
    const byAge = groupBy(people, p => p.age);
    
    expect(byAge.size).toBe(2);
    expect(byAge.get(30)?.map(p => p.name)).toEqual(['Alice', 'Charlie']);
    expect(byAge.get(25)?.map(p => p.name)).toEqual(['Bob', 'David']);
  });
  
  it('preserves order within groups', () => {
    const items = [
      { key: 'a', value: 1 },
      { key: 'b', value: 2 },
      { key: 'a', value: 3 },
      { key: 'b', value: 4 }
    ];
    
    const grouped = groupBy(items, item => item.key);
    
    expect(grouped.get('a')?.map(i => i.value)).toEqual([1, 3]);
    expect(grouped.get('b')?.map(i => i.value)).toEqual([2, 4]);
  });
  
  it('handles empty array', () => {
    const empty: number[] = [];
    const grouped = groupBy(empty, n => n);
    
    expect(grouped.size).toBe(0);
  });
  
  it('handles single element', () => {
    const single = [42];
    const grouped = groupBy(single, n => n);
    
    expect(grouped.size).toBe(1);
    expect(grouped.get(42)).toEqual([42]);
  });
  
  it('handles all elements with same key', () => {
    const numbers = [1, 2, 3, 4, 5];
    const grouped = groupBy(numbers, () => 'same');
    
    expect(grouped.size).toBe(1);
    expect(grouped.get('same')).toEqual([1, 2, 3, 4, 5]);
  });
  
  it('handles string keys', () => {
    const words = ['apple', 'apricot', 'banana', 'blueberry', 'cherry'];
    const byFirstLetter = groupBy(words, w => w[0]);
    
    expect(byFirstLetter.size).toBe(3);
    expect(byFirstLetter.get('a')).toEqual(['apple', 'apricot']);
    expect(byFirstLetter.get('b')).toEqual(['banana', 'blueberry']);
    expect(byFirstLetter.get('c')).toEqual(['cherry']);
  });
});

describe('lastBy', () => {
  it('keeps last value for each key', () => {
    const items = [
      { id: 1, name: 'First' },
      { id: 2, name: 'Second' },
      { id: 1, name: 'Updated First' }
    ];
    
    const byId = lastBy(items, item => item.id);
    
    expect(byId.size).toBe(2);
    expect(byId.get(1)?.name).toBe('Updated First');
    expect(byId.get(2)?.name).toBe('Second');
  });
  
  it('handles all unique keys', () => {
    const items = [
      { id: 1, value: 'a' },
      { id: 2, value: 'b' },
      { id: 3, value: 'c' }
    ];
    
    const byId = lastBy(items, item => item.id);
    
    expect(byId.size).toBe(3);
    expect(byId.get(1)?.value).toBe('a');
    expect(byId.get(2)?.value).toBe('b');
    expect(byId.get(3)?.value).toBe('c');
  });
  
  it('handles empty array', () => {
    const empty: Array<{ id: number }> = [];
    const byId = lastBy(empty, item => item.id);
    
    expect(byId.size).toBe(0);
  });
  
  it('handles single element', () => {
    const single = [{ id: 42, name: 'Answer' }];
    const byId = lastBy(single, item => item.id);
    
    expect(byId.size).toBe(1);
    expect(byId.get(42)?.name).toBe('Answer');
  });
  
  it('overwrites earlier values', () => {
    const versions = [
      { key: 'config', version: 1 },
      { key: 'config', version: 2 },
      { key: 'config', version: 3 }
    ];
    
    const latest = lastBy(versions, v => v.key);
    
    expect(latest.size).toBe(1);
    expect(latest.get('config')?.version).toBe(3);
  });
});

describe('minBy', () => {
  it('finds element with minimum value', () => {
    const people = [
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
      { name: 'Charlie', age: 35 }
    ];
    
    const youngest = minBy(people, p => p.age);
    
    expect(youngest).not.toBe(null);
    expect(youngest?.name).toBe('Bob');
    expect(youngest?.age).toBe(25);
  });
  
  it('finds minimum with custom compare', () => {
    const numbers = [5, 2, 8, 1, 9];
    const min = minBy(
      numbers,
      n => n,
      (a, b) => a - b
    );
    
    expect(min).toBe(1);
  });
  
  it('handles ties (returns first)', () => {
    const items = [
      { id: 1, score: 10 },
      { id: 2, score: 5 },
      { id: 3, score: 5 },
      { id: 4, score: 10 }
    ];
    
    const minScore = minBy(items, item => item.score);
    
    expect(minScore?.id).toBe(2); // First with score 5
  });
  
  it('returns null for empty array', () => {
    const empty: number[] = [];
    const min = minBy(empty, n => n);
    
    expect(min).toBe(null);
  });
  
  it('handles single element', () => {
    const single = [{ value: 42 }];
    const min = minBy(single, item => item.value);
    
    expect(min?.value).toBe(42);
  });
  
  it('works with string ordering', () => {
    const words = ['zebra', 'apple', 'mango', 'banana'];
    const first = minBy(words, w => w);
    
    expect(first).toBe('apple');
  });
  
  it('works with negative numbers', () => {
    const numbers = [5, -2, 8, -10, 3];
    const min = minBy(numbers, n => n);
    
    expect(min).toBe(-10);
  });
});

describe('maxBy', () => {
  it('finds element with maximum value', () => {
    const people = [
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
      { name: 'Charlie', age: 35 }
    ];
    
    const oldest = maxBy(people, p => p.age);
    
    expect(oldest).not.toBe(null);
    expect(oldest?.name).toBe('Charlie');
    expect(oldest?.age).toBe(35);
  });
  
  it('finds maximum with custom compare', () => {
    const numbers = [5, 2, 8, 1, 9];
    const max = maxBy(
      numbers,
      n => n,
      (a, b) => a - b
    );
    
    expect(max).toBe(9);
  });
  
  it('handles ties (returns first)', () => {
    const items = [
      { id: 1, score: 10 },
      { id: 2, score: 5 },
      { id: 3, score: 10 },
      { id: 4, score: 5 }
    ];
    
    const maxScore = maxBy(items, item => item.score);
    
    expect(maxScore?.id).toBe(1); // First with score 10
  });
  
  it('returns null for empty array', () => {
    const empty: number[] = [];
    const max = maxBy(empty, n => n);
    
    expect(max).toBe(null);
  });
  
  it('handles single element', () => {
    const single = [{ value: 42 }];
    const max = maxBy(single, item => item.value);
    
    expect(max?.value).toBe(42);
  });
  
  it('works with string ordering', () => {
    const words = ['zebra', 'apple', 'mango', 'banana'];
    const last = maxBy(words, w => w);
    
    expect(last).toBe('zebra');
  });
  
  it('works with negative numbers', () => {
    const numbers = [-5, -2, -8, -10, -3];
    const max = maxBy(numbers, n => n);
    
    expect(max).toBe(-2);
  });
});

describe('mergeMaps', () => {
  it('merges disjoint maps', () => {
    const map1 = new Map([['a', 1], ['b', 2]]);
    const map2 = new Map([['c', 3], ['d', 4]]);
    
    const merged = mergeMaps(map1, map2);
    
    expect(merged.size).toBe(4);
    expect(merged.get('a')).toBe(1);
    expect(merged.get('b')).toBe(2);
    expect(merged.get('c')).toBe(3);
    expect(merged.get('d')).toBe(4);
  });
  
  it('overwrites with map2 by default', () => {
    const map1 = new Map([['a', 1], ['b', 2]]);
    const map2 = new Map([['b', 20], ['c', 3]]);
    
    const merged = mergeMaps(map1, map2);
    
    expect(merged.size).toBe(3);
    expect(merged.get('a')).toBe(1);
    expect(merged.get('b')).toBe(20); // Overwritten
    expect(merged.get('c')).toBe(3);
  });
  
  it('uses value function to resolve conflicts', () => {
    const map1 = new Map([['a', 1], ['b', 2]]);
    const map2 = new Map([['b', 3], ['c', 4]]);
    
    const merged = mergeMaps(map1, map2, (v1, v2) => v1 + v2);
    
    expect(merged.size).toBe(3);
    expect(merged.get('a')).toBe(1);
    expect(merged.get('b')).toBe(5); // 2 + 3
    expect(merged.get('c')).toBe(4);
  });
  
  it('handles empty maps', () => {
    const map1 = new Map<string, number>();
    const map2 = new Map([['a', 1]]);
    
    const merged1 = mergeMaps(map1, map2);
    expect(merged1.size).toBe(1);
    expect(merged1.get('a')).toBe(1);
    
    const merged2 = mergeMaps(map2, map1);
    expect(merged2.size).toBe(1);
    expect(merged2.get('a')).toBe(1);
    
    const merged3 = mergeMaps(map1, new Map());
    expect(merged3.size).toBe(0);
  });
  
  it('creates new map (does not modify originals)', () => {
    const map1 = new Map([['a', 1]]);
    const map2 = new Map([['b', 2]]);
    
    const merged = mergeMaps(map1, map2);
    
    expect(map1.size).toBe(1);
    expect(map2.size).toBe(1);
    expect(merged.size).toBe(2);
  });
  
  it('handles complex value types', () => {
    const map1 = new Map([
      ['user1', { name: 'Alice', score: 10 }],
      ['user2', { name: 'Bob', score: 20 }]
    ]);
    const map2 = new Map([
      ['user2', { name: 'Bob', score: 15 }],
      ['user3', { name: 'Charlie', score: 30 }]
    ]);
    
    const merged = mergeMaps(
      map1,
      map2,
      (v1, v2) => ({ name: v2.name, score: v1.score + v2.score })
    );
    
    expect(merged.size).toBe(3);
    expect(merged.get('user1')?.score).toBe(10);
    expect(merged.get('user2')?.score).toBe(35); // 20 + 15
    expect(merged.get('user3')?.score).toBe(30);
  });
  
  it('handles multiple conflicts', () => {
    const map1 = new Map([['a', 1], ['b', 2], ['c', 3]]);
    const map2 = new Map([['a', 10], ['b', 20], ['c', 30]]);
    
    const merged = mergeMaps(map1, map2, (v1, v2) => v1 * v2);
    
    expect(merged.size).toBe(3);
    expect(merged.get('a')).toBe(10); // 1 * 10
    expect(merged.get('b')).toBe(40); // 2 * 20
    expect(merged.get('c')).toBe(90); // 3 * 30
  });
});

describe('stress tests', () => {
  it('groupBy handles 1000 elements', () => {
    const items: Array<{ key: number; value: number }> = [];
    for (let i = 0; i < 1000; i++) {
      items.push({ key: i % 10, value: i });
    }
    
    const grouped = groupBy(items, item => item.key);
    
    expect(grouped.size).toBe(10);
    for (let i = 0; i < 10; i++) {
      expect(grouped.get(i)?.length).toBe(100);
    }
  });
  
  it('minBy/maxBy handle 1000 elements', () => {
    const numbers: number[] = [];
    for (let i = 0; i < 1000; i++) {
      numbers.push(Math.floor(Math.random() * 10000));
    }
    
    const min = minBy(numbers, n => n);
    const max = maxBy(numbers, n => n);
    
    expect(min).not.toBe(null);
    expect(max).not.toBe(null);
    
    if (min !== null && max !== null) {
      for (const n of numbers) {
        expect(n).toBeGreaterThanOrEqual(min);
        expect(n).toBeLessThanOrEqual(max);
      }
    }
  });
  
  it('mergeMaps handles 1000 entries', () => {
    const map1 = new Map<number, number>();
    const map2 = new Map<number, number>();
    
    for (let i = 0; i < 500; i++) {
      map1.set(i, i * 2);
    }
    
    for (let i = 250; i < 750; i++) {
      map2.set(i, i * 3);
    }
    
    const merged = mergeMaps(map1, map2, (v1, v2) => v1 + v2);
    
    expect(merged.size).toBe(750);
    
    // Check non-overlapping regions
    expect(merged.get(0)).toBe(0);
    expect(merged.get(600)).toBe(1800);
    
    // Check overlapping region (250-499)
    expect(merged.get(300)).toBe(1500); // 600 + 900
  });
});
