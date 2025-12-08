/**
 * Validator Tests
 * 
 * Test enforcement of TypeScript "Good Parts" subset
 * Based on: https://github.com/fcapolini/goodscript/blob/main/docs/GOOD-PARTS.md
 */

import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { Validator } from '../src/frontend/validator.js';

function validate(source: string) {
  const sourceFile = ts.createSourceFile(
    'test.ts',
    source,
    ts.ScriptTarget.ES2022,
    true
  );

  const validator = new Validator();
  return validator.validate(sourceFile);
}

describe('Validator - Good Parts', () => {
  describe('GS101: with statement', () => {
    it('should reject with statements', () => {
      const diagnostics = validate('with (obj) { x = 5; }');
      
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].code).toBe('GS101');
      expect(diagnostics[0].message).toContain('with');
    });
  });

  describe('GS102: eval and Function constructor', () => {
    it('should reject eval()', () => {
      const diagnostics = validate('eval("code");');
      
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].code).toBe('GS102');
      expect(diagnostics[0].message).toContain('eval');
    });

    it('should reject Function constructor', () => {
      const diagnostics = validate('const fn = new Function("x", "return x");');
      
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].code).toBe('GS102');
      expect(diagnostics[0].message).toContain('Function');
    });
  });

  describe('GS103: arguments object', () => {
    it('should reject arguments object', () => {
      const diagnostics = validate('function f() { return arguments; }');
      
      expect(diagnostics.some(d => d.code === 'GS103')).toBe(true);
    });

    it('should accept rest parameters', () => {
      const diagnostics = validate('function f(...args: number[]) { return args; }');
      expect(diagnostics.filter(d => d.code === 'GS103')).toHaveLength(0);
    });
  });

  describe('GS104: for-in loops', () => {
    it('should reject for-in loops', () => {
      const diagnostics = validate('for (const key in obj) { }');
      
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].code).toBe('GS104');
      expect(diagnostics[0].message).toContain('for-in');
    });

    it('should accept for-of loops', () => {
      const diagnostics = validate('for (const item of items) { }');
      expect(diagnostics).toHaveLength(0);
    });
  });

  describe('GS105: var keyword', () => {
    it('should reject var declarations', () => {
      const diagnostics = validate('var x = 5;');
      
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].code).toBe('GS105');
    });

    it('should accept const', () => {
      const diagnostics = validate('const x = 5;');
      expect(diagnostics).toHaveLength(0);
    });

    it('should accept let', () => {
      const diagnostics = validate('let x = 5;');
      expect(diagnostics).toHaveLength(0);
    });
  });

  describe('GS106/GS107: Equality operators', () => {
    it('should reject ==', () => {
      const diagnostics = validate('const x = 5 == 5;');
      
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].code).toBe('GS106');
    });

    it('should reject !=', () => {
      const diagnostics = validate('const x = 5 != 3;');
      
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].code).toBe('GS107');
    });

    it('should accept ===', () => {
      const diagnostics = validate('const x = 5 === 5;');
      expect(diagnostics).toHaveLength(0);
    });

    it('should accept !==', () => {
      const diagnostics = validate('const x = 5 !== 3;');
      expect(diagnostics).toHaveLength(0);
    });
  });

  describe('GS108: this in functions', () => {
    it('should reject this in function declarations', () => {
      const diagnostics = validate('function f() { return this.x; }');
      
      expect(diagnostics.some(d => d.code === 'GS108')).toBe(true);
    });

    it('should reject this in function expressions', () => {
      const diagnostics = validate('const f = function() { return this.x; };');
      
      expect(diagnostics.some(d => d.code === 'GS108')).toBe(true);
    });

    it('should accept this in arrow functions (lexical)', () => {
      const diagnostics = validate('const f = () => this.x;');
      expect(diagnostics.filter(d => d.code === 'GS108')).toHaveLength(0);
    });

    it('should accept this in class methods', () => {
      const diagnostics = validate(`
        class Person {
          name: string;
          greet() { return this.name; }
        }
      `);
      expect(diagnostics.filter(d => d.code === 'GS108')).toHaveLength(0);
    });
  });

  describe('GS109: any type', () => {
    it('should reject any type', () => {
      const diagnostics = validate('const x: any = 5;');
      
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].code).toBe('GS109');
    });

    it('should accept explicit types', () => {
      const diagnostics = validate('const x: number = 5;');
      expect(diagnostics).toHaveLength(0);
    });
  });

  describe('GS110: Truthy/falsy checks', () => {
    it('should reject truthy check in if', () => {
      const diagnostics = validate('if (x) { }');
      
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].code).toBe('GS110');
    });

    it('should reject falsy check with !', () => {
      const diagnostics = validate('if (!x) { }');
      
      // Both !x and x are flagged
      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics.some(d => d.code === 'GS110')).toBe(true);
    });

    it('should accept explicit comparison', () => {
      const diagnostics = validate('if (x !== null) { }');
      expect(diagnostics).toHaveLength(0);
    });

    it('should accept boolean literals', () => {
      const diagnostics = validate('if (true) { } if (false) { }');
      expect(diagnostics).toHaveLength(0);
    });

    it('should reject truthy in while loop', () => {
      const diagnostics = validate('while (x) { }');
      
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].code).toBe('GS110');
    });
  });

  describe('GS111: delete operator', () => {
    it('should reject delete operator', () => {
      const diagnostics = validate('delete obj.x;');
      
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].code).toBe('GS111');
    });
  });

  describe('GS112: comma operator', () => {
    it('should reject comma operator', () => {
      const diagnostics = validate('const x = (1, 2);');
      
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].code).toBe('GS112');
    });

    it('should accept comma in arrays', () => {
      const diagnostics = validate('const arr = [1, 2, 3];');
      expect(diagnostics).toHaveLength(0);
    });
  });

  describe('GS113: switch fall-through', () => {
    it('should reject missing break', () => {
      const diagnostics = validate(`
        switch (x) {
          case 1:
            console.log("one");
          case 2:
            console.log("two");
        }
      `);
      
      expect(diagnostics.some(d => d.code === 'GS113')).toBe(true);
    });

    it('should accept break', () => {
      const diagnostics = validate(`
        switch (x) {
          case 1:
            console.log("one");
            break;
          case 2:
            console.log("two");
            break;
        }
      `);
      expect(diagnostics.filter(d => d.code === 'GS113')).toHaveLength(0);
    });

    it('should accept return', () => {
      const diagnostics = validate(`
        const f = (x: number) => {
          switch (x) {
            case 1: return "one";
            case 2: return "two";
          }
        };
      `);
      expect(diagnostics.filter(d => d.code === 'GS113')).toHaveLength(0);
    });

    it('should accept empty cases', () => {
      const diagnostics = validate(`
        switch (x) {
          case 1:
          case 2:
          case 3:
            return "small";
        }
      `);
      expect(diagnostics.filter(d => d.code === 'GS113')).toHaveLength(0);
    });
  });

  describe('GS115: void operator', () => {
    it('should reject void operator', () => {
      const diagnostics = validate('const x = void 0;');
      
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].code).toBe('GS115');
    });
  });

  describe('GS116: primitive constructors', () => {
    it('should allow String() for type conversion', () => {
      const diagnostics = validate('const x = String(42);');
      
      expect(diagnostics).toHaveLength(0);
    });

    it('should allow Number() for type conversion', () => {
      const diagnostics = validate('const x = Number("42");');
      
      expect(diagnostics).toHaveLength(0);
    });

    it('should allow Boolean() for type conversion', () => {
      const diagnostics = validate('const x = Boolean(1);');
      
      expect(diagnostics).toHaveLength(0);
    });

    it('should reject new String()', () => {
      const diagnostics = validate('const x = new String("hi");');
      
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].code).toBe('GS116');
    });

    it('should reject new Number()', () => {
      const diagnostics = validate('const x = new Number(42);');
      
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].code).toBe('GS116');
    });

    it('should reject new Boolean()', () => {
      const diagnostics = validate('const x = new Boolean(true);');
      
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].code).toBe('GS116');
    });
  });

  describe('GS126: prototype', () => {
    it('should reject prototype access', () => {
      const diagnostics = validate('Array.prototype.x = 1;');
      
      expect(diagnostics.some(d => d.code === 'GS126')).toBe(true);
    });

    it('should reject __proto__', () => {
      const diagnostics = validate('obj.__proto__ = null;');
      
      expect(diagnostics.some(d => d.code === 'GS126')).toBe(true);
    });
  });

  describe('GS127: dynamic imports', () => {
    it('should reject dynamic import with variable path', () => {
      const diagnostics = validate(`
        const path = './utils.js';
        const mod = await import(path);
      `);
      
      expect(diagnostics.some(d => d.code === 'GS127')).toBe(true);
    });

    it('should reject dynamic import with expression', () => {
      const diagnostics = validate(`
        const mod = await import('./utils' + '.js');
      `);
      
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].code).toBe('GS127');
    });

    it('should allow dynamic import with string literal', () => {
      const diagnostics = validate(`
        const mod = await import('./utils.js');
      `);
      
      expect(diagnostics.filter(d => d.code === 'GS127')).toHaveLength(0);
    });
  });

  describe('Good Code', () => {
    it('should accept valid GoodScript code', () => {
      const diagnostics = validate(`
        class Calculator {
          private value: number = 0;
          
          add(n: number): number {
            this.value += n;
            return this.value;
          }
          
          getValue(): number {
            return this.value;
          }
        }
        
        const calc = new Calculator();
        const result = calc.add(5);
        
        const double = (x: number) => x * 2;
        const numbers = [1, 2, 3];
        
        for (const num of numbers) {
          console.log(double(num));
        }
        
        if (result === 5) {
          console.log("Correct");
        }
      `);
      
      expect(diagnostics).toHaveLength(0);
    });
  });
});
