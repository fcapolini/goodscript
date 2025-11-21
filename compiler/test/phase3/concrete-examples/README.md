# Concrete Examples

This directory contains complete, real-world GoodScript programs used for testing end-to-end compilation and runtime equivalence between TypeScript and Rust targets.

## Structure

Each example should follow this structure:

```
example-name/
  src/
    main.gs.ts    # Entry point (must be .gs.ts extension)
```

## How Tests Work

The `concrete-examples.test.ts` file:

1. **Discovers** all directories in this folder automatically
2. **Compiles** each `src/main.gs.ts` to both JavaScript and Rust
3. **Executes** both versions
4. **Compares** the runtime outputs for equivalence

## Adding New Examples

To add a new example:

1. Create a new directory: `mkdir -p my-example/src`
2. Add your GoodScript code: `my-example/src/main.gs.ts`
3. Run tests: `npm test -- test/phase3/concrete-examples.test.ts`

The test suite will automatically discover and test your new example.

## Current Examples

### n-queens

Classic N-Queens solver demonstrating:
- Recursive algorithms
- Array manipulation
- Closures
- Control flow (while, for, if)
- String interpolation
- Console output

## Notes

- All examples must use the `.gs.ts` extension
- The entry point must be named `main.gs.ts`
- Examples should produce console output for validation
- Rust equivalence is a work in progress for complex features
