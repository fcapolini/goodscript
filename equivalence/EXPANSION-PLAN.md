# Equivalence Test Expansion Plan

**Goal**: Increase test coverage from 161 tests to 250+ tests by adding missing feature coverage

## Current Coverage (161 tests, 21 suites)
- ✅ Basic: 84 tests (11 suites)
- ✅ Edge Cases: 36 tests (5 suites)
- ✅ Stdlib: 41 tests (5 suites)
- ⏳ Integration: 0 tests (planned)

## Expansion Plan

### Phase 1: Critical Features (High Priority) - 50+ tests
**Impact**: Tests major implemented features that are currently uncovered

#### 1.1 Async/Await (`integration/async-await.test.ts`) - 15 tests
- [ ] Basic async function
- [ ] Async function with await
- [ ] Promise.resolve() and Promise.reject()
- [ ] Multiple awaits in sequence
- [ ] Async arrow functions
- [ ] Error handling with async/await
- [ ] Async function return values
- [ ] Nested async calls
- [ ] Promise chaining
- [ ] Async in class methods
- [ ] Async forEach (if supported)
- [ ] Promise.all() equivalent (if supported)
- [ ] Concurrent async operations
- [ ] Async with try/catch/finally
- [ ] Async recursion

#### 1.2 Union Types (`basic/union-types.test.ts`) - 10 tests
- [ ] T | null basic usage
- [ ] T | undefined basic usage
- [ ] Function returning T | null
- [ ] Variable with union type annotation
- [ ] typeof narrowing for unions
- [ ] Optional chaining with unions
- [ ] Array of union types
- [ ] Map with union value types
- [ ] Union with primitives
- [ ] Union in function parameters

#### 1.3 Object Literals (`basic/object-literals.test.ts`) - 8 tests
- [ ] Simple object literal
- [ ] Nested object literals
- [ ] Object with mixed types
- [ ] Object as function parameter
- [ ] Object as return value
- [ ] Anonymous struct type inference
- [ ] Object with computed properties (if supported)
- [ ] Object spread (if supported)

#### 1.4 Interfaces (`basic/interfaces.test.ts`) - 7 tests
- [ ] Simple interface implementation
- [ ] Interface with methods
- [ ] Multiple interfaces
- [ ] Interface inheritance (if supported)
- [ ] Interface as function parameter
- [ ] Interface as return type
- [ ] Structural typing (duck typing)

#### 1.5 Function Hoisting (`integration/function-hoisting.test.ts`) - 10 tests
- [ ] Simple recursive nested function
- [ ] Fibonacci with nested recursion
- [ ] Factorial hoisting
- [ ] GCD recursive function
- [ ] Mutually recursive nested functions
- [ ] Hoisted function with parameters
- [ ] Non-hoistable (closure dependency)
- [ ] Hoisted vs non-hoisted performance
- [ ] Multiple hoisted functions in scope
- [ ] Conditional recursion

### Phase 2: Edge Cases & Advanced Features - 30+ tests

#### 2.1 Recursion (`integration/recursion.test.ts`) - 12 tests
- [ ] Direct recursion (factorial)
- [ ] Tail recursion
- [ ] Tree recursion (fibonacci)
- [ ] Mutual recursion (even/odd)
- [ ] Recursive array processing
- [ ] Recursive string processing
- [ ] Deep recursion (stack depth)
- [ ] Recursion with accumulator
- [ ] Recursion with multiple parameters
- [ ] Recursive class methods
- [ ] Recursion with lambda
- [ ] Recursion termination conditions

#### 2.2 Nested Control Flow (`edge-cases/nested-control-flow.test.ts`) - 10 tests
- [ ] Nested for loops (2 levels)
- [ ] Nested for loops (3 levels)
- [ ] for inside while
- [ ] for-of inside for
- [ ] Break in nested loop
- [ ] Continue in nested loop
- [ ] Multiple continues/breaks
- [ ] Switch inside loop
- [ ] Try/catch inside loop
- [ ] Nested if-else chains

#### 2.3 Exception Handling Advanced (`edge-cases/exception-advanced.test.ts`) - 8 tests
- [ ] Nested try/catch
- [ ] Multiple catch blocks (if supported)
- [ ] Exception in finally
- [ ] Re-throwing exceptions
- [ ] Exception types (Error objects)
- [ ] Exception in constructor
- [ ] Exception propagation through functions
- [ ] Try/finally without catch

### Phase 3: Standard Library Deep Dive - 25+ tests

#### 3.1 Array Methods Advanced (`stdlib/array-advanced.test.ts`) - 10 tests
- [ ] Method chaining (filter + map)
- [ ] Reduce with complex accumulator
- [ ] FindIndex and find
- [ ] Some and every
- [ ] Sort with comparator
- [ ] Reverse and mutability
- [ ] Slice with negative indices
- [ ] Concat multiple arrays
- [ ] Flat and flatMap (if supported)
- [ ] Array.from() (if supported)

#### 3.2 String Methods Advanced (`stdlib/string-advanced.test.ts`) - 8 tests
- [ ] Replace with regex (if supported)
- [ ] ReplaceAll (if supported)
- [ ] Repeat
- [ ] PadStart/padEnd
- [ ] CharAt and charCodeAt
- [ ] StartsWith/endsWith
- [ ] Match with regex (if supported)
- [ ] Unicode handling

#### 3.3 Number Methods (`stdlib/number-methods.test.ts`) - 7 tests
- [ ] toFixed with various decimals
- [ ] toExponential
- [ ] toPrecision
- [ ] toString with radix
- [ ] Number.isInteger (if supported)
- [ ] Number.isNaN (if supported)
- [ ] Number.parseFloat/parseInt (if supported)

### Phase 4: FileSystem & HTTP (Special Handling) - 15+ tests

#### 4.1 FileSystem Equivalence (`stdlib/filesystem.test.ts`) - 8 tests
**Note**: Use temp files and cleanup to ensure determinism

- [ ] Write and read text file
- [ ] Append to file
- [ ] File exists check
- [ ] Directory creation
- [ ] Directory listing
- [ ] File stats (normalize timestamps)
- [ ] File copy
- [ ] File deletion

#### 4.2 HTTP Mocking (`stdlib/http.test.ts`) - 7 tests
**Note**: Skip actual network calls in equivalence tests, or use localhost test server

- [ ] HTTP structure validation (no actual call)
- [ ] HTTPAsync structure validation
- [ ] Request object creation
- [ ] Response parsing (mock data)
- [ ] Header handling
- [ ] Error handling structure
- [ ] Timeout handling structure

### Phase 5: Lambda & Closure Semantics - 20+ tests

#### 5.1 Lambda Closures (`integration/lambda-closures.test.ts`) - 12 tests
- [ ] Simple closure capture
- [ ] Nested closures
- [ ] Closure with mutation (if mutable)
- [ ] Multiple closures sharing variable
- [ ] Closure in array
- [ ] Closure in class
- [ ] IIFE (immediately invoked)
- [ ] Closure with parameters
- [ ] Closure return value
- [ ] Higher-order functions
- [ ] Currying
- [ ] Partial application

#### 5.2 Lambda Advanced (`integration/lambda-advanced.test.ts`) - 8 tests
- [ ] Lambda in lambda
- [ ] Lambda as callback
- [ ] Lambda with generic return
- [ ] Lambda with array methods
- [ ] Lambda with ownership transfer
- [ ] Lambda with this (class method)
- [ ] Lambda type inference
- [ ] Lambda with destructuring (if supported)

## Implementation Strategy

### Priority Order
1. **Async/Await** (15 tests) - Major feature, zero coverage
2. **Recursion** (12 tests) - Common pattern, important for correctness
3. **Union Types** (10 tests) - Recently added feature
4. **Array Advanced** (10 tests) - High usage, need deeper testing
5. **Lambda Closures** (12 tests) - Complex semantics, critical for C++
6. **Object Literals** (8 tests) - Recently added, needs validation
7. **Nested Control Flow** (10 tests) - Edge cases, optimizer impact
8. **Function Hoisting** (10 tests) - New optimizer feature
9. **Interfaces** (7 tests) - Structural typing validation
10. **Exception Advanced** (8 tests) - Error handling completeness

### Quality Metrics
- **Target**: 250+ total tests (from current 161)
- **Coverage**: All major features have ≥5 equivalence tests
- **Modes**: Each test runs in Node.js, GC C++, Ownership C++
- **Executions**: 250 tests × 3 modes = 750 total executions
- **Runtime**: Keep total suite under 5 minutes

### Test Authoring Guidelines
1. **Deterministic**: No random values, no actual timestamps
2. **Fast**: Each test < 100ms in slowest mode
3. **Clear**: Expected output is obvious and minimal
4. **Isolated**: No dependencies between tests
5. **Comprehensive**: Cover happy path + edge cases
6. **Documented**: Each test has clear name and purpose

## Success Criteria
- ✅ 250+ tests passing in all three modes
- ✅ All implemented features have equivalence coverage
- ✅ Zero mode-specific failures (except documented limitations)
- ✅ Test suite completes in < 5 minutes
- ✅ 95%+ pass rate maintained as new features are added

---

**Next Steps**: Start with Phase 1 (Async/Await, Union Types, Object Literals)
