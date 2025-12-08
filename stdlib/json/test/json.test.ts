import { describe, it, expect } from 'vitest';
import { JSON, JsonTools, type JsonValue } from '../src/json-gs.js';

describe('JSON', () => {
  describe('parse/tryParse', () => {
    it('should parse null', () => {
      const result = JSON.parse('null');
      expect(result.kind).toBe('null');
    });

    it('should parse boolean', () => {
      const t = JSON.parse('true');
      expect(t.kind).toBe('boolean');
      if (t.kind === 'boolean') {
        expect(t.value).toBe(true);
      }

      const f = JSON.parse('false');
      expect(f.kind).toBe('boolean');
      if (f.kind === 'boolean') {
        expect(f.value).toBe(false);
      }
    });

    it('should parse number', () => {
      const result = JSON.parse('42');
      expect(result.kind).toBe('number');
      if (result.kind === 'number') {
        expect(result.value).toBe(42);
      }
    });

    it('should parse string', () => {
      const result = JSON.parse('"hello"');
      expect(result.kind).toBe('string');
      if (result.kind === 'string') {
        expect(result.value).toBe('hello');
      }
    });

    it('should parse array', () => {
      const result = JSON.parse('[1, 2, 3]');
      expect(result.kind).toBe('array');
      if (result.kind === 'array') {
        expect(result.value.length).toBe(3);
      }
    });

    it('should parse object', () => {
      const result = JSON.parse('{"name": "John", "age": 30}');
      expect(result.kind).toBe('object');
      if (result.kind === 'object') {
        expect(result.value.size).toBe(2);
        expect(result.value.has('name')).toBe(true);
      }
    });

    it('should parse nested structures', () => {
      const json = '{"users": [{"name": "Alice"}, {"name": "Bob"}]}';
      const result = JSON.parse(json);
      expect(result.kind).toBe('object');
      
      if (result.kind === 'object') {
        const users = result.value.get('users');
        expect(users?.kind).toBe('array');
      }
    });

    it('should throw on invalid JSON', () => {
      expect(() => JSON.parse('{')).toThrow('Failed to parse JSON');
      expect(() => JSON.parse('invalid')).toThrow('Failed to parse JSON');
    });

    it('should return null on invalid JSON with tryParse', () => {
      expect(JSON.tryParse('{')).toBeNull();
      expect(JSON.tryParse('invalid')).toBeNull();
    });
  });

  describe('stringify/tryStringify', () => {
    it('should stringify null', () => {
      const value: JsonValue = { kind: 'null' };
      expect(JSON.stringify(value)).toBe('null');
    });

    it('should stringify boolean', () => {
      const value: JsonValue = { kind: 'boolean', value: true };
      expect(JSON.stringify(value)).toBe('true');
    });

    it('should stringify number', () => {
      const value: JsonValue = { kind: 'number', value: 42 };
      expect(JSON.stringify(value)).toBe('42');
    });

    it('should stringify string', () => {
      const value: JsonValue = { kind: 'string', value: 'hello' };
      expect(JSON.stringify(value)).toBe('"hello"');
    });

    it('should stringify array', () => {
      const value: JsonValue = {
        kind: 'array',
        value: [
          { kind: 'number', value: 1 },
          { kind: 'number', value: 2 }
        ]
      };
      expect(JSON.stringify(value)).toBe('[1,2]');
    });

    it('should stringify object', () => {
      const map = new Map<string, JsonValue>();
      map.set('name', { kind: 'string', value: 'John' });
      map.set('age', { kind: 'number', value: 30 });
      
      const value: JsonValue = { kind: 'object', value: map };
      const result = JSON.stringify(value);
      
      expect(result).toContain('"name"');
      expect(result).toContain('"John"');
      expect(result).toContain('"age"');
      expect(result).toContain('30');
    });

    it('should support pretty printing', () => {
      const map = new Map<string, JsonValue>();
      map.set('a', { kind: 'number', value: 1 });
      
      const value: JsonValue = { kind: 'object', value: map };
      const pretty = JSON.stringify(value, true);
      
      expect(pretty).toContain('\n');
      expect(pretty).toContain('  ');
    });
  });

  describe('round-trip', () => {
    it('should preserve data through parse/stringify cycle', () => {
      const original = '{"name":"Alice","scores":[95,87,92]}';
      const parsed = JSON.parse(original);
      const stringified = JSON.stringify(parsed);
      const reparsed = JSON.parse(stringified);
      
      expect(JSON.stringify(parsed)).toBe(JSON.stringify(reparsed));
    });
  });
});

describe('JsonTools', () => {
  describe('asString/tryAsString', () => {
    it('should extract string value', () => {
      const value: JsonValue = { kind: 'string', value: 'hello' };
      expect(JsonTools.asString(value)).toBe('hello');
      expect(JsonTools.tryAsString(value)).toBe('hello');
    });

    it('should throw on wrong type', () => {
      const value: JsonValue = { kind: 'number', value: 42 };
      expect(() => JsonTools.asString(value)).toThrow('Expected JSON string');
    });

    it('should return null on wrong type with try variant', () => {
      const value: JsonValue = { kind: 'number', value: 42 };
      expect(JsonTools.tryAsString(value)).toBeNull();
    });
  });

  describe('asNumber/tryAsNumber', () => {
    it('should extract number value', () => {
      const value: JsonValue = { kind: 'number', value: 42 };
      expect(JsonTools.asNumber(value)).toBe(42);
      expect(JsonTools.tryAsNumber(value)).toBe(42);
    });
  });

  describe('asBoolean/tryAsBoolean', () => {
    it('should extract boolean value', () => {
      const value: JsonValue = { kind: 'boolean', value: true };
      expect(JsonTools.asBoolean(value)).toBe(true);
      expect(JsonTools.tryAsBoolean(value)).toBe(true);
    });
  });

  describe('asArray/tryAsArray', () => {
    it('should extract array value', () => {
      const value: JsonValue = {
        kind: 'array',
        value: [{ kind: 'number', value: 1 }]
      };
      const arr = JsonTools.asArray(value);
      expect(arr.length).toBe(1);
    });
  });

  describe('asObject/tryAsObject', () => {
    it('should extract object value', () => {
      const map = new Map<string, JsonValue>();
      map.set('key', { kind: 'string', value: 'value' });
      
      const value: JsonValue = { kind: 'object', value: map };
      const obj = JsonTools.asObject(value);
      expect(obj.size).toBe(1);
    });
  });

  describe('isNull', () => {
    it('should check for null', () => {
      expect(JsonTools.isNull({ kind: 'null' })).toBe(true);
      expect(JsonTools.isNull({ kind: 'number', value: 0 })).toBe(false);
    });
  });

  describe('get/tryGet', () => {
    it('should get value from object', () => {
      const map = new Map<string, JsonValue>();
      map.set('name', { kind: 'string', value: 'Alice' });
      
      const obj: JsonValue = { kind: 'object', value: map };
      const name = JsonTools.get(obj, 'name');
      
      expect(name.kind).toBe('string');
    });

    it('should throw on missing key', () => {
      const obj: JsonValue = { kind: 'object', value: new Map() };
      expect(() => JsonTools.get(obj, 'missing')).toThrow('Key not found');
    });

    it('should return null on missing key with tryGet', () => {
      const obj: JsonValue = { kind: 'object', value: new Map() };
      expect(JsonTools.tryGet(obj, 'missing')).toBeNull();
    });
  });

  describe('getOrDefault', () => {
    it('should return value if present', () => {
      const map = new Map<string, JsonValue>();
      map.set('key', { kind: 'number', value: 42 });
      
      const obj: JsonValue = { kind: 'object', value: map };
      const defaultValue: JsonValue = { kind: 'number', value: 0 };
      
      const result = JsonTools.getOrDefault(obj, 'key', defaultValue);
      expect(result.kind).toBe('number');
      if (result.kind === 'number') {
        expect(result.value).toBe(42);
      }
    });

    it('should return default if missing', () => {
      const obj: JsonValue = { kind: 'object', value: new Map() };
      const defaultValue: JsonValue = { kind: 'number', value: 99 };
      
      const result = JsonTools.getOrDefault(obj, 'missing', defaultValue);
      if (result.kind === 'number') {
        expect(result.value).toBe(99);
      }
    });
  });
});
