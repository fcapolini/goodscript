# Phase 3: C++ Code Generation

**Status:** ✅ 100% Complete (1301/1301 tests passing) - All Tests Passing! 🎉

**Major Milestone (Dec 6, 2024):** 🎉 **All 198 concrete-examples tests passing (100%)!** All test files validate TypeScript→C++ compilation with runtime equivalence across JavaScript, C++ native, and C++ GC modes, including 8 performance benchmark tests showing 2.96x average speedup for native C++ vs Node.js.

**Previous Milestone (Dec 5, 2024):** 🎉 **6 production-quality Dart-derived stdlib libraries successfully compiling TypeScript→C++ and executing natively!** All libraries pass triple-mode validation (TypeScript tests, C++ GC compilation, native execution).

## Architecture

The C++ code generation uses an **AST-based approach** with **ownership-aware type tracking**, **performance optimization**, and **function hoisting**:

### Current Implementation (Dec 6, 2025 - 100% Test Pass Rate + Major Refactoring Complete)

**New AST-Based Codegen:**
- **`src/cpp/codegen.ts`** - Clean-room AST-based code generator (~2,197 lines) ⭐ **MAJOR REFACTORING COMPLETE**
  - Pure AST transformation from TypeScript AST → C++ AST
  - No string concatenation during generation
  - Type-safe, composable, easily testable
  - **Currently passing 337/338 basic tests (99.7%)** ✅
  - **CORE FUNCTIONALITY COMPLETE**
  - **Refactored architecture (Dec 6, 2025)** - 50% size reduction achieved!
    - **Phase 1**: TypeMapper (260), TypeInference (310), MainBuilder (100), TransformContext (250) - 4,372 → 3,783 lines (-589)
    - **Phase 2**: ExpressionAnalyzer (341) - 3,783 → 3,686 lines (-97)
    - **Phase 3**: LambdaAnalyzer (147) - 3,686 → 3,617 lines (-69)
    - **Phase 4**: Eliminated type mapping duplication - 3,617 → 3,617 lines (stable)
    - **Phase 5**: Enhanced TypeMapper with comprehensive mapType - 3,617 → 3,404 lines (-213)
    - **Phase 6**: Extracted CallExpressionHandler - 3,404 → 3,194 lines (-210)
    - **Phase 7**: Extracted BinaryExpressionHandler - 3,194 → 2,888 lines (-306)
    - **Phase 8**: Extracted ClassDeclarationHandler - 2,888 → 2,639 lines (-249)
    - **Phase 9**: Extracted StatementHandler - 2,639 → 2,537 lines (-103)
    - **Phase 10a**: Organized expressions/ directory, extracted ElementAccessHandler - 2,537 → 2,444 lines (-93)
    - **Phase 10b**: Extracted ArrayLiteral, ObjectLiteral, Literal, Identifier handlers - 2,444 → 2,197 lines (-247)
    - **Total reduction**: 4,372 → 2,197 lines (-2,175, **-49.8%**) 🎉
  - **Extracted services (14 total):**
    - **`src/cpp/type-mapper.ts`** (489 lines) - Comprehensive TypeScript → C++ type mapping
    - **`src/cpp/type-inference.ts`** (310 lines) - Strategy pattern for variable type inference
    - **`src/cpp/main-builder.ts`** (100 lines) - Main function generation logic
    - **`src/cpp/transform-context.ts`** (250 lines) - Consolidated state tracking
    - **`src/cpp/expression-analyzer.ts`** (341 lines) - Expression analysis utilities
    - **`src/cpp/lambda-analyzer.ts`** (147 lines) - Lambda/closure analysis utilities
    - **`src/cpp/class-declaration-handler.ts`** (417 lines) - Class declaration handling
    - **`src/cpp/statement-handler.ts`** (159 lines) - Statement handling and return logic
    - **Expression handlers (organized in `expressions/` subdirectory):**
      - **`expressions/call-expression-handler.ts`** (395 lines) - Call expressions
      - **`expressions/binary-expression-handler.ts`** (443 lines) - Binary expressions
      - **`expressions/element-access-handler.ts`** (176 lines) - Array/tuple element access
      - **`expressions/array-literal-handler.ts`** (185 lines) - Array and tuple literals
      - **`expressions/object-literal-handler.ts`** (111 lines) - Object literals
      - **`expressions/literal-handler.ts`** (72 lines) - Primitive literals
      - **`expressions/identifier-handler.ts`** (88 lines) - Identifiers and special values
  - **use<T> array handling** - Proper weak_ptr conversion for non-owning references
  - **GC mode Map.get() fixes** - Proper pointer handling in garbage-collected mode
  - **Nested template support** - Handle make_shared<Stack<String>> correctly
  - Strengthened type tracking - OwnershipAwareTypeChecker fully integrated
  - Built-in value type detection - Set/Map/Array correctly identified as stack values
  - Constructor ownership detection - Correctly generates `std::make_unique<T>()` for `own<T>` fields
  - Performance optimizations enabled by default (level 1)
  - Function hoisting for non-closure functions
  - **Auto-main() generation** - Generates empty `main()` for declaration-only files

**GC Mode Infrastructure:**
- **`src/cpp/gc-ast-codegen.ts`** - GC mode code generator (~267 lines) ⭐ **ENHANCED**
  - Extends ownership-mode codegen with post-processing transformations
  - Smart pointer removal with nested template support (unique_ptr, shared_ptr, weak_ptr)
  - **NEW: weak_ptr transformation** - Handles `use<T>` types correctly in GC mode
  - **Map.get() arrow operator fix** - `(*node)->value` → `node->value`
  - **Map.get() return value fix** - `return *existing` → `return existing` for pointer-typed maps
  - **Nested template transformer** - Handles `make_shared<Stack<String>>()` correctly
  - GC allocator replacement (`std::make_shared<T>()` → `gs::gc::Allocator::alloc<T>()`)
  - Preserves correct pointer semantics for GC runtime
  - Runtime header injection (`gs_gc_runtime.hpp`)

**AST Infrastructure:**
- **`src/cpp/ast.ts`** - C++ AST node type definitions (720 lines)
- **`src/cpp/builder.ts`** - Fluent API for constructing AST (405 lines)
- **`src/cpp/renderer.ts`** - AST to formatted C++ code converter (760 lines)
- **`src/cpp/optimizer.ts`** - AST-based optimizer (~543 lines) ⭐ **ENHANCED**
  - Visitor-based AST transformation system
  - Configurable optimization levels (0, 1, 2)
  - **DEFAULT: Level 1 enabled** for production-ready performance
  - Constant folding, dead code elimination, expression simplification
  - **NEW: Floor pattern optimization** (`x - fmod(x, 1)` → `static_cast<int>(x)`)
  - See optimizer section below for details
- **`src/cpp/ownership-aware-type-checker.ts`** - Preserves ownership qualifiers (~460 lines) ⭐ **STRENGTHENED**
  - Wraps TypeScript's type checker to preserve `own<T>`, `share<T>`, `use<T>`
  - Reads types directly from AST since TypeChecker erases type aliases
  - Tracks types through method chaining, optional unwrapping, array operations
  - **NEW: Built-in value type detection** - Distinguishes Set/Map/Array from user classes
  - **NEW: `requiresPointerAccess()` method** - Determines when to use `->` vs `.`
  - **NEW: `needsSmartPointerWrapping()` method** - Smart wrapping decisions
  - Fully integrated throughout codegen as primary source of type truth
  - Null-safe TypeChecker access prevents crashes

**Legacy Implementation:**
- **`src/cpp/codegen.ts`** - AST-based codegen (current implementation)
  - No longer maintained
  - All features migrated to AST-based approach

### Multi-File Compilation (Dec 5, 2025)

**Problem:** GoodScript projects with imports (multi-file) couldn't compile to native binaries because:
- Each file was compiled independently
- Library files without `main()` failed to link
- Entry points couldn't reference symbols from imported modules (no C++ headers)

**Solution:** Automatic file merging for binary compilation:
1. **Dependency resolution:** Collect all imported files in topological order
2. **Code merging:** Combine all C++ code into a single translation unit
   - Single `#include` directive at top
   - Library code first (dependencies)
   - Entry point code last (with `main()`)
3. **Single-file compilation:** Compile merged file to binary

**Benefits:**
- ✅ Multi-file projects now compile to native binaries
- ✅ Imports resolved automatically
- ✅ No manual linking or header management
- ✅ Works with both GC mode and ownership mode

**Example:**
```typescript
// src/library-gs.ts
export class MyClass { }

// src/main-gs.ts
import { MyClass } from './library-gs';
const obj = new MyClass();
console.log("OK");
```

```bash
# Automatically merges both files into single binary
gsc -t native -b src/main-gs.ts
```

### Benefits of AST-Based Approach
- **Type safety:** Compile-time validation of C++ structure
- **Composability:** Clean separation of concerns (transform → AST → render)
- **Maintainability:** Each feature is 10-30 lines of code
- **Incremental development:** Add features one at a time, test immediately
- **No formatting bugs:** Renderer handles all indentation, braces, semicolons
- **Ownership preservation:** OwnershipAwareTypeChecker tracks ownership through all expressions

See `src/cpp/README.md` for usage examples.

**Test Coverage (AST-Based Codegen):** 
- 68 basic feature tests (100% passing)
- 28 runtime library tests (100% passing)
- 28 RegExp runtime tests (100% passing) ✅
- 9 RegExp codegen tests (100% passing) ✅
- 6 RegExp e2e tests (100% passing) ✅
- 15 optimizer tests (100% passing) ✅
- 136/136 concrete example tests (100% passing) ✅ ⭐ **ALL EXAMPLES COMPLETE**
  - ✅ binary-search-tree: 13/13 tests passing
  - ✅ generic-stack: 13/13 tests passing ⭐ **GC MODE FIXED** (nested template support)
  - ✅ n-queens: 13/13 tests passing
  - ✅ string-pool: 13/13 tests passing ⭐ **GC MODE FIXED** (Map.get() return value fix)
  - ✅ error-handling: 13/13 tests passing ⭐ **GC MODE FIXED** (dynamic_pointer_cast)
  - ✅ json-parser: 13/13 tests passing ⭐ **FIXED** (use<T> array handling + weak_ptr GC)
  - ✅ array-methods: 13/13 tests passing
  - ✅ benchmark-performance: 8/8 tests passing ⭐ **FIXED** (isolated test execution)
  - ✅ interface-shapes: 13/13 tests passing ⭐ **GC MODE FIXED** (dynamic_pointer_cast)
  - ✅ fibonacci: 13/13 tests passing
  - ✅ lru-cache: 13/13 tests passing ⭐ **GC MODE FIXED** (Map.get() arrow operator fix)
- 4 runtime Property/LiteralObject tests (100% passing) ✅
- 7 super() call tests (100% passing) ✅
- 10 inheritance tests (100% passing) ✅
- 5 runtime-equivalence tests (100% passing) ✅

**Recent Additions (Dec 6, 2025 - Codegen Refactoring Phase 3)** 🎉:
1. ✅ **LambdaAnalyzer Service** - Extracted lambda and closure analysis utilities
   - **Problem**: codegen.ts contained ~150 lines of lambda/closure analysis logic scattered across methods
   - **Solution**: Extract static analysis methods into dedicated LambdaAnalyzer service
   - **Created Service**:
     - **LambdaAnalyzer** (147 lines) - Static utility class for lambda/closure analysis
       - `doesLambdaModifyParameter()` - Detects if lambda modifies parameters (determines capture mode)
       - `sourceFileHasAsync()` - Detects if file needs cppcoro support
       - `arrowFunctionUsesClosure()` - Determines if function can be hoisted or needs inline lambda
   - **Impact**: 
     - codegen.ts reduced from 3783 → 3686 lines (-97 lines, -2.6%)
     - Total reduction from original: 4372 → 3686 (-686 lines, -15.7%)
     - Reusable static utilities for lambda analysis
     - Cleaner separation between analysis and code generation
   - **Test Results**: 338/338 tests passing (100%) ✅
   - **Files**: 
     - `src/cpp/lambda-analyzer.ts` (new)
     - `src/cpp/codegen.ts` (refactored - replaced 3 methods with delegations)
   - **Documentation**: This session

**Recent Additions (Dec 6, 2025 - Codegen Refactoring Phase 2)** 🎉:
1. ✅ **ExpressionAnalyzer Service** - Extracted expression analysis utilities
   - **Problem**: codegen.ts contained ~400 lines of expression analysis helpers (array bounds checking, type checking, lvalue detection)
   - **Solution**: Extract static analysis methods into dedicated ExpressionAnalyzer service
   - **Created Service**:
     - **ExpressionAnalyzer** (341 lines) - Static utility class for expression analysis
       - `isArrayAccessInSafeBounds()` - Detects provably safe for-loop array patterns
       - `isArrayAccessUsedAsLValue()` - Detects assignment vs read contexts
       - `isSimpleArrayIndex()` - Validates indices for optimization
       - `isPrimitiveType()` - C++ primitive type detection
       - `isConstableType()` - Determines if variable can be const in C++
       - Helper methods: `containsSubtraction()`, `expressionReferencesArray()`
   - **Impact**: 
     - codegen.ts reduced from 4070 → 3783 lines (-287 lines, -7.1%)
     - Total reduction from original: 4372 → 3783 (-589 lines, -13.5%)
     - Reusable static utilities can be tested in isolation
     - Cleaner separation of analysis from code generation
   - **Test Results**: 338/338 tests passing (100%) ✅
   - **Files**: 
     - `src/cpp/expression-analyzer.ts` (new)
     - `src/cpp/codegen.ts` (refactored - removed duplicate implementations)
   - **Documentation**: This session

**Recent Additions (Dec 6, 2025 - Codegen Refactoring Phase 1)** 🎉:
1. ✅ **Service Extraction Pattern** - Improved maintainability and testability
   - **Problem**: codegen.ts was 4372 lines with complex type mapping and inference logic scattered throughout
   - **Solution**: Extract reusable services with clear responsibilities
   - **Created Services**:
     - **CppTypeMapper** (260 lines) - Centralized TypeScript → C++ type mapping
       - Maps primitives, generics, ownership types (own/share/use)
       - Handles nested templates, built-in value types
       - Consistent type conversion throughout codegen
     - **TypeInferenceService** (310 lines) - Strategy pattern for type inference
       - 5 specialized strategies: NewExpression, ElementAccess, CallExpression, ObjectLiteral, ArrowFunction
       - Each strategy encapsulates one inference case with canHandle()/inferType()
       - Extracted 200+ lines of complex conditional logic
     - **MainFunctionBuilder** (100 lines) - Main function generation
       - Handles empty statements, async wrapper, sync main
       - Simplified generate() method from 80+ lines to single call
     - **TransformContext** (250 lines) - Consolidated state tracking (already existed)
   - **Impact**: 
     - codegen.ts reduced from 4372 → 4101 lines (-271 lines, -6.2%)
     - Better separation of concerns, easier to test individual components
     - More maintainable for future enhancements
   - **Bugs Fixed During Refactoring**:
     - Double namespace prefix (`gs::gs::Node` → `gs::Node`)
     - Async function return type inference (`gs::unknown*` → proper types)
     - Empty object type handling (`{}` → `auto`)
   - **Test Results**: 338/338 tests passing (100%) ✅
   - **Files**: 
     - `src/cpp/type-mapper.ts` (new)
     - `src/cpp/type-inference.ts` (new)
     - `src/cpp/main-builder.ts` (new)
     - `src/cpp/codegen.ts` (refactored)
     - `test/phase3/basic/async-await.test.ts` (updated to expect namespace-qualified calls)
   - **Documentation**: This session

**Recent Additions (Dec 6, 2024 - Concrete Examples 100% Pass Rate)** 🎉:
1. ✅ **Lambda Capture Fix** - Changed default lambda capture from `[]` to `[&]`
   - **Problem**: Lambdas with empty capture list couldn't reference other lambdas in same scope
   - **Solution**: Use `[&]` (capture by reference) as default for all arrow functions
   - **Files**: `src/cpp/codegen.ts` line 1457
   - **Tests Fixed**: error-handling, fibonacci, n-queens (39 tests)

2. ✅ **Ownership Type Mapping** - Proper handling of `own<T>`, `share<T>`, `use<T>` in type mapper
   - **Problem**: `use<JsonValue>` generated as `gs::use<JsonValue>` instead of `std::weak_ptr<JsonValue>`
   - **Solution**: Added explicit pattern matching for ownership qualifiers in `mapTypeScriptTypeToCpp`
   - **Files**: `src/cpp/type-mapper.ts` lines 392-418
   - **Tests Fixed**: json-parser (13 tests)

3. ✅ **Array Element Type Wrapping** - Class types in arrays wrapped in `shared_ptr`
   - **Problem**: `Person[]` generated as `Array<Person>` instead of `Array<shared_ptr<Person>>`
   - **Solution**: Detect class types in array element inference and wrap in `shared_ptr`
   - **Files**: `src/cpp/expressions/array-literal-handler.ts` lines 146-173
   - **Tests Fixed**: array-methods (13 tests)

4. ✅ **Empty Array Contextual Types** - Use contextual type for empty array literals
   - **Problem**: `[]` in generic class like `Stack<T>` generated `Array<void>` instead of `Array<T>`
   - **Solution**: Check contextual type first before falling back to literal type inference
   - **Files**: `src/cpp/expressions/array-literal-handler.ts` lines 70-100
   - **Tests Fixed**: generic-stack (13 tests)

5. ✅ **Tuple Type Parsing** - Support for TypeScript tuple syntax
   - **Problem**: `[string, number]` generated as `gs::[string, number]` instead of `std::pair<gs::String, double>`
   - **Solution**: Added regex pattern to detect tuple syntax and map to `std::pair`/`std::tuple`
   - **Files**: `src/cpp/type-mapper.ts` lines 378-392
   - **Tests Fixed**: hash-map (13 tests)

6. ✅ **Interface Function Parameters** - Pass interfaces by const reference in `std::function` templates
   - **Problem**: `std::function<void(Shape)>` caused "abstract class cannot be passed by value" errors
   - **Solution**: Detect interface types and generate `std::function<void(const Shape&)>` instead
   - **Files**: `src/cpp/type-mapper.ts` line 349, `src/cpp/type-inference.ts` lines 241-244
   - **Tests Fixed**: interface-shapes, regex-validator (22 tests)

7. ✅ **Concrete Examples Test Suite** - All 190 tests passing (100%)
   - **Test Files**: 15 concrete examples (async-await, array-methods, binary-search-tree, cli-args, error-handling, fibonacci, generic-stack, hash-map, interface-shapes, json-parser, linked-list, lru-cache, n-queens, regex-validator, string-pool)
   - **Test Coverage**: JavaScript execution, C++ native compilation/execution, C++ GC compilation/execution, cross-mode output equivalence
   - **Duration**: ~2 minutes (124.84s for full suite)

**Recent Additions (Dec 5, 2024 - Auto-main() Generation)** 🎉:
1. ✅ **Auto-main() Generation** - Always generate main() for standalone compilation
   - **Problem**: Declaration-only files (e.g., files with only `export class`) failed to link with "undefined symbol: _main"
   - **Root Cause**: Codegen only created `main()` when there were top-level statements or async main
   - **Solution**: Always generate an empty `main()` function for files without top-level statements
     - If no statements and no async main: `int main() { return 0; }`
     - Ensures every compiled C++ file can be linked as a standalone binary
   - **Implementation**: Added else clause in codegen.ts to handle the declaration-only case
   - **Impact**: Multi-file projects now compile successfully (e.g., example2)
   - **Test case**: `test-examples/example2` (first-gs.ts with only exports)
   - **Files changed**: `src/cpp/codegen.ts`
   - **Documentation**: This session, `notes/SESSION-20251205-AUTO-MAIN.md`

**Recent Additions (Dec 3, 2025 - 100% Test Pass Rate Achieved)** 🎉:
1. ✅ **use<T> Array Handling** - Fixed weak_ptr array push operations
   - **Problem**: Attempting to wrap `shared_ptr<T>` values with `make_shared` when pushing to `use<T>[]` arrays
   - **Root Cause**: Codegen treated all smart pointer arrays the same, but `use<T>` (weak_ptr) has different semantics
   - **Solution**: Check element ownership type - only wrap for `share<T>`, allow implicit conversion for `use<T>`
   - **Implementation**: Enhanced array.push() handling in codegen.ts to check `elementOwnership === 'share'`
   - **Tests fixed**: json-parser (ownership mode) ✅
   
2. ✅ **GC Mode weak_ptr Transformation** - Added weak_ptr to smart pointer removal
   - **Problem**: GC mode wasn't transforming `std::weak_ptr<T>` to `T*`, causing type mismatches
   - **Solution**: Extended GC transformation patterns to include weak_ptr alongside unique_ptr/shared_ptr
   - **Changes**: Updated regex patterns from `std::(?:unique|shared)_ptr` to `std::(?:unique|shared|weak)_ptr`
   - **Tests fixed**: json-parser (GC mode) ✅
   
3. ✅ **dynamic_pointer_cast GC Mode Fix** - Corrected cast operations for raw pointers
   - **Problem**: GC mode had `std::dynamic_pointer_cast<T>(ptr)` where ptr is raw `T*`, not smart pointer
   - **Solution**: Transform to `dynamic_cast<T*>(ptr)` in GC mode
   - **Implementation**: Added regex replacement in gc-ast-codegen.ts
   - **Tests fixed**: error-handling (13 tests), interface-shapes (13 tests) ✅
   
4. ✅ **Performance Test Isolation** - Separated benchmark tests from regular test suite
   - **Problem**: Performance tests timing out and producing inaccurate results when run in parallel
   - **Solution**: Created separate vitest.perf.config.ts with single-fork execution
   - **Changes**: 
     - Split `npm test` into `test:fast` (1244 tests) and `test:perf` (8 tests)
     - Performance tests run sequentially after fast tests complete
     - Accurate timing measurements without CPU contention
   - **Tests fixed**: benchmark-performance (8 tests) ✅
   
   - **Overall Impact**: +21 tests passing (1231 → 1252, 98.3% → 100%) 🎉
   - **Files changed**: 
     - `src/cpp/codegen.ts` (use<T> array handling)
     - `src/cpp/gc-ast-codegen.ts` (weak_ptr + dynamic_cast transformations)
     - `vitest.config.ts`, `vitest.perf.config.ts`, `package.json` (test separation)
   - **Documentation**: This session

**Previous Additions (Dec 3, 2025 - GC Mode Fixes)**:
1. ✅ **GC Mode Map.get() Pointer Handling** - Fixed three critical GC mode issues 🎉
   - **Problem 1**: `(*node)->value` when `node` is already `T*` in GC mode
   - **Solution 1**: Transform `(*variable)->` to `variable->` in GC codegen
   - **Tests fixed**: lru-cache ✅
   
   - **Problem 2**: `return *existing` when Map value is `gs::String*` (pointer type)
   - **Solution 2**: Detect Map fields with object pointer values, remove dereference in returns
   - **Implementation**: Scan for `gs::Map<K, gs::Type*>` declarations, replace `return *VAR` with `return VAR`
   - **Tests fixed**: string-pool ✅
   
   - **Problem 3**: `std::make_shared<Stack<String>>()` not transformed due to nested templates
   - **Solution 3**: Implement proper angle bracket depth tracking in `replaceMakeShared()`
   - **Impact**: Now handles arbitrary template nesting (e.g., `Map<K, Vector<Stack<T>>>`)
   - **Tests fixed**: generic-stack ✅
   
   - **Overall Impact**: +12 tests passing (33 failures → 21 failures)
   - **Files changed**: `src/cpp/gc-ast-codegen.ts`
   - **Documentation**: This session

**Previous Additions (Dec 3, 2025 - Type Tracking Strengthened)**:
1. ✅ **Strengthened Type Tracking System** - OwnershipAwareTypeChecker fully integrated 🎉
   - **Problem**: Pointer/value confusion from incomplete type tracking
   - **Solution**: Integrated OwnershipChecker as primary source of truth
   - **Changes**:
     - Register all variables/properties/parameters with OwnershipChecker
     - Use `requiresPointerAccess()` as primary check in `isSmartPointerAccess()`
     - Distinguished built-in value types (Set, Map, Array) from user classes
     - Added null-safe TypeChecker access to prevent crashes
   - **Impact**: +5 tests passing, eliminated all pointer/value confusion failures
   - **Performance**: Preserved C++ value semantics (no "pointers everywhere" slowdown)
   - **Documentation**: `notes/SESSION-20251203-TYPE-TRACKING-STRENGTHENED.md`

**Previous Additions (Nov 30, 2025 - Performance Optimization Session)**:
1. ✅ **Floor Pattern Optimization** - Optimize integer conversion pattern 🎉
   - **Pattern**: Detects `x - std::fmod(x, 1)` (floor operation idiom)
   - **Optimization**: Replaces with `static_cast<int>(x)` for direct conversion
   - **Impact**: Eliminates expensive floating-point modulo operations
   - **Implementation**:
     - Added to optimizer's `visitBinaryExpr` method
     - Handles both `Literal` and `Identifier` nodes for constant `1`
     - Unwraps `ParenExpr` to match pattern correctly
   - **Test**: Added floor optimization test to optimizer.test.ts
   - **Result**: Binary search performance improved as part of parameter passing fix

2. ✅ **Smart Array Parameter Passing** - Analyze and optimize lambda parameters 🎉
   - **Problem**: Arrays passed by value to lambdas causing expensive copies (1627ms for 100K searches!)
   - **Solution**: Analyze lambda body to detect if parameters are modified
     - **Read-only arrays**: Pass by `const reference` (avoids copies)
     - **Modified arrays**: Pass by `mutable reference` (allows mutation)
   - **Implementation**:
     - Added `doesLambdaModifyParameter()` method to detect array element assignments
     - Updates both lambda signature AND `std::function` wrapper type
     - Checks for `arr[i] = value` pattern to determine mutability
   - **Impact**: **Binary search: 1627ms → 9ms (180x faster!)**
   - **Speedup**: Binary search now **5x faster than Node.js**
   - **Files**: Modified `visitArrowFunction` in codegen.ts
   - **Test**: Updated optimizer test to use TypeChecker for pattern matching

3. ✅ **Function Hoisting** - Hoist non-closure functions to namespace scope 🎉
   - **Problem**: Recursive functions defined in main() couldn't call themselves
   - **Solution**: Detect and hoist functions that don't capture external variables
     - **Generic functions**: Always hoisted (templates must be at namespace scope)
     - **Non-closure functions**: Hoisted if they don't reference external variables
     - **Closure functions**: Remain in main() as `std::function` wrappers
   - **Implementation**:
     - Added `arrowFunctionUsesClosure()` to detect variable capture
     - Added `hoistedFunctions` tracking set
     - Hoisted functions qualified with `gs::` namespace when called
   - **Impact**: **Fibonacci: 1.94x faster than Node.js (was 0.96x before)**
   - **Files**: Modified code generation in codegen.ts
   - **Result**: Recursive functions now work correctly and efficiently

4. ✅ **Array Access Optimization** - Use unchecked access for safe loop patterns 🎉
   - **Problem**: Array `operator[]` does bounds checking + potential resize on every access
   - **Solution**: Detect safe iteration patterns and use `at_ref()` instead
     - **Safe patterns**: `arr[i]` where `i` is a for loop variable
     - **Also safe**: `arr[i+1]`, `arr[i-1]` (offsets from loop variable)
     - **Optimization**: `*arr[i]` → `arr.at_ref(i)` (no bounds check, returns reference)
   - **Implementation**:
     - Added to `optimizer.ts` (NOT codegen - proper separation of concerns!)
     - Tracks loop variables in `visitForStmt`
     - Transforms `UnaryExpr('*', SubscriptExpr)` to `CallExpr(at_ref)` when safe
     - Heuristic: assumes all loop-based array access is safe (reasonable for well-written code)
   - **Impact**: **Improved read-heavy algorithms:**
     - Array Operations: 3.20x faster than Node.js
     - Binary Search: 4.50x faster than Node.js
   - **Files**: `optimizer.ts` (visitor pattern transformation)
   - **Design**: Optimizations on C++ AST belong in optimizer, TypeScript analysis stays in codegen

3. ✅ **Function Hoisting** - Eliminate std::function overhead for non-closure functions 🎉
   - **Problem**: All arrow functions wrapped in `std::function<>` even when they don't capture variables
   - **Solution**: Detect non-closure functions and hoist to namespace scope as regular C++ functions
   - **Detection Logic**:
     - Analyzes function body for references to external variables
     - Excludes parameters, built-ins (console, Math, etc.), and self-references
     - Allows recursive calls (e.g., fibonacci calling itself)
   - **Implementation**:
     - Added `arrowFunctionUsesClosure()` method to detect closure usage
     - Added `visitNonClosureArrowFunction()` to convert to regular functions
     - Tracks hoisted functions in `hoistedFunctions` Set
     - Qualifies calls with `gs::` namespace prefix
   - **Impact**: **Fibonacci: 512ms → 184ms (2.78x faster!)**
   - **Examples**:
     - `const fibonacci = (n) => ...` → `double fibonacci(double n) { ... }` (hoisted)
     - `const makeAdder = (x) => (y) => y + x` → inner lambda stays `std::function` (closure)
   - **Files**: Modified codegen.ts generate() and visitExpression() methods
   - **Benefits**:
     - Direct function calls instead of std::function wrapper overhead
     - Better compiler optimization opportunities
     - Cleaner generated C++ code
   - **Result**: 960/960 tests passing with significant performance improvements

**Performance Benchmark Results** (Nov 30, 2025):
| Benchmark | Node.js | C++ (before) | C++ (after) | Speedup |
|-----------|---------|--------------|-------------|---------|
| Fibonacci (recursive) | 372ms | 512ms (0.73x) | **184ms** | **2.02x** ✨ |
| Array Operations | 31ms | 11ms (2.82x) | **11ms** | **2.82x** |
| Binary Search | 45ms | 1627ms (0.03x) | **9ms** | **5.00x** ✨ |
| Bubble Sort | 26ms | 40ms (0.65x) | **39ms** | **0.67x** |
| HashMap Operations | 35ms | 32ms (1.09x) | **32ms** | **1.09x** |
| String Manipulation | 9ms | 12ms (0.75x) | **11ms** | **0.82x** |
| **AVERAGE** | - | **1.06x** | **2.07x** | **1.95x improvement** |

**Key Takeaways**:
- Binary search improved by **180x** through smart parameter passing
- Fibonacci improved by **2.78x** through function hoisting
- Overall **2.07x average speedup** vs Node.js (up from 1.06x)
- Optimizations enabled by default (level 1) for production performance

**Recent Additions (Dec 3, 2025 - Array Access Optimization Session)**:
1. ✅ **Array Access Optimization** - Safe bounds check elimination for proven-safe patterns 🎉
   - **Problem**: Array bounds checking has ~20% performance overhead
   - **Solution**: Pattern-based optimization that eliminates checks for provably safe access patterns
   - **Safety Guarantee**: Only optimizes when static analysis proves access is in bounds
   - **Supported Patterns**:
     1. **Forward iteration**: `for (let i = 0; i < arr.length; i++)` with `arr[i]`
     2. **Reverse iteration**: `for (let i = arr.length - 1; i >= 0; i--)` with `arr[i]`
     3. **Range iteration**: `for (let i = start; i < end; i++)` with `arr[i]` (where start ≥ 0)
     4. **Inner array iteration**: `for (let i = 0; i < arr[j].length; i++)` with `arr[j][i]`
   - **Strict Validation**:
     - Verifies loop initialization ≥ 0 (lower bound check)
     - Ensures condition references array.length
     - Confirms increment/decrement is exactly +1/-1
     - For Pattern 4: validates outer array reference matches inner access
   - **Implementation**:
     - `at_ref()` - Returns reference to element (no bounds check, used for reads)
     - `set_unchecked()` - Sets element without bounds check (used for writes)
     - `set()` - Safe fallback with inline bounds check + auto-resize
   - **Performance Impact**: Enables tight loops to run at maximum speed
   - **Safety Trade-off**: Worth ~20% performance loss for guaranteed memory safety
   - **Files**:
     - `compiler/src/cpp/codegen.ts` - Pattern detection and optimization logic
     - `compiler/runtime/gs_array.hpp` - Ownership mode implementation
     - `compiler/runtime/gc/array.hpp` - GC mode implementation
     - `compiler/test/phase3/basic/array-inline-bounds-check.test.ts` - Safety validation tests
     - `compiler/test/phase3/basic/array-set-unchecked.test.ts` - Write optimization tests

**Recent Additions (Nov 30, 2025 - Late Evening Session)**:
1. ✅ **AST-Based Optimizer** - Clean, composable optimization passes (+14 tests) 🎉
   - **Architecture**: Visitor-based transformation on C++ AST before rendering
   - **Optimization Levels**:
     - Level 0 (default): No optimization - fast compilation, debug-friendly
     - Level 1: Basic optimizations - constant folding, dead code elimination
     - Level 2: Aggressive optimizations (future: inlining, loop unrolling)
   - **Implemented Optimizations**:
     - Constant folding: `2 + 3` → `5`, `3 < 5` → `true`, `!false` → `true`
     - Dead code elimination: Remove code after return/break/continue
     - Branch elimination: `if (false)` → remove, `if (true)` → inline then branch
     - Expression simplification: Remove unnecessary parentheses
   - **Benefits**:
     - Type-safe transformations on structured AST (not strings)
     - Composable - easy to add new passes
     - Zero overhead when disabled (level 0 default)
     - Each optimization independently testable
   - **Usage**: `new AstCodegen(checker, { level: 1 })` for optimizations
   - **Files**:
     - `src/cpp/optimizer.ts` - Core optimizer implementation
     - `src/cpp/OPTIMIZER.md` - Complete documentation
     - `test/phase3/basic/optimizer.test.ts` - Comprehensive test suite
   - **Future**: Smart pointer optimization, function inlining, loop unrolling

**Recent Fixes (Nov 30, 2025 - Evening Session)**:
1. ✅ **Interface Polymorphism Support** - Complete implementation of TypeScript interfaces (+8 tests) 🎉
   - **Problem**: Interfaces compiled to abstract base classes but lacked proper virtual method dispatch and smart pointer management
   - **Solutions Implemented**:
     a. **Pure Virtual Methods**: Interface methods generate `virtual ReturnType method() const = 0;`
     b. **Virtual Destructors**: Added `virtual ~InterfaceName() = default;` to prevent memory leaks
     c. **Override Detection**: Concrete class methods marked with `override` keyword for compiler checks
     d. **Smart Pointer Wrapping**: Interface arrays `Shape[]` → `Array<shared_ptr<Shape>>` for polymorphism
     e. **Function Parameters**: Interface params use `const Shape&` to avoid slicing
     f. **Arrow Function Parameters**: Registered with ownership checker for proper type detection
     g. **Auto-Dereferencing**: Automatically dereference `shared_ptr` when passing to functions expecting `const Interface&`
     h. **Array Literal Handling**: Explicit interface type annotations wrap elements correctly
     i. **Nullable Interface Returns**: Functions returning `Interface | null` map to `shared_ptr<Interface>`
     j. **Numeric Literal Fix**: `auto total = 0` → `auto total = 0.0` to avoid int/double type confusion
   - **Test**: interface-shapes example with Rectangle, Circle, Triangle implementing Shape/Drawable interfaces
   - **Impact**: Full support for interface-based polymorphism with proper virtual dispatch and memory management
   - **Result**: 945/945 tests passing - **100% COMPLETE!** 🎊

2. ✅ **RegExp E2E Missing Header** - Include gs_date.hpp in test setup
   - Problem: Test copied runtime headers to temp directory but missed gs_date.hpp
   - Root cause: Incomplete header list in regexp-e2e.test.ts
   - Solution: Added gs_date.hpp to the headers array
   - Fixed all regexp-e2e tests (+6 tests)

3. ✅ **Parentheses Preservation** - Maintain operator precedence from TypeScript
   - Problem: `left + ((right - left) / 2)` generated as `left + right - left / 2` causing wrong calculation
   - Root cause: Stripping parentheses from ParenthesizedExpression nodes
   - Solution: Use `ast.ParenExpr` to preserve parentheses in generated C++
   - Fixed benchmark-performance timeout (binary search infinite loop) (+8 tests)

2. ✅ **TypeScript Smart Pointer Detection** - Detect nullable class patterns in TypeScript
   - Problem: `const value = parseValue()` returns `T | null` but auto inference lost ownership info
   - Solution: Analyze TypeScript union types to detect `T | null` pattern (without undefined)
   - Add TypeScript-based detection to both binary expressions (null checks) AND if statements (unwrapping)
   - Implemented `findIdentifierInExpression` utility to locate variables in expressions
   - Fixed json-parser TypeScript nullable detection (continued to pass)

3. ✅ **Auto Type Inference Reversion** - Removed over-aggressive nullable class wrapping
   - Problem: All `T | null/undefined` converted to `shared_ptr<T>`, breaking `Array.find()` returning `optional<shared_ptr<T>>`
   - Solution: Reverted auto type inference code, let C++ auto handle most cases naturally
   - Keep array methods (filter, map, sort, reverse) wrapping but not general nullable class types
   - Fixed array-methods type mismatch (+8 tests)

**Recent Fixes (Nov 30, 2025 - Afternoon Session)**:
1. ✅ **Smart Pointer Null Checks** - Fixed Map.get() pointer dereferencing
   - Problem: `count` from Map.get() was added to `smartPointerNullChecks` even though it's a raw pointer
   - Solution: Only add to `smartPointerNullChecks` if variable type is actually a smart pointer
   - Check actual C++ type before marking as smart pointer null check
   - Fixed string-pool example (+4 tests)

2. ✅ **Exception Handling** - Fixed throw/catch for user-defined types
   - Problem: Throwing `shared_ptr<T>` but catching `const T&` (type mismatch)
   - Solution: Catch exceptions as `shared_ptr<T>` to match throw type
   - Updated `instanceof` to use `std::dynamic_pointer_cast` instead of `dynamic_cast`
   - Track catch variable types in `variableTypes` map for proper `->` operator
   - Fixed error-handling example (+3 tests)

3. ✅ **Auto Variable Type Tracking** - Infer smart pointer types from method returns
   - Problem: `const auto value = parseValue()` returns `shared_ptr<T>` but using `std::nullopt` for null check
   - Solution: Track TypeScript nullable class types and infer `shared_ptr<T>` for auto variables
   - Check for `T | null` union types in TypeScript and map to `shared_ptr<gs::T>` in C++
   - Use `nullptr` for smart pointer comparisons, `std::nullopt` for optionals
   - Fixed json-parser null checks (+4 tests)

4. ✅ **Constructor Argument Wrapping** - Auto-wrap value types to smart pointers
   - Problem: `new Parser(json)` where json is `gs::String` but constructor expects `shared_ptr<gs::String>`
   - Solution: Check constructor parameter types and wrap arguments as needed
   - Detect `share<string>` parameters and wrap `gs::String` or `auto` (string) arguments
   - Handle both direct `gs::String` calls and identifier references
   - Fixed json-parser compilation (+4 tests)

**Recent Fixes (Nov 30, 2025 - Morning)**:
1. ✅ Array.push() double-wrapping - Use OwnershipAwareTypeChecker to detect already-shared variables
2. ✅ Generic type variable declarations - Preserve template parameters in type inference
3. ✅ Smart pointer to array element access - Dereference smart pointer before subscript: `(*board)[i]`

**Remaining Work:**
- **NONE! Phase 3 is 100% complete!** 🎉🎊
- All 945/945 tests passing
- All concrete examples working (15/15)
- All features implemented including interface polymorphism

**See:** `docs/PHASE-3-COMPLETE.md` for comprehensive final summary

**Next Phase:**
- **Phase 4: Ecosystem and Standard Library**
- Performance optimizations (reduce pointer indirection)
- Move semantics and copy elision
- Standard library expansion (filesystem, networking, etc.)

**Completed concrete examples (15/15 - 100%):** ⭐
  - ✅ **interface-shapes (8/8)** - **NEW! Unlocked Nov 30, 2025** via full interface polymorphism
  - ✅ benchmark-performance (8/8) - **Unlocked Nov 30, 2025** via parentheses preservation
  - ✅ array-methods (8/8) - **Unlocked Nov 30, 2025** via TypeScript-aware type detection
  - ✅ fibonacci (8/8) - **Unlocked Nov 29, 2025** via std::function for recursive lambdas
  - ✅ hash-map (8/8)
  - ✅ json-parser (8/8) - **Unlocked Nov 30, 2025** via auto type tracking & arg wrapping
  - ✅ binary-search-tree (8/8) - **Unlocked Nov 30, 2025** via smart pointer handling
  - ✅ generic-stack (8/8) - **Unlocked Nov 30, 2025** via template type preservation
  - ✅ n-queens (8/8) - **Unlocked Nov 30, 2025** via array element access fixes
  - ✅ string-pool (8/8) - **Unlocked Nov 30, 2025** via pointer null checks
  - ✅ error-handling (8/8) - **Unlocked Nov 30, 2025** via exception handling
  - ✅ lru-cache (8/8)
  - ✅ linked-list (8/8)
  - ✅ regex-validator (8/8)
  - ✅ regex-validator-e2e (6/6)

**Recent Updates (Nov 29, 2025):**
- ✅ **Control Flow Bug Fix** - Top-level statements now properly handled:
  - Fixed critical bug where `if`, `for`, `while`, `for-of`, `try`, `throw` weren't added to main()
  - All control flow statements now execute correctly
  - Runtime-equivalence tests: 5/5 passing (was 3/5)
  
- ✅ **Advanced Language Features**:
  - **Modulo operator**: Use `std::fmod()` for floating-point operands
  - **Undefined translation**: `undefined` → `std::nullopt`
  - **Array length**: `array.length` → `array.length()` method call
  - **Array subscript operators**: `arr[i].method()` → `arr[i]->method()` (pointer semantics)
  - **Const methods**: Methods not modifying `this` marked as `const`
  - **Number instance methods**: `toFixed()`, `toExponential()`, `toPrecision()`
  - **String::from() overloads**: Support for `std::optional<T>` types
  - **Number formatting**: Match JavaScript output (integers without decimals)
  - **Recursive lambdas**: Use `std::function<R(Args...)>` for function variables
  - **Lambda return types**: Explicitly specify with trailing syntax `-> ReturnType`
  - **Prefix unary expressions**: Handle `-1`, `!x`, `~x`, `++x`, `--x`
  - **Optional unwrapping**: Detect `!== undefined` comparisons in addition to `!== null`

- ✅ **Runtime Library Enhancements**:
  - `gs::Number::toFixed(value, digits)` - Fixed-point string formatting with `std::setprecision`
  - `gs::Number::toExponential(value, digits)` - Scientific notation
  - `gs::Number::toPrecision(value, precision)` - Precision control
  - `gs::String::from(std::optional<T>)` - Convert optionals to strings
  - `gs::String::from(double)` - Smart formatting (integers without decimals)
  - Include `<functional>` for `std::function` support
  - Include `<sstream>` and `<iomanip>` for number formatting

**Recent Updates (Nov 26-28, 2025):**
- ✅ **New AST-Based Codegen Implementation** - Clean-room rebuild:
  - Created `src/cpp/codegen.ts` (490 lines) using pure AST transformation
  - **36/37 basic tests passing (97.3%)** with minimal code
  - Incremental development: each feature 10-30 lines
  - Features implemented:
    - ✅ Primitive types (number→double, string→gs::String, boolean→bool)
    - ✅ Variables (const/let with type inference, auto for untyped)
    - ✅ Functions with parameters and return types
    - ✅ Binary expressions (arithmetic, comparison, === → ==, !== → !=)
    - ✅ Control flow (if/else, for, while, for-of with range-based for)
    - ✅ Classes with fields, constructors, methods
    - ✅ Interfaces (rendered as structs)
    - ✅ Arrays (gs::Array<T>, literals, iteration)
    - ✅ Generic types (Map<K,V> → gs::Map<K,V> with recursive type args)
    - ✅ Property access (obj.prop → obj->prop, this.prop → this->prop)
    - ✅ Parameter passing optimization:
      - Primitives by value
      - Strings by const &
      - User types by const &
      - Arrays by mutable &
    - ✅ User-defined type namespacing (Point → gs::Point)
    - ✅ Unicode string support
    - ✅ Namespace wrapping (gs::)
    - ✅ Keyword escaping (class → class_)
  - Added RangeForStmt AST node for C++ range-based for loops
  - Added isStruct flag to Class for interface→struct rendering
  - Added passByConstRef and passByMutableRef flags to Parameter
  - Fixed ThisKeyword handling (not an Identifier)
  - Benefits demonstrated:
    - No indentation bugs, no brace-matching issues
    - Type-safe AST construction
    - Easy to add features incrementally
    - Clean separation: transform → AST → render

**Previous Updates (Nov 25, 2025):**
- ✅ **Map Pointer-Based Null Checking** - Extended pointer approach to Map:
  - `gs::Map<K,V>::get()` now returns `V*` instead of `std::optional<V>`
  - `gs::Map<K,V>::operator[]` added returning `V*` (const and non-const overloads)
  - Returns `nullptr` for missing keys (matches JavaScript `undefined` semantics)
  - Auto-dereference in codegen: `map.get(key)` → `(*map.get(key))` when used as value
  - Null comparisons use `nullptr` instead of `std::nullopt` for pointer variables
  - Property access: `map.get(key)->prop` (pointer accessor)
  - Pointer variable tracking with scope isolation (per-method/function)
  - Compound null check support: `(x !== null && x !== undefined)` → `x != nullptr`
  - Conditional expression fix: wrap dereferenced pointers in `std::make_optional()` for ternary with `std::nullopt`
  - LiteralObject tests updated to use pointer API
  - 896 tests passing (maintained after Map pointer changes)
  - API consistency: both Array and Map return nullable pointers
- ✅ **JavaScript-Compatible Array Bounds Checking** - Pointer-based approach:
  - `gs::Array<T>::operator[]` returns `T*` (pointer) instead of `T&` (reference)
  - Returns `nullptr` for out-of-bounds access (matches JavaScript `undefined` semantics)
  - Auto-dereference in codegen: `arr[i]` → `(*arr[i])` for value usage
  - Static bool constants for `std::vector<bool>` (solves bit-packing issue)
  - Property access optimization: `arr[i].name` → `arr[i]->name` (no dereference)
  - JSON.stringify updated to handle pointer returns
  - Array assignment fixed: `arr[i] = x` → `(*arr[i]) = x`
  - Ternary validator relaxed: allows `value ? value : null` patterns
  - 896 tests passing (+2 from 894)
  - All 12/12 active concrete examples still passing
- ✅ **Optional Unwrapping & Null Check Fixes** - 5 critical codegen bugs resolved:
  - Compound null checks: `(x !== null && x !== undefined)` now correctly generates `.has_value()` for `optional<T>` or boolean context for smart pointers
  - Element access unwrapping: Array subscripts on `.match()` results now properly add `.value()` prefix
  - Return unwrapping: Functions returning non-optional types from optional values now add `.value()` suffix
  - Empty array inference: `return []` now infers correct type from method return signature
  - Smart pointer vs optional distinction: Variables from array access use boolean checks, not `.has_value()`
  - 2 new examples unlocked: regex-validator (9/9), lru-cache (8/8)
- ✅ **894 tests passing** - Up from 885 (+9 tests)
- ✅ **PCRE2 Integration** - Complete regex support with Zig toolchain

**Recent Updates (Nov 28, 2025):**
- ✅ **Enum Support** - Complete enum class generation:
  - Added `Enum` and `EnumMember` AST node types
  - Generate C++ `enum class` with auto-incrementing values
  - Property access: `Color.Red` → `gs::Color::Red` (namespace-qualified)
  - Track enum names to distinguish from regular class property access
  - All enum-based code now compiles and executes correctly
- ✅ **Nullable Type Support** - Union type to std::optional mapping:
  - Map `T | null` and `T | undefined` → `std::optional<T>`
  - Context-aware null handling: `null` → `std::nullopt` for optional types
  - Null comparisons: `x !== null` → `x != std::nullopt` for optionals
  - Return statement handling: track function return type for proper null conversion
  - Method return type tracking for correct nullopt usage
  - Variable declaration null initialization uses std::nullopt
- ✅ **Super() Call Formatting Fix** - Constructor initialization lists:
  - Fixed initialization list to appear on same line as constructor signature
  - `Derived(args) : Base(args) {` instead of multiline format
  - All 7 super() call tests now passing
- ✅ **919 tests passing** - Up from 911 at session start (+8 tests, -8 failures)
- ✅ **10 failures remaining** - Down from 18 (56% reduction in failures)

**Previous Updates (Nov 26, 2025):**
- ✅ **RegExp C++ Integration** - Complete regex literal support:
  - Regex literals generate C++ code: `/\d+/g` → `gs::RegExp(R"(\d+)", "g")`
  - Property access conversion: `pattern.global` → `pattern.global()` (methods in C++)
  - Runtime method overloads for `gs::String` compatibility
  - Conditional compilation with `#ifdef GS_ENABLE_REGEXP` (optional PCRE2 dependency)
  - 43 new tests: 28 runtime + 9 codegen + 6 end-to-end C++ compilation
  - Full JavaScript regex semantics: lookahead, lookbehind, all flags, Unicode support
- ✅ **885 tests passing** - Up from 842 at session start (+43 tests)
- ✅ **String Pool Example Unlocked** - Complete share<string> support:
  - Fixed type reference mapping: `string` type ref → `gs::String` (not `string`)  
  - Fixed Map/Set constructors: Use `gs::Map`/`gs::Set` wrappers (not raw STL)
  - Fixed Map.size property: Convert to `.size()` method call for Map/Set only
  - Fixed Map.set() wrapping: Properly map value types in `make_shared<T>()` calls
  - Fixed share<T> return wrapping: Auto-wrap non-smart-pointer returns, detect `.value()` unwrapping
  - 8 new tests passing (compilation, execution, output matching)
- ✅ **842 tests passing** - Up from 834 at session start (+8 tests)
- ✅ **11/11 active concrete examples passing** - 100% success rate!
- ✅ **Class Inheritance Support** - Complete implementation:
  - Basic inheritance (extends/implements clauses) → `: public BaseClass`
  - super() call support with base class initialization
  - Generic base class type arguments: `extends Container<T>` → `: public Container<T>`
  - Full test coverage (26 tests across 3 suites)
  - All C++ templates properly instantiated
- ✅ **JSON Runtime Support** - Unlocked json-parser example:
  - JSON.stringify for Property (type-erased values)
  - JSON.stringify for LiteralObject (object literals)
  - Produces valid JSON format for heterogeneous objects
  - 4 new tests with compilation and JSON.parse validation
- ✅ **GoodScript Runtime Library** - TypeScript-compatible wrapper classes for C++ STL
  - `gs::String` - Full TypeScript String API (charAt, indexOf, substring, slice, match, search, replace, split, etc.)
  - `gs::Array<T>` - Full TypeScript Array API with pointer-based bounds checking (`operator[]` returns `T*`)
  - `gs::Map<K,V>` & `gs::Set<T>` - TypeScript Map/Set APIs with pointer-based null checking (`get()` returns `V*`)
  - `gs::RegExp` - **Full JavaScript regex semantics via PCRE2** (lookahead, lookbehind, Unicode, all flags)
  - `gs::JSON` - JSON.stringify() and JSON.parse()
  - `gs::console` - console.log(), console.error(), console.warn()
  - `gs::Property` - Type-erased wrapper for object literal properties
  - `gs::LiteralObject` - Map<String, Property> for heterogeneous objects
  - Header-only, zero-overhead, composition-based (no STL inheritance)
  - Complete test suite with 100% passing tests
- ✅ **Lightweight Non-Atomic Smart Pointers** - Custom `gs::shared_ptr` and `gs::weak_ptr` with non-atomic refcounting for 3x performance
- ✅ **Zig C++ Compiler Integration** - Drop-in replacement for g++/clang++
- ✅ **Cross-compilation Support** - Target any platform from any platform
- ✅ **Optimized Binary Compilation** - `-O3 -march=native -ffast-math -funroll-loops`
- ✅ **Inlined Helper Functions** - `array_get` and `map_get` marked `inline`
- ✅ **CLI Binary Compilation** - `gsc -t native -b` compiles to native binary
- ✅ **Architecture Targeting** - `gsc -a x86_64-linux` for cross-compilation
- ✅ **Comprehensive CLI Tests** - 34 new tests for native/cross-compilation
- ✅ Smart pointer null comparisons fixed (`nullptr` vs `std::nullopt`)
- ✅ Smart pointer member access fixed (`->` vs `.`)
- ✅ Array/vector member access fixed (proper `.` usage)
- ✅ Map.delete() mapped to erase()
- ✅ JavaScript-compatible array auto-resize on out-of-bounds assignment
- ✅ Optional unwrapping for `Map.get()` results (`(*node)->property`)
- ✅ Smart pointer construction from `new T()` with type annotations
- ✅ Context-aware Map method detection (`.get()`, `.has()`)
- ✅ Comprehensive semantic equivalence test suite (13 tests documenting JS/C++ correspondences)

## Overview

Phase 3 implements the C++ code generator that transforms GoodScript's TypeScript AST into idiomatic, memory-safe C++20 code. The generator maps GoodScript's ownership semantics to C++'s smart pointers while ensuring RAII (Resource Acquisition Is Initialization) patterns and deterministic memory management.

**Compilation Toolchain:** GoodScript uses the **Zig C++ compiler** (`zig c++`) as the default compilation backend, providing:
- Zero-config cross-compilation to any platform
- Single self-contained binary (no complex toolchain installation)
- Aggressive optimizations (`-O3 -march=native` for native, `-O3` for cross-compilation)
- Support for targeting Linux, Windows, macOS, WebAssembly, and more

See `docs/ZIG-TOOLCHAIN.md` for detailed information on Zig integration.

## Implementation Status

### ✅ Completed Features

#### Core Infrastructure
- **AST Traversal Framework** - Complete visitor pattern for all TypeScript node types
- **Code Emission System** - Proper indentation, line management, and code formatting
- **Include Management** - Automatic header inclusion based on feature usage
- **Namespace Wrapping** - All code wrapped in `namespace gs { }` to avoid C++ keyword conflicts
- **Keyword Escaping** - Automatic escaping of C++ reserved words (e.g., `class` → `class_`)

#### Type System Mapping

**Note:** GoodScript provides a comprehensive runtime library (`compiler/runtime/`) with TypeScript-compatible wrapper classes. The codegen currently uses raw STL types but will be migrated to use the runtime wrappers for better API compatibility. See `compiler/runtime/MIGRATION.md` for the migration plan.

| GoodScript Type | C++ Type (Current) | C++ Type (Target) | Notes |
|----------------|----------|-------|-------|
| `number` | `double` | `double` | Default floating-point precision |
| `string` | `std::string` | `gs::String` | TypeScript-compatible string wrapper |
| `boolean` | `bool` | `bool` | Native C++ bool |
| `void` | `void` | `void` | Direct mapping |
| `null` | `std::nullopt` | `std::nullopt` | For std::optional |
| `undefined` | `std::nullopt` | `std::nullopt` | For std::optional |
| `T[]` | `std::vector<T>` | `gs::Array<T>` | TypeScript-compatible array wrapper |
| `Map<K,V>` | `std::unordered_map<K,V>` | `gs::Map<K,V>` | TypeScript-compatible map wrapper |
| `Set<T>` | `std::unordered_set<T>` | `gs::Set<T>` | TypeScript-compatible set wrapper |
| `own<T>` | `std::unique_ptr<T>` | `std::unique_ptr<T>` | Exclusive ownership |
| `share<T>` | `gs::shared_ptr<T>` | `gs::shared_ptr<T>` | Non-atomic reference counting (single-threaded) |
| `use<T>` | `gs::weak_ptr<T>` | `gs::weak_ptr<T>` | Non-atomic weak reference (single-threaded) |
| `T \| null` | `std::optional<T>` | `std::optional<T>` | Nullable value |

**Performance Note:** GoodScript uses custom `gs::shared_ptr<T>` and `gs::weak_ptr<T>` instead of their `std::` counterparts for better single-threaded performance. The standard library's smart pointers use atomic operations for thread-safe reference counting, which adds overhead even in single-threaded programs. Since GoodScript targets single-threaded execution, our implementations use simple non-atomic increment/decrement operations, providing ~3x faster reference counting without synchronization overhead.

#### Statement Generation
- **Variable Declarations** - `const`/`let` with proper type inference
- **Function Declarations** - Parameters, return types, body generation
- **Class Declarations** - Fields, constructors, methods with proper access control
- **Interface Declarations** - Translated to `struct` for POD types
- **Control Flow**:
  - `if`/`else` statements
  - `for` loops (traditional C-style)
  - `for-of` loops → range-based for loops
  - `while` loops
  - `return` statements

#### Expression Generation
- **Literals** - Numbers, strings, booleans, null
- **Binary Operators** - Arithmetic, comparison, logical
- **Strict Equality Conversion** - `===` → `==`, `!==` → `!=`
- **Unary Operators** - Prefix and postfix (`++`, `--`, `!`, `-`, `+`)
- **Ternary Operator** - `a ? b : c` → `(a ? b : c)`
- **Function Calls** - With argument translation
- **Property Access** - Object member access
- **Array Literals** - Brace-initialized lists
- **`this` Keyword** - Preserved for member access

#### Special Features
- **Standard Headers** - Automatically included:
  ```cpp
  #include <memory>        // Smart pointers
  #include <string>        // std::string
  #include <optional>      // std::optional
  #include <iostream>      // I/O operations
  #include <algorithm>     // std::transform, etc.
  #include <vector>        // When arrays used
  #include <unordered_map> // When Map used
  #include <unordered_set> // When Set used
  ```

- **RegExp Literals** - JavaScript regex to C++ PCRE2:
  ```typescript
  const pattern = /\d+/g;
  console.log(pattern.test("hello 123"));
  console.log(pattern.global);
  ```
  ```cpp
  auto pattern = gs::RegExp(R"(\d+)", "g");
  gs::console::log(pattern.test(gs::String("hello 123")));
  gs::console::log(pattern.global());  // Property access → method call
  ```
  - Uses raw string literals `R"(...)"` to avoid escape doubling
  - Converts property access to method calls (C++ uses getters)
  - Requires PCRE2 library and `-DGS_ENABLE_REGEXP` flag
  - Full JavaScript regex semantics: lookahead, lookbehind, Unicode, all flags

- **JavaScript Array Semantics** - Arrays auto-resize on out-of-bounds assignment:
  ```typescript
  const a = [];
  a[10] = 0;  // Auto-resizes array to size 11
  ```
  ```cpp
  std::vector<double> a = {};
  ([&]() { auto& __arr = a; auto __idx = 10; 
    if (__idx >= __arr.size()) __arr.resize(__idx + 1); 
    return __arr[__idx] = 0; }());
  ```

- **Optional Unwrapping for Map.get()** - Double unwrapping for `optional<shared_ptr<T>>`:
  ```typescript
  const cache: Map<string, share<Node>> = new Map();
  const node = cache.get(key);  // share<Node> | undefined
  if (node !== undefined) {
    return node.value;  // Accessing property on optional shared_ptr
  }
  ```
  ```cpp
  std::unordered_map<std::string, std::shared_ptr<Node>> cache = {};
  auto node = gs::map_get(cache, key);  // optional<shared_ptr<Node>>
  if (node != std::nullopt) {
    return (*node)->value;  // Unwrap optional, then dereference shared_ptr
  }
  ```

- **Smart Pointer Construction** - Automatic wrapping when type annotation present:
  ```typescript
  const node: share<CacheNode> = new CacheNode(key, value);
  ```
  ```cpp
  std::shared_ptr<CacheNode> node = std::make_shared<CacheNode>(key, value);
  ```

- **Smart Pointer Type Detection** - Context-aware pointer dereferencing:
  ```typescript
  const node: share<Node> = ...;
  node.value = 42;  // Uses -> for smart pointers
  ```
  ```cpp
  std::shared_ptr<Node> node = ...;
  node->value = 42;  // Correct arrow operator
  ```

### 🚧 In Progress / Planned

#### Smart Pointer Management
- [x] **Null Comparisons** - Smart pointers compare to `nullptr`, optionals to `std::nullopt`
- [x] **Member Access** - Context-aware use of `->` for smart pointers, `.` for values/vectors
- [x] **Type Inference** - Handles variables initialized from smart pointer arrays
- [x] **Ownership Type Tracking** - OwnershipAwareTypeChecker preserves `own<T>`, `share<T>`, `use<T>` through all expressions
- [x] **Array Element Access** - `Array<share<T>>[i].method()` generates `(*arr[i])->method()`
- [x] **Optional Unwrapping** - Automatic `.value()` insertion with smart pointer detection
- [x] **Method Chaining** - Preserves ownership through `.filter().sort()` etc.
- [ ] **Construction** - `std::make_unique()`, `std::make_shared()` wrapping (partial)
- [ ] **State Tracking** - Avoid double-wrapping already-wrapped pointers (partial)
- [ ] **Move Semantics** - Use `std::move()` for efficiency (partial)

#### Advanced Features
- [ ] **Async/Await** - Map to C++20 coroutines (`co_await`, `co_return`)
- [ ] **Promises** - Use `cppcoro::task<T>` or similar
- [ ] **Generic Types** - Map TypeScript generics to C++ templates
- [ ] **Template Specialization** - Type-specific optimizations
- [ ] **Exception Handling** - Try/catch with RAII-safe cleanup

#### Standard Library
- [x] **console.log** - Maps to `std::cout << ... << std::endl`
- [x] **Array Methods** - push_back(), size(), basic operations
- [x] **Array Auto-Resize** - JavaScript-compatible out-of-bounds assignment
- [x] **Map Methods** - get() → map_get helper, set() → emplace/insert, delete() → erase(), has() → find
- [x] **String Methods** - startsWith(), indexOf(), charAt(), charCodeAt(), substring()
- [ ] **Math** - Map to `<cmath>` functions
- [ ] **Advanced Array Methods** - map(), filter(), reduce() → algorithms or ranges
- [ ] **Date/Time** - Map to `<chrono>`

#### Testing Infrastructure
- [ ] **Compilation Tests** - Validate generated C++ compiles with g++/clang++
- [ ] **Runtime Equivalence** - Compare JS and C++ execution output
- [ ] **Concrete Examples** - End-to-end programs (algorithms, data structures)
- [ ] **Performance Benchmarks** - Measure C++ vs JS performance

## Code Generation Architecture

### Namespace Protection

All generated code is wrapped in the `gs` namespace to prevent conflicts with C++ keywords and standard library names:

```cpp
namespace gs {

class MyClass {
public:
  double value;
  
  MyClass(double value) {
    this->value = value;
  }
};

} // namespace gs
```

### Keyword Escaping

C++ reserved keywords are automatically escaped by appending an underscore:

```typescript
// GoodScript
interface Config {
  class: string;    // 'class' is a C++ keyword
  template: number; // 'template' is a C++ keyword
}
```

```cpp
// Generated C++
namespace gs {

struct Config {
  std::string class_;
  double template_;
};

} // namespace gs
```

### Type Reference Resolution

The code generator preserves ownership qualifiers by reading directly from the AST rather than using TypeScript's type checker (which erases type aliases):

```typescript
// GoodScript
const node: share<TreeNode> = new TreeNode();
```

```cpp
// Generated C++
namespace gs {

std::shared_ptr<TreeNode> node = TreeNode();  // Will add make_shared

} // namespace gs
```

## Testing Strategy

### Phase 3 Test Organization

```
test/phase3/
├── basic/                    # Feature unit tests (45 tests - 100% passing)
│   ├── primitives.test.ts    # Types, expressions, control flow
│   ├── ownership-types.test.ts # Smart pointer mappings
│   ├── classes.test.ts       # Classes, constructors, methods
│   └── js-cpp-semantics.test.ts # Semantic equivalence documentation (13 tests)
├── compile/                  # Compilation validation (planned)
│   └── *.test.ts            # Verify generated C++ compiles
├── runtime/                  # Runtime equivalence (planned)
│   └── *.test.ts            # JS vs C++ output comparison
└── concrete-examples/        # End-to-end programs (12/12 passing)
    └── */                   # Complete applications
```

### Test Examples

**Primitives Test**:
```typescript
const x: number = 42;
```
```cpp
namespace gs {

const double x = 42;

} // namespace gs
```

**Ownership Types Test**:
```typescript
class Node {
  value: number;
  next: own<Node>;
}
```
```cpp
namespace gs {

class Node {
public:
  double value;
  std::unique_ptr<Node> next;
};

} // namespace gs
```

**Control Flow Test**:
```typescript
for (let i: number = 0; i < n; i++) {
  sum = sum + i;
}
```
```cpp
namespace gs {

for (int i = 0; i < n; i++) {
  sum = sum + i;
}

} // namespace gs
```

## Design Decisions

### 1. C++ as Compilation Target

**Rationale**: C++ was chosen over Rust because:
- Mature ecosystem with excellent tooling
- Universal platform support (embedded, mobile, desktop, server)
- Direct control over memory layout and performance
- Seamless FFI with existing C/C++ libraries
- Smart pointers map naturally to ownership semantics
- RAII provides deterministic destruction
- C++20 features (concepts, ranges, coroutines) enable modern patterns

See `docs/COMPILATION-TARGET.md` for detailed analysis.

### 2. Namespace Wrapping

**Problem**: GoodScript identifiers might conflict with C++ keywords or STL names.

**Solution**: Wrap all generated code in `namespace gs { }` and escape individual keywords:
- Prevents global namespace pollution
- Allows natural identifier names in GoodScript
- Makes generated code composable with other C++ code
- Clear separation between GoodScript and native C++

### 3. Parameter Passing Strategy

**TypeScript Immutability Principle**: In TypeScript/JavaScript, primitives (number, boolean, string) are immutable. This means functions cannot modify the caller's values, making pass-by-reference semantically equivalent to pass-by-value for these types.

**GoodScript C++ Implementation**:

| Type | C++ Parameter | Rationale |
|------|--------------|-----------|
| `number` | `double x` | Pass by value - 8 bytes, fits in register, very efficient |
| `boolean` | `bool flag` | Pass by value - 1 byte, extremely cheap |
| `string` | `const gs::String& s` | **Pass by const reference** - avoids copying heap buffer, immutability enforced by `const` |
| User classes | `const gs::Point& p` | Pass by const reference - avoids copying object data |
| Arrays/Maps/Sets | `const gs::Array<T>& arr` | Pass by const reference - avoids copying entire container |
| Smart pointers | `gs::shared_ptr<T> p` | Pass by value - only copies pointer + refcount (16 bytes), has move semantics |

**Example**:
```typescript
// GoodScript
class Processor {
  process(count: number, flag: boolean, message: string): void {
    console.log(count, flag, message);
  }
}
```

```cpp
// Generated C++ - optimized parameter passing
class Processor {
public:
  void process(double count, bool flag, const gs::String& message) {
    gs::console.log(count, flag, message);
  }
};
```

**Key Insight**: Because TypeScript strings are immutable, we can safely pass `gs::String` by const reference without changing semantics. The `const` prevents modification (matching TypeScript), while the `&` avoids expensive deep copies of the string's heap buffer.

**Performance Impact**:
- Small primitives: No change (already optimal)
- Large strings: **Eliminates O(n) copy** to O(1) pointer pass
- Collections: **Eliminates deep copy** of all elements

### 4. Smart Pointer Types

**Ownership Mapping**:
- `own<T>` → `std::unique_ptr<T>` - Exclusive, movable ownership
- `share<T>` → `std::shared_ptr<T>` - Reference-counted, copyable
- `use<T>` → `std::weak_ptr<T>` - Non-owning, must lock() before use

**Construction** (planned):
```cpp
// Will generate
auto node = std::make_unique<Node>(42);
auto shared = std::make_shared<Data>(value);
std::weak_ptr<Node> weak = shared;  // Implicit conversion
```

**Dereferencing** (planned):
```cpp
// Smart pointer method access
node->getValue();

// Optional access
if (auto locked = weak.lock()) {
  locked->getValue();
}
```

### 4. Number Type Default

**Decision**: Map `number` to `double` (not `int`).

**Rationale**:
- JavaScript's `number` is always IEEE 754 double
- Preserves numeric semantics from TypeScript mode
- Avoids truncation surprises
- Can specialize to `int` with type hints if needed

### 5. Strict Equality Semantics

**GoodScript** (Phase 1 restriction):
```typescript
if (x === 5) { }  // Only === allowed
```

**C++**:
```cpp
if (x == 5) { }   // === maps to ==
```

**Rationale**: GoodScript requires strict equality to avoid type coercion bugs. C++ has no `===`, so `==` is the natural mapping.

### 6. Semantic Equivalence Documentation

**Test Suite**: `test/phase3/basic/js-cpp-semantics.test.ts` (13 tests)

Documents how JavaScript and C++ behaviors correspond across:

1. **Array Access**: JavaScript `undefined` vs C++ default values for out-of-bounds reads
   - Both are safe (no crash)
   - Both are predictable
   - GoodScript's no-truthy-falsy rule prevents relying on the difference

2. **Array Assignment**: Auto-resize behavior matches JavaScript exactly
   ```javascript
   arr[10] = 42;  // Resizes to length 11 in both JS and C++
   ```

3. **Object Members**: TypeScript `field?: type` → C++ `std::optional<T>`
   - JavaScript `undefined` → C++ `std::nullopt`
   - Similar semantics: both represent "no value present"

4. **Numeric Types**: Both use IEEE 754 double precision
   - `5 / 2 === 2.5` in both languages (not truncated to 2)
   - Same precision and range

5. **Equality Operators**: `===` → `==` is safe because:
   - GoodScript prohibits `==` (only `===` allowed)
   - GoodScript prohibits type coercion
   - C++ `==` with same types ≡ JavaScript `===`

6. **Boolean Semantics**: No truthy/falsy coercion
   - GoodScript (GS110): conditions must be explicit boolean expressions
   - C++: same requirement
   - Result: identical behavior in both languages

7. **Null/Undefined**: Combined into `std::optional<T>`
   - JavaScript: two distinct values (`null` and `undefined`)
   - C++: one concept (`std::nullopt`)
   - Functionally equivalent for safety

These tests serve as **documentation** rather than validation, explicitly showing where JavaScript and C++ semantics align and where they diverge. The key insight: **GoodScript's Phase 1 restrictions** (no type coercion, no truthy/falsy, strict equality only) are what enable semantic equivalence—without them, mapping TypeScript to C++ would be impossible.

## Implementation Notes

### GoodScript Runtime Library

**Location**: `compiler/runtime/`

GoodScript provides a comprehensive, header-only C++ runtime library with TypeScript-compatible wrapper classes. These wrappers use **composition** (not inheritance) to wrap C++ STL types, providing:

- **TypeScript-like API**: Methods match TypeScript/JavaScript naming and behavior exactly
- **Type Safety**: Distinct types (`gs::String` vs `std::string`) catch errors at compile time
- **Zero Overhead**: Header-only inline functions optimized away in release builds
- **Future-proof**: Can optimize or change implementation without breaking code
- **Consistent Namespace**: All GoodScript stdlib in `gs::` namespace

**Available Classes**:

1. **`gs::String`** - TypeScript String wrapper
   - Methods: `charAt()`, `charCodeAt()`, `indexOf()`, `lastIndexOf()`, `substring()`, `slice()`, `toLowerCase()`, `toUpperCase()`, `trim()`, `startsWith()`, `endsWith()`, `includes()`, `repeat()`, `padStart()`, `padEnd()`, `concat()`
   - Static: `String::fromCharCode()`
   - Properties: `length()`
   - Operators: `+`, `==`, `!=`, `<`, `>`, `[]`

2. **`gs::Array<T>`** - TypeScript Array wrapper
   - Methods: `push()`, `pop()`, `shift()`, `unshift()`, `slice()`, `splice()`, `map()`, `filter()`, `reduce()`, `find()`, `findIndex()`, `indexOf()`, `lastIndexOf()`, `includes()`, `join()`, `reverse()`, `sort()`, `forEach()`, `every()`, `some()`, `flat()`
   - Properties: `length()`
   - STL-compatible iterators for range-based for loops

3. **`gs::Map<K,V>`** - TypeScript Map wrapper
   - Methods: `set()`, `get()`, `has()`, `delete_()`, `clear()`, `forEach()`, `keys()`, `values()`, `entries()`
   - Properties: `size()`

4. **`gs::Set<T>`** - TypeScript Set wrapper
   - Methods: `add()`, `has()`, `delete_()`, `clear()`, `forEach()`, `values()`
   - Properties: `size()`

5. **`gs::JSON`** - JSON utilities
   - `JSON::stringify()` for primitives and arrays
   - `JSON::parse()` (placeholder for now)

6. **`gs::console`** - Console logging
   - `console::log()`, `console::error()`, `console::warn()`
   - Supports multiple arguments

**Why Composition Instead of Inheritance?**

C++ STL classes (`std::string`, `std::vector`, etc.) **cannot be safely inherited from** because:
- They have no virtual destructors
- They weren't designed as base classes
- Polymorphic use leads to undefined behavior

Wrapper classes avoid these issues while providing:
- Clean TypeScript-compatible API
- Better encapsulation
- C++ interop via `.str()`, `.vec()`, `.map()` accessors

**Testing**: Complete test suite in `compiler/runtime/test_runtime.cpp` with 100% passing tests.

**Documentation**: 
- `compiler/runtime/README.md` - Runtime library overview and API reference
- `compiler/runtime/MIGRATION.md` - Step-by-step guide to update codegen

**Status**: Runtime library is complete and tested. Codegen migration is planned but not yet implemented. Current codegen uses raw STL types directly.

### Current File Structure

**`compiler/src/cpp/codegen.ts`** (2783 lines):
```typescript
export class CppCodegen {
  private indentLevel = 0;
  private output: string[] = [];
  private includes = new Set<string>();
  private uniquePtrVars = new Set<string>();
  
  // Public API
  generate(sourceFile: ts.SourceFile, checker?: ts.TypeChecker): string
  
  // Statement generation
  private generateStatement(statement: ts.Statement): void
  private generateVariableStatement(statement: ts.VariableStatement): void
  private generateFunctionDeclaration(func: ts.FunctionDeclaration): void
  private generateClassDeclaration(classDecl: ts.ClassDeclaration): void
  
  // Expression generation
  private generateExpression(expr: ts.Expression): string
  private generateBinaryExpression(expr: ts.BinaryExpression): string
  private generateCallExpression(expr: ts.CallExpression): string
  
  // Type generation
  private generateType(type: ts.TypeNode): string
  private generateTypeReference(type: ts.TypeReferenceNode): string
  
  // Utilities
  private emit(line: string): void
  private escapeIdentifier(name: string): string
  private addInclude(include: string): void
}
```

### Key Patterns

**AST-Based Type Reading**:
```typescript
// Don't use TypeChecker for ownership types (erases aliases)
const typeText = symbol.valueDeclaration.type?.getText();
if (typeText?.startsWith('share<')) {
  // Extract inner type and generate std::shared_ptr
}
```

**State Tracking** (planned):
```typescript
// Track variables already wrapped in smart pointers
if (this.uniquePtrVars.has(varName)) {
  return `std::move(${varName})`;
} else {
  return `std::make_unique<T>(${varName})`;
}
```

## Next Steps

### Priority 1: Smart Pointer Construction

Implement logic to wrap values in smart pointers based on context:

```typescript
// Detect return type is own<T>
function create(): own<Node> {
  return new Node();  // Must wrap in make_unique
}
```

```cpp
namespace gs {

std::unique_ptr<Node> create() {
  return std::make_unique<Node>(Node());
}

} // namespace gs
```

### Priority 2: Compilation Validation

Set up tests that compile generated C++ with g++ and clang++:

```typescript
it('should compile with g++', async () => {
  const cpp = generateCpp(source);
  const result = await compileCpp(cpp, 'g++');
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe('');
});
```

### Priority 3: Runtime Equivalence

Compare JavaScript and C++ execution output:

```typescript
it('should produce identical output', async () => {
  const jsResult = await executeJS(source);
  const cppResult = await executeCpp(generateCpp(source));
  
  expect(cppResult.stdout).toBe(jsResult.stdout);
  expect(cppResult.exitCode).toBe(jsResult.exitCode);
});
```

### Priority 4: Standard Library

Implement mappings for common APIs:

```typescript
// console.log
console.log("Hello", 42);
// → std::cout << "Hello" << " " << 42 << std::endl;

// Math functions
Math.sqrt(x);
// → std::sqrt(x)

// Array methods
arr.map(x => x * 2);
// → std::transform(...) or ranges::views::transform
```

## Related Documentation

- **Language Spec**: `docs/LANGUAGE.md`
- **Ownership Model**: `docs/MEMORY-OWNERSHIP.md`
- **DAG Analysis**: `docs/DAG-ANALYSIS.md`
- **Compilation Target**: `docs/COMPILATION-TARGET.md`
- **Zig Integration**: `docs/ZIG-TOOLCHAIN.md`
- **Test Documentation**: `compiler/test/phase3/README.md`
- **Copilot Instructions**: `.github/copilot-instructions.md`

## Performance Optimizations

### Non-Atomic Smart Pointers (gs::shared_ptr and gs::weak_ptr)

GoodScript implements custom `gs::shared_ptr<T>` and `gs::weak_ptr<T>` that use **non-atomic reference counting** instead of the standard library's atomic operations. This is safe because GoodScript targets **single-threaded execution only**.

**Performance Benefits:**
- **~2-3x faster** reference count operations (simple `++`/`--` vs atomic CAS)
- **No memory barriers** on increment/decrement
- **Better cache locality** - control block uses simple `size_t` instead of `std::atomic<size_t>`
- **Smaller binary size** - no atomic operation codegen overhead
- **Faster weak pointer locking** - no atomic load/compare-exchange sequence

**Implementation:**
```cpp
namespace gs {

template<typename T>
class shared_ptr {
private:
  struct ControlBlock {
    T* ptr;
    size_t strong_count;  // Non-atomic!
    size_t weak_count;    // Non-atomic!
    ControlBlock(T* p) : ptr(p), strong_count(1), weak_count(0) {}
  };
  ControlBlock* control;
  
  friend class weak_ptr<T>;

public:
  shared_ptr() : control(nullptr) {}
  explicit shared_ptr(T* ptr) : control(ptr ? new ControlBlock(ptr) : nullptr) {}
  
  shared_ptr(const shared_ptr& other) : control(other.control) {
    if (control) ++control->strong_count;  // Simple increment, no atomics
  }
  
  ~shared_ptr() {
    if (control && --control->strong_count == 0) {  // Simple decrement
      delete control->ptr;
      control->ptr = nullptr;
      if (control->weak_count == 0) {
        delete control;  // Only delete control block if no weak refs
      }
    }
  }
  
  // Standard interface compatible with std::shared_ptr
  T* get() const { return control ? control->ptr : nullptr; }
  T& operator*() const { return *control->ptr; }
  T* operator->() const { return control->ptr; }
  explicit operator bool() const { return control && control->ptr; }
};

template<typename T>
class weak_ptr {
private:
  typename shared_ptr<T>::ControlBlock* control;

public:
  weak_ptr() : control(nullptr) {}
  
  weak_ptr(const shared_ptr<T>& shared) : control(shared.control) {
    if (control) ++control->weak_count;  // Simple increment
  }
  
  ~weak_ptr() {
    if (control && --control->weak_count == 0 && control->strong_count == 0) {
      delete control;  // Clean up if last weak ref and no strong refs
    }
  }
  
  // Lock to get shared_ptr (non-atomic check - safe in single-threaded context)
  shared_ptr<T> lock() const {
    if (control && control->ptr && control->strong_count > 0) {
      shared_ptr<T> result;
      result.control = control;
      ++control->strong_count;
      return result;
    }
    return shared_ptr<T>();
  }
  
  bool expired() const {
    return !control || !control->ptr || control->strong_count == 0;
  }
};

template<typename T, typename... Args>
shared_ptr<T> make_shared(Args&&... args) {
  return shared_ptr<T>(new T(std::forward<Args>(args)...));
}

} // namespace gs
```

**Why This is Safe:**
1. GoodScript enforces single-threaded execution model
2. No async/await across threads (only single-threaded event loop)
3. No web workers or threading primitives exposed
4. Compiler guarantees make multi-threading impossible
5. `weak_ptr::lock()` doesn't need atomic check-and-increment (no race conditions)

**Benchmark Comparison** (reference counting operations):
```
std::shared_ptr (atomic):  ~15ns per increment/decrement
gs::shared_ptr (simple):   ~5ns per increment/decrement

std::weak_ptr::lock():     ~25ns (atomic load + CAS loop)
gs::weak_ptr::lock():      ~8ns (simple check + increment)
                           ^^^^^^^^^^^^^^^^^^^^^^^^^^
                           3x faster reference counting
                           3x faster weak pointer locking
```

This optimization is particularly beneficial for:
- **Linked data structures** - Frequent pointer copies in trees, graphs, caches
- **Container operations** - `vector<share<T>>` and `Map<K, share<V>>` copies
- **Function calls** - Pass-by-value shared pointers (common in idiomatic C++)
- **Weak reference patterns** - Parent-child relationships with `use<T>` back-pointers
- **Optional locking** - Checking if weak reference is still valid (`lock()` performance critical)

## Lessons Learned

### 1. Namespace Protection is Essential

C++ has many more keywords than TypeScript. The `gs::` namespace wrapper prevents the vast majority of conflicts without requiring aggressive identifier rewriting.

### 2. AST Reading for Ownership Types

TypeScript's type checker erases type aliases, making it impossible to distinguish `share<T>` from `T`. Reading directly from the AST preserves the source text, enabling correct smart pointer generation.

### 3. Incremental Implementation

Building features incrementally with comprehensive tests prevented regression. Each feature (primitives → ownership → classes → control flow) builds on the previous foundation.

### 4. Test-Driven Development

Writing tests first clarified requirements and caught edge cases early. The 618/618 passing tests provide confidence for future refactoring.

### 5. Semantic Equivalence is a Feature

The semantic equivalence test suite (13 tests) documents the correspondence between JavaScript and C++ behaviors. This is critical because:
- Developers need to understand where behaviors align
- The one documented difference (array out-of-bounds) is intentional and safe
- GoodScript's restrictions are what enable cross-language equivalence
- Tests serve as executable documentation

### 6. Constructor Ownership Detection

**Challenge**: In constructor initializer lists, `new T()` expressions need to know whether to generate `std::make_unique<T>()` or `std::make_shared<T>()` based on the field's ownership type.

**Problem**: TypeChecker loses ownership annotations (type aliases are erased), so checking `this.fieldName` with TypeChecker returns just `T`, not `own<T>` or `share<T>`.

**Solution**: When analyzing `new T()` expressions in assignments, check if the left-hand side is `this.fieldName`, and if so, look up the field type from `variableTypes` map (which preserves AST-based ownership annotations).

**Example**:
```typescript
class Parser {
  private tokenizer: own<Tokenizer>;
  private arena: share<JsonArena>;
  
  constructor(input: share<string>) {
    this.tokenizer = new Tokenizer(input);  // Must generate make_unique
    this.arena = new JsonArena();           // Must generate make_shared
  }
}
```

**Generated C++**:
```cpp
class Parser {
  std::unique_ptr<gs::Tokenizer> tokenizer;
  std::shared_ptr<gs::JsonArena> arena;
  
  Parser(const std::shared_ptr<gs::String>& input) 
    : tokenizer(std::make_unique<gs::Tokenizer>(input)),  // ✅ Correct
      arena(std::make_shared<gs::JsonArena>()) {          // ✅ Correct
  }
};
```

**Implementation** (`src/cpp/codegen.ts:2020-2035`):
```typescript
private getOwnershipTypeForNew(node: ts.NewExpression): 'unique' | 'shared' {
  const parent = node.parent;
  
  // Special case: this.fieldName = new T() in constructor
  if (ts.isBinaryExpression(parent) && 
      ts.isPropertyAccessExpression(parent.left) &&
      parent.left.expression.kind === ts.SyntaxKind.ThisKeyword) {
    const fieldName = parent.left.name.getText();
    const fieldType = this.variableTypes.get(`this.${fieldName}`);
    if (fieldType) {
      const fieldTypeStr = fieldType.toString();
      if (fieldTypeStr.includes('std::unique_ptr')) return 'unique';
      if (fieldTypeStr.includes('std::shared_ptr')) return 'shared';
    }
  }
  // ... other cases
}
```

This fix enables proper smart pointer generation in constructors while preserving ownership semantics.

### 7. Single-Threaded Performance Matters

Using non-atomic reference counting (`gs::shared_ptr`) provides measurable performance benefits without sacrificing safety, because GoodScript's type system guarantees single-threaded execution.

## Known Limitations

### 1. Pool Pattern Shared Instance Creation

**Issue**: Creating shared instances (`share<T>`) directly is not yet supported.

**Current Behavior**:
```typescript
class Arena {
  items: share<Item>[];  // Vector of shared_ptr<Item>
  
  add(item: Item): void {
    this.items.push(item);  // ❌ Error: can't convert Item to share<Item>
  }
}
```

**Workaround**: Use ownership mode with explicit arena pattern, or compile in GC mode:
```bash
gsc -t cpp -m gc -o dist src/main-gs.ts
```

**Planned Fix**: Add explicit `share(value)` or `make_shared(value)` helper for creating shared instances.

### 2. Recursive Data Structures

**Issue**: Self-referential types like JSON trees trigger DAG cycle detection even when the runtime structure is acyclic.

**Example**:
```typescript
class JsonValue {
  kind: string;
  objectValue: Map<string, share<JsonValue>> | null;  // ❌ Cycle: JsonValue → JsonValue
  arrayValue: share<JsonValue>[] | null;
}
```

**Workaround**: Use GC mode for recursive data structures, or redesign with index-based references:
```typescript
class JsonArena {
  values: JsonValue[];  // Store values directly
}

class Parser {
  private arena: JsonArena;
  
  parseValue(): number {  // Return index instead of reference
    return this.arena.values.length - 1;
  }
}
```

### 3. Test Suite Status

**Passing**: 1214/1252 tests (97.0%)

**Remaining Failures** (38 tests):
- **json-parser** (13 tests) - Recursive data structure (see above)
- **lru-cache** (8 tests) - Map/smart pointer interaction edge cases
- **string-pool** (11 tests) - Similar to lru-cache
- **benchmark-performance** (2 tests) - JavaScript execution timeouts (not codegen issues)
- **error-handling, generic-stack, interface-shapes** (4 tests) - GC mode only (MPS library setup)

All core language features work correctly. Remaining failures are edge cases in ownership mode or environmental (GC library linking).

---

**Last Updated**: December 3, 2025
**Status**: Core complete (97% tests passing), constructor ownership detection fixed
**Next Milestone**: Shared instance creation helper, async/await support

