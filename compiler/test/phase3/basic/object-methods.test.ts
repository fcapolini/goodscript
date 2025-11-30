/**
 * Phase 3 Tests: Object methods
 * 
 * Tests C++ code generation for supported Object methods (keys, values, entries, assign, is)
 * and validation for unsupported methods (GS124).
 */

import { describe, it, expect } from 'vitest';
import { CppCodegen } from '../../../src/cpp/codegen';
import { compileSource, hasError } from '../../phase1/test-helpers';
import ts from 'typescript';

function compileToCpp(source: string): string {
  const sourceFile = ts.createSourceFile(
    'test.ts',
    source,
    ts.ScriptTarget.ES2020,
    true
  );
  
  const codegen = new CppCodegen();
  return codegen.generate(sourceFile);
}

describe('Phase 3: Object methods', () => {
  it('should generate code for Object.keys', () => {
    const source = `
const map = new Map<string, number>();
const keys = Object.keys(map);
    `;
    const cpp = compileToCpp(source);
    expect(cpp).toContain('Object');
    expect(cpp).toContain('keys');
  });

  it('should generate code for Object.values', () => {
    const source = `
const map = new Map<string, number>();
const values = Object.values(map);
    `;
    const cpp = compileToCpp(source);
    expect(cpp).toContain('Object');
    expect(cpp).toContain('values');
  });

  it('should generate code for Object.entries', () => {
    const source = `
const map = new Map<string, number>();
const entries = Object.entries(map);
    `;
    const cpp = compileToCpp(source);
    expect(cpp).toContain('Object');
    expect(cpp).toContain('entries');
  });

  it('should generate code for Object.assign', () => {
    const source = `
const target = new Map<string, number>();
const source1 = new Map<string, number>();
Object.assign(target, source1);
    `;
    const cpp = compileToCpp(source);
    expect(cpp).toContain('Object');
    expect(cpp).toContain('assign');
  });

  it('should generate code for Object.is', () => {
    const source = `
const result = Object.is(42, 42);
    `;
    const cpp = compileToCpp(source);
    expect(cpp).toContain('Object');
    expect(cpp).toContain('is');
  });

  it('should reject Object.defineProperty (GS124)', () => {
    const source = `
const obj = {};
Object.defineProperty(obj, 'x', { value: 42 });
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS124')).toBe(true);
  });

  it('should reject Object.create (GS124)', () => {
    const source = `
const obj = Object.create(null);
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS124')).toBe(true);
  });

  it('should reject Object.getPrototypeOf (GS124)', () => {
    const source = `
const obj = {};
const proto = Object.getPrototypeOf(obj);
    `;
    const result = compileSource(source);
    expect(hasError(result.diagnostics, 'GS124')).toBe(true);
  });
});


