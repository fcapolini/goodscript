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
    // std::unique_ptr<T> → T*
    code = code.replace(/std::unique_ptr<([^>]+)>/g, '$1*');
    
    // std::shared_ptr<T> → T*
    code = code.replace(/std::shared_ptr<([^>]+)>/g, '$1*');
    
    // std::weak_ptr<T> → T*
    code = code.replace(/std::weak_ptr<([^>]+)>/g, '$1*');

    // Replace allocation calls
    // std::make_unique<T>(args) → gs::gc::Allocator::alloc<T>(args)
    code = code.replace(/std::make_unique<([^>]+)>\(([^)]*)\)/g, 'gs::gc::Allocator::alloc<$1>($2)');
    
    // std::make_shared<T>(args) → gs::gc::Allocator::alloc<T>(args)
    code = code.replace(/std::make_shared<([^>]+)>\(([^)]*)\)/g, 'gs::gc::Allocator::alloc<$1>($2)');

    // Remove * dereference when accessing array/vector elements
    // In GC mode, Array::operator[] returns T& instead of T*
    // Pattern: *array[index] should become array[index]
    // This includes: *this->array[i], *array[i], *values[i], etc.
    code = code.replace(/\*([a-zA-Z_][a-zA-Z0-9_]*(?:->[a-zA-Z_][a-zA-Z0-9_]*)?)\[/g, '$1[');
    code = code.replace(/\*this->([a-zA-Z_][a-zA-Z0-9_]*)\[/g, 'this->$1[');

    // Remove .get() calls (pointers are already raw)
    // But be careful - only remove when it's clearly a method call
    code = code.replace(/(\w+)\.get\(\)/g, '$1');

    // Remove std::move calls (not needed for GC)
    // std::move(x) → x
    code = code.replace(/std::move\(([^)]+)\)/g, '$1');

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

    // Add GC runtime initialization at start of main()
    code = code.replace(
      /int main\(\) \{/,
      'int main() {\n  gs::gc::Runtime gc_runtime;'
    );

    return code;
  }
}
