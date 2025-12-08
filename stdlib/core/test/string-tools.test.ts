import { describe, it, expect } from 'vitest';
import { StringTools } from '../src/string-tools-gs.js';

describe('StringTools', () => {
  describe('parseInt/tryParseInt', () => {
    it('should parse valid integers', () => {
      expect(StringTools.parseInt('123')).toBe(123);
      expect(StringTools.parseInt('-456')).toBe(-456);
      expect(StringTools.parseInt('0')).toBe(0);
    });

    it('should parse integers with whitespace', () => {
      expect(StringTools.parseInt('  123  ')).toBe(123);
      expect(StringTools.parseInt('\t456\n')).toBe(456);
    });

    it('should throw on invalid integers', () => {
      expect(() => StringTools.parseInt('abc')).toThrow('Invalid integer');
      expect(() => StringTools.parseInt('12.34')).toThrow('Invalid integer');
      expect(() => StringTools.parseInt('123abc')).toThrow('Invalid integer');
      expect(() => StringTools.parseInt('')).toThrow('Invalid integer');
    });

    it('should return null on invalid integers with tryParseInt', () => {
      expect(StringTools.tryParseInt('abc')).toBeNull();
      expect(StringTools.tryParseInt('12.34')).toBeNull();
      expect(StringTools.tryParseInt('')).toBeNull();
    });
  });

  describe('parseFloat/tryParseFloat', () => {
    it('should parse valid floats', () => {
      expect(StringTools.parseFloat('123.45')).toBe(123.45);
      expect(StringTools.parseFloat('-67.89')).toBe(-67.89);
      expect(StringTools.parseFloat('0.5')).toBe(0.5);
    });

    it('should parse integers as floats', () => {
      expect(StringTools.parseFloat('123')).toBe(123);
    });

    it('should parse scientific notation', () => {
      expect(StringTools.parseFloat('1.23e2')).toBe(123);
      expect(StringTools.parseFloat('1e-2')).toBe(0.01);
    });

    it('should throw on invalid floats', () => {
      expect(() => StringTools.parseFloat('abc')).toThrow('Invalid number');
      expect(() => StringTools.parseFloat('')).toThrow('Invalid number');
    });

    it('should return null on invalid floats with tryParseFloat', () => {
      expect(StringTools.tryParseFloat('abc')).toBeNull();
      expect(StringTools.tryParseFloat('')).toBeNull();
    });
  });

  describe('contains', () => {
    it('should check substring', () => {
      expect(StringTools.contains('hello world', 'world')).toBe(true);
      expect(StringTools.contains('hello world', 'xyz')).toBe(false);
    });
  });

  describe('startsWith/endsWith', () => {
    it('should check prefix', () => {
      expect(StringTools.startsWith('hello', 'hel')).toBe(true);
      expect(StringTools.startsWith('hello', 'lo')).toBe(false);
    });

    it('should check suffix', () => {
      expect(StringTools.endsWith('hello', 'lo')).toBe(true);
      expect(StringTools.endsWith('hello', 'hel')).toBe(false);
    });
  });

  describe('repeat', () => {
    it('should repeat string', () => {
      expect(StringTools.repeat('ab', 3)).toBe('ababab');
      expect(StringTools.repeat('x', 0)).toBe('');
    });

    it('should throw on negative count', () => {
      expect(() => StringTools.repeat('a', -1)).toThrow('Repeat count must be non-negative');
    });
  });

  describe('reverse', () => {
    it('should reverse string', () => {
      expect(StringTools.reverse('hello')).toBe('olleh');
      expect(StringTools.reverse('a')).toBe('a');
      expect(StringTools.reverse('')).toBe('');
    });
  });

  describe('padLeft/padRight', () => {
    it('should pad left', () => {
      expect(StringTools.padLeft('5', 3, '0')).toBe('005');
      expect(StringTools.padLeft('abc', 5)).toBe('  abc');
    });

    it('should pad right', () => {
      expect(StringTools.padRight('5', 3, '0')).toBe('500');
      expect(StringTools.padRight('abc', 5)).toBe('abc  ');
    });
  });

  describe('split/join', () => {
    it('should split string', () => {
      expect(StringTools.split('a,b,c', ',')).toEqual(['a', 'b', 'c']);
      expect(StringTools.split('hello', '')).toEqual(['h', 'e', 'l', 'l', 'o']);
    });

    it('should join strings', () => {
      expect(StringTools.join(['a', 'b', 'c'], ',')).toBe('a,b,c');
      expect(StringTools.join(['a', 'b', 'c'])).toBe('abc');
    });
  });

  describe('toUpperCase/toLowerCase', () => {
    it('should convert case', () => {
      expect(StringTools.toUpperCase('hello')).toBe('HELLO');
      expect(StringTools.toLowerCase('WORLD')).toBe('world');
    });
  });

  describe('trim/trimLeft/trimRight', () => {
    it('should trim whitespace', () => {
      expect(StringTools.trim('  hello  ')).toBe('hello');
      expect(StringTools.trimLeft('  hello  ')).toBe('hello  ');
      expect(StringTools.trimRight('  hello  ')).toBe('  hello');
    });
  });
});
