# Concrete Examples

This directory contains complete, real-world GoodScript programs used for testing end-to-end compilation and runtime equivalence between TypeScript and C++ targets.

## Structure

Each example should follow this structure:

```
example-name/
  src/
    main.gs.ts    # Entry point (must be .gs.ts extension)
  tsconfig.json   # TypeScript configuration
  .gitignore      # Ignore dist/ directory
  dist/           # Generated outputs (git-ignored)
    main.js       # Compiled JavaScript
    main.cpp      # Compiled C++ source
    example-name  # Compiled C++ binary (executable)
```

## Building Examples Locally

To build an example's dist directory for inspection:

```bash
cd example-name
npx gsc src/main.gs.ts --out-dir dist
```

To compile the C++ binary:

```bash
cd example-name/dist
gcc main.cpp -o example-name
./example-name  # Run the binary
```

Note: The `dist/` directory is git-ignored since it contains generated code and binaries.

## How Tests Work

The `concrete-examples.test.ts` file:

1. **Discovers** all directories in this folder automatically
2. **Compiles** each `src/main.gs.ts` to both JavaScript and C++ (output to `example-name/dist/`)
3. **Compiles** the C++ source to a native binary (saved in dist/)
4. **Executes** both JavaScript (via Node.js) and C++ (native binary) versions
5. **Compares** the runtime outputs for equivalence

All generated files (JS, C++ source, and compiled binaries) are preserved in each example's `dist/` directory for inspection.

## Adding New Examples

To add a new example:

1. Create a new directory: `mkdir -p my-example/src`
2. Add your GoodScript code: `my-example/src/main.gs.ts`
3. Run tests: `npm test -- test/phase3/concrete-examples.test.ts`

The test suite will automatically discover and test your new example.

## Current Examples

### array-methods

Advanced array operations demonstrating:
- Array.map() for transformations
- Array.filter() for filtering elements
- Array.reduce() for aggregation
- Array.find() and Array.findIndex()
- Array.some() and Array.every() predicates
- Array.sort() with custom comparators
- Method chaining and composition
- Higher-order functions with Person class

**Status**: 🆕 New example - not yet tested

### binary-search-tree

Binary search tree implementation demonstrating:
- Recursive data structures with Pool Pattern
- share<TreeNode>[] for node storage
- Index-based tree linking (left/right children)
- Recursive algorithms (insert, search, min/max, height)
- Three traversal orders (inorder, preorder, postorder)
- Null-safe operations on empty tree
- Complex recursive patterns

**Status**: 🆕 New example - not yet tested

### cli-args

Command-line argument parser demonstrating:
- Classes with constructors and methods
- HashMap/Map usage for key-value storage
- String methods (startsWith, substring, indexOf)
- Option<T> return types and null safety
- Method signatures with owned vs borrowed parameters

**Status**: ✅ Full JavaScript and C++ equivalence

### error-handling

Exception handling demonstrating:
- Error class and custom error types (ValidationError)
- try-catch-finally blocks
- Error propagation and re-throwing
- Resource cleanup with finally
- Nested try-catch blocks
- Multiple error types with error codes
- instanceof checks for error types

**Status**: 🆕 New example - not yet tested

### fibonacci

Fibonacci calculator (recursive and iterative) demonstrating:
- Arrow functions (no function declarations in GoodScript)
- Simple recursion
- Number arithmetic
- For loops and control flow
- Explicit boolean comparisons (no truthy/falsy)

**Status**: ✅ Full JavaScript and C++ equivalence

### generic-stack

Generic/template class demonstrating:
- Generic class Stack<T> with type parameters
- Generic methods (push, pop, peek)
- Type-safe operations for different types
- Nullable return types (T | null)
- Generic functions (reverseArray<T>)
- Balanced parentheses checker using stack
- Multiple type instantiations (Stack<number>, Stack<string>)

**Status**: 🆕 New example - not yet tested

### hash-map

Word frequency counter demonstrating:
- Map<K, V> usage and iteration
- for-of loops with Map entries
- Tuple types [string, number]
- Bubble sort algorithm
- String manipulation (split, toLowerCase)

**Status**: ✅ JavaScript works, ⚠️ Known C++ codegen issues:
- Map.get() returns `std::optional<V>` but arithmetic doesn't unwrap it
- for-of with Map entries doesn't generate proper `[key, value]` destructuring
- Tuple return types need proper `std::tuple` or `std::pair` mapping

### interface-shapes

Interfaces and polymorphism demonstrating:
- Interface definitions (Shape, Drawable, Comparable)
- Classes implementing multiple interfaces
- Polymorphism through interface types
- instanceof type checking
- Interface-typed arrays and parameters
- Geometric calculations (area, perimeter)
- Multiple implementations (Rectangle, Circle, Triangle)

**Status**: 🆕 New example - not yet tested

### json-parser

Complete JSON tokenizer and parser demonstrating:
- Complex state management (position tracking, token buffering)
- Character-by-character string parsing
- Ownership types (`own<T>` for tokenizer and input strings)
- Nullable return types (`string | null`, `JsonValue | null`)
- Static factory methods
- Map<K,V> and Array manipulation
- Union type pattern (JsonValue with multiple internal representations)

**Status**: ✅ Full JavaScript and C++ equivalence

### linked-list

Doubly-linked list demonstrating:
- Pool Pattern for managing cyclic data structures
- share<Node>[] for shared ownership of nodes
- Index-based linking (avoids ownership cycles)
- Bidirectional traversal
- Array operations (push, length)

**Status**: ✅ JavaScript works, ⚠️ Minor C++ issue

### lru-cache

LRU (Least Recently Used) cache demonstrating:
- Pool Pattern with shared ownership (`share<T>`)
- HashMap and doubly-linked list combination
- Index-based node linking
- Cache eviction logic
- Multiple data structure coordination

**Status**: ✅ Full JavaScript and C++ equivalence

### n-queens

Classic N-Queens solver demonstrating:
- Closures with mutable captures
- Array element access and assignment
- Recursive algorithms
- Control flow (while, for, if)
- String interpolation

**Status**: ✅ Full JavaScript and C++ equivalence

### string-pool

String interning/deduplication demonstrating:
- share<string> for heap-allocated shared strings
- Map with `share<T>` values
- Reference counting and deduplication
- String pool pattern

**Status**: ✅ JavaScript works, ⚠️ Known C++ codegen issues:
- share<string> should map to `gs::shared_ptr<std::string>` with proper construction
- Map.get() optional handling needs unwrapping
- String literal wrapping when assigned to share<string>

## Test Statistics

- **Total Examples**: 13
- **Original Examples**: 8 (cli-args, fibonacci, hash-map, json-parser, linked-list, lru-cache, n-queens, string-pool)
- **New Examples**: 5 (array-methods, binary-search-tree, error-handling, generic-stack, interface-shapes)
- **Full Equivalence**: 5 (cli-args, fibonacci, json-parser, lru-cache, n-queens)
- **JS Only**: 3 (hash-map, linked-list, string-pool - document known C++ codegen bugs)
- **To Be Tested**: 5 (new examples awaiting first test run)

## Notes

- All examples must use the `.gs.ts` extension
- The entry point must be named `main.gs.ts`
- Examples should produce console output for validation
- Examples with known C++ issues serve as test cases for future codegen improvements
- Compiled binaries are generated in each example's `dist/` directory
