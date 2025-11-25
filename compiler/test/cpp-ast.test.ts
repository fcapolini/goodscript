/**
 * C++ AST Unit Tests
 * 
 * Tests for the C++ AST builder and renderer
 */

import { describe, it, expect } from 'vitest';
import { cpp, render } from '../src/cpp';

describe('C++ AST', () => {
  describe('Basic types', () => {
    it('should create primitive types', () => {
      expect(cpp.int().toString()).toBe('int');
      expect(cpp.double().toString()).toBe('double');
      expect(cpp.bool().toString()).toBe('bool');
      expect(cpp.string().toString()).toBe('gs::String');
      expect(cpp.void().toString()).toBe('void');
      expect(cpp.auto().toString()).toBe('auto');
    });

    it('should create smart pointer types', () => {
      expect(cpp.uniquePtr(cpp.int()).toString()).toBe('std::unique_ptr<int>');
      expect(cpp.sharedPtr(cpp.string()).toString()).toBe('gs::shared_ptr<gs::String>');
      expect(cpp.weakPtr(cpp.double()).toString()).toBe('gs::weak_ptr<double>');
      expect(cpp.optional(cpp.bool()).toString()).toBe('std::optional<bool>');
    });

    it('should create container types', () => {
      expect(cpp.vector(cpp.int()).toString()).toBe('std::vector<int>');
      expect(cpp.map(cpp.string(), cpp.int()).toString()).toBe('std::unordered_map<gs::String, int>');
    });

    it('should handle type modifiers', () => {
      expect(cpp.int().withConst().toString()).toBe('const int');
      expect(cpp.string().withReference().toString()).toBe('gs::String&');
      expect(cpp.int().withPointer().toString()).toBe('int*');
      expect(cpp.string().withConst().withReference().toString()).toBe('const gs::String&');
    });
  });

  describe('Expressions', () => {
    it('should render literals', () => {
      expect(render(cpp.numberLit(42))).toBe('42');
      expect(render(cpp.numberLit(3.14))).toBe('3.14');
      expect(render(cpp.doubleLit(42))).toBe('42');  // Will be 42.0 in JS but renders as 42
      expect(render(cpp.stringLit('hello'))).toBe('"hello"');
      expect(render(cpp.boolLit(true))).toBe('true');
      expect(render(cpp.boolLit(false))).toBe('false');
      expect(render(cpp.nullLit())).toBe('nullptr');
    });

    it('should render identifiers', () => {
      expect(render(cpp.id('myVar'))).toBe('myVar');
      expect(render(cpp.id('std::cout'))).toBe('std::cout');
    });

    it('should render binary expressions', () => {
      const expr = cpp.binary(cpp.id('a'), '+', cpp.id('b'));
      expect(render(expr)).toBe('a + b');
    });

    it('should render unary expressions', () => {
      expect(render(cpp.unary('!', cpp.id('flag')))).toBe('!flag');
      expect(render(cpp.unary('++', cpp.id('i'), true))).toBe('++i');
      expect(render(cpp.unary('++', cpp.id('i'), false))).toBe('i++');
    });

    it('should render function calls', () => {
      const call = cpp.call(cpp.id('func'), [cpp.id('arg1'), cpp.id('arg2')]);
      expect(render(call)).toBe('func(arg1, arg2)');
    });

    it('should render member access', () => {
      const member = cpp.member(cpp.id('obj'), 'field');
      expect(render(member)).toBe('obj.field');

      const ptrMember = cpp.member(cpp.id('ptr'), 'field', true);
      expect(render(ptrMember)).toBe('ptr->field');
    });

    it('should render array subscript', () => {
      const subscript = cpp.subscript(cpp.id('arr'), cpp.intLit(0));
      expect(render(subscript)).toBe('arr[0]');
    });
  });

  describe('Statements', () => {
    it('should render variable declarations', () => {
      const decl = cpp.varDecl('x', cpp.int(), cpp.intLit(42));
      expect(render(decl)).toBe('int x = 42;');
    });

    it('should render return statements', () => {
      const ret = cpp.return_(cpp.id('value'));
      expect(render(ret)).toBe('return value;');
    });

    it('should render if statements', () => {
      const ifStmt = cpp.if_(
        cpp.binary(cpp.id('x'), '>', cpp.intLit(0)),
        cpp.block(cpp.return_(cpp.id('x')))
      );
      const result = render(ifStmt);
      expect(result).toContain('if (x > 0) {');
      expect(result).toContain('return x;');
    });

    it('should render while loops', () => {
      const whileStmt = cpp.while_(
        cpp.binary(cpp.id('i'), '<', cpp.intLit(10)),
        cpp.block(cpp.exprStmt(cpp.unary('++', cpp.id('i'), true)))
      );
      const result = render(whileStmt);
      expect(result).toContain('while (i < 10) {');
      expect(result).toContain('++i;');
    });
  });

  describe('Functions', () => {
    it('should render simple functions', () => {
      const func = cpp.function(
        'add',
        cpp.int(),
        [cpp.param('a', cpp.int()), cpp.param('b', cpp.int())],
        cpp.block(
          cpp.return_(cpp.binary(cpp.id('a'), '+', cpp.id('b')))
        )
      );
      const result = render(func);
      expect(result).toContain('int add(int a, int b) {');
      expect(result).toContain('return a + b;');
    });

    it('should render template functions', () => {
      const func = cpp.function(
        'identity',
        cpp.type('T'),
        [cpp.param('value', cpp.type('T'))],
        cpp.block(cpp.return_(cpp.id('value'))),
        ['T']
      );
      const result = render(func);
      expect(result).toContain('template<typename T>');
      expect(result).toContain('T identity(T value) {');
    });
  });

  describe('Classes', () => {
    it('should render simple classes', () => {
      const cls = cpp.class_('Point', {
        fields: [
          cpp.field('x', cpp.int()),
          cpp.field('y', cpp.int())
        ]
      });
      const result = render(cls);
      expect(result).toContain('class Point {');
      expect(result).toContain('int x;');
      expect(result).toContain('int y;');
    });

    it('should render classes with methods', () => {
      const cls = cpp.class_('Counter', {
        fields: [
          cpp.field('count', cpp.int(), { initializer: cpp.intLit(0) })
        ],
        methods: [
          cpp.method(
            'increment',
            cpp.void(),
            [],
            cpp.block(
              cpp.exprStmt(cpp.unary('++', cpp.member(cpp.id('this'), 'count'), true))
            )
          )
        ]
      });
      const result = render(cls);
      expect(result).toContain('class Counter {');
      expect(result).toContain('int count = 0;');
      expect(result).toContain('void increment() {');
      expect(result).toContain('++this.count;');
    });
  });

  describe('Includes and namespaces', () => {
    it('should render includes', () => {
      expect(render(cpp.include('iostream'))).toBe('#include <iostream>');
      expect(render(cpp.include('myheader.hpp', false))).toBe('#include "myheader.hpp"');
    });

    it('should render namespaces', () => {
      const ns = cpp.namespace('myns', [
        cpp.varDecl('globalVar', cpp.int(), cpp.intLit(42))
      ]);
      const result = render(ns);
      expect(result).toContain('namespace myns {');
      expect(result).toContain('int globalVar = 42;');
      expect(result).toContain('} // namespace myns');
    });
  });

  describe('Smart pointer helpers', () => {
    it('should generate std::make_unique', () => {
      const expr = cpp.makeUnique(cpp.int(), cpp.intLit(42));
      expect(render(expr)).toBe('std::make_unique<int>(42)');
    });

    it('should generate gs::make_shared', () => {
      const expr = cpp.makeShared(cpp.string(), cpp.stringLit('hello'));
      expect(render(expr)).toBe('gs::make_shared<gs::String>("hello")');
    });

    it('should generate std::move', () => {
      const expr = cpp.move(cpp.id('ptr'));
      expect(render(expr)).toBe('std::move(ptr)');
    });
  });

  describe('Full translation unit', () => {
    it('should render complete C++ file', () => {
      const tu = cpp.translationUnit(
        [cpp.include('gs_runtime.hpp')],
        [
          cpp.namespace('gs', [
            cpp.function(
              'main',
              cpp.int(),
              [],
              cpp.block(
                cpp.varDecl('x', cpp.int(), cpp.intLit(42)),
                cpp.return_(cpp.id('x'))
              )
            )
          ])
        ]
      );
      const result = render(tu);
      expect(result).toContain('#include <gs_runtime.hpp>');
      expect(result).toContain('namespace gs {');
      expect(result).toContain('int main() {');
      expect(result).toContain('int x = 42;');
      expect(result).toContain('return x;');
    });
  });
});
