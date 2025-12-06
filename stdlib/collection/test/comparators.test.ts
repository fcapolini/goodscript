import { describe, it, expect } from 'vitest';
import {
  equalsIgnoreAsciiCase,
  hashIgnoreAsciiCase,
  compareAsciiUpperCase,
  compareAsciiLowerCase,
  compareNatural,
  compareAsciiLowerCaseNatural,
  compareAsciiUpperCaseNatural,
} from '../src/comparators-gs';

describe('equalsIgnoreAsciiCase', () => {
  it('returns true for identical strings', () => {
    expect(equalsIgnoreAsciiCase('hello', 'hello')).toBe(true);
    expect(equalsIgnoreAsciiCase('', '')).toBe(true);
    expect(equalsIgnoreAsciiCase('ABC123', 'ABC123')).toBe(true);
  });

  it('returns true for strings differing only in ASCII case', () => {
    expect(equalsIgnoreAsciiCase('hello', 'HELLO')).toBe(true);
    expect(equalsIgnoreAsciiCase('Hello', 'hELLO')).toBe(true);
    expect(equalsIgnoreAsciiCase('abc', 'ABC')).toBe(true);
    expect(equalsIgnoreAsciiCase('TeSt', 'tEsT')).toBe(true);
  });

  it('returns false for strings with different lengths', () => {
    expect(equalsIgnoreAsciiCase('hello', 'hell')).toBe(false);
    expect(equalsIgnoreAsciiCase('a', 'ab')).toBe(false);
  });

  it('returns false for strings with different characters', () => {
    expect(equalsIgnoreAsciiCase('hello', 'world')).toBe(false);
    expect(equalsIgnoreAsciiCase('abc', 'abd')).toBe(false);
  });

  it('is case-sensitive for non-ASCII characters', () => {
    // Non-ASCII characters must match exactly
    expect(equalsIgnoreAsciiCase('café', 'café')).toBe(true);
    expect(equalsIgnoreAsciiCase('café', 'CAFÉ')).toBe(false);
  });

  it('handles mixed ASCII and numbers', () => {
    expect(equalsIgnoreAsciiCase('abc123', 'ABC123')).toBe(true);
    expect(equalsIgnoreAsciiCase('test123', 'TEST123')).toBe(true);
  });
});

describe('hashIgnoreAsciiCase', () => {
  it('produces same hash for strings differing only in ASCII case', () => {
    expect(hashIgnoreAsciiCase('hello')).toBe(hashIgnoreAsciiCase('HELLO'));
    expect(hashIgnoreAsciiCase('test')).toBe(hashIgnoreAsciiCase('TEST'));
    expect(hashIgnoreAsciiCase('ABC')).toBe(hashIgnoreAsciiCase('abc'));
  });

  it('produces same hash for identical strings', () => {
    expect(hashIgnoreAsciiCase('test')).toBe(hashIgnoreAsciiCase('test'));
    expect(hashIgnoreAsciiCase('ABC')).toBe(hashIgnoreAsciiCase('ABC'));
  });

  it('typically produces different hashes for different strings', () => {
    // Note: hash collisions are possible but rare
    expect(hashIgnoreAsciiCase('hello')).not.toBe(hashIgnoreAsciiCase('world'));
  });

  it('handles empty string', () => {
    const hash = hashIgnoreAsciiCase('');
    expect(typeof hash).toBe('number');
  });

  it('produces consistent results', () => {
    const str = 'TestString123';
    const hash1 = hashIgnoreAsciiCase(str);
    const hash2 = hashIgnoreAsciiCase(str);
    expect(hash1).toBe(hash2);
  });
});

describe('compareAsciiUpperCase', () => {
  it('returns 0 for identical strings', () => {
    expect(compareAsciiUpperCase('hello', 'hello')).toBe(0);
    expect(compareAsciiUpperCase('', '')).toBe(0);
  });

  it('uses tie-breaking for case-only differences', () => {
    // Comparison uses uppercase but ties break on original case
    expect(compareAsciiUpperCase('hello', 'HELLO')).not.toBe(0);
    expect(compareAsciiUpperCase('test', 'TEST')).not.toBe(0);
  });

  it('compares lexically when different', () => {
    expect(compareAsciiUpperCase('abc', 'abd')).toBe(-1);
    expect(compareAsciiUpperCase('xyz', 'abc')).toBe(1);
    expect(compareAsciiUpperCase('apple', 'banana')).toBe(-1);
  });

  it('handles length differences', () => {
    expect(compareAsciiUpperCase('abc', 'abcd')).toBe(-1);
    expect(compareAsciiUpperCase('abcd', 'abc')).toBe(1);
  });

  it('handles numbers', () => {
    expect(compareAsciiUpperCase('a1', 'a2')).toBe(-1);
    expect(compareAsciiUpperCase('test123', 'test123')).toBe(0);
  });
});

describe('compareAsciiLowerCase', () => {
  it('returns 0 for identical strings', () => {
    expect(compareAsciiLowerCase('hello', 'hello')).toBe(0);
    expect(compareAsciiLowerCase('', '')).toBe(0);
  });

  it('uses tie-breaking for case-only differences', () => {
    // Comparison uses lowercase but ties break on original case
    expect(compareAsciiLowerCase('hello', 'HELLO')).not.toBe(0);
    expect(compareAsciiLowerCase('test', 'TEST')).not.toBe(0);
  });

  it('compares lexically when different', () => {
    expect(compareAsciiLowerCase('abc', 'abd')).toBe(-1);
    expect(compareAsciiLowerCase('xyz', 'abc')).toBe(1);
  });

  it('handles length differences', () => {
    expect(compareAsciiLowerCase('abc', 'abcd')).toBe(-1);
    expect(compareAsciiLowerCase('abcd', 'abc')).toBe(1);
  });
});

describe('compareNatural', () => {
  it('returns 0 for identical strings', () => {
    expect(compareNatural('test', 'test')).toBe(0);
    expect(compareNatural('abc123', 'abc123')).toBe(0);
  });

  it('compares non-numeric parts lexically', () => {
    expect(compareNatural('abc', 'abd')).toBe(-1);
    expect(compareNatural('xyz', 'abc')).toBe(1);
  });

  it('compares numbers numerically', () => {
    expect(compareNatural('a2', 'a10')).toBe(-1);
    expect(compareNatural('a10', 'a2')).toBe(1);
    expect(compareNatural('a100', 'a20')).toBe(1);
  });

  it('handles the documented example order', () => {
    const sorted = [
      'a',
      'a0',
      'a0b',
      'a1',
      'a01',
      'a9',
      'a10',
      'a100',
      'a100b',
      'aa',
    ];

    for (let i = 0; i < sorted.length - 1; i++) {
      expect(compareNatural(sorted[i], sorted[i + 1])).toBe(-1);
    }
  });

  it('handles leading zeros', () => {
    expect(compareNatural('a01', 'a1')).toBe(1); // More leading zeros is greater
    expect(compareNatural('a001', 'a01')).toBe(1);
  });

  it('handles zero values', () => {
    expect(compareNatural('a0', 'a00')).toBe(-1);
    expect(compareNatural('a0b', 'a00b')).toBe(-1);
  });

  it('handles multiple number sequences', () => {
    expect(compareNatural('a1b2', 'a1b10')).toBe(-1);
    expect(compareNatural('a10b5', 'a2b20')).toBe(1);
  });

  it('handles strings without numbers', () => {
    expect(compareNatural('abc', 'def')).toBe(-1);
    expect(compareNatural('test', 'test')).toBe(0);
  });

  it('handles empty strings', () => {
    expect(compareNatural('', '')).toBe(0);
    expect(compareNatural('a', '')).toBe(1);
    expect(compareNatural('', 'a')).toBe(-1);
  });

  it('handles length differences', () => {
    expect(compareNatural('test', 'test1')).toBe(-1);
    expect(compareNatural('test123', 'test')).toBe(1);
  });
});

describe('compareAsciiLowerCaseNatural', () => {
  it('combines case-insensitive and natural ordering', () => {
    expect(compareAsciiLowerCaseNatural('A2', 'a10')).toBe(-1);
    expect(compareAsciiLowerCaseNatural('TEST10', 'test2')).toBe(1);
  });

  it('uses tie-breaking for case differences', () => {
    // Comparison ignores case for sorting but uses tie-breaking
    expect(compareAsciiLowerCaseNatural('test', 'TEST')).not.toBe(0);
    expect(compareAsciiLowerCaseNatural('a10', 'A10')).not.toBe(0);
  });

  it('handles natural sort with mixed case', () => {
    const sorted = [
      'a',
      'A0',
      'a0b',
      'A1',
      'a01',
      'A9',
      'a10',
      'A100',
    ];

    for (let i = 0; i < sorted.length - 1; i++) {
      const result = compareAsciiLowerCaseNatural(sorted[i], sorted[i + 1]);
      expect(result).toBe(-1);
    }
  });
});

describe('compareAsciiUpperCaseNatural', () => {
  it('combines case-insensitive and natural ordering', () => {
    expect(compareAsciiUpperCaseNatural('A2', 'a10')).toBe(-1);
    expect(compareAsciiUpperCaseNatural('TEST10', 'test2')).toBe(1);
  });

  it('uses tie-breaking for case differences', () => {
    // Comparison ignores case for sorting but uses tie-breaking
    expect(compareAsciiUpperCaseNatural('test', 'TEST')).not.toBe(0);
    expect(compareAsciiUpperCaseNatural('a10', 'A10')).not.toBe(0);
  });

  it('handles natural sort with mixed case', () => {
    const sorted = [
      'a',
      'A0',
      'a0b',
      'A1',
      'a01',
      'A9',
      'a10',
      'A100',
    ];

    for (let i = 0; i < sorted.length - 1; i++) {
      const result = compareAsciiUpperCaseNatural(sorted[i], sorted[i + 1]);
      expect(result).toBe(-1);
    }
  });
});

describe('comparators with array sort', () => {
  it('can be used with Array.sort for natural ordering', () => {
    const arr = ['a100', 'a2', 'a10', 'a1', 'a20'];
    arr.sort(compareNatural);
    expect(arr).toEqual(['a1', 'a2', 'a10', 'a20', 'a100']);
  });

  it('can be used for case-insensitive natural sort', () => {
    const arr = ['Test10', 'test2', 'TEST1', 'test20'];
    arr.sort(compareAsciiLowerCaseNatural);
    expect(arr).toEqual(['TEST1', 'test2', 'Test10', 'test20']);
  });

  it('can be used for case-insensitive sort', () => {
    const arr = ['Zebra', 'apple', 'Banana', 'cherry'];
    arr.sort(compareAsciiLowerCase);
    expect(arr).toEqual(['apple', 'Banana', 'cherry', 'Zebra']);
  });
});

describe('edge cases', () => {
  it('handles very long numbers', () => {
    expect(compareNatural('a999999999', 'a1000000000')).toBe(-1);
  });

  it('handles numbers at string boundaries', () => {
    expect(compareNatural('123', '456')).toBe(-1);
    expect(compareNatural('99', '100')).toBe(-1);
  });

  it('handles alternating digits and letters', () => {
    expect(compareNatural('a1b2c3', 'a1b2c10')).toBe(-1);
    expect(compareNatural('1a2b3c', '1a2b10c')).toBe(-1);
  });

  it('handles special characters', () => {
    expect(compareNatural('test-10', 'test-2')).toBe(1);
    expect(compareNatural('file_1.txt', 'file_10.txt')).toBe(-1);
  });
});
