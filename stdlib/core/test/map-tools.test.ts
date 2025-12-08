import { describe, it, expect } from 'vitest';
import { MapTools } from '../src/map-tools-gs.js';

describe('MapTools', () => {
  describe('getOrDefault', () => {
    it('should get existing value', () => {
      const map = new Map([['a', 1], ['b', 2]]);
      expect(MapTools.getOrDefault(map, 'a', 99)).toBe(1);
      expect(MapTools.getOrDefault(map, 'b', 99)).toBe(2);
    });

    it('should return default for missing key', () => {
      const map = new Map([['a', 1]]);
      expect(MapTools.getOrDefault(map, 'x', 99)).toBe(99);
    });
  });

  describe('get/tryGet', () => {
    it('should get existing value', () => {
      const map = new Map([['a', 1], ['b', 2]]);
      expect(MapTools.get(map, 'a')).toBe(1);
      expect(MapTools.tryGet(map, 'b')).toBe(2);
    });

    it('should throw on missing key with get', () => {
      const map = new Map([['a', 1]]);
      expect(() => MapTools.get(map, 'x')).toThrow('Key not found in map');
    });

    it('should return null on missing key with tryGet', () => {
      const map = new Map([['a', 1]]);
      expect(MapTools.tryGet(map, 'x')).toBeNull();
    });
  });

  describe('keys/values/entries', () => {
    it('should get keys', () => {
      const map = new Map([['a', 1], ['b', 2]]);
      expect(MapTools.keys(map)).toEqual(['a', 'b']);
    });

    it('should get values', () => {
      const map = new Map([['a', 1], ['b', 2]]);
      expect(MapTools.values(map)).toEqual([1, 2]);
    });

    it('should get entries', () => {
      const map = new Map([['a', 1], ['b', 2]]);
      expect(MapTools.entries(map)).toEqual([['a', 1], ['b', 2]]);
    });

    it('should handle empty map', () => {
      const map = new Map();
      expect(MapTools.keys(map)).toEqual([]);
      expect(MapTools.values(map)).toEqual([]);
      expect(MapTools.entries(map)).toEqual([]);
    });
  });

  describe('fromEntries', () => {
    it('should create map from entries', () => {
      const entries: Array<[string, number]> = [['a', 1], ['b', 2]];
      const map = MapTools.fromEntries(entries);
      expect(map.get('a')).toBe(1);
      expect(map.get('b')).toBe(2);
    });

    it('should handle empty entries', () => {
      const map = MapTools.fromEntries([]);
      expect(map.size).toBe(0);
    });
  });

  describe('mapValues', () => {
    it('should map values', () => {
      const map = new Map([['a', 1], ['b', 2]]);
      const result = MapTools.mapValues(map, (v) => v * 2);
      expect(result.get('a')).toBe(2);
      expect(result.get('b')).toBe(4);
    });

    it('should provide key to mapper function', () => {
      const map = new Map([['a', 1], ['b', 2]]);
      const result = MapTools.mapValues(map, (v, k) => `${k}:${v}`);
      expect(result.get('a')).toBe('a:1');
      expect(result.get('b')).toBe('b:2');
    });
  });

  describe('filter', () => {
    it('should filter by value', () => {
      const map = new Map([['a', 1], ['b', 2], ['c', 3]]);
      const result = MapTools.filter(map, (v) => v > 1);
      expect(result.size).toBe(2);
      expect(result.get('b')).toBe(2);
      expect(result.get('c')).toBe(3);
    });

    it('should provide key to predicate', () => {
      const map = new Map([['a', 1], ['b', 2], ['c', 3]]);
      const result = MapTools.filter(map, (v, k) => k === 'b' || v === 3);
      expect(result.size).toBe(2);
      expect(result.get('b')).toBe(2);
      expect(result.get('c')).toBe(3);
    });
  });

  describe('merge', () => {
    it('should merge multiple maps', () => {
      const m1 = new Map([['a', 1], ['b', 2]]);
      const m2 = new Map([['c', 3]]);
      const m3 = new Map([['d', 4]]);
      const result = MapTools.merge(m1, m2, m3);
      expect(result.size).toBe(4);
      expect(result.get('a')).toBe(1);
      expect(result.get('d')).toBe(4);
    });

    it('should override earlier values with later ones', () => {
      const m1 = new Map([['a', 1], ['b', 2]]);
      const m2 = new Map([['b', 99], ['c', 3]]);
      const result = MapTools.merge(m1, m2);
      expect(result.get('b')).toBe(99);
    });

    it('should handle empty maps', () => {
      const result = MapTools.merge(new Map(), new Map());
      expect(result.size).toBe(0);
    });
  });
});
