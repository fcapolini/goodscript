/**
 * Tests for async/await type system support
 * Phase 7b.1 Step 1: Promise<T> IR type
 */

import { describe, it, expect } from 'vitest';
import { types } from '../src/ir/builder.js';
import { TypeSignatureGenerator } from '../src/ir/signatures.js';

describe('Promise<T> Type System', () => {
  it('should create Promise<number> type', () => {
    const promiseNum = types.promise(types.number());
    
    expect(promiseNum.kind).toBe('promise');
    expect(promiseNum).toHaveProperty('resultType');
    if (promiseNum.kind === 'promise') {
      expect(promiseNum.resultType.kind).toBe('primitive');
      if (promiseNum.resultType.kind === 'primitive') {
        expect(promiseNum.resultType.type).toBe('number');
      }
    }
  });

  it('should create Promise<string> type', () => {
    const promiseStr = types.promise(types.string());
    
    expect(promiseStr.kind).toBe('promise');
    if (promiseStr.kind === 'promise') {
      expect(promiseStr.resultType.kind).toBe('primitive');
      if (promiseStr.resultType.kind === 'primitive') {
        expect(promiseStr.resultType.type).toBe('string');
      }
    }
  });

  it('should create Promise<void> type', () => {
    const promiseVoid = types.promise(types.void());
    
    expect(promiseVoid.kind).toBe('promise');
    if (promiseVoid.kind === 'promise') {
      expect(promiseVoid.resultType.kind).toBe('primitive');
      if (promiseVoid.resultType.kind === 'primitive') {
        expect(promiseVoid.resultType.type).toBe('void');
      }
    }
  });

  it('should create nested Promise<Promise<number>> type', () => {
    const innerPromise = types.promise(types.number());
    const outerPromise = types.promise(innerPromise);
    
    expect(outerPromise.kind).toBe('promise');
    if (outerPromise.kind === 'promise') {
      expect(outerPromise.resultType.kind).toBe('promise');
      if (outerPromise.resultType.kind === 'promise') {
        expect(outerPromise.resultType.resultType.kind).toBe('primitive');
      }
    }
  });

  it('should create Promise<Array<string>> type', () => {
    const arrayStr = types.array(types.string());
    const promiseArrayStr = types.promise(arrayStr);
    
    expect(promiseArrayStr.kind).toBe('promise');
    if (promiseArrayStr.kind === 'promise') {
      expect(promiseArrayStr.resultType.kind).toBe('array');
      if (promiseArrayStr.resultType.kind === 'array') {
        expect(promiseArrayStr.resultType.element.kind).toBe('primitive');
      }
    }
  });

  it('should create Promise<Map<string, number>> type', () => {
    const mapType = types.map(types.string(), types.number());
    const promiseMap = types.promise(mapType);
    
    expect(promiseMap.kind).toBe('promise');
    if (promiseMap.kind === 'promise') {
      expect(promiseMap.resultType.kind).toBe('map');
      if (promiseMap.resultType.kind === 'map') {
        expect(promiseMap.resultType.key.kind).toBe('primitive');
        expect(promiseMap.resultType.value.kind).toBe('primitive');
      }
    }
  });

  it('should generate correct type signature for Promise<number>', () => {
    const promiseNum = types.promise(types.number());
    const sigGen = new TypeSignatureGenerator();
    const signature = sigGen.getTypeString(promiseNum);
    
    expect(signature).toBe('Promise<number>');
  });

  it('should generate correct type signature for Promise<string>', () => {
    const promiseStr = types.promise(types.string());
    const sigGen = new TypeSignatureGenerator();
    const signature = sigGen.getTypeString(promiseStr);
    
    expect(signature).toBe('Promise<string>');
  });

  it('should generate correct type signature for Promise<Array<number>>', () => {
    const arrayNum = types.array(types.number());
    const promiseArray = types.promise(arrayNum);
    const sigGen = new TypeSignatureGenerator();
    const signature = sigGen.getTypeString(promiseArray);
    
    // Array signature includes ownership, so this will be:
    // Promise<Array<number,value>>
    expect(signature).toContain('Promise<Array<number,');
  });

  it('should generate correct type signature for Promise<void>', () => {
    const promiseVoid = types.promise(types.void());
    const sigGen = new TypeSignatureGenerator();
    const signature = sigGen.getTypeString(promiseVoid);
    
    expect(signature).toBe('Promise<void>');
  });

  it('should handle Promise<T> in function return type', () => {
    const promiseNum = types.promise(types.number());
    const funcType = types.function([types.string()], promiseNum);
    
    expect(funcType.kind).toBe('function');
    expect(funcType.returnType.kind).toBe('promise');
    
    const sigGen = new TypeSignatureGenerator();
    const signature = sigGen.getTypeString(funcType);
    
    // (string)->Promise<number>
    expect(signature).toBe('(string)->Promise<number>');
  });
});
