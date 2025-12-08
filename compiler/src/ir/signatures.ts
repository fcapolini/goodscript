/**
 * Type Signature System
 * 
 * Implements structural typing through canonical type signatures.
 * Two types with identical structure map to the same signature,
 * enabling duck typing while maintaining static analysis.
 */

import type { IRType, IRInterfaceDecl, IRClassDecl } from './types.js';

/**
 * Canonical type signature - deterministic representation of a type's structure
 */
export interface TypeSignature {
  /** Unique hash identifying this signature */
  hash: string;
  /** Human-readable signature string */
  canonical: string;
  /** Properties in normalized order */
  properties: PropertySignature[];
  /** Methods in normalized order */
  methods: MethodSignature[];
}

export interface PropertySignature {
  name: string;
  type: string; // Canonical type string
  readonly: boolean;
}

export interface MethodSignature {
  name: string;
  params: ParamSignature[];
  returnType: string; // Canonical type string
}

export interface ParamSignature {
  name: string;
  type: string; // Canonical type string
}

/**
 * Generates canonical type signatures for structural typing
 */
export class TypeSignatureGenerator {
  private signatureCache = new Map<string, TypeSignature>();
  private typeStringCache = new Map<IRType, string>();

  /**
   * Get or generate signature for an interface
   */
  getInterfaceSignature(iface: IRInterfaceDecl): TypeSignature {
    const key = `interface:${iface.name}`;
    
    if (this.signatureCache.has(key)) {
      return this.signatureCache.get(key)!;
    }

    const methods: MethodSignature[] = iface.methods.map(m => ({
      name: m.name,
      params: m.params.map(p => ({
        name: p.name,
        type: this.getTypeString(p.type),
      })),
      returnType: this.getTypeString(m.returnType),
    }));

    // Sort methods by name for deterministic signature
    methods.sort((a, b) => a.name.localeCompare(b.name));

    const signature = this.createSignature([], methods);
    this.signatureCache.set(key, signature);
    return signature;
  }

  /**
   * Get or generate signature for a class (public interface only)
   */
  getClassSignature(cls: IRClassDecl): TypeSignature {
    const key = `class:${cls.name}`;
    
    if (this.signatureCache.has(key)) {
      return this.signatureCache.get(key)!;
    }

    const properties: PropertySignature[] = cls.fields
      .filter(f => !f.name.startsWith('_')) // Exclude private fields
      .map(f => ({
        name: f.name,
        type: this.getTypeString(f.type),
        readonly: f.isReadonly,
      }));

    const methods: MethodSignature[] = cls.methods
      .filter(m => !m.isStatic && !m.name.startsWith('_'))
      .map(m => ({
        name: m.name,
        params: m.params.map(p => ({
          name: p.name,
          type: this.getTypeString(p.type),
        })),
        returnType: this.getTypeString(m.returnType),
      }));

    // Sort for deterministic signature
    properties.sort((a, b) => a.name.localeCompare(b.name));
    methods.sort((a, b) => a.name.localeCompare(b.name));

    const signature = this.createSignature(properties, methods);
    this.signatureCache.set(key, signature);
    return signature;
  }

  /**
   * Check if two types have compatible signatures (structural typing)
   */
  areCompatible(type1: IRType, type2: IRType): boolean {
    // Primitive types must match exactly
    if (type1.kind === 'primitive' && type2.kind === 'primitive') {
      return type1.type === type2.type;
    }

    // For complex types, compare canonical strings
    const str1 = this.getTypeString(type1);
    const str2 = this.getTypeString(type2);
    return str1 === str2;
  }

  /**
   * Get canonical string representation of a type
   */
  getTypeString(type: IRType): string {
    if (this.typeStringCache.has(type)) {
      return this.typeStringCache.get(type)!;
    }

    let result: string;

    switch (type.kind) {
      case 'primitive':
        result = type.type;
        break;

      case 'class':
      case 'interface':
        result = `${type.name}<${type.ownership}>`;
        if (type.typeArgs && type.typeArgs.length > 0) {
          const args = type.typeArgs.map(t => this.getTypeString(t)).join(',');
          result += `[${args}]`;
        }
        break;

      case 'array':
        result = `Array<${this.getTypeString(type.element)},${type.ownership}>`;
        break;

      case 'map':
        result = `Map<${this.getTypeString(type.key)},${this.getTypeString(type.value)},${type.ownership}>`;
        break;

      case 'function':
        const params = type.params.map(p => this.getTypeString(p)).join(',');
        result = `(${params})->${this.getTypeString(type.returnType)}`;
        break;

      case 'union':
        const types = type.types.map(t => this.getTypeString(t)).sort();
        result = types.join('|');
        break;

      case 'nullable':
        result = `${this.getTypeString(type.inner)}?`;
        break;
    }

    this.typeStringCache.set(type, result);
    return result;
  }

  /**
   * Create signature from properties and methods
   */
  private createSignature(
    properties: PropertySignature[],
    methods: MethodSignature[]
  ): TypeSignature {
    // Build canonical string
    const parts: string[] = [];

    for (const prop of properties) {
      const readonly = prop.readonly ? 'readonly ' : '';
      parts.push(`${readonly}${prop.name}:${prop.type}`);
    }

    for (const method of methods) {
      const params = method.params.map(p => `${p.name}:${p.type}`).join(',');
      parts.push(`${method.name}(${params}):${method.returnType}`);
    }

    const canonical = parts.join(';');
    const hash = this.hashString(canonical);

    return {
      hash,
      canonical,
      properties,
      methods,
    };
  }

  /**
   * Simple string hash (FNV-1a)
   */
  private hashString(str: string): string {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  /**
   * Clear all caches
   */
  reset(): void {
    this.signatureCache.clear();
    this.typeStringCache.clear();
  }
}
