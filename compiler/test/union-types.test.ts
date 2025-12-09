import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { IRLowering } from '../src/frontend/lowering.js';
import { CppCodegen } from '../src/backend/cpp/codegen.js';
import { types } from '../src/ir/builder.js';
import { PrimitiveType, IRType } from '../src/ir/types.js';

describe('Union Types', () => {
  /**
   * Helper to compile TypeScript source to C++
   */
  function compileToCpp(source: string): string {
    const sourceFile = ts.createSourceFile('test.ts', source, ts.ScriptTarget.ES2022, true);
    const program = ts.createProgram(['test.ts'], {}, {
      getSourceFile: (fileName) => fileName === 'test.ts' ? sourceFile : undefined,
      writeFile: () => {},
      getCurrentDirectory: () => '',
      getDirectories: () => [],
      fileExists: () => true,
      readFile: () => '',
      getCanonicalFileName: (fileName) => fileName,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => '\n',
      getDefaultLibFileName: () => 'lib.d.ts',
    });
    const lowering = new IRLowering();
    const program_ir = lowering.lower(program);
    const codegen = new CppCodegen();
    const files = codegen.generate(program_ir, 'gc');
    return files.get('test.cpp') || '';
  }

  describe('Step 1: IR Type System', () => {
    it('should create union type with types.union()', () => {
      const union = types.union([
        types.string(),
        types.number(),
      ]);

      expect(union.kind).toBe('union');
      expect(union.types).toHaveLength(2);
      expect(union.types[0]).toEqual({ kind: 'primitive', type: PrimitiveType.String });
      expect(union.types[1]).toEqual({ kind: 'primitive', type: PrimitiveType.Number });
    });

    it('should create nullable union (T | null)', () => {
      const union = types.union([
        types.string(),
        types.nullable(types.void()), // null is nullable void
      ]);

      expect(union.kind).toBe('union');
      expect(union.types).toHaveLength(2);
    });

    it('should handle union of primitives', () => {
      const union = types.union([
        types.number(),
        types.boolean(),
      ]);

      expect(union.kind).toBe('union');
      expect(union.types).toHaveLength(2);
    });
  });

  describe('Step 2: AST Lowering', () => {
    it('should lower string | null type', () => {
      const source = `
        function getValue(): string | null {
          return null;
        }
      `;

      const cpp = compileToCpp(source);
      
      // In GC mode: string | null → gs::String* (nullable pointer)
      // We just want to verify it compiles without error for now
      expect(cpp).toContain('getValue');
    });

    it('should lower number | undefined type', () => {
      const source = `
        function findIndex(): number | undefined {
          return undefined;
        }
      `;

      const cpp = compileToCpp(source);
      expect(cpp).toContain('findIndex');
    });

    it('should lower T | null | undefined type', () => {
      const source = `
        function maybeGet(): string | null | undefined {
          return null;
        }
      `;

      const cpp = compileToCpp(source);
      expect(cpp).toContain('maybeGet');
    });
  });

  describe('Step 3: Type Checker Integration', () => {
    it('should recognize T | null as effectively nullable in GC mode', () => {
      // In GC mode, T | null is normalized to just T because all objects are nullable
      const union: IRType = types.union([
        types.string(),
        types.nullable(types.void()),
      ]);

      // After normalization in lowering, this becomes just string
      // because GC mode treats all objects as nullable by default
      expect(union.kind).toBe('union');
    });

    it.skip('should narrow union types in if statements', () => {
      // TODO: Implement type narrowing
      const source = `
        function process(value: string | null): void {
          if (value !== null) {
            console.log(value.length);
          }
        }
      `;

      const cpp = compileToCpp(source);
      expect(cpp).toContain('process');
    });
  });

  describe('Step 4: C++ Code Generation', () => {
    it('should generate code for string | null (GC mode)', () => {
      const source = `
        function getValue(): string | null {
          return null;
        }
      `;

      const cpp = compileToCpp(source);
      
      // In GC mode, string | null → gs::String* (nullptr for null)
      expect(cpp).toContain('getValue');
      expect(cpp).toContain('gs::String');
    });

    it.skip('should generate std::optional for T | null (ownership mode)', () => {
      // TODO: Test ownership mode
      // string | null → std::optional<gs::String>
    });

    it.skip('should generate null checks correctly', () => {
      const source = `
        function process(value: string | null): void {
          if (value !== null) {
            console.log(value);
          }
        }
      `;

      const cpp = compileToCpp(source);
      
      // Should generate: if (value != nullptr)
      expect(cpp).toContain('if');
      expect(cpp).toContain('nullptr');
    });
  });

  describe('Step 5: Integration Tests', () => {
    it.skip('should implement Array.find() with T | undefined', () => {
      const source = `
        function find<T>(arr: Array<T>, predicate: (item: T) => boolean): T | undefined {
          for (const item of arr) {
            if (predicate(item)) {
              return item;
            }
          }
          return undefined;
        }

        const numbers = [1, 2, 3, 4, 5];
        const result = find(numbers, (n) => n > 3);
      `;

      const cpp = compileToCpp(source);
      expect(cpp).toContain('find');
    });

    it('should handle union types in variable declarations', () => {
      const source = `
        const value: string | null = null;
      `;

      const cpp = compileToCpp(source);
      expect(cpp).toContain('value');
      expect(cpp).toContain('nullptr');
    });
  });

  describe('Edge Cases', () => {
    it('should handle union with duplicate types', () => {
      const union = types.union([
        types.string(),
        types.string(),
      ]);

      // Should normalize to single string
      // For now, just verify it doesn't crash
      expect(union.kind).toBe('union');
    });

    it('should handle nested unions', () => {
      const inner = types.union([
        types.string(),
        types.number(),
      ]);

      const outer = types.union([
        inner,
        types.boolean(),
      ]);

      // Should flatten to string | number | boolean
      // For now, just verify it doesn't crash
      expect(outer.kind).toBe('union');
    });
  });
});
