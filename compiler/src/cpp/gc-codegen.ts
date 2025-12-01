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

    // Remove .get() calls (pointers are already raw)
    // But be careful - only remove when it's clearly a method call
    code = code.replace(/(\w+)\.get\(\)/g, '$1');

    // Remove std::move calls (not needed for GC)
    // std::move(x) → x
    code = code.replace(/std::move\(([^)]+)\)/g, '$1');

    // Remove String::from() wrapper (not needed in GC mode)
    code = code.replace(/gs::String::from\(([^)]+)\)/g, '$1');

    // Add GC runtime initialization at start of main()
    code = code.replace(
      /int main\(\) \{/,
      'int main() {\n  gs::gc::Runtime gc_runtime;'
    );

    return code;
  }
}
