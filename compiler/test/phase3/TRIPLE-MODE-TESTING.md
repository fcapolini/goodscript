# Extending Triple-Mode Testing to Phase 3 Tests

## Overview

Currently, only the 15 concrete examples have comprehensive triple-mode testing (JavaScript + Ownership C++ + GC C++). The basic Phase 3 tests (141 tests in 16 files) only verify code generation, not runtime equivalence.

This document outlines how to extend triple-mode testing to all Phase 3 tests.

## Current Status

**Test Breakdown** (1025 total tests):
- **Phase 1** (Validator): 315 tests - mode-independent
- **Phase 2** (Ownership Analysis): 237 tests - ownership-mode specific  
- **Phase 3** (C++ Codegen): 394 tests
  - **Basic tests**: 141 tests - code generation only, no execution
  - **Runtime tests**: 67 tests - ownership mode execution only
  - **Concrete Examples**: 186 tests - **full triple-mode testing** ✅

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

### 1. Boolean Output Formatting

**Issue**: JavaScript outputs `true`/`false`, C++ outputs `1`/`0`

```typescript
// JavaScript
console.log(true);  // "true"

// C++ (both modes)
gs::console::log(true);  // "1"
```

**Workaround**: Use string conversion:
```typescript
console.log(String(myBool));  // "true" in all modes
```

**Long-term Fix**: Update `gs::console::log()` to handle bool specially:
```cpp
namespace console {
  inline void log(bool value) {
    std::cout << (value ? "true" : "false") << std::endl;
  }
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

**Current**: 186/1025 tests (18%) are triple-mode  
**After Phase 1**: ~300/1025 tests (29%) triple-mode  
**After Full Migration**: ~600/1025 tests (58%) triple-mode  

(Phase 1 and Phase 2 tests remain mode-independent/ownership-specific)

## Benefits

1. **Early GC Bug Detection**: Catch GC mode issues during basic feature development
2. **Regression Prevention**: Ensure GC mode doesn't break when adding features
3. **Confidence**: Know that GC mode maintains JavaScript semantics across all features
4. **Documentation**: Triple-mode tests serve as examples of equivalent code

## Next Steps

1. **Fix console.log boolean formatting** (5 min fix in runtime headers)
2. **Convert primitives.test.ts** to demonstrate pattern
3. **Convert 3-5 more basic tests** as examples
4. **Document patterns** for common test scenarios
5. **Create PR template** requiring triple-mode tests for new features

## Implementation Priority

**High Priority** (simple, high value):
- [ ] Boolean console.log formatting fix
- [ ] primitives.test.ts conversion
- [ ] js-cpp-semantics.test.ts conversion

**Medium Priority**:
- [ ] classes.test.ts (partial - simple classes)
- [ ] array-bounds.test.ts
- [ ] array-resize.test.ts

**Low Priority** (complex, ownership-specific):
- [ ] ownership-types.test.ts (keep ownership-only)
- [ ] super-calls.test.ts (complex inheritance)

## Success Criteria

✅ Triple-mode helpers working  
✅ Example test demonstrating pattern  
🔄 Boolean formatting fixed  
🔄 At least 3 basic tests converted  
🔄 Documentation complete  
⏳ 50%+ of suitable basic tests converted

---

**Note**: This is a gradual improvement process. Each test converted adds value incrementally. Focus on tests that exercise GC mode runtime library features most heavily.
