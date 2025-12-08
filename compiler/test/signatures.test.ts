/**
 * Type Signature Tests
 */

import { describe, it, expect } from 'vitest';
import { PrimitiveType } from '../src/ir/types.js';
import { TypeSignatureGenerator } from '../src/ir/signatures.js';
import type { IRInterfaceDecl, IRClassDecl, IRType } from '../src/ir/types.js';
import { Ownership } from '../src/ir/types.js';

describe('Type Signature System', () => {
  const generator = new TypeSignatureGenerator();

  describe('Interface signatures', () => {
    it('should generate identical signatures for structurally identical interfaces', () => {
      const drawable: IRInterfaceDecl = {
        kind: 'interface',
        name: 'Drawable',
        methods: [{
          name: 'draw',
          params: [],
          returnType: { kind: 'primitive', type: PrimitiveType.Void },
        }],
      };

      const renderable: IRInterfaceDecl = {
        kind: 'interface',
        name: 'Renderable',
        methods: [{
          name: 'draw',
          params: [],
          returnType: { kind: 'primitive', type: PrimitiveType.Void },
        }],
      };

      const sig1 = generator.getInterfaceSignature(drawable);
      const sig2 = generator.getInterfaceSignature(renderable);

      expect(sig1.hash).toBe(sig2.hash);
      expect(sig1.canonical).toBe(sig2.canonical);
    });

    it('should generate different signatures for different interfaces', () => {
      const drawable: IRInterfaceDecl = {
        kind: 'interface',
        name: 'Drawable',
        methods: [{
          name: 'draw',
          params: [],
          returnType: { kind: 'primitive', type: PrimitiveType.Void },
        }],
      };

      const clickable: IRInterfaceDecl = {
        kind: 'interface',
        name: 'Clickable',
        methods: [{
          name: 'click',
          params: [],
          returnType: { kind: 'primitive', type: PrimitiveType.Void },
        }],
      };

      const sig1 = generator.getInterfaceSignature(drawable);
      const sig2 = generator.getInterfaceSignature(clickable);

      expect(sig1.hash).not.toBe(sig2.hash);
    });

    it('should normalize method order', () => {
      const iface1: IRInterfaceDecl = {
        kind: 'interface',
        name: 'Interface1',
        methods: [
          {
            name: 'foo',
            params: [],
            returnType: { kind: 'primitive', type: PrimitiveType.Void },
          },
          {
            name: 'bar',
            params: [],
            returnType: { kind: 'primitive', type: PrimitiveType.Void },
          },
        ],
      };

      const iface2: IRInterfaceDecl = {
        kind: 'interface',
        name: 'Interface2',
        methods: [
          {
            name: 'bar',
            params: [],
            returnType: { kind: 'primitive', type: PrimitiveType.Void },
          },
          {
            name: 'foo',
            params: [],
            returnType: { kind: 'primitive', type: PrimitiveType.Void },
          },
        ],
      };

      const sig1 = generator.getInterfaceSignature(iface1);
      const sig2 = generator.getInterfaceSignature(iface2);

      expect(sig1.hash).toBe(sig2.hash);
    });
  });

  describe('Class signatures', () => {
    it('should generate signature from public interface only', () => {
      const cls: IRClassDecl = {
        kind: 'class',
        name: 'MyClass',
        fields: [
          {
            name: 'publicField',
            type: { kind: 'primitive', type: PrimitiveType.Number },
            isReadonly: false,
          },
          {
            name: '_privateField',
            type: { kind: 'primitive', type: PrimitiveType.String },
            isReadonly: false,
          },
        ],
        methods: [
          {
            name: 'publicMethod',
            params: [],
            returnType: { kind: 'primitive', type: PrimitiveType.Void },
            body: { id: 0, instructions: [], terminator: { kind: 'return', value: undefined } },
            isStatic: false,
          },
          {
            name: '_privateMethod',
            params: [],
            returnType: { kind: 'primitive', type: PrimitiveType.Void },
            body: { id: 0, instructions: [], terminator: { kind: 'return', value: undefined } },
            isStatic: false,
          },
        ],
      };

      const sig = generator.getClassSignature(cls);

      expect(sig.properties).toHaveLength(1);
      expect(sig.properties[0].name).toBe('publicField');
      expect(sig.methods).toHaveLength(1);
      expect(sig.methods[0].name).toBe('publicMethod');
    });

    it('should match class and interface with same structure', () => {
      const iface: IRInterfaceDecl = {
        kind: 'interface',
        name: 'Point',
        methods: [
          {
            name: 'getX',
            params: [],
            returnType: { kind: 'primitive', type: PrimitiveType.Number },
          },
          {
            name: 'getY',
            params: [],
            returnType: { kind: 'primitive', type: PrimitiveType.Number },
          },
        ],
      };

      const cls: IRClassDecl = {
        kind: 'class',
        name: 'Vector2D',
        fields: [],
        methods: [
          {
            name: 'getX',
            params: [],
            returnType: { kind: 'primitive', type: PrimitiveType.Number },
            body: { id: 0, instructions: [], terminator: { kind: 'return', value: undefined } },
            isStatic: false,
          },
          {
            name: 'getY',
            params: [],
            returnType: { kind: 'primitive', type: PrimitiveType.Number },
            body: { id: 0, instructions: [], terminator: { kind: 'return', value: undefined } },
            isStatic: false,
          },
        ],
      };

      const ifaceSig = generator.getInterfaceSignature(iface);
      const classSig = generator.getClassSignature(cls);

      expect(ifaceSig.hash).toBe(classSig.hash);
    });
  });

  describe('Type string generation', () => {
    it('should generate canonical strings for primitives', () => {
      const numType: IRType = { kind: 'primitive', type: PrimitiveType.Number };
      const intType: IRType = { kind: 'primitive', type: PrimitiveType.Integer };
      const int53Type: IRType = { kind: 'primitive', type: PrimitiveType.Integer53 };
      const strType: IRType = { kind: 'primitive', type: PrimitiveType.String };

      expect(generator.getTypeString(numType)).toBe('number');
      expect(generator.getTypeString(intType)).toBe('integer');
      expect(generator.getTypeString(int53Type)).toBe('integer53');
      expect(generator.getTypeString(strType)).toBe('string');
    });

    it('should generate canonical strings for arrays', () => {
      const arrType: IRType = {
        kind: 'array',
        element: { kind: 'primitive', type: PrimitiveType.Number },
        ownership: Ownership.Own,
      };

      expect(generator.getTypeString(arrType)).toBe('Array<number,own>');
    });

    it('should generate canonical strings for functions', () => {
      const fnType: IRType = {
        kind: 'function',
        params: [
          { kind: 'primitive', type: PrimitiveType.Number },
          { kind: 'primitive', type: PrimitiveType.String },
        ],
        returnType: { kind: 'primitive', type: PrimitiveType.Boolean },
      };

      expect(generator.getTypeString(fnType)).toBe('(number,string)->boolean');
    });

    it('should normalize union types', () => {
      const union1: IRType = {
        kind: 'union',
        types: [
          { kind: 'primitive', type: PrimitiveType.Number },
          { kind: 'primitive', type: PrimitiveType.String },
        ],
      };

      const union2: IRType = {
        kind: 'union',
        types: [
          { kind: 'primitive', type: PrimitiveType.String },
          { kind: 'primitive', type: PrimitiveType.Number },
        ],
      };

      const str1 = generator.getTypeString(union1);
      const str2 = generator.getTypeString(union2);

      expect(str1).toBe(str2); // Order normalized
    });
  });

  describe('Type compatibility', () => {
    it('should confirm primitive type compatibility', () => {
      const num1: IRType = { kind: 'primitive', type: PrimitiveType.Number };
      const num2: IRType = { kind: 'primitive', type: PrimitiveType.Number };
      const str: IRType = { kind: 'primitive', type: PrimitiveType.String };

      expect(generator.areCompatible(num1, num2)).toBe(true);
      expect(generator.areCompatible(num1, str)).toBe(false);
    });

    it('should confirm complex type compatibility', () => {
      const arr1: IRType = {
        kind: 'array',
        element: { kind: 'primitive', type: PrimitiveType.Number },
        ownership: Ownership.Own,
      };

      const arr2: IRType = {
        kind: 'array',
        element: { kind: 'primitive', type: PrimitiveType.Number },
        ownership: Ownership.Own,
      };

      const arr3: IRType = {
        kind: 'array',
        element: { kind: 'primitive', type: PrimitiveType.String },
        ownership: Ownership.Own,
      };

      expect(generator.areCompatible(arr1, arr2)).toBe(true);
      expect(generator.areCompatible(arr1, arr3)).toBe(false);
    });
  });
});
