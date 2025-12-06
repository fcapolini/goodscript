import { describe, it, expect } from 'vitest';
import { minBy, maxBy } from '../src/min-max-by-gs';

describe('minBy', () => {
  it('finds element with minimum value', () => {
    const numbers = [3, 1, 4, 1, 5, 9, 2, 6];
    const result = minBy(numbers, x => x);
    expect(result).toBe(1);
  });
  
  it('finds element with minimum projected value', () => {
    const people = [
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
      { name: 'Charlie', age: 35 }
    ];
    const youngest = minBy(people, p => p.age);
    expect(youngest).toEqual({ name: 'Bob', age: 25 });
  });
  
  it('returns null for empty iterable', () => {
    const result = minBy([], x => x);
    expect(result).toBe(null);
  });
  
  it('uses custom comparator', () => {
    const words = ['apple', 'pie', 'banana', 'split'];
    const shortest = minBy(words, w => w.length, (a, b) => a - b);
    expect(shortest).toBe('pie');
  });
  
  it('handles string comparison', () => {
    const items = [
      { id: 'c', value: 10 },
      { id: 'a', value: 20 },
      { id: 'b', value: 15 }
    ];
    const result = minBy(items, x => x.id);
    expect(result).toEqual({ id: 'a', value: 20 });
  });
  
  it('handles negative numbers', () => {
    const numbers = [5, -3, 8, -10, 0];
    const result = minBy(numbers, x => x);
    expect(result).toBe(-10);
  });
  
  it('returns first element when all equal', () => {
    const items = [
      { name: 'a', value: 5 },
      { name: 'b', value: 5 },
      { name: 'c', value: 5 }
    ];
    const result = minBy(items, x => x.value);
    expect(result).toEqual({ name: 'a', value: 5 });
  });
  
  it('handles single element', () => {
    const result = minBy([42], x => x);
    expect(result).toBe(42);
  });
  
  it('works with complex projections', () => {
    const data = [
      { scores: [80, 90, 70] },
      { scores: [60, 85, 95] },
      { scores: [90, 95, 100] }
    ];
    const result = minBy(data, x => x.scores[0]);
    expect(result).toEqual({ scores: [60, 85, 95] });
  });
  
  it('handles ties by returning first occurrence', () => {
    const numbers = [3, 1, 4, 1, 5];
    const result = minBy(numbers, x => x);
    expect(result).toBe(1);
  });
});

describe('maxBy', () => {
  it('finds element with maximum value', () => {
    const numbers = [3, 1, 4, 1, 5, 9, 2, 6];
    const result = maxBy(numbers, x => x);
    expect(result).toBe(9);
  });
  
  it('finds element with maximum projected value', () => {
    const people = [
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
      { name: 'Charlie', age: 35 }
    ];
    const oldest = maxBy(people, p => p.age);
    expect(oldest).toEqual({ name: 'Charlie', age: 35 });
  });
  
  it('returns null for empty iterable', () => {
    const result = maxBy([], x => x);
    expect(result).toBe(null);
  });
  
  it('uses custom comparator', () => {
    const words = ['apple', 'pie', 'banana', 'split'];
    const longest = maxBy(words, w => w.length, (a, b) => a - b);
    expect(longest).toBe('banana');
  });
  
  it('handles string comparison', () => {
    const items = [
      { id: 'c', value: 10 },
      { id: 'a', value: 20 },
      { id: 'b', value: 15 }
    ];
    const result = maxBy(items, x => x.id);
    expect(result).toEqual({ id: 'c', value: 10 });
  });
  
  it('handles negative numbers', () => {
    const numbers = [5, -3, 8, -10, 0];
    const result = maxBy(numbers, x => x);
    expect(result).toBe(8);
  });
  
  it('returns first element when all equal', () => {
    const items = [
      { name: 'a', value: 5 },
      { name: 'b', value: 5 },
      { name: 'c', value: 5 }
    ];
    const result = maxBy(items, x => x.value);
    expect(result).toEqual({ name: 'a', value: 5 });
  });
  
  it('handles single element', () => {
    const result = maxBy([42], x => x);
    expect(result).toBe(42);
  });
  
  it('works with complex projections', () => {
    const data = [
      { scores: [80, 90, 70] },
      { scores: [60, 85, 95] },
      { scores: [90, 95, 100] }
    ];
    const result = maxBy(data, x => x.scores[2]);
    expect(result).toEqual({ scores: [90, 95, 100] });
  });
  
  it('handles ties by returning first occurrence', () => {
    const numbers = [9, 3, 9, 1, 5];
    const result = maxBy(numbers, x => x);
    expect(result).toBe(9);
  });
});

describe('minBy and maxBy edge cases', () => {
  it('work with Set', () => {
    const set = new Set([3, 1, 4, 1, 5, 9]);
    const min = minBy(set, x => x);
    const max = maxBy(set, x => x);
    expect(min).toBe(1);
    expect(max).toBe(9);
  });
  
  it('work with Map values', () => {
    const map = new Map([
      ['a', 10],
      ['b', 30],
      ['c', 20]
    ]);
    const minEntry = minBy(map, ([, v]) => v);
    const maxEntry = maxBy(map, ([, v]) => v);
    expect(minEntry).toEqual(['a', 10]);
    expect(maxEntry).toEqual(['b', 30]);
  });
  
  it('handle reverse comparator', () => {
    const numbers = [3, 1, 4, 1, 5, 9, 2, 6];
    // Reverse comparator swaps min and max
    const reverseCompare = (a: number, b: number) => b - a;
    const min = minBy(numbers, x => x, reverseCompare);
    const max = maxBy(numbers, x => x, reverseCompare);
    expect(min).toBe(9); // max value with reversed comparator
    expect(max).toBe(1); // min value with reversed comparator
  });
  
  it('handle floating point numbers', () => {
    const numbers = [3.14, 2.71, 1.41, 1.73];
    const min = minBy(numbers, x => x);
    const max = maxBy(numbers, x => x);
    expect(min).toBe(1.41);
    expect(max).toBe(3.14);
  });
  
  it('handle large datasets', () => {
    const large = Array.from({ length: 10000 }, (_, i) => ({ id: i, value: i * 2 }));
    const min = minBy(large, x => x.value);
    const max = maxBy(large, x => x.value);
    expect(min).toEqual({ id: 0, value: 0 });
    expect(max).toEqual({ id: 9999, value: 19998 });
  });
});
