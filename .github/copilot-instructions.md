# GoodScript Copilot Instructions



















































































































































































































































































































































- Bugs found: 0 (all tests passed first time after codegen fix)- Documentation: ~350 lines- Codegen additions: ~30 lines (>>> support, Math.sign())- Library size: 545 lines + 320 test lines- Session duration: ~45 minutes**Stats:**---5. **Branchless algorithms**: Modern C++ patterns often beat explicit branching4. **Triple validation catches everything**: TypeScript + GoodScript + C++ native3. **Documentation is valuable**: Comprehensive API docs prevent confusion2. **Test-driven translation**: Dart's test suite catches issues early1. **Compiler-first approach pays off**: Improving codegen benefits all future code## Lessons Learned4. Potentially add comprehensive bitwise operator tests3. Monitor for other JavaScript features that need codegen support2. Consider adding more Math functions as needed1. Continue adding collection libraries (LinkedHashSet, CanonicalizedMap)## Next Steps```Stdlib progress: 19/25 libraries (76%), 593 tests, 100% pass rateTriple validation: TypeScript ✓, GoodScript ✓, C++ native ✓Files: 545 lines library code, 320 lines tests, full API docs- Add Math.sign() to runtime (branchless implementation)- Support >>> (unsigned right shift) operatorCodegen improvements:- 43 tests, all passing- Case-insensitive natural sort variants- Natural sort ordering (compareNatural) for strings with embedded numbers- Case-insensitive ASCII comparison (equalsIgnoreAsciiCase, hashIgnoreAsciiCase)Add comprehensive string comparison utilities:feat(stdlib): add Comparators library + codegen improvements```## Commit Message- Limitations (ASCII-only case handling)- Performance characteristics- Real-world use cases (file sorting, case-insensitive maps, version sorting)- Multiple usage examples- Parameter and return value documentation- Function signatures and detailed descriptionsCreated comprehensive API documentation (`Comparators.md`) with:## DocumentationThis validates the entire natural sort order in one test.```});  }    expect(compareNatural(sorted[i], sorted[i + 1])).toBe(-1);  for (let i = 0; i < sorted.length - 1; i++) {    ];    'a', 'a0', 'a0b', 'a1', 'a01', 'a9', 'a10', 'a100', 'a100b', 'aa'  const sorted = [it('handles the documented example order', () => {```typescript### Example Test Pattern6. **Real-World**: File names, version numbers, special characters5. **Integration**: Array.sort() with various comparators4. **Natural Sort**: Numbers at various positions, leading zeros3. **Case Sensitivity**: ASCII vs non-ASCII characters2. **Edge Cases**: Empty strings, length differences, very long numbers1. **Basic Functionality**: Identical strings, basic comparisons### Test Categories## Testing Strategy- Ensures strings equal by `equalsIgnoreAsciiCase` have same hash- Case normalization happens before hashing- Uses bitwise operations and masking- Designed for JavaScript's SMI (Small Integer) optimizationJenkins hash in `hashIgnoreAsciiCase`:### 3. Hash Function DesignC++ requires explicit casts at each step to achieve the same semantics.- Converts result back to signed 32-bit integer- Performs right shift (zero-fill)- Converts to 32-bit unsigned integerJavaScript's `>>>` operator is surprisingly complex:### 2. Unsigned Right Shift Complexity- Standard C++ pattern for sign function- Compiles to efficient assembly (conditional moves)- Two comparisons, one subtraction- No if/else statementsThis is branchless and efficient:```inline int sign(double x) { return (x > 0) - (x < 0); }```cppThe `Math.sign()` implementation is elegant:### 1. Branchless sign() Implementation## Key Insights4. IterableExtensions - Additional iterable utilities3. ListExtensions - Additional list utilities2. CanonicalizedMap - Map with canonical keys (case-insensitive strings)1. LinkedHashSet - Insertion-order hash set**Next Candidates:**- ✅ Codegen improvements for JS features- ✅ Interface support with optional fields- ✅ Iterator protocol fully implemented- ✅ All tests passing in triple-mode validation- ✅ All libraries compile TypeScript → C++ → native binary- ✅ 19/25 target libraries (76% complete)**Milestones:****Pass Rate:** 100%**Total Tests:** 593  **Total Libraries:** 19  ## Stdlib Progress- Natural comparisons: O(n) with additional overhead for number parsing- `compareNatural`: O(n) worst case, typically better with early differences- `hashIgnoreAsciiCase`: O(n) using Jenkins hash- `equalsIgnoreAsciiCase`: O(n) with early termination on mismatchAll comparison functions are O(n) where n is the length of the shorter string:## Performance Characteristics5. Support multiple number sequences in one string4. Handle leading zeros (more zeros = greater for tie-breaking)3. Compare non-numeric parts lexically2. Compare numbers numerically1. Parse embedded numbers as single units**Algorithm:**```// NOT: ['a1', 'a10', 'a100', 'a2', 'a20'] (lexical)// Result: ['a1', 'a2', 'a10', 'a20', 'a100']files.sort(compareNatural);const files = ['a1', 'a2', 'a10', 'a20', 'a100'];```typescript**Example:**The comparators library includes sophisticated natural sort ordering:### Natural Sort Algorithm4. **Future-proofing**: These are standard JavaScript features that should be supported3. **Developer Experience**: TypeScript developers expect `>>>` and `Math.sign()` to work2. **Maintainability**: Library code stays close to Dart original1. **Consistency**: Other stdlib libraries may need these features**Rationale:**- Keep library code natural and idiomatic- Add `Math.sign()` to runtime- Implement `>>>` properly in codegen**Better Approach (Chosen):**```hash = (hash >> 6) & 0x1fffffff;  // Adapting to work around missing >>>// Replace >>> with regular >> and mask```typescript**Initial Approach (Rejected):**### Why Improve Codegen Instead of Adapting Code?## Design Decisions```🎉 All phases passed!✅ Execution: PASS[4/4] Native execution...✅ Compilation: PASS[3/4] Native compilation (C++ → binary)...✅ Phase 3: PASS (9909 bytes generated)[2/4] Phase 3: C++ code generation...✅ Phase 1+2: PASS[1/4] Phase 1+2: Validation (restrictions + ownership)...```### GoodScript Validation```Tests  43 passed (43)Test Files  1 passed (1)  ✓ edge cases (4)  ✓ comparators with array sort (3)  ✓ compareAsciiUpperCaseNatural (3)  ✓ compareAsciiLowerCaseNatural (3)  ✓ compareNatural (10)  ✓ compareAsciiLowerCase (4)  ✓ compareAsciiUpperCase (5)  ✓ hashIgnoreAsciiCase (5)  ✓ equalsIgnoreAsciiCase (6)✓ test/comparators.test.ts (43 tests) 6ms```### TypeScript Tests## Validation Results4. `.github/copilot-instructions.md` - Updated milestone (19 libraries, 593 tests)3. `stdlib/collection/README.md` - Updated library list2. `compiler/src/cpp/expressions/binary-expression-handler.ts` - Added `>>>` support1. `compiler/runtime/gs_gc_runtime.hpp` - Added `Math.sign()`### Modified Files3. `stdlib/docs/reference/collection/Comparators.md` (comprehensive API docs)2. `stdlib/collection/test/comparators.test.ts` (320 lines, 43 tests)1. `stdlib/collection/src/comparators-gs.ts` (545 lines)### New Files## Files Changed- Both return `int` (-1, 0, or 1)- `int` version for integers- `double` version for floating-point numbers**Overloads:**- Clever branchless implementation from standard C++ patterns- Result: `-1` for negative, `0` for zero, `1` for positive- `(x < 0)` → `1` if negative, `0` otherwise- `(x > 0)` → `1` if positive, `0` otherwise**How It Works:**```}  inline int sign(int x) { return (x > 0) - (x < 0); }  inline int sign(double x) { return (x > 0) - (x < 0); }  // ... existing functions ...namespace Math {```cpp**Implementation:****File**: `compiler/runtime/gs_gc_runtime.hpp`#### 2. Math.sign() Function- Cast back to `int` to match JavaScript's 32-bit signed result- C++ requires explicit casting to `unsigned int` for unsigned semantics- JavaScript `>>>` treats operands as 32-bit unsigned integers**Why This Works:**```// C++: hash = static_cast<int>(static_cast<unsigned int>(hash) >> 6);// JavaScript: hash >>>= 6;```cpp**Generated C++:**```}  return cpp.cast(new ast.CppType('int'), shiftExpr);  const shiftExpr = cpp.binary(unsignedLeft, '>>', right);  const unsignedLeft = cpp.cast(new ast.CppType('unsigned int'), left);  // C++: static_cast<int>(static_cast<unsigned int>(a) >> b)  // JavaScript: a >>> bif (isUnsignedRightShift) {// Handle unsigned right shift >>> with proper casting// ... later in the function ...}  op = '>>';  // Will be wrapped in static_cast<unsigned> laterif (isUnsignedRightShift) {const isUnsignedRightShift = op === '>>>';// Detect >>> operator```typescript**Implementation:****File**: `compiler/src/cpp/expressions/binary-expression-handler.ts`#### 1. Unsigned Right Shift (`>>>`) SupportFollowing GoodScript philosophy of "improve the compiler, not the code", we enhanced codegen:### Solution: Improve Codegen Instead of Adapting Library2. `Math.sign()` not in C++ runtime1. `>>>` operator (unsigned right shift) not recognized by C++Initial GoodScript validation failed with C++ compilation errors:### Problem Encountered## Codegen Improvements- Edge cases (very long numbers, special characters, alternating digits)- Array.sort() integration- Natural sort ordering- Case comparison edge cases- Hash function verification- Equality checks**Test Coverage:** 43 tests, 100% passing- Natural UI sorting with embedded numbers- Case-insensitive hash maps- Version numbers: `['v1.0', 'v1.2', 'v1.10', 'v2.0']`- File name sorting: `['file1.txt', 'file2.txt', 'file10.txt', 'file20.txt']`**Use Cases:**7. `compareAsciiUpperCaseNatural(a, b)` - Case-insensitive natural sort (uppercase)6. `compareAsciiLowerCaseNatural(a, b)` - Case-insensitive natural sort5. `compareNatural(a, b)` - Natural sort ordering (numbers within strings)4. `compareAsciiLowerCase(a, b)` - Compare with lowercase normalization3. `compareAsciiUpperCase(a, b)` - Compare with uppercase normalization2. `hashIgnoreAsciiCase(str)` - Hash function compatible with case-insensitive equality1. `equalsIgnoreAsciiCase(a, b)` - Case-insensitive ASCII equality**Functions:**Translated from [Dart's collection/comparators.dart](https://github.com/dart-lang/collection/blob/master/lib/src/comparators.dart)### Comparators (545 lines, 43 tests)## Libraries AddedSuccessfully added the 19th library to stdlib collection package: **Comparators** - a comprehensive string comparison utility library with case-insensitive comparison and natural sort ordering. Instead of adapting the library to work around missing JavaScript features, we improved the C++ code generator to properly handle `>>>` (unsigned right shift) and `Math.sign()`.## Summary**Focus**: Adding Comparators library to stdlib + improving codegen for `>>>` and `Math.sign()`**Date**: December 6, 2024  ## Project Overview

GoodScript is a **TypeScript specialization** for native compilation, positioned as **"Go for TypeScript developers"**. It compiles TypeScript code to C++ for deployment as single binaries.

**Core Innovation**: Two compilation modes:
1. **GC Mode (default)**: Automatic garbage collection, no ownership annotations, Go-like deployment with TypeScript syntax
2. **Ownership Mode (advanced)**: Ownership qualifiers (`own<T>`, `share<T>`, `use<T>`) that are transparent type aliases in TypeScript but map to C++ smart pointers (unique_ptr, shared_ptr, weak_ptr) for zero-GC performance

**Market Position**: Competing with Go for TypeScript developers who want single-binary deployment without learning a new language. Not competing with Node.js - different use cases.

## Architecture Phases

### Phase 1: TypeScript Restrictions (✅ Complete)
- Enforces "The Good Parts" - strict subset of TypeScript
- No `var`, only `===`/`!==`, no type coercion, no `any`, no dynamic features
- 244 tests validating restrictions
- **Key file**: `compiler/src/validator.ts`
- **Documentation**: `docs/GOOD-PARTS.md`

### Phase 2: Ownership Analysis (✅ Complete)  
- DAG (Directed Acyclic Graph) analysis prevents ownership cycles
- Validates ownership derivation rules (Unique→Weak, Shared→Shared/Weak, Weak→Weak)
- Enforces Pool Pattern for complex data structures
- 425 tests with 100% coverage
- **Key files**: `compiler/src/ownership-analyzer.ts`, `compiler/src/null-check-analyzer.ts`
- **Documentation**: `docs/DAG-ANALYSIS.md`, `docs/MEMORY-OWNERSHIP.md`

### Phase 3: C++ Code Generation (✅ Complete - 100% tests passing)
- Translates TypeScript AST to C++ code
- Maps ownership types: `own<T>` → `std::unique_ptr<T>`, `share<T>` → `std::shared_ptr<T>`, `use<T>` → `std::weak_ptr<T>`
- Generates idiomatic C++ with proper RAII, exception handling
- All code wrapped in `gs` namespace to avoid keyword conflicts
- Runtime library with `gs::String`, `gs::Array<T>`, `gs::Map<K,V>`, `gs::Set<T>`, `gs::RegExp`
- **Status**: 1208/1208 tests passing (100%) - Phase 3 Complete! 🎉
- **Key files**: `compiler/src/cpp/codegen.ts` (AST-based implementation), `runtime/*.hpp`
- **Documentation**: `docs/COMPILATION-TARGET.md`, `docs/PHASE-3-CPP.md`
- **Recent changes**: 
  - Migrated from legacy string-based to AST-based codegen (Dec 1, 2025)
  - Fixed property accessor detection for array.length and RegExp properties (Dec 1, 2025)
  - Implemented array auto-resize with IIFE pattern (Dec 1, 2025)
  - Implemented LiteralObject support for object literals (Dec 1, 2025)
  - Implemented optional field syntax (`field?: Type` → `std::optional<T>`) (Dec 1, 2025)
  - Fixed 'any' type mapping in generic contexts (auto→std::optional<E>) (Dec 5, 2024)
  - Fixed optional value unwrapping in return statements (Dec 5, 2024)

### Phase 3.5: Conformance Testing (✅ Infrastructure Complete, 🚀 84.4% Native Pass Rate)
- TypeScript Compiler (TSC) conformance suite integration
- Dual-mode validation (JavaScript transpilation + optional C++ GC compilation)
- Feature filtering for "Good Parts" subset
- Automated test batching and execution
- **Status**: Infrastructure 100% complete (Dec 2, 2024)
- **JavaScript Mode**: ✅ 100% pass rate (17/17 eligible tests from Classes category)
- **Native Mode**: 🚀 84.4% pass rate (27/32 tests), **14x improvement** from initial 5.9%
- **Achievement**: Successfully compiles TypeScript → C++ with MPS GC and executes
- **Recent Improvements** (Dec 2, 2024):
  - ✅ Auto-main() generation for declaration-only tests
  - ✅ typeof keyword handling (maps to `auto` in C++)
  - ✅ Function return type inference via TypeChecker
  - ✅ Enhanced filters for TypeScript-specific features
  - Remaining 5 failures are edge cases (super, overloads, arrow function types)
- **Value**: Discovered and fixed multiple codegen bugs (method/function return types, typeof handling)
- **Key files**: `conformance-tsc/src/harness/`, `conformance-tsc/src/suites/`
- **Documentation**: `conformance-tsc/README.md`, `conformance-tsc/STATUS.md`

### Phase 4: Ecosystem (✅ MAJOR MILESTONE - Dec 6, 2024)
- **Standard Library Development**: Porting proven libraries from Dart collection package
- **Translation Workflow**: AI-assisted translation with triple validation (TypeScript + GoodScript + C++ generation)
- **🎉 MILESTONE**: 19 libraries fully validated in triple-mode (TypeScript, C++ GC, C++ native)
  - ✅ HeapPriorityQueue (273 lines, 22 tests)
  - ✅ QueueList (358 lines, 29 tests)
  - ✅ ListQueue (207 lines, 29 tests)
  - ✅ EqualitySet (251 lines, 26 tests)
  - ✅ EqualityMap (242 lines, 27 tests)
  - ✅ UnmodifiableListView (153 lines, 39 tests)
  - ✅ UnmodifiableSetView (29 tests)
  - ✅ UnmodifiableMapView (24 tests)
  - ✅ Range (155 lines, 18 tests) - **Iterator protocol**
  - ✅ Zip (165 lines, 25 tests) - **Iterator protocol**
  - ✅ Partition (218 lines, 32 tests)
  - ✅ CombinedListView (36 tests)
  - ✅ UnionSet (30 tests)
  - ✅ BoolList (47 tests)
  - ✅ Algorithms (47 tests)
  - ✅ Collection Utils (36 tests)
  - ✅ groupBy/lastBy (23 tests) - **Utility functions**
  - ✅ mergeMaps/mapMap (31 tests) - **Map transformation utilities**
  - ✅ Comparators (545 lines, 43 tests) - **String comparison & natural sort** (Dec 6, 2024)
- **Iterator Protocol**: ✅ Fully implemented (Dec 6, 2024)
  - Symbol.iterator → __iterator() method
  - Iterator.next() is non-const (allows state mutation)
  - IteratorResult<T> is stack-allocated value type
  - C-style cast for incomplete type upcasts in inline methods
  - for...of loops work automatically
- **Interface Support**: ✅ Interfaces with optional fields (Dec 6, 2024)
  - Forward declarations for template interfaces
  - Optional function fields map to std::function
  - Proper ordering: interface forward decls → function forward decls → interface defs → function defs
- **Codegen Improvements** (Dec 6, 2024):
  - ✅ `>>>` operator (unsigned right shift) → `static_cast<int>(static_cast<unsigned int>(a) >> b)`
  - ✅ `Math.sign()` function added to runtime
- **Achievement**: First production-quality Dart-derived libraries compiling TypeScript→C++ and executing natively
- **Test Results**: 593 TypeScript tests, 100% pass rate across all modes
- **Target**: 20-25 core collection libraries by mid-December 2024
- **Key files**: `stdlib/collection/src/*-gs.ts`, `stdlib/collection/test/*.test.ts`
- **Documentation**: `stdlib/docs/TRANSLATION-WORKFLOW.md`, `stdlib/docs/reference/*.md`

## Standard Library Translation Workflow

### Overview

GoodScript's stdlib is being built by translating well-tested libraries from Dart's collection package. This provides production-quality data structures with proven algorithms.

**Why Dart?**: Null-safe, well-documented, similar to TypeScript, excellent collection library design.

**Translation Speed**: 5-30 minutes per library with AI assistance and triple validation.

### File Naming Convention

**CRITICAL**: Use `-gs.ts` suffix (NOT `.gs.ts`):
```
✅ priority-queue-gs.ts
❌ priority-queue.gs.ts
```

This maintains compatibility with TypeScript tooling while clearly marking GoodScript-specific files.

### 8-Step Translation Process

Reference: `stdlib/docs/TRANSLATION-WORKFLOW.md`

1. **Select source**: Choose library from Dart collection package
2. **Create -gs.ts file**: Translate Dart → TypeScript with GoodScript constraints
3. **Apply GoodScript constraints**:
   - No getters/setters → use methods (`getLength()`, `setLength()`)
   - No iterator protocol → use `toArray()` pattern
   - No array indexing syntax → use `get(i)`, `set(i, value)`
   - Explicit null checks (GoodScript is null-safe)
   - No `any` type
   - Only `===`/`!==` operators
   - No type coercion
4. **Create test file**: Comprehensive tests covering all methods and edge cases
5. **Run TypeScript tests**: `npm test` - must pass 100%
6. **Run GoodScript validation**: `node quick-test.js src/library-name-gs.ts`
   - Phase 1+2 validation
   - C++ code generation
7. **Document API**: Create reference doc in `stdlib/docs/reference/ClassName.md`
8. **Commit**: Clean commit with library + tests + docs

### GoodScript Constraints Reference

When translating, remember these key restrictions:

1. **No getter/setter syntax**: 
   ```typescript
   // Dart: queue.length
   // GoodScript: queue.getLength()
   ```

2. **No iterator protocol** (Symbol not supported):
   ```typescript
   // Dart: for (var item in queue) { ... }
   // GoodScript: for (const item of queue.toArray()) { ... }
   ```

3. **No array indexing on custom types**:
   ```typescript
   // Dart: queue[i], queue[i] = value
   // GoodScript: queue.get(i), queue.set(i, value)
   ```

4. **Explicit null handling**:
   ```typescript
   if (value !== null && value !== undefined) { ... }
   ```

5. **No `any` type**: Use generics or specific types

6. **Only strict equality**: Use `===` and `!==`, never `==` or `!=`

7. **No type coercion**: Explicit conversions only

### Quality Checklist

Before considering a library complete:

- ✅ All TypeScript tests passing
- ✅ GoodScript Phase 1+2 validation passing
- ✅ C++ code generation successful (Phase 3)
- ✅ Reference documentation created
- ✅ Performance characteristics documented
- ✅ Edge cases tested (empty, single element, growth)
- ✅ Differences from Dart original documented

### Testing Strategy

Each library should have comprehensive tests:

```typescript
describe('ClassName', () => {
  describe('constructor', () => { /* ... */ });
  describe('basic operations', () => { /* ... */ });
  describe('edge cases', () => { 
    it('handles empty collection', () => { /* ... */ });
    it('handles single element', () => { /* ... */ });
    it('handles growth', () => { /* ... */ });
  });
  describe('stress test', () => {
    it('handles 1000+ elements', () => { /* ... */ });
  });
});
```

### Validation Commands

```bash
# TypeScript tests (from package directory)
cd stdlib/collection
npm test

# GoodScript validation (from stdlib directory)
cd stdlib
node quick-test.js collection/src/heap-priority-queue-gs.ts
node quick-test.js collection/src/queue-list-gs.ts

# Both validations (from package directory)
npm test && cd .. && node quick-test.js collection/src/library-name-gs.ts
```

### Documentation Structure

```
stdlib/
├── collection/                      # @goodscript/collection package
│   ├── src/
│   │   ├── heap-priority-queue-gs.ts
│   │   ├── queue-list-gs.ts
│   │   └── ...
│   ├── test/
│   │   ├── heap-priority-queue.test.ts
│   │   ├── queue-list.test.ts
│   │   └── ...
│   ├── package.json
│   └── README.md
├── core/                            # @goodscript/core package (planned)
├── async/                           # @goodscript/async package (planned)
├── io/                              # @goodscript/io package (planned)
├── docs/
│   ├── TRANSLATION-WORKFLOW.md      # This workflow
│   ├── FUTURE-IMPROVEMENTS.md       # Deferred features
│   └── reference/                   # API documentation
│       ├── collection/              # Collection library docs
│       │   ├── HeapPriorityQueue.md
│       │   ├── QueueList.md
│       │   └── ...
│       ├── core/                    # Core library docs
│       ├── async/                   # Async library docs
│       └── io/                      # I/O library docs
├── quick-test.js                    # GoodScript validation script
└── README.md                        # Main stdlib overview
```

### Common Translation Patterns

**Pattern: Length property → method**
```typescript
// Dart
int get length => _length;
set length(int value) { ... }

// GoodScript
getLength(): number { return this._length; }
setLength(value: number): void { ... }
```

**Pattern: Iterator → toArray()**
```typescript
// Dart
Iterable<E> get iterator => ...;

// GoodScript
toArray(): E[] {
  const result: E[] = [];
  // ... collect elements
  return result;
}
```

**Pattern: Array indexing → get/set methods**
```typescript
// Dart
E operator[](int index) => ...;
void operator[]=(int index, E value) { ... }

// GoodScript
get(index: number): E { ... }
set(index: number, value: E): void { ... }
```

### Libraries Completed (as of Dec 6, 2024)

1. ✅ **HeapPriorityQueue** (273 lines, 19 tests) - Min-heap priority queue
2. ✅ **QueueList** (358 lines, 29 tests) - Double-ended queue with O(1) both ends
3. ✅ **ListQueue** (207 lines, 29 tests) - Alternative queue implementation using circular buffer
4. ✅ **EqualitySet** (251 lines, 26 tests) - Hash set with custom equality
5. ✅ **EqualityMap** (242 lines, 24 tests) - Hash map with custom equality
6. ✅ **UnmodifiableListView** (153 lines, 36 tests) - Read-only list wrapper
7. ✅ **Range** (155 lines, 18 tests) - Numeric sequence generation with **iterator protocol**
8. ✅ **Zip** (165 lines, 25 tests) - Combine multiple iterables with **iterator protocol**
9. ✅ **Partition** (218 lines, 32 tests) - Split and group collections
10. ✅ **CombinedListView** - Lazy concatenated view
11. ✅ **UnionSet** - Lazy union view  
12. ✅ **BoolList** - Space-efficient boolean list
13. ✅ **Algorithms** - Sorting and searching utilities
14. ✅ **Collection Utils** - Higher-order collection functions

**Total:** 14 libraries, 496 tests, 100% pass rate

### Next Candidate Libraries

From Dart collection package (in priority order):

1. **LinkedHashSet** - Insertion-order hash set
2. **HashSet** - Standard hash set (if not using built-in Set)
3. **UnmodifiableListView** - Read-only list wrapper
4. **ListQueue** - Alternative queue implementation
5. **LinkedHashMap** - Insertion-order map (Map already built-in)
6. **SplayTreeSet** - Self-balancing tree set
7. **SplayTreeMap** - Self-balancing tree map

### Known Limitations (Documented in FUTURE-IMPROVEMENTS.md)

- **Iterator protocol**: Deferred to Phase 4 (Symbol not supported)
  - **Workaround**: Use `toArray()` pattern
- **Getter/setter syntax**: Not supported in GoodScript
  - **Workaround**: Use explicit methods
- **Array indexing on custom types**: Not supported
  - **Workaround**: Use `get(i)` and `set(i, value)` methods

## Critical Design Principles

### 1. Ownership Semantics

**Type Declarations** (transparent in TypeScript):
```typescript
declare type own<T> = T;  // Exclusive ownership
declare type share<T> = T;  // Reference-counted shared ownership  
declare type use<T> = T | null | undefined;  // Non-owning reference
```

**C++ Mapping**:
```cpp
own<T> → std::unique_ptr<T>  // Heap-allocated, single owner
share<T> → std::shared_ptr<T>  // Reference-counted, multiple owners
use<T>   → std::weak_ptr<T>    // Non-owning, prevents cycles
```

**Derivation Rules** (enforced in Phase 2):
- From `own<T>` → only `use<T>` (no aliasing of exclusive ownership)
- From `share<T>` → `share<T>` or `use<T>` (can share or downgrade)
- From `use<T>` → only `use<T>` (can't upgrade to ownership)

### 2. DAG Enforcement

**Purpose**: Prevent reference cycles that cause memory leaks in reference-counted systems.

**How it works**:
1. Build ownership graph: Types are nodes, `share<T>` fields are edges
2. Detect cycles using DFS
3. Reject code with cycles, forcing use of Pool Pattern

**Pool Pattern** (the escape hatch):
```typescript
// ❌ Rejected - potential cycle
class TreeNode {
  children: share<TreeNode>[];  // A -> TreeNode (self-reference)
}

// ✅ Accepted - Pool Pattern breaks cycle
class Tree {
  nodes: own<TreeNode>[];  // Tree owns all nodes
}
class TreeNode {
  children: use<TreeNode>[];  // Non-owning links (no edges)
}
```

### 3. AST-Based Type Preservation

**Problem**: TypeScript's type checker erases ownership annotations because they're type aliases.
```typescript
type share<T> = T;  // TypeChecker sees just T, not share<T>
```

**Solution**: Read types directly from AST using `symbol.valueDeclaration.type?.getText()`
```typescript
// This preserves the source text "share<CacheNode>"
const typeText = symbol.valueDeclaration.type?.getText();
if (typeText?.startsWith('share<')) {
  // We know it's Shared, not just T
}
```

**Why this matters**: Critical for C++ codegen to know when to use `std::make_shared()` vs `std::make_unique()`.

## Current Development Focus

### Phase 3 C++ Codegen - Early Implementation

**Current State**: AST-based implementation in `cpp/codegen.ts`

**Key Challenges Ahead**:

1. **Smart Pointer Management**:
   - Must generate correct `std::make_unique()`, `std::make_shared()`, and `std::weak_ptr` usage
   - Avoid double-wrapping when transferring ownership
   - Handle container types with shared ownership (e.g., `std::vector<std::shared_ptr<T>>`)

2. **Memory Safety Translation**:
   - Map TypeScript ownership semantics to C++ RAII patterns
   - Ensure proper destruction order and lifetime management
   - Handle nullable types with `std::optional<T>` or raw pointers for weak references

3. **Async/Await Support**:
   - Use C++20 coroutines with `cppcoro::task<T>` or similar
   - Map Promise<T> to appropriate future/task types
   - Handle suspension points and lifetime across await boundaries

**Next Steps**:
- Implement basic AST → C++ traversal
- Add type mapping logic for ownership qualifiers
- Generate simple class and function translations

## Coding Guidelines

### When Working on C++ Codegen (`cpp/codegen.ts`)

1. **Always use AST-based type lookup for ownership types**:
   ```typescript
   // ❌ Don't use TypeChecker for ownership types
   const type = checker.getTypeAtLocation(node);
   
   // ✅ Do read from AST
   const typeText = symbol.valueDeclaration.type?.getText();
   const isShared = typeText?.match(/share<([^>]+)>/);
   // Then map to: std::shared_ptr<${elementType}>
   ```

2. **Use TypeChecker for return type inference**:
   ```typescript
   // When method has no explicit return type annotation
   const signature = this.checker.getSignatureFromDeclaration(member);
   const tsReturnType = signature.getReturnType();
   const returnTypeStr = this.checker.typeToString(tsReturnType);
   // Map: 'number' → 'double', 'string' → 'gs::String', 'boolean' → 'bool'
   ```

3. **Use OwnershipAwareTypeChecker for type tracking**:
   ```typescript
   // Register all declarations
   this.ownershipChecker.registerVariable(name, decl);
   this.ownershipChecker.registerProperty(className, propName, decl);
   
   // Check if expression needs pointer access
   if (this.ownershipChecker.requiresPointerAccess(expr)) {
     // Use -> operator for smart pointers
   }
   
   // Check if wrapping is needed
   const wrapping = this.ownershipChecker.needsSmartPointerWrapping(targetType, sourceExpr);
   if (wrapping === 'shared') {
     // Wrap with std::make_shared
   }
   ```

4. **Track state across statements** (fallback when OwnershipChecker insufficient):
   - Track variables with unique_ptr ownership (already moved/wrapped)
   - Track variables with shared_ptr (may need .get() for raw access)
   - Track nullable types (std::optional or pointer-based)

3. **Context-aware wrapping**:
   ```typescript
   // Same value needs different treatment based on context:
   // - Constructor field assignment: may need std::make_unique()
   // - Map insert with share<V>: needs std::make_shared()
   // - Function call with share<T> param: needs std::make_shared()
   // - Already wrapped: use std::move() or pass by reference
   ```

4. **Handle numeric literals carefully**:
   ```typescript
   // C++ handles integer/float literals naturally
   // Use explicit type suffixes when needed: 1.0f, 1.0, 1L
   ```

### When Working on Type Tracking (`ownership-aware-type-checker.ts`)

1. **Always register declarations**:
   ```typescript
   // In visitVariableStatement
   this.ownershipChecker.registerVariable(name, decl);
   
   // In visitClass (for properties)
   this.ownershipChecker.registerProperty(className, fieldName, member);
   
   // In visitFunction (for parameters)
   this.ownershipChecker.registerVariable(paramName, param);
   ```

2. **Distinguish built-in value types from user classes**:
   ```typescript
   const builtInValueTypes = ['Array', 'Map', 'Set', 'String', 'RegExp', 'Date', 'Promise'];
   const isBuiltIn = builtInValueTypes.includes(className.split('<')[0]);
   
   if (isBuiltIn) {
     // These are stack values, no ownership
     return { baseType: className, ownership: undefined };
   } else {
     // User classes get smart pointer ownership
     return { baseType: className, ownership: 'share' };
   }
   ```

3. **Use OwnershipChecker as primary source of truth**:
   ```typescript
   // FIRST: Check OwnershipChecker (most reliable)
   if (this.ownershipChecker.requiresPointerAccess(expr)) {
     return true;
   }
   
   // SECOND: Fallback to manual variableTypes map
   const varType = this.variableTypes.get(varName);
   // ...
   ```

4. **Always null-check TypeChecker before use**:
   ```typescript
   // OwnershipChecker methods that use this.checker:
   if (this.checker) {
     const tsType = this.checker.getTypeAtLocation(expr);
     // Safe to use TypeChecker
   }
   ```

### When Working on Ownership Analysis (`ownership-analyzer.ts`)

1. **Follow DAG rules strictly**:
   - Only `share<T>` creates edges
   - `own<T>` and `use<T>` do NOT create edges
   - Container transitivity: `Array<share<T>>`, `Map<K, share<V>>`

2. **Cycle detection**:
   ```typescript
   // DFS with visited/visiting sets
   // visiting = currently on stack (gray)
   // visited = completely processed (black)
   // If we encounter a gray node, we have a cycle
   ```

3. **Error messages should suggest Pool Pattern**:
   ```typescript
   this.addError(
     `Type '${typeName}' contains a share<T> ownership cycle. ` +
     `Use the Pool Pattern: centralize ownership in a container type ` +
     `and use use<T> references for relationships.`,
     location,
     'GS305'
   );
   ```

### When Working on Validation (`validator.ts`)

1. **Error codes follow convention**:
   - GS1XX: Prohibited features (GS101=with, GS102=eval, GS105=var, GS106==/!=)
   - GS2XX: Type coercion (GS201=string+number)
   - GS3XX: Ownership/DAG (GS301=derivation, GS302=nullable, GS305=cycle)

2. **Diagnostic severity**:
   - `error`: Violates GoodScript rules (compilation fails)
   - `warning`: Suspicious but legal
   - `info`: Educational/best practice

### Test Organization

**Directory Structure**:
```
test/
├── phase1/          # Validator tests (142 tests)
│   ├── var-keyword.test.ts
│   ├── strict-equality.test.ts
│   └── ...
├── phase2/          # Ownership/DAG tests (283 tests)
│   ├── ownership-derivation.test.ts
│   ├── dag-cycles.test.ts
│   └── ...
└── phase3/          # C++ codegen tests (to be implemented)
    ├── basic/       # Unit tests for features
    ├── compile/     # Validation that generated code compiles with g++/clang
    ├── runtime/     # JS vs C++ equivalence tests
    └── concrete-examples/  # Real programs
```

**Testing Philosophy**:
1. **Unit tests** verify individual features work
2. **Compile tests** ensure generated C++ compiles with g++/clang++
3. **Runtime tests** verify JS and C++ produce identical output
4. **Concrete examples** are end-to-end real programs

### Common Patterns

**Pattern: Method Return Type Lookup**
```typescript
private getMethodReturnTypeFromSource(callExpr: ts.CallExpression): string | undefined {
  if (!this.checker) return undefined;
  
  const signature = this.checker.getResolvedSignature(callExpr);
  if (!signature || !signature.declaration) return undefined;
  
  if (ts.isMethodDeclaration(signature.declaration)) {
    const returnTypeNode = signature.declaration.type;
    return returnTypeNode?.getText();  // Preserves "own<Token>"
  }
  
  return undefined;
}
```

**Pattern: Tracking Variables Across Statements**
```typescript
// In constructor body generation:
this.uniquePtrVars.clear();  // Reset for each constructor

// When finding a method call returning own<T>:
const returnType = this.getMethodReturnTypeFromSource(callExpr);
if (returnType?.startsWith('own<')) {
  this.uniquePtrVars.add(localVarName);  // Mark as already unique_ptr
}

// Later, in member initialization:
if (field.type.startsWith('std::unique_ptr<') && !this.uniquePtrVars.has(field.name)) {
  emit(`${field.name}(std::make_own<${elementType}>(${field.name}))`);
} else {
  emit(`${field.name}(std::move(${field.name}))`);
}
```

**Pattern: Container Type Detection**
```typescript
// Check if std::vector expects share<T> elements
const vecTypeText = symbol.valueDeclaration.type?.getText();
const sharedMatch = vecTypeText?.match(/share<([^>]+)>\[\]/);
if (sharedMatch) {
  const elementType = sharedMatch[1];
  // std::vector<std::shared_ptr<${elementType}>>
  // Use push_back(std::make_share<${elementType}>())
}

// Check if Map expects share<V> values  
const mapTypeText = symbol.valueDeclaration.type?.getText();
const sharedMatch = mapTypeText?.match(/Map<[^,]+,\s*share<([^>]+)>>/);
if (sharedMatch) {
  const valueType = sharedMatch[1];
  // std::unordered_map<K, std::shared_ptr<${valueType}>>
  // Use insert or emplace with std::make_shared
}
```

## Documentation References

### Design Documents
- **`docs/LANGUAGE.md`**: Language specification for implementors
- **`docs/MEMORY-OWNERSHIP.md`**: Formal proof of memory safety model
- **`docs/DAG-ANALYSIS.md`**: DAG cycle detection algorithm specification
- **`docs/GOOD-PARTS.md`**: Phase 1 TypeScript restrictions with rationale
- **`docs/COMPILATION-TARGET.md`**: Why C++/Rust vs other targets
- **`docs/GOODSCRIPT-VS-RUST.md`**: Comparison with Rust's ownership model

### Implementation Guides  
- **`docs/COMPILATION-TARGET.md`**: Why C++ was chosen as compilation target
- **`docs/FOR-TS-DEVELOPERS.md`**: Developer-facing guide
- **`docs/REACT.md`**: React/JSX support
- **`docs/ASYNC-AWAIT.md`**: Async/await and Promise handling
- **`docs/MINIMAL-STD-LIB.md`**: Standard library design

### Test Documentation
- **`compiler/test/README.md`**: Test suite overview
- **`compiler/test/phase3/concrete-examples/README.md`**: Concrete examples guide
- **`notes/SESSION-*.md`**: Development session notes (not in git)

## Common Pitfalls & Solutions

### ❌ Pitfall 1: Using TypeChecker for Ownership Types
```typescript
// ❌ This loses ownership qualifiers
const type = checker.getTypeAtLocation(expr);
// type is "CacheNode", not "share<CacheNode>"
```

**✅ Solution**: Read from AST
```typescript
const symbol = checker.getSymbolAtLocation(expr);
const typeText = symbol.valueDeclaration.type?.getText();
// typeText is "share<CacheNode>"
```

### ❌ Pitfall 2: Double-Wrapping
```typescript
// ❌ Constructor returns own<T> (already unique_ptr<T>)
const token = tokenizer.nextToken();  // Returns unique_ptr<Token>
this.current = std::make_own<Token>(token);  // Double wrap!
```

**✅ Solution**: Track unique_ptr variables and use std::move
```typescript
const returnType = this.getMethodReturnTypeFromSource(callExpr);
if (returnType?.startsWith('own<')) {
  this.uniquePtrVars.add('current');
}
// Later: if (!this.uniquePtrVars.has('current')) { wrap... } else { std::move... }
```

### ❌ Pitfall 3: Ignoring Context
```typescript
// ❌ Same value needs different treatment
map.insert(key, value);  // If map is Map<K, share<V>>, needs make_shared
vec.push_back(value);    // If vec is array of share<T>, needs make_shared
```

**✅ Solution**: Check container element types via AST
```typescript
const mapTypeText = getFieldType(mapSymbol);
if (mapTypeText?.includes('share<')) {
  value = `std::make_share<${elementType}>(${value})`;
}
```

### ❌ Pitfall 4: Hardcoding Type Conversions
```typescript
// ❌ Assumes all numbers need .0
const literal = value + '.0';  // What if value is "1.0" already?
```

**✅ Solution**: Check before adding
```typescript
if (!value.includes('.')) {
  value += '.0';
}
```

## Key Files to Understand

### Core Compiler
1. **`compiler/src/cpp/codegen.ts`** (2783 lines) - Main C++ code generator
   - `AstCodegen` class (exported as `CppCodegen` for compatibility)
   - Handles all AST → C++ transformations
   - Uses AST-based approach with cpp/ast.ts node types

2. **`compiler/src/ownership-analyzer.ts`** (1314 lines) - DAG analysis
   - Builds ownership graph from AST
   - Detects cycles using DFS
   - Enforces derivation rules

3. **`compiler/src/validator.ts`** (453 lines) - Phase 1 restrictions
   - Checks for prohibited features
   - Enforces strict typing
   - Simple visitor pattern

### Type Definitions
4. **`lib/goodscript.d.ts`** - Type declarations for GoodScript
   - Defines `own<T>`, `share<T>`, `use<T>`
   - Transparent type aliases for TypeScript compatibility

### Test Infrastructure
5. **`compiler/test/phase3/concrete-examples/`** - Real programs
   - Each subdirectory is a complete program
   - Tests compilation, rustc validation, runtime equivalence
   - Best place to see GoodScript in action

## Development Workflow

### Adding a New Feature

1. **Update type definitions** if needed (`lib/goodscript.d.ts`)
2. **Add validation** if new restriction (`validator.ts`)
3. **Update ownership analysis** if affects DAG (`ownership-analyzer.ts`)
4. **Implement codegen** (`rust-codegen.ts`)
5. **Write tests**:
   - Unit test in `test/phase3/basic/`
   - Rustc validation test in `test/phase3/rustc/`
   - Runtime equivalence test in `test/phase3/runtime/`
6. **Update documentation** (`docs/PHASE-3-RUST.md`)

### Debugging Rust Codegen Issues

1. **Find failing test**:
   ```bash
   npm test -- --grep "test-name"
   ```

2. **Examine generated Rust**:
   ```bash
   npm run build && npm test
   # Check compiler/test/phase3/concrete-examples/example-name/dist/rust/
   ```

3. **Check C++ compiler errors**:
   ```bash
   cd compiler/test/phase3/concrete-examples/example-name/dist/cpp
   g++ -std=c++20 -o main src/main.cpp
   # Or use clang++
   # Read error messages
   ```

4. **Compare with TypeScript**:
   - Look at source `-gs.ts` file
   - Check what TypeScript equivalent would be
   - Ensure C++ captures same semantics

5. **Add debug logging** in `cpp/codegen.ts`:
   ```typescript
   console.log(`[DEBUG] Generating for ${node.kind}: ${node.getText()}`);
   ```

### Running Tests

```bash
# All tests
npm test

# Phase 3 only
npm test -- test/phase3

# Concrete examples only
npm test -- test/phase3/concrete-examples

# Specific test file
npm test -- test/phase3/basic/classes.test.ts

# With coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

## Session Notes Convention

Development sessions are documented in `notes/SESSION-N.md` (not committed, in .gitignore):
- Problem statement
- Solutions implemented  
- Code changes with line numbers
- Test results (before/after)
- Architecture insights
- Lessons learned

These notes help track progress and reasoning over time.

## Questions to Ask

When implementing new features or fixing bugs:

1. **Does this affect ownership semantics?** → Update `ownership-analyzer.ts`
2. **Does TypeChecker preserve the type information I need?** → Probably not, use AST
3. **Could this cause double-wrapping?** → Track state, use std::move when appropriate
4. **Does the generated C++ compile?** → Add g++/clang++ compilation test
5. **Does it behave the same as TypeScript?** → Add runtime equivalence test
6. **Could this create an ownership cycle?** → Check DAG rules
7. **Is this a TypeScript "bad part"?** → Add validation in `validator.ts`

## Philosophy & Goals

1. **"Go for TypeScript developers"**: Target TS devs evaluating Go, offer same deployment benefits without language switch
2. **Single-binary deployment**: Like Go's `go build`, but with TypeScript syntax
3. **New stdlib is expected**: We're not Node.js - new APIs are par for the course (like Go has different APIs than Node)
4. **TypeScript familiarity**: Classes, async/await, familiar patterns work - no paradigm shift required
5. **Dual-mode execution**: Develop in Node.js/Deno, deploy as native binary
6. **Optional ownership for experts**: Zero-GC mode available for embedded/real-time/high-performance use cases
7. **Explicit over implicit**: If it can surprise, make it explicit
8. **Fail early**: Compile-time errors > Runtime errors > Memory corruption

## Current Status (as of Dec 5, 2024)

- **Phase 1**: ✅ 100% complete (244/244 tests)
- **Phase 2**: ✅ 100% complete (425/425 tests)  
- **Phase 3**: ✅ 100% complete (1208/1208 tests passing) 🎉
  - ✅ AST traversal and code emission
  - ✅ Type mappings (primitives, ownership types, collections)
  - ✅ Statement generation (variables, functions, classes, control flow)
  - ✅ Expression generation (operators, calls, literals)
  - ✅ Namespace wrapping (gs::) and keyword escaping
  - ✅ Runtime library (String, Array, Map, Set, JSON, console)
  - ✅ STL compatibility (push_back, size aliases for std::back_inserter)
  - ✅ Smart pointer wrapping (wrap_for_push helper)
  - ✅ String methods (indexOf, startsWith, fromCharCode)
  - ✅ Map/Set operations (delete_, has, set, get, keys, values)
  - ✅ **Set insertion-order preservation** (vector+index pattern like Map)
  - ✅ Legacy codegen removed, AST-based codegen is sole implementation
  - ✅ Generic base classes with template argument mapping
  - ✅ Class inheritance with proper keyword escaping
  - ✅ Property accessor detection (array.length(), RegExp.global())
  - ✅ Parameter type tracking in methods
  - ✅ Array auto-resize (IIFE pattern for out-of-bounds writes)
  - ✅ LiteralObject support (object literals with mixed types)
  - ✅ Optional field syntax (`field?: Type` → `std::optional<T>`)
- **Phase 3.5**: ✅ 100% infrastructure complete (Dec 2, 2024)
  - ✅ TypeScript conformance testing with TSC suite
  - ✅ JavaScript mode: 100% pass rate (17/17 eligible tests)
  - ✅ Native C++ mode: 84.4% pass rate (27/32 tests)
  - ✅ MPS library integration (libmps.a)
  - ✅ Method return type inference via TypeChecker API
  - ✅ Type mapping for GC mode (double, bool, gs::String)
  - ✅ Discovered and fixed real codegen bugs
- **Phase 4**: 🚀 In Progress (Started Dec 5, 2024)
  - ✅ Translation workflow established and documented
  - ✅ HeapPriorityQueue (273 lines, 19 tests, all validations passing)
  - ✅ QueueList (358 lines, 29 tests, all validations passing)
  - 🚀 **Translation speed**: 5-30 minutes per library with AI assistance
  - 📋 Target: 20-30 core collection libraries by Dec 12, 2024

**Current Focus**:
1. **Standard library porting sprint** - Translating Dart collection libraries
   - Proven workflow: Dart source → GoodScript → Triple validation
   - 2/~25 libraries complete (Day 1)
   - Target pace: 2-4 libraries per day
2. Future priorities after stdlib complete:
   - Node.js API compatibility layers (fs, http, path, etc.)
   - Package management and build tooling
   - Migration guides and example projects
   - GC performance optimization

---

## Quick Reference

### Ownership Type Mappings
| GoodScript | TypeScript | C++ | Semantics |
|-----------|-----------|------|-----------|---|
| `own<T>` | `T` | `std::unique_ptr<T>` | Exclusive ownership |
| `share<T>` | `T` | `std::shared_ptr<T>` | Shared ownership |
| `use<T>` | `T \| null \| undefined` | `std::weak_ptr<T>` | Non-owning reference |

### Error Code Prefixes
- `GS1XX`: Language restrictions (var, eval, ==, etc.)
- `GS2XX`: Type coercion issues
- `GS3XX`: Ownership and DAG violations

### Key Directories
- `compiler/src/`: Compiler implementation
- `compiler/test/`: Test suite (organized by phase)
- `docs/`: Design documents and specifications
- `lib/`: Type definitions for GoodScript
- `notes/`: Development session notes (not committed)

---

**Remember**: When in doubt, check the documentation in `docs/` - it's comprehensive and kept up to date. The architecture is intentional, not accidental!
