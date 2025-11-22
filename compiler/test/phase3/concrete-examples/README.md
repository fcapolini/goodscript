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

### cli-args

Command-line argument parser demonstrating:
- Classes with constructors and methods
- HashMap/Map usage for key-value storage
- String methods (startsWith, substring, indexOf)
- Mutable methods requiring `&mut self`
- Option<T> return types and null safety
- Option<String> in template literals with automatic unwrapping
- Method signatures with owned vs borrowed parameters

**Output**:
```
Verbose mode enabled
Total positional args: 2
Output file: output.txt
Format: json
Input file: input.txt
```

### n-queens

Classic N-Queens solver demonstrating:
- Closures with mutable captures
- Array element access and assignment
- Vec<T> manipulation
- Recursive algorithms
- Control flow (while, for, if)
- String interpolation
- Console output

**Output**:
```
• • c •
a • • •
• • • d
• b • •
```

### json-parser

Complete JSON tokenizer and parser demonstrating:
- Enums with multiple variants (TokenType)
- Recursive descent parsing
- Complex state management (position tracking, token buffering)
- Character-by-character string parsing
- Ownership types (`Unique<T>` for tokenizer and input strings)
- Nullable return types (`string | null`, `JsonValue | null`)
- Static factory methods
- Map<K,V> and Array manipulation
- String methods (charAt, substring, comparisons)
- Complex control flow (nested while loops, if-else chains)
- Union type pattern (JsonValue with multiple internal representations)
- Method mutability detection (conservative `&mut self`)
- Option<T> unwrapping after null checks

**Output**:
```
Parsed JSON kind: object
```

## Notes

- All examples must use the `.gs.ts` extension
- The entry point must be named `main.gs.ts`
- Examples should produce console output for validation
- ✅ Both examples now produce **identical output** in JavaScript and C++
- Compiled binaries are ~500KB (unoptimized debug builds)
