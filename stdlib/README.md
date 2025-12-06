# GoodScript Standard Library

Production-quality libraries for GoodScript, primarily translated from Dart's proven packages.

## Packages

### [@goodscript/collection](./collection/)

Data structures and algorithms translated from Dart's collection package.

**Included:**
- **HeapPriorityQueue** - Min-heap priority queue  
- **QueueList** - Double-ended queue with random access
- **ListQueue** - Circular buffer queue implementation
- **EqualityMap** - Hash map with custom equality
- **EqualitySet** - Hash set with custom equality
- **UnmodifiableListView** - Read-only list wrapper
- **Algorithms** - Sorting and searching utilities (binarySearch, mergeSort, insertionSort, etc.)
- **Collection Utils** - Higher-order collection functions (groupBy, minBy, maxBy, mergeMaps, lastBy)

**Status:** ✅ 8 libraries complete (246 tests, 100% pass rate), ~17 more planned

### @goodscript/core (planned)
Core utilities

### @goodscript/async (planned)
Async utilities

### @goodscript/io (planned)
I/O libraries

## Testing

### TypeScript Tests

Run tests for TypeScript/Node.js mode:

```bash
# From the package directory
cd collection
npm test

# Or run all tests from stdlib root
npm test -ws
```

### GoodScript Validation

Validate a library with GoodScript compiler (Phase 1+2+3):

```bash
# From stdlib directory
node quick-test.js collection/src/heap-priority-queue-gs.ts
```

This validates:
1. ✅ Phase 1+2: TypeScript restrictions + ownership analysis
2. ✅ Phase 3: C++ code generation
3. ✅ Native compilation with Zig C++ compiler
4. ✅ Native execution and output verification

### Triple-Mode Testing (Planned)

Full triple-mode validation will verify:
1. TypeScript/Node.js execution
2. C++ GC mode compilation and execution
3. C++ ownership mode compilation and execution
4. Output equivalence across all three modes

*Currently, we validate TypeScript + GoodScript separately.*

## Development Workflow

### Adding a New Library

1. **Translate from Dart:**
   ```bash
   # Find Dart source
   # Use AI to translate to GoodScript
   # Save as src/library-name.gs.ts
   ```

2. **Port tests:**
   ```typescript
   // test/library-name.test.ts
   import { describe, it, expect } from 'vitest';
   // Port Dart tests to TypeScript
   ```

3. **Run TypeScript tests:**
   ```bash
   npm test
   ```

4. **Validate with GoodScript:**
   ```bash
   cd ..
   node quick-test.js collection/src/library-name-gs.ts
   ```

5. **Verify all validations pass:**
   - ✅ TypeScript tests pass (vitest)
   - ✅ GoodScript Phase 1+2 validation passes
   - ✅ C++ code generation succeeds
   - ✅ C++ compilation succeeds
   - ✅ Native execution succeeds

### Quality Gates

A library is considered "complete" when:

- [x] All Dart functionality translated
- [x] TypeScript tests pass (vitest)
- [x] GoodScript Phase 1+2 validation passes
- [x] C++ code generation succeeds
- [x] C++ compilation and execution succeeds

**Current Status (Dec 6, 2024):**
- ✅ 6/6 libraries: All quality gates passed
- ✅ 163 TypeScript tests passing (100%)
- ✅ 6/6 libraries: GoodScript validation passing
- ✅ 6/6 libraries: C++ code generation successful  
- ✅ 6/6 libraries: C++ compilation successful (Zig compiler)
- ✅ 6/6 libraries: Native execution successful
- ✅ 0 compiler regressions (1301/1301 tests passing)

**Validated Libraries:**
| Library | Lines | Tests | TS Tests | GoodScript | C++ Codegen | C++ Compile | C++ Execute |
|---------|-------|-------|----------|------------|-------------|-------------|-------------|
| HeapPriorityQueue | 273 | 19 | ✅ | ✅ | ✅ | ✅ | ✅ |
| QueueList | 358 | 29 | ✅ | ✅ | ✅ | ✅ | ✅ |
| ListQueue | 207 | 29 | ✅ | ✅ | ✅ | ✅ | ✅ |
| EqualityMap | 242 | 24 | ✅ | ✅ | ✅ | ✅ | ✅ |
| EqualitySet | 251 | 26 | ✅ | ✅ | ✅ | ✅ | ✅ |
| UnmodifiableListView | 153 | 36 | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Total** | **1,484** | **163** | **100%** | **6/6** | **6/6** | **6/6** | **6/6** |

## Recent Updates

**Dec 6, 2024 - Union Type Codegen Fixes** 🎉
- Fixed union type handling in C++ code generation
- `(E | null)[]` now generates `std::optional<E>` correctly
- All 6 libraries now compile to C++ successfully
- See: [notes/SESSION-20241206-UNION-TYPE-CODEGEN-FIXES.md](../notes/SESSION-20241206-UNION-TYPE-CODEGEN-FIXES.md)

**Dec 5, 2024 - Initial Libraries**
- Translated 6 production-quality libraries from Dart
- 163 TypeScript tests, all passing
- Proven translation workflow established
- See: [docs/TRANSLATION-WORKFLOW.md](./docs/TRANSLATION-WORKFLOW.md)

## Architecture

```
stdlib/
├── collection/                    # @goodscript/collection package
│   ├── src/
│   │   ├── heap-priority-queue-gs.ts
│   │   ├── queue-list-gs.ts
│   │   ├── list-queue-gs.ts
│   │   ├── equality-map-gs.ts
│   │   ├── equality-set-gs.ts
│   │   ├── unmodifiable-list-view-gs.ts
│   │   └── .gs-output/            # Generated C++ code
│   ├── test/
│   │   ├── heap-priority-queue.test.ts
│   │   └── ...                    # TypeScript tests
│   ├── dist/                      # Compiled TypeScript
│   ├── package.json
│   └── vitest.config.ts
├── core/                          # Planned
├── async/                         # Planned  
├── io/                            # Planned
├── docs/
│   ├── TRANSLATION-WORKFLOW.md    # Step-by-step guide
│   ├── FUTURE-IMPROVEMENTS.md     # Deferred features
│   └── reference/                 # API documentation
├── quick-test.js                  # GoodScript validation script
└── test-runner.ts                 # Triple-mode test runner (WIP)
```

## Translation Guidelines

```
stdlib/
├── collection/           # Collection data structures
│   ├── src/
│   │   ├── priority-queue.gs.ts
│   │   └── index.ts
│   ├── test/
│   │   └── priority-queue.test.ts
│   ├── dist/
│   │   ├── gc-native/       # C++ GC mode output
│   │   └── ownership-native/ # C++ ownership output
│   └── package.json
├── quiver/              # Google's utility library (planned)
├── crypto/              # Cryptography (planned)
├── http/                # HTTP client (planned)
└── test-runner.ts       # Triple-mode test infrastructure
```

## Translation Guidelines

When translating from Dart:

### Type Mappings

```dart
// Dart → GoodScript
int, double, num        → number
String                  → string
bool                    → boolean
List<T>                 → T[]
Map<K,V>                → Map<K,V>
Set<T>                  → Set<T>
String?                 → string | null
Future<T>               → Promise<T>
```

### Syntax Patterns

```dart
// Dart constructor
class Foo {
  final int x;
  Foo(this.x);
}

// GoodScript
class Foo {
  constructor(readonly x: number) {}
}
```

```dart
// Dart private field
class Foo {
  int _value;
}

// GoodScript
class Foo {
  private value: number;
}
```

```dart
// Dart async
Future<String> fetch() async {
  return await getData();
}

// GoodScript
async function fetch(): Promise<string> {
  return await getData();
}
```

## Performance Targets

| Operation | Target vs Node.js | Target vs Dart |
|-----------|------------------|----------------|
| Collections | 1-2x | 1-1.5x |
| Crypto | 1.5-2x | 1-2x |
| I/O | 1.5-2x | 1.5-2x |

GC mode should be competitive with Node.js/Dart.
Ownership mode should be faster (no GC overhead).

## Documentation

- **API Reference**: [docs/reference/](./docs/reference/)
  - [Collection](./docs/reference/collection/) - HeapPriorityQueue, QueueList
- **Translation Workflow**: [docs/TRANSLATION-WORKFLOW.md](./docs/TRANSLATION-WORKFLOW.md)
- **Future Improvements**: [docs/FUTURE-IMPROVEMENTS.md](./docs/FUTURE-IMPROVEMENTS.md)

## License

Each package maintains its original license (typically BSD-3-Clause from Dart).
See individual package LICENSE files.

## Acknowledgments

Translated from Dart's excellent standard library and ecosystem packages:
- `dart:collection` - Dart team
- `package:collection` - Dart team  
- `package:quiver` - Google
- `package:crypto` - Dart team

Thank you to the Dart community for building such high-quality, well-tested libraries! 🙏
