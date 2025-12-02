# Extending Triple-Mode Testing to Phase 3 Tests

## Overview

Currently, only the 15 concrete examples have comprehensive triple-mode testing (JavaScript + Ownership C++ + GC C++). The basic Phase 3 tests (141 tests in 16 files) only verify code generation, not runtime equivalence.

This document outlines how to extend triple-mode testing to all Phase 3 tests.

## Current Status

**Test Breakdown** (1206 total tests):
- **Phase 1** (Validator): 315 tests - mode-independent
- **Phase 2** (Ownership Analysis): 237 tests - ownership-mode specific  
- **Phase 3** (C++ Codegen): 654 tests
  - **Basic tests**: 141 tests - original code generation tests
  - **Triple-mode tests**: 181 tests - **full triple-mode testing** ✅ (10 primitives + 16 arrays + 6 classes + 17 control flow + 15 strings + 30 operators + 23 numbers + 27 booleans + 20 maps + 17 sets)
  - **Runtime tests**: 67 tests - ownership mode execution only
  - **Concrete Examples**: 186 tests - **full triple-mode testing** ✅
  - **Other**: 79 tests - various specialized tests

**Triple-Mode Coverage**: 367/1206 tests (30%) have full triple-mode validation

## New Infrastructure

### Triple-Mode Helpers (`test/phase3/triple-mode-helpers.ts`)

Provides simplified API for triple-mode testing:

```typescript
import { expectTripleModeEquivalence } from '../triple-mode-helpers.js';

it('should produce identical output', () => {
  const result = expectTripleModeEquivalence(`
    console.log("Hello, World!");
  `);
  
  expect(result.allMatch).toBe(true);
});
```

**API**:
- `testTripleMode(source)` - Compile and execute in all three modes, return detailed results
- `expectTripleModeEquivalence(source)` - Assert all modes produce identical output (throws on mismatch)
- `expectTripleModeCompilation(source)` - Compile to all three modes, return code (no execution)

### Example Test (`test/phase3/basic/primitives-triple-mode.test.ts`)

Demonstrates the pattern:

```typescript
describe('Phase 3: Primitive Types (Triple-Mode)', () => {
  describe('Code Generation', () => {
    it('should generate in all modes', () => {
      const { ownershipCppCode, gcCppCode } = expectTripleModeCompilation(`...`);
      expect(ownershipCppCode).toContain('...');
      expect(gcCppCode).toContain('...');
    });
  });
  
  describe('Runtime Equivalence', () => {
    it('should produce identical output', () => {
      expectTripleModeEquivalence(`console.log(42);`);
    });
  });
});
```

## Known Limitations

### 1. ~~Boolean Output Formatting~~ ✅ FIXED (Dec 2025)

**Status**: ✅ **RESOLVED**

Both `runtime/gs_console.hpp` (ownership mode) and `runtime/gs_gc_runtime.hpp` (GC mode) now have `bool` overloads that output `"true"`/`"false"` matching JavaScript behavior.

```cpp
// Both modes now include:
inline void log(bool value) {
  std::cout << (value ? "true" : "false") << std::endl;
}
```

### 2. Floating-Point Precision

**Issue**: JavaScript shows full IEEE 754 precision, C++ may round

```typescript
// JavaScript
console.log(0.1 + 0.2);  // "0.30000000000000004"

// C++ (both modes)
std::cout << 0.1 + 0.2;  // "0.3" (depends on default precision)
```

**Workaround**: Use `toFixed()` or avoid precision-sensitive comparisons
```typescript
console.log((0.1 + 0.2).toFixed(2));  // "0.30" in all modes
```

**Long-term Fix**: Set `std::cout` precision or implement Number.toString() properly

### 3. Null/Undefined Output

**Issue**: C++ uses `std::optional`, which may format differently

**Workaround**: Explicit null checks before logging

### 4. Object/Array Stringification

**Issue**: JavaScript has rich default stringification, C++ may differ

**Workaround**: Use `JSON.stringify()` explicitly for objects and arrays

## Migration Strategy

### Phase 1: Low-Hanging Fruit (Recommended Start)

Convert tests that only use simple primitives and operators:

**Good candidates**:
- `primitives.test.ts` - numbers, strings, booleans (with bool fix)
- `js-cpp-semantics.test.ts` - operator semantics
- `parameter-passing.test.ts` - function parameters

**Skip for now**:
- Tests with complex output formatting
- Tests that rely on specific ownership semantics
- Tests that use features not yet in GC runtime

### Phase 2: Selective Conversion

Add triple-mode tests alongside existing tests:

```typescript
// Keep existing code generation tests
describe('Phase 3: Classes', () => {
  it('should generate class definition', () => {
    const cpp = compileToCpp(`class Foo { ... }`);
    expect(cpp).toContain('class Foo');
  });
});

// Add new triple-mode runtime tests
describe('Phase 3: Classes (Triple-Mode)', () => {
  it('should instantiate and use class', () => {
    expectTripleModeEquivalence(`
      class Greeter {
        greet() { console.log("Hello"); }
      }
      const g = new Greeter();
      g.greet();
    `);
  });
});
```

### Phase 3: Full Coverage

Once console.log formatting issues are resolved, convert all suitable tests.

## Testing Checklist

Before adding triple-mode test:

- [ ] Does it use console.log for output?
  - [ ] Only strings/numbers? ✅ Good to go
  - [ ] Booleans? ⚠️ Use String(bool) or fix console first
  - [ ] Objects/arrays? ⚠️ Use JSON.stringify()
  
- [ ] Does it rely on ownership semantics?
  - [ ] No? ✅ Good for triple-mode
  - [ ] Yes? ⚠️ Keep as ownership-only test
  
- [ ] Is the runtime library feature implemented in GC mode?
  - [ ] String, Array, Map, Set, Number? ✅ Implemented
  - [ ] Other types? ⚠️ May need GC implementation

## Running Tests

```bash
# Run all tests (including new triple-mode tests)
npm test

# Run only triple-mode tests
npm test -- test/phase3/basic/primitives-triple-mode.test.ts

# Run all basic tests (mix of old and new)
npm test -- test/phase3/basic

# Run with verbose output to see execution details
npm test -- test/phase3/basic/primitives-triple-mode.test.ts --reporter=verbose
```

## Expected Impact

**Current**: 367/1206 tests (30%) are triple-mode (186 concrete examples + 181 basic tests)  
**After More Conversions**: ~470/1206 tests (39%) triple-mode  
**After Full Migration**: ~770/1206 tests (64%) triple-mode  

(Phase 1 and Phase 2 tests remain mode-independent/ownership-specific)

## Technical Details

### TypeChecker Integration (Critical Fix - Dec 2025)

The triple-mode helpers **must** pass a TypeChecker to the codegen constructors for proper type inference.

**Problem**: Without a TypeChecker, array literals like `[1, 2, 3]` would be inferred as `Array<int>` instead of `Array<double>`, breaking JavaScript semantics where all numbers are doubles.

**Solution** in `triple-mode-helpers.ts`:
```typescript
// Create a TypeScript program with checker
const compilerOptions: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.ESNext,
  strict: true,
};

const host = ts.createCompilerHost(compilerOptions);
host.getSourceFile = (fileName, languageVersion) => {
  if (fileName === 'test.ts') {
    return sourceFile;
  }
  return originalGetSourceFile(fileName, languageVersion);
};

const program = ts.createProgram(['test.ts'], compilerOptions, host);
const checker = program.getTypeChecker();

// Pass checker to codegens ✅
const ownershipCodegen = new AstCodegen(checker);
const gcCodegen = new GcCodegen(checker);
```

**Impact**: Without the checker, the codegen can't properly resolve:
- Array element types (`number[]` → `Array<double>` not `Array<int>`)
- Generic type arguments
- Return types of methods
- Smart pointer types for ownership

**Result**: Ensures C++ code maintains JavaScript's numeric semantics (all numbers are IEEE 754 doubles).

## Benefits

1. **Early GC Bug Detection**: Catch GC mode issues during basic feature development
2. **Regression Prevention**: Ensure GC mode doesn't break when adding features
3. **Confidence**: Know that GC mode maintains JavaScript semantics across all features
4. **Documentation**: Triple-mode tests serve as examples of equivalent code

## Next Steps

1. ✅ **Fix console.log boolean formatting** - Done (both modes)
2. ✅ **Fix TypeChecker integration** - Done (triple-mode-helpers.ts)  
3. ✅ **Convert primitives.test.ts** - Done (10 tests passing)
4. ✅ **Convert arrays.test.ts** - Done (16 tests passing)
5. **Convert functions.test.ts** - Next target
6. **Convert classes.test.ts** (partial) - Simple classes only
7. **Document patterns** for common test scenarios
8. **Create PR template** requiring triple-mode tests for new features

## Implementation Priority

**High Priority** (simple, high value):
- [x] Boolean console.log formatting fix ✅
- [x] primitives.test.ts conversion ✅ (10 tests)
- [x] arrays.test.ts conversion ✅ (16 tests)
- [x] classes.test.ts conversion ✅ (6 tests - basic OOP)
- [x] control-flow.test.ts conversion ✅ (17 tests - conditionals, loops, logic)
- [x] strings.test.ts conversion ✅ (15 tests - string operations)
- [x] operators.test.ts conversion ✅ (30 tests - all operators)
- [x] numbers.test.ts conversion ✅ (23 tests - number operations)
- [x] booleans.test.ts conversion ✅ (27 tests - boolean operations)
- [x] maps.test.ts conversion ✅ (20 tests - Map with iteration support)
- [x] sets.test.ts conversion ✅ (17 tests - Set with iteration support)
- [ ] js-cpp-semantics.test.ts conversion

**Medium Priority**:
- [ ] array-bounds.test.ts
- [ ] functions.test.ts

**Low Priority** (complex, ownership-specific):
- [ ] ownership-types.test.ts (keep ownership-only)
- [ ] super-calls.test.ts (complex inheritance)

## Success Criteria

✅ Triple-mode helpers working  
✅ Example test demonstrating pattern (primitives-triple-mode.test.ts)  
✅ Boolean formatting fixed (gs_console.hpp, gs_gc_runtime.hpp)  
✅ TypeChecker integration fixed (triple-mode-helpers.ts)  
✅ Array tests converted and passing (arrays-triple-mode.test.ts - 16 tests)  
✅ Classes tests converted and passing (classes-triple-mode.test.ts - 6 tests)
✅ Control flow tests converted and passing (control-flow-triple-mode.test.ts - 17 tests)
✅ Strings tests converted and passing (strings-triple-mode.test.ts - 15 tests)
✅ Operators tests converted and passing (operators-triple-mode.test.ts - 30 tests)
✅ Numbers tests converted and passing (numbers-triple-mode.test.ts - 23 tests)
✅ Booleans tests converted and passing (booleans-triple-mode.test.ts - 27 tests)
✅ Maps tests converted and passing (maps-basic-triple-mode.test.ts - 20 tests)
✅ Sets tests converted and passing (sets-basic-triple-mode.test.ts - 17 tests)
✅ 181 basic tests converted (10+16+6+17+15+30+23+27+20+17)
⏳ 200+ basic tests converted  
⏳ 50%+ of suitable basic tests converted

**Collections Fully Tested** (Dec 2, 2025):
- ✅ Map: set, get, has, delete, clear, size, keys(), values()
  - Fixed map.get() pointer dereferencing in console.log
  - Fixed Map.size() to exclude tombstones  
  - Added type inference for map.keys() and map.values()
  - Implemented Array.from() handling as no-op in C++
- ✅ Set: add, has, delete, clear, size, values()
  - Added Set::values() to GC runtime
  - Added Array::includes() for order-independent testing
  - Type inference for set.values()

**Codegen Gaps Identified** (for future work):
- Method chaining (`return this`) requires `shared_from_this()` in ownership mode
- Function hoisting requires forward declarations in C++
- Property access (`.length`) vs method calls (`.length()`) inconsistency
- Missing string methods: `slice`, `replace`, `startsWith`, `endsWith`

---

**Note**: This is a gradual improvement process. Each test converted adds value incrementally. Focus on tests that exercise GC mode runtime library features most heavily.
