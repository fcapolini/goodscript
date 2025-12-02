# TypeScript Compiler Conformance Tests

## Overview

A second conformance test suite based on TypeScript's own tests (`tests/cases/conformance`), complementing the Test262 ECMAScript conformance tests.

## Rationale

### Why TSC Tests Are Better Aligned with GoodScript

1. **TypeScript-Native**
   - Tests written for TypeScript's type system
   - No undeclared variables or dynamic JavaScript features
   - Strict compilation expected (aligns with GoodScript philosophy)

2. **Type System Coverage**
   - Tests type inference, generics, unions, intersections
   - Validates ownership annotation handling
   - Tests structural typing and compatibility

3. **"Good Parts" Compatible**
   - TypeScript already enforces many restrictions GoodScript has
   - No `var`, no type coercion, strict equality
   - Modern JavaScript features (let/const, classes, arrow functions)

4. **Established Baselines**
   - Known-good JavaScript output (`.js` files)
   - Expected errors (`.errors.txt` files)
   - Type information (`.types` and `.symbols` files)

5. **Comprehensive Coverage**
   - 5,688 conformance tests across categories
   - Classes, interfaces, enums, modules, namespaces
   - Async/await, generators, decorators
   - Control flow analysis, narrowing, type guards

### Complementary to Test262

| Aspect | Test262 | TSC Tests |
|--------|---------|-----------|
| **Focus** | ECMAScript runtime | TypeScript type system |
| **Language** | JavaScript | TypeScript |
| **Tests** | 50,000+ | 5,688 |
| **Undeclared vars** | Common | Compile errors |
| **Type checking** | Runtime only | Compile-time |
| **GoodScript fit** | Moderate | Excellent |

## Test Structure

### TypeScript Test Format

```
tests/cases/conformance/
├── classes/
│   ├── classExpression.ts          # Test input
│   └── ...
└── ...

tests/baselines/reference/
├── classExpression.js               # Expected JS output
├── classExpression.symbols          # Symbol information
├── classExpression.types            # Type information
├── classExpression.errors.txt       # Expected errors (if any)
└── ...
```

### Test Categories

High-value categories for GoodScript:

**Core Language Features:**
- `classes/` - Class declarations, inheritance, members (27 tests)
- `controlFlow/` - If/else, loops, switch, type narrowing (59 tests)
- `es6/` - Modern syntax: destructuring, spread, templates (30 tests)
- `async/` - Async/await, promises (6 tests)

**Type System:**
- `types/` - Primitive types, unions, intersections
- `interfaces/` - Interface declarations and implementation
- `generics/` - Generic functions and classes

**Less Priority (GoodScript restrictions):**
- `enums/` - Not a focus initially
- `decorators/` - Future feature
- `dynamicImport/` - Module system (Phase 4)
- `esDecorators/` - Stage 3 decorators

## Implementation Plan

### Phase 1: Infrastructure (Week 1)

Create new subproject `conformance-tsc/`:

```
conformance-tsc/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── README.md
├── src/
│   ├── harness/
│   │   ├── runner.ts          # Execute TSC tests
│   │   ├── parser.ts          # Parse .ts and baseline files
│   │   ├── comparator.ts      # Compare outputs
│   │   └── filters.ts         # Feature filtering
│   ├── suites/
│   │   ├── classes.test.ts    # Class tests
│   │   ├── controlFlow.test.ts
│   │   └── ...
│   └── utils/
│       └── tsc-baseline.ts    # Baseline file utilities
└── typescript/                # Git submodule
    └── tests/
        ├── cases/conformance/
        └── baselines/reference/
```

### Phase 2: Core Categories (Week 2)

Target high-value, GoodScript-compatible categories:

1. **Classes** (27 tests)
   - Class expressions, declarations
   - Inheritance, super calls
   - Member visibility (public/private/protected)

2. **Control Flow** (59 tests)
   - Type narrowing with if/else
   - Switch statements with discriminated unions
   - Loop control flow

3. **ES6 Features** (30 tests)
   - Destructuring (arrays, objects)
   - Spread/rest operators
   - Template literals

### Phase 3: Type System (Week 3)

1. **Interfaces**
   - Interface declarations
   - Extends and implements
   - Index signatures

2. **Generics**
   - Generic functions
   - Generic classes
   - Constraints and defaults

3. **Union/Intersection Types**
   - Type unions
   - Type intersections
   - Discriminated unions

### Phase 4: Validation & Refinement

- Compare against Test262 results
- Identify GoodScript-specific issues
- Refine filters for unsupported features
- Document compatibility matrix

## Test Execution Model

### Validation Strategy

For each test file:

```typescript
1. Parse test.ts source
2. Check if test should run (filters)
3. Compile with GoodScript:
   - Phase 1: Validate (with permissive mode)
   - Phase 2: Ownership analysis (skip for GC mode)
   - Phase 3: Generate C++
4. Compare outputs:
   - JS output vs baseline .js file
   - C++ execution vs JS execution
5. Check errors:
   - If .errors.txt exists, expect compilation errors
   - Otherwise, expect success
```

### Filtering Strategy

Skip tests using unsupported features:

```typescript
- `var` keyword (GS105)
- `== / !=` operators (GS106)
- `eval` / `with` (GS101/GS102)
- Decorators (future feature)
- Dynamic imports (Phase 4)
- `any` type (GoodScript restriction)
- Prototype manipulation
- `arguments` object
```

### Success Criteria

A test passes if:

1. **Compilation succeeds** (when no `.errors.txt` baseline)
2. **JS output matches baseline** (semantically equivalent)
3. **C++ output matches JS output** (dual-mode validation)
4. **Errors match baseline** (when `.errors.txt` exists)

## Expected Benefits

### For GoodScript Development

1. **Type System Validation**
   - Ensures TypeScript compatibility
   - Validates ownership annotation handling
   - Tests type inference and generics

2. **Regression Testing**
   - Large, established test suite
   - Prevents breaking TypeScript compatibility
   - Validates C++ codegen correctness

3. **Better Coverage**
   - TypeScript-specific features
   - Type-level constructs
   - More realistic code patterns

### For Documentation

1. **Compatibility Matrix**
   - Clear list of supported TypeScript features
   - Known limitations and workarounds
   - Migration guide from TypeScript

2. **Example Code**
   - Real TypeScript patterns that work
   - Idiomatic GoodScript usage
   - Best practices

## Integration with Test262

Both test suites serve different purposes:

**Test262**: Validates ECMAScript runtime semantics
- Focus: Does the compiled C++ behave like JavaScript?
- Tests: Runtime behavior, operators, built-ins
- Value: Ensures language spec compliance

**TSC Tests**: Validates TypeScript compilation
- Focus: Does GoodScript compile TypeScript correctly?
- Tests: Type system, syntax, compilation
- Value: Ensures TypeScript compatibility

**Together**: Complete validation of GoodScript's dual goals
- TypeScript source compatibility
- JavaScript/C++ runtime equivalence

## Metrics & Goals

### Initial Targets (End of Phase 2)

- **Classes**: 75% pass rate (≥20/27 tests)
- **Control Flow**: 60% pass rate (≥35/59 tests)
- **ES6**: 70% pass rate (≥21/30 tests)
- **Overall**: 65% pass rate (≥76/116 tests)

### Long-term Goals (6 months)

- **Core categories**: 90%+ pass rate
- **Type system**: 80%+ pass rate
- **Total coverage**: 1000+ tests, 85%+ pass rate

## Resources Required

### Development Time
- Phase 1 (Infrastructure): 2-3 days
- Phase 2 (Core categories): 3-4 days
- Phase 3 (Type system): 3-4 days
- Phase 4 (Refinement): 2-3 days
- **Total**: 10-14 days

### Dependencies
- TypeScript repo as git submodule
- Same runtime dependencies as Test262 conformance
- Additional: TypeScript compiler API for baseline comparison

## Next Steps

1. **Decision**: Approve TSC conformance test suite addition
2. **Setup**: Create `conformance-tsc/` subproject structure
3. **Submodule**: Add TypeScript repo as git submodule
4. **Harness**: Implement test runner and comparator
5. **Pilot**: Run classes category, measure pass rate
6. **Iterate**: Refine filters and fix issues
7. **Expand**: Add more categories progressively

## References

- TypeScript Repo: https://github.com/microsoft/TypeScript
- Test Structure: `tests/cases/conformance/`
- Baselines: `tests/baselines/reference/`
- TypeScript Handbook: https://www.typescriptlang.org/docs/handbook/
