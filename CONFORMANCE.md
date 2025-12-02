# GoodScript Conformance Testing

This directory contains TC39 Test262 conformance tests for GoodScript.

## Quick Start

```bash
# Initialize test262 submodule
git submodule add https://github.com/tc39/test262.git conformance/test262

# Install dependencies
cd conformance
npm install

# Build
npm run build

# Run tests
npm test
```

## What This Tests

- **Language Semantics**: GoodScript's TypeScript subset behaves like JavaScript
- **Type System**: Type checking and compilation correctness
- **Runtime Equivalence**: JS and C++ GC mode outputs match

**Note**: Uses GC mode (`-DGS_GC_MODE`) for C++ compilation to provide simpler memory management closer to JavaScript's garbage collection semantics.

See [conformance/README.md](conformance/README.md) for detailed documentation.

## Structure

- `src/harness/` - Test262 test runner and adapter
- `src/suites/` - Organized test suites (basics, collections, async, classes, ownership)
- `src/utils/` - Compiler wrapper and output comparator
- `test262/` - Git submodule with TC39 tests (not committed)

## Adding the Submodule

From the repository root:

```bash
git submodule add https://github.com/tc39/test262.git conformance/test262
git submodule update --init --recursive
```

## CI Integration

Add to `.github/workflows/test.yml`:

```yaml
- name: Test Conformance
  run: |
    cd conformance
    npm ci
    npm run update-test262
    npm test
```

Target: 95%+ pass rate for GoodScript-supported features.
