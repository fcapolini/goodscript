# GoodScript Standard Library

Production-quality libraries for GoodScript, primarily translated from Dart's proven packages.

## Packages

### [@goodscript/collection](./collection/)

Data structures and algorithms translated from Dart's collection package.

**Included:**
- **HeapPriorityQueue** - Min-heap priority queue  
- **QueueList** - Double-ended queue with random access

**Status:** 2 libraries complete, ~25 more planned

### @goodscript/core (planned)
Core utilities

### @goodscript/async (planned)
Async utilities

### @goodscript/io (planned)
I/O libraries

## Testing

Run triple-mode tests for a library:

```bash
# Test collection package in all three modes
npm run test:triple -- ./collection

# Or from the library directory
cd collection
npm run test:triple
```

This will:
1. Run vitest tests in TypeScript/Node.js
2. Compile to C++ (GC mode) and run native executable
3. Compile to C++ (Ownership mode) and run native executable
4. Verify all three produce identical output

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

3. **Run triple-mode validation:**
   ```bash
   npm run test:triple
   ```

4. **Verify all modes pass:**
   - ✅ TypeScript execution
   - ✅ GC native compilation + execution
   - ✅ Ownership native compilation + execution
   - ✅ All outputs match

### Quality Gates

A library is considered "complete" when:

- [ ] All Dart functionality translated
- [ ] TypeScript tests pass (vitest)
- [ ] GoodScript Phase 1+2 validation passes
- [ ] GC mode compiles with g++/clang++
- [ ] Ownership mode compiles with g++/clang++
- [ ] All three modes produce identical output
- [ ] Performance within 2x of Node.js/Dart
- [ ] No memory leaks (valgrind clean)
- [ ] Documentation complete

## Architecture

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
