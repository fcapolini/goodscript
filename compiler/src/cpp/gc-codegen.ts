/**
 * GC-Mode C++ Code Generator
 * 
 * Generates C++ code using MPS garbage collection instead of smart pointers.
 * This is a simplified mode that doesn't require ownership annotations.
 */

import * as ts from 'typescript';
import { AstCodegen } from './codegen';

/**
 * GC-mode code generator.
 * 
 * Key differences from ownership mode:
 * - All heap allocations use gs::gc::Allocator
 * - No smart pointers (unique_ptr, shared_ptr, weak_ptr)
 * - Raw pointers for all object references
 * - Runtime inserts gs::gc::Runtime initialization
 * 
 * This allows Phase 1 code (without ownership annotations) to compile directly.
 */
export class GcCodegen {
  private baseCodegen: AstCodegen;

  constructor(checker?: ts.TypeChecker) {
    this.baseCodegen = new AstCodegen(checker);
  }

  /**
   * Generate C++ code in GC mode
   */
  generate(sourceFile: ts.SourceFile): string {
    // Generate base C++ code using ownership codegen
    let code = this.baseCodegen.generate(sourceFile);
    
    // Transform ownership constructs to GC equivalents
    code = this.transformToGc(code);
    
    return code;
  }

  /**
   * Transform ownership-based C++ to GC-based C++
   * 
   * This is a post-processing step that converts:
   * - #include "gs_runtime.hpp" → #include "gs_gc_runtime.hpp"
   * - std::unique_ptr<T> → T*
   * - std::shared_ptr<T> → T*
   * - std::weak_ptr<T> → T*
   * - std::make_unique<T>(...) → new T(...)
   * - std::make_shared<T>(...) → new T(...)
   * - .get() calls on pointers (no longer needed)
   * - std::move(...) (no longer needed)
   * - Adds gs::gc::Runtime initialization in main()
   */
  private transformToGc(code: string): string {
    // Replace runtime header
    code = code.replace(
      /#include "gs_runtime\.hpp"/g,
      '#include "gs_gc_runtime.hpp"'
    );

    // Replace smart pointer types with raw pointers
    // Must handle nested templates like Stack<String>
    // std::unique_ptr<T> → T*
    code = this.replaceSmartPointerTypes(code, 'unique_ptr');
    
    // std::shared_ptr<T> → T*
    code = this.replaceSmartPointerTypes(code, 'shared_ptr');
    
    // std::weak_ptr<T> → T*
    code = this.replaceSmartPointerTypes(code, 'weak_ptr');

    // Replace allocation calls
    // std::make_unique<T>(args) → gs::gc::Allocator::alloc<T>(args)
    // std::make_shared<T>(args) → gs::gc::Allocator::alloc<T>(args)
    // Note: Must handle nested templates like Stack<String>
    code = this.replaceSmartPointerAllocations(code, 'make_unique');
    code = this.replaceSmartPointerAllocations(code, 'make_shared');

    // Handle std::make_shared calls that might have been missed
    // Pattern: std::make_shared<Type>(value) where value is already a pointer or value
    // In many cases, if we're passing a value type to make_shared, we just need to allocate it
    // Example: std::make_shared<String>(str) → just use &str if str is a value
    //          or gs::gc::Allocator::alloc<String>(str) if we need a new allocation
    code = code.replace(/std::make_shared<([^>]+)>\(/g, 'gs::gc::Allocator::alloc<$1>(');
    code = code.replace(/std::make_unique<([^>]+)>\(/g, 'gs::gc::Allocator::alloc<$1>(');

    // Remove * dereference when accessing array/vector elements
    // In GC mode, Array::operator[] returns T& instead of T*
    // Pattern: *array[index] should become array[index]
    // This includes: *this->array[i], *array[i], *values[i], etc.
    code = code.replace(/\*([a-zA-Z_][a-zA-Z0-9_]*(?:->[a-zA-Z_][a-zA-Z0-9_]*)?)\[/g, '$1[');
    code = code.replace(/\*this->([a-zA-Z_][a-zA-Z0-9_]*)\[/g, 'this->$1[');

    // Fix array assignment pattern from auto-resize IIFE
    // Pattern: return *(*__arr)[__idx] = value;
    // In GC mode should be: return (*__arr)[__idx] = value;
    code = code.replace(/return \*\(\*__arr\)\[__idx\]/g, 'return (*__arr)[__idx]');

    // Fix array element access with ->
    // Pattern: array[index]->method() where array contains value types (not pointers)
    // Should be: array[index].method()
    // This is a heuristic: if the array subscript result uses ->, change to .
    // Match: identifier[...] followed by ->
    code = code.replace(/(\w+\[(?:[^\[\]]+)\])->(\w+)/g, '$1.$2');

    // Fix optional comparisons after null checks
    // Pattern: if (x != std::nullopt && (x <op> value))
    // The comparisons after the null check need to unwrap the optional
    // We need to replace x with x.value() in the comparison part
    code = this.unwrapOptionalsInComparisons(code);

    // Remove .get() calls (pointers are already raw)
    // But be careful - only remove when it's clearly a method call
    code = code.replace(/(\w+)\.get\(\)/g, '$1');

    // Remove std::move calls (not needed for GC)
    // std::move(x) → x
    code = code.replace(/std::move\(([^)]+)\)/g, '$1');

    // Replace std::dynamic_pointer_cast with dynamic_cast for raw pointers
    // std::dynamic_pointer_cast<T>(ptr) → dynamic_cast<T*>(ptr)
    code = code.replace(/std::dynamic_pointer_cast<([^>]+)>\(([^)]+)\)/g, 'dynamic_cast<$1*>($2)');

    // Fix const pointer declarations
    // In GC mode, `const T* ptr` should be `T* const ptr` to make the pointer const, not the pointed-to object
    // This handles: variable declarations, function parameters, and return types
    // For references: const T*& becomes T* const&
    // For values: const T* becomes T* const
    code = code.replace(/\bconst\s+(gs::\w+)\*\s*&(\s+\w+)/g, '$1* const&$2');
    code = code.replace(/\bconst\s+(gs::\w+)\*(\s+\w+)/g, '$1* const$2');

    // Fix Map.get() dereference patterns
    // Pattern: (map.get(key) != nullptr ? *map.get(key) : nullptr)
    // Should be: map.get(key)
    // This regex handles the ternary pattern that the ownership codegen generates
    code = code.replace(/\(([^?]+\.get\([^)]+\))\s*!=\s*nullptr\s*\?\s*\*\1\s*:\s*nullptr\)/g, '$1');

    // Also fix double nullptr checks like: if (x != nullptr && x != nullptr)
    // Should be: if (x != nullptr)
    code = code.replace(/(\w+\s*!=\s*nullptr)\s*&&\s*\1/g, '$1');

    // Add main() function if missing (for conformance tests that are just declarations)
    if (!code.includes('int main()')) {
      code += '\n\nint main() {\n  gs::gc::Runtime gc_runtime;\n  return 0;\n}\n';
    } else {
      // Add GC runtime initialization at start of main()
      code = code.replace(
        /int main\(\) \{/,
        'int main() {\n  gs::gc::Runtime gc_runtime;'
      );
    }

    return code;
  }

  /**
   * Replace smart pointer types handling nested templates.
   * std::unique_ptr<T> → T*
   * std::shared_ptr<T> → T*
   * std::weak_ptr<T> → T*
   * 
   * Must properly handle nested templates like Stack<String>.
   */
  private replaceSmartPointerTypes(code: string, ptrType: 'unique_ptr' | 'shared_ptr' | 'weak_ptr'): string {
    const pattern = `std::${ptrType}<`;
    let result = '';
    let pos = 0;

    while (true) {
      const start = code.indexOf(pattern, pos);
      if (start === -1) {
        result += code.substring(pos);
        break;
      }

      // Copy everything before the match
      result += code.substring(pos, start);

      // Find matching closing >
      let depth = 0;
      let i = start + pattern.length;
      while (i < code.length) {
        if (code[i] === '<') depth++;
        else if (code[i] === '>') {
          if (depth === 0) break;
          depth--;
        }
        i++;
      }

      if (i >= code.length) {
        // Malformed, just copy and continue
        result += code.substring(start, start + pattern.length);
        pos = start + pattern.length;
        continue;
      }

      // Extract the type
      const type = code.substring(start + pattern.length, i);
      
      // Replace std::ptrType<T> with T*
      result += `${type}*`;
      pos = i + 1;
    }

    return result;
  }

  /**
   * Replace smart pointer allocations handling nested templates.
   * Regex can't handle nested <> properly, so we parse manually.
   */
  private replaceSmartPointerAllocations(code: string, funcName: 'make_unique' | 'make_shared'): string {
    const pattern = `std::${funcName}<`;
    let result = '';
    let pos = 0;
    let replacements = 0;

    while (true) {
      const start = code.indexOf(pattern, pos);
      if (start === -1) {
        result += code.substring(pos);
        break;
      }

      // Copy everything before the match
      result += code.substring(pos, start);

      // Find matching closing >
      let depth = 0;
      let i = start + pattern.length;
      while (i < code.length) {
        if (code[i] === '<') depth++;
        else if (code[i] === '>') {
          if (depth === 0) break;
          depth--;
        }
        i++;
      }

      if (i >= code.length) {
        // Malformed, just copy and continue
        result += code.substring(start, start + pattern.length);
        pos = start + pattern.length;
        continue;
      }

      // Extract the type
      const type = code.substring(start + pattern.length, i);

      // Find the argument list
      if (i + 1 >= code.length || code[i + 1] !== '(') {
        result += code.substring(start, i + 1);
        pos = i + 1;
        continue;
      }

      // Find matching closing )
      let parenDepth = 0;
      let j = i + 2; // Start after the '('
      while (j < code.length) {
        if (code[j] === '(') parenDepth++;
        else if (code[j] === ')') {
          if (parenDepth === 0) break;
          parenDepth--;
        }
        j++;
      }

      const args = code.substring(i + 2, j);
      result += `gs::gc::Allocator::alloc<${type}>(${args})`;
      pos = j + 1;
      replacements++;
    }

    return result;
  }

  /**
   * Unwrap optionals in comparisons that come after null checks.
   * 
   * Pattern: if (x != std::nullopt && (...comparisons with x...))
   * After the null check, we know x has a value, so comparisons need x.value()
   * 
   * Example:
   *   if (ch != std::nullopt && (ch >= gs::String("0") && ch <= gs::String("9")))
   * Should become:
   *   if (ch != std::nullopt && (ch.value() >= gs::String("0") && ch.value() <= gs::String("9")))
   */
  private unwrapOptionalsInComparisons(code: string): string {
    // Strategy: Find patterns like "varname != std::nullopt &&"
    // Then in the rest of that condition (until the closing paren), replace varname with varname.value()
    
    // Use a more flexible approach: find the pattern, then manually parse to find the end
    let result = '';
    let pos = 0;
    
    const nullCheckPattern = /(\w+)\s*!=\s*std::nullopt\s*&&\s*/g;
    let match;
    
    while ((match = nullCheckPattern.exec(code)) !== null) {
      const varname = match[1];
      const matchEnd = match.index + match[0].length;
      
      // Copy everything before this match
      result += code.substring(pos, matchEnd);
      
      // Now find the closing paren for this condition
      // We need to find the matching ) for the if (
      // Start from matchEnd and count parentheses
      let parenDepth = 0;
      let i = matchEnd;
      
      // Go backwards to find the opening ( of the if statement
      let j = match.index - 1;
      while (j >= 0 && code[j].trim() === '') j--;
      if (j >= 0 && code[j] === '(') {
        parenDepth = 1;
      }
      
      // Now find where this condition ends
      let conditionEnd = matchEnd;
      while (i < code.length && parenDepth > 0) {
        if (code[i] === '(') parenDepth++;
        else if (code[i] === ')') {
          parenDepth--;
          if (parenDepth === 0) {
            conditionEnd = i;
            break;
          }
        }
        i++;
      }
      
      // Extract the condition part after the null check
      const conditionPart = code.substring(matchEnd, conditionEnd);
      
      // Replace varname with varname.value() in this part
      // But avoid replacing if it's already varname.value() or varname.method()
      const unwrapped = conditionPart.replace(
        new RegExp(`\\b${varname}\\b(?!\\.value\\(\\))(?!\\.\\w+)`, 'g'),
        `${varname}.value()`
      );
      
      result += unwrapped;
      pos = conditionEnd;
    }
    
    // Add the rest
    result += code.substring(pos);
    
    return result;
  }
}
