/**
 * JSON value type using discriminated unions.
 * 
 * This provides type-safe JSON representation where each value
 * explicitly declares its kind.
 */
export type JsonValue =
  | { kind: 'null' }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'number'; value: number }
  | { kind: 'string'; value: string }
  | { kind: 'array'; value: Array<JsonValue> }
  | { kind: 'object'; value: Map<string, JsonValue> };

/**
 * JSON operations with dual error handling pattern.
 * 
 * Note: In the future, this will dispatch to backend-specific implementations:
 * - Haxe backend → haxe.Json
 * - C++ backend → nlohmann/json or similar
 * 
 * Current implementation uses JavaScript's built-in JSON.
 */
export class JSON {
  /**
   * Parse JSON string. Throws on invalid JSON.
   */
  static parse(text: string): JsonValue {
    const result = JSON.tryParse(text);
    if (result === null) {
      throw new Error('Failed to parse JSON');
    }
    return result;
  }

  /**
   * Parse JSON string. Returns null on invalid JSON.
   */
  static tryParse(text: string): JsonValue | null {
    try {
      const raw = globalThis.JSON.parse(text);
      return JSON.fromJavaScript(raw);
    } catch {
      return null;
    }
  }

  /**
   * Convert JsonValue to JSON string. Throws on error.
   */
  static stringify(value: JsonValue, pretty: boolean = false): string {
    const result = JSON.tryStringify(value, pretty);
    if (result === null) {
      throw new Error('Failed to stringify JSON');
    }
    return result;
  }

  /**
   * Convert JsonValue to JSON string. Returns null on error.
   */
  static tryStringify(value: JsonValue, pretty: boolean = false): string | null {
    try {
      const raw = JSON.toJavaScript(value);
      return pretty 
        ? globalThis.JSON.stringify(raw, null, 2)
        : globalThis.JSON.stringify(raw);
    } catch {
      return null;
    }
  }

  /**
   * Convert JavaScript value to JsonValue.
   * Internal helper for parse().
   */
  private static fromJavaScript(raw: unknown): JsonValue {
    if (raw === null) {
      return { kind: 'null' };
    }
    
    if (typeof raw === 'boolean') {
      return { kind: 'boolean', value: raw };
    }
    
    if (typeof raw === 'number') {
      return { kind: 'number', value: raw };
    }
    
    if (typeof raw === 'string') {
      return { kind: 'string', value: raw };
    }
    
    if (Array.isArray(raw)) {
      return {
        kind: 'array',
        value: raw.map(item => JSON.fromJavaScript(item))
      };
    }
    
    if (typeof raw === 'object') {
      const map = new Map<string, JsonValue>();
      for (const [key, value] of Object.entries(raw)) {
        map.set(key, JSON.fromJavaScript(value));
      }
      return { kind: 'object', value: map };
    }
    
    throw new Error(`Unsupported JSON value type: ${typeof raw}`);
  }

  /**
   * Convert JsonValue to JavaScript value.
   * Internal helper for stringify().
   */
  private static toJavaScript(value: JsonValue): unknown {
    switch (value.kind) {
      case 'null':
        return null;
      
      case 'boolean':
        return value.value;
      
      case 'number':
        return value.value;
      
      case 'string':
        return value.value;
      
      case 'array':
        return value.value.map(item => JSON.toJavaScript(item));
      
      case 'object': {
        const obj: Record<string, unknown> = {};
        for (const [key, val] of value.value.entries()) {
          obj[key] = JSON.toJavaScript(val);
        }
        return obj;
      }
    }
  }
}

/**
 * Typed extraction helpers for JsonValue.
 */
export class JsonTools {
  /**
   * Extract string value. Throws if not a string.
   */
  static asString(value: JsonValue): string {
    const result = JsonTools.tryAsString(value);
    if (result === null) {
      throw new Error(`Expected JSON string, got ${value.kind}`);
    }
    return result;
  }

  /**
   * Extract string value. Returns null if not a string.
   */
  static tryAsString(value: JsonValue): string | null {
    return value.kind === 'string' ? value.value : null;
  }

  /**
   * Extract number value. Throws if not a number.
   */
  static asNumber(value: JsonValue): number {
    const result = JsonTools.tryAsNumber(value);
    if (result === null) {
      throw new Error(`Expected JSON number, got ${value.kind}`);
    }
    return result;
  }

  /**
   * Extract number value. Returns null if not a number.
   */
  static tryAsNumber(value: JsonValue): number | null {
    return value.kind === 'number' ? value.value : null;
  }

  /**
   * Extract boolean value. Throws if not a boolean.
   */
  static asBoolean(value: JsonValue): boolean {
    const result = JsonTools.tryAsBoolean(value);
    if (result === null) {
      throw new Error(`Expected JSON boolean, got ${value.kind}`);
    }
    return result;
  }

  /**
   * Extract boolean value. Returns null if not a boolean.
   */
  static tryAsBoolean(value: JsonValue): boolean | null {
    return value.kind === 'boolean' ? value.value : null;
  }

  /**
   * Extract array value. Throws if not an array.
   */
  static asArray(value: JsonValue): Array<JsonValue> {
    const result = JsonTools.tryAsArray(value);
    if (result === null) {
      throw new Error(`Expected JSON array, got ${value.kind}`);
    }
    return result;
  }

  /**
   * Extract array value. Returns null if not an array.
   */
  static tryAsArray(value: JsonValue): Array<JsonValue> | null {
    return value.kind === 'array' ? value.value : null;
  }

  /**
   * Extract object value. Throws if not an object.
   */
  static asObject(value: JsonValue): Map<string, JsonValue> {
    const result = JsonTools.tryAsObject(value);
    if (result === null) {
      throw new Error(`Expected JSON object, got ${value.kind}`);
    }
    return result;
  }

  /**
   * Extract object value. Returns null if not an object.
   */
  static tryAsObject(value: JsonValue): Map<string, JsonValue> | null {
    return value.kind === 'object' ? value.value : null;
  }

  /**
   * Check if value is null.
   */
  static isNull(value: JsonValue): boolean {
    return value.kind === 'null';
  }

  /**
   * Get value from JSON object by key. Throws if not found.
   */
  static get(obj: JsonValue, key: string): JsonValue {
    const result = JsonTools.tryGet(obj, key);
    if (result === null) {
      throw new Error(`Key not found in JSON object: ${key}`);
    }
    return result;
  }

  /**
   * Get value from JSON object by key. Returns null if not found.
   */
  static tryGet(obj: JsonValue, key: string): JsonValue | null {
    if (obj.kind !== 'object') {
      return null;
    }
    return obj.value.get(key) ?? null;
  }

  /**
   * Get value from JSON object by key, or return default.
   */
  static getOrDefault(obj: JsonValue, key: string, defaultValue: JsonValue): JsonValue {
    const result = JsonTools.tryGet(obj, key);
    return result !== null ? result : defaultValue;
  }
}
