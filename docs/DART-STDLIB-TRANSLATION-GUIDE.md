# Dart Standard Library Translation Guide

**Audience:** GoodScript stdlib developers, translator implementors

**Purpose:** Practical guide for translating Dart libraries to GoodScript, including strategy, technical approach, and implementation roadmap.

**Decision Date:** December 5, 2024

---

## Executive Summary

**Strategy:** Translate Dart's standard library and ecosystem packages to bootstrap GoodScript's stdlib in **weeks instead of months**.

**Rationale:**
- ✅ Dart has **universal null safety** (since 2.12) → matches GoodScript's type system
- ✅ Dart has **native async/await** → maps 1:1 to GoodScript's C++20 coroutines
- ✅ Dart is **Google-backed** → quality, longevity, maintenance guaranteed
- ✅ Flutter ecosystem → thousands of battle-tested packages
- ✅ **4-6x faster than writing from scratch**

**Timeline:** 1-2 weeks with AI-assisted development (collections, utils, crypto core)

**Traditional approach:** 8-12 weeks  
**AI-assisted approach:** 1-2 weeks (5-10x faster)

---

## Why This Aligns with GoodScript's Philosophy

Every major GoodScript decision follows the same pattern:

### The Pragmatic Pattern

| Decision | Pragmatic Choice | Why | Time Saved |
|----------|-----------------|-----|------------|
| **Compilation target** | C++ (not Rust) | Faster codegen, rich ecosystem, MPS GC exists | 6-12 months |
| **Source language** | TypeScript (not new syntax) | Zero learning curve, existing tooling | 12+ months |
| **Market position** | "Go for TS developers" | Clear target, real pain point | Instant clarity |
| **Standard library** | **Translate Dart** | Null-safe, async-first, battle-tested | **9-18 months** |

**Meta-principle:** Leverage existing, proven work. Focus on unique value (ownership analysis, single-binary deployment).
## Translation Strategy (AI-Assisted)

### The AI Advantage

**Why this can be done in days, not weeks:**

1. **Pattern recognition** - AI can instantly understand Dart→GoodScript patterns
2. **Batch translation** - Translate entire libraries in single session
3. **Automatic test porting** - Convert Dart tests to GoodScript tests
4. **Iterative refinement** - Fix issues in real-time during conversation
5. **No context switching** - Human focuses on validation, AI does mechanical work

**Workflow:**
```
Human: "Translate PriorityQueue from Dart collection package"
AI: [Reads Dart source, applies type mappings, generates GoodScript]
Human: "Compile and test"
AI: [Fixes any compilation/runtime issues]
Result: Working library in 1-2 hours instead of 1-2 days
```

### Phase 1: Core Data Structures (Days 1-3)
## Translation Strategy
**Success criteria:**
- [ ] PriorityQueue, Queue, LinkedList working
- [ ] All ported tests passing
- [ ] Performance validated

**AI-assisted timeline:** 2-3 days (not 4 weeks)

### Phase 2: Utilities & Algorithms (Days 4-5)
- `SplayTreeMap<K,V>` - Sorted map
- `SplayTreeSet<T>` - Sorted set
- `PriorityQueue<T>` (from `collection` package)
- Collection algorithms (binary search, merge, etc.)

**Why start here:**
- ✅ Small, focused scope
- ✅ Pure algorithms (no I/O dependencies)
- ✅ Well-tested, documented
- ✅ Immediate value to users

**Success criteria:**
- [ ] Translator can parse Dart AST
- [ ] Type mapping works (int/double→number, String?→string|null, etc.)
- [ ] Generated GoodScript compiles (passes Phase 1+2 validation)
- [ ] Generated C++ compiles with g++/clang++
**Success criteria:**
- [ ] Quiver utilities working
- [ ] LRU cache showcases Pool Pattern

**AI-assisted timeline:** 1-2 days (not 4 weeks)

### Phase 3: Crypto & Encoding (Days 6-7)
- Collection utilities (multimap, bimap, range)
- Iterables (enumerate, zip, partition)
- Cache (LRU cache - **can use GoodScript Pool Pattern!**)
- Async utilities (FutureGroup, StreamBuffer)
- String utilities

**Why:**
- ✅ Google-maintained (high quality)
- ✅ Practical, frequently-used utilities
- ✅ Mix of sync + async patterns (tests both)
- ✅ Cache example showcases GoodScript ownership

**Success criteria:**
- [ ] Async/await translation works (Future<T>→Promise<T>)
- [ ] Generic constraints handled
- [ ] Extension methods converted to utility functions
- [ ] Cache uses Pool Pattern (ownership showcase)

### Phase 3: Crypto & Encoding (Weeks 9-10)

**Target:** `crypto` package

**Libraries to translate:**
- Hash functions (SHA-1, SHA-256, SHA-512, MD5)
- HMAC (Hash-based Message Authentication Code)
- Digest utilities

**Why:**
- ✅ Essential for any stdlib
- ✅ Pure algorithms (no platform dependencies)
- ✅ Well-defined, testable behavior
- ✅ Security-critical (need battle-tested code)

**Success criteria:**
- [ ] SHA-256, HMAC working
- [ ] Byte-for-byte match with Dart

**AI-assisted timeline:** 1-2 days (not 2 weeks)

### Phase 4: Foundation Complete (Day 8-10)

**Target:** `http` package (subset)

**Libraries to translate:**
- HTTP client (GET, POST, headers, body)
- Request/Response objects
- Basic error handling

**Why:**
- ✅ Most requested feature for practical apps
- ✅ Tests async/await thoroughly
- ✅ Foundation for REST APIs, web scraping, etc.

**Considerations:**
- ⚠️ May need custom C++ implementation (platform-specific I/O)
- ⚠️ Dart uses `dart:io` (native) - might not translate directly
- **Strategy:** Translate API surface, implement with libcurl or C++ HTTP library

**Success criteria:**
- [ ] Basic GET/POST work
- [ ] Async/await pattern preserved
- [ ] Error handling matches expectations
- [ ] Can build simple HTTP client apps

---
## Technical Approach (AI-Assisted Workflow)

### The Pragmatic Approach: Skip the Formal Translator

**Traditional approach:** Build formal Dart→GoodScript translator (2-4 weeks)

**AI-assisted approach:** Human + AI pair-programming (days)

**Why this works:**

1. **AI reads Dart source directly** - No need for formal AST parser
2. **AI applies type mappings instantly** - Pattern matching, not code generation
3. **Human validates output** - Compile, test, iterate
4. **Incremental refinement** - Fix issues as they arise

**Workflow example:**

```
Day 1, Hour 1-2: PriorityQueue
─────────────────────────────
Human: "Here's Dart's PriorityQueue source [paste]. Translate to GoodScript."
AI: [Generates complete GoodScript implementation]
Human: "Compile with goodscript compiler"
AI: [Fixes any validation errors]
Human: "Run tests"
AI: [Fixes any runtime issues]
Result: Working PriorityQueue in 1-2 hours

Day 1, Hour 3-4: Queue
──────────────────────
[Repeat process, faster now that patterns are established]

Day 1, Hour 5-6: LinkedList
────────────────────────────
[Even faster - AI has learned project conventions]
```

**Key insight:** The "translator" is the AI + human feedback loop, not a separate tool to build.

### 1. No Formal Parser Needed

**Instead:**
- Human provides Dart source to AI (copy-paste or file read)
- AI understands Dart syntax natively
- AI applies type mappings in-context
- Human validates compilation + runtime behavior
**Decision point:** Week 1 - evaluate both approaches, pick simpler one.

### 2. Type Mapper

**Core type mappings:**

```typescript
// translator/src/type-mapper.ts
class TypeMapper {
    mapDartType(dartType: DartType): GoodScriptType {
        // Primitives
        if (dartType.name === 'int') return 'number';
        if (dartType.name === 'double') return 'number';
        if (dartType.name === 'num') return 'number';
        if (dartType.name === 'String') return 'string';
        if (dartType.name === 'bool') return 'boolean';
        if (dartType.name === 'void') return 'void';
        
        // Null safety
        if (dartType.isNullable) {
            const baseType = this.mapDartType(dartType.withoutNullability());
            return `${baseType} | null`;
        }
        
        // Collections
        if (dartType.name === 'List') {
            const elementType = this.mapDartType(dartType.typeArguments[0]);
            return `${elementType}[]`;
        }
        if (dartType.name === 'Map') {
            const keyType = this.mapDartType(dartType.typeArguments[0]);
            const valueType = this.mapDartType(dartType.typeArguments[1]);
            return `Map<${keyType}, ${valueType}>`;
        }
        if (dartType.name === 'Set') {
            const elementType = this.mapDartType(dartType.typeArguments[0]);
            return `Set<${elementType}>`;
        }
        
        // Async
        if (dartType.name === 'Future') {
            const resultType = this.mapDartType(dartType.typeArguments[0]);
            return `Promise<${resultType}>`;
        }
        
        // Generic type parameters
        if (dartType.isTypeParameter) {
            return dartType.name; // T, E, K, V, etc.
        }
        
        // User-defined types (classes, interfaces)
        return dartType.name;
    }
}
```

**Edge cases to handle:**
- `dynamic` type (Dart's equivalent of `any`) → reject or map to `unknown`
- Function types: `int Function(String)` → `(arg: string) => number`
- Optional parameters: handled separately in parameter mapping
- Named parameters: convert to options object pattern

### 3. Code Generator

**AST traversal approach:**

```typescript
// translator/src/codegen.ts
class DartToGoodScriptCodegen {
    private typeMapper: TypeMapper;
    private output: string[] = [];
    
    translateClass(dartClass: DartClassDeclaration): void {
        // Class header
        this.emit(`class ${dartClass.name}${this.translateTypeParams(dartClass.typeParameters)} {`);
        
        // Fields
        for (const field of dartClass.fields) {
            const type = this.typeMapper.mapDartType(field.type);
            const modifier = field.isPrivate ? 'private ' : '';
            const readonly = field.isFinal ? 'readonly ' : '';
            const initializer = field.initializer ? ` = ${this.translateExpr(field.initializer)}` : '';
            this.emit(`  ${modifier}${readonly}${field.name}: ${type}${initializer};`);
        }
        
        // Constructor
        if (dartClass.constructor) {
            this.translateConstructor(dartClass.constructor);
        }
        
        // Methods
        for (const method of dartClass.methods) {
            this.translateMethod(method);
        }
        
        this.emit('}');
    }
    
    translateMethod(method: DartMethodDeclaration): void {
        const isAsync = method.isAsync ? 'async ' : '';
        const name = method.name;
        const params = this.translateParameters(method.parameters);
        const returnType = this.translateReturnType(method);
        
        this.emit(`  ${isAsync}${name}(${params}): ${returnType} {`);
        this.translateBlock(method.body);
        this.emit('  }');
    }
    
    translateReturnType(method: DartMethodDeclaration): string {
        let returnType = this.typeMapper.mapDartType(method.returnType);
        
        // Async methods wrap return type in Promise
        if (method.isAsync && !returnType.startsWith('Promise<')) {
            returnType = `Promise<${returnType}>`;
        }
        
        return returnType;
    }
    
    translateParameters(params: DartParameter[]): string {
        return params.map(p => {
            const type = this.typeMapper.mapDartType(p.type);
            const optional = p.isOptional ? '?' : '';
            const defaultValue = p.defaultValue ? ` = ${this.translateExpr(p.defaultValue)}` : '';
            return `${p.name}${optional}: ${type}${defaultValue}`;
        }).join(', ');
    }
}
```

### 4. Special Cases

#### A. Named Parameters → Options Object

**Dart:**
```dart
void greet({required String name, int age = 0}) {
    print('Hello $name, age $age');
}

greet(name: 'Alice', age: 30);
```

**GoodScript:**
```typescript
function greet(options: { name: string, age?: number }): void {
    const { name, age = 0 } = options;
    console.log(`Hello ${name}, age ${age}`);
}

greet({ name: 'Alice', age: 30 });
```

#### B. Extension Methods → Utility Functions

**Dart:**
```dart
extension StringExtension on String {
    String get reversed => split('').reversed.join('');
}

// Usage: "hello".reversed
```

**GoodScript:**
```typescript
// translator/src/extensions.ts
class StringUtils {
    static reversed(s: string): string {
        return s.split('').reverse().join('');
    }
}

// Usage: StringUtils.reversed("hello")
```

#### C. Late Variables → Constructor Initialization

**Dart:**
```dart
class Example {
    late String value;  // Will be initialized later
    
    void initialize() {
        value = "initialized";
    }
}
```

**GoodScript (conservative approach):**
```typescript
class Example {
    private value: string | undefined;  // Explicitly nullable until initialized
    
    initialize(): void {
        this.value = "initialized";
    }
    
    getValue(): string {
        if (this.value === undefined) {
            throw new Error("Value not initialized");
        }
        return this.value;
    }
}
```

**Alternative (trust Dart's analysis):**
```typescript
class Example {
    private value!: string;  // TypeScript's definite assignment assertion
    
    initialize(): void {
        this.value = "initialized";
    }
}
```

**Decision:** Use conservative approach initially, optimize later if needed.

#### D. Async/Await

## AI-Assisted Implementation Roadmap

### Day 1: Core Collections (6-8 hours)

**Morning Session (3-4 hours):**

**Target:** `PriorityQueue<E>` from Dart's `collection` package

**Workflow:**
1. Human: Read Dart source from GitHub, paste to AI
2. AI: Translate to GoodScript (apply type mappings, convert syntax)
3. Human: Create file, compile with GoodScript
4. AI: Fix any Phase 1/2 validation errors
5. Human: Compile to C++, run
6. AI: Fix any runtime issues
7. Human: Port Dart unit tests (paste to AI)
8. AI: Convert to GoodScript test syntax
9. Validate all tests pass

**Expected:** Working, tested PriorityQueue in 3-4 hours

**Afternoon Session (3-4 hours):**

**Targets:** `Queue<T>`, `LinkedList<T>`, basic utilities

**Workflow:** Same pattern, but faster (learned conventions)

**Expected:** 2-3 more data structures

**End of Day 1:**
- [ ] PriorityQueue working
- [ ] Queue working  
- [ ] LinkedList working
- [ ] All tests passing
- [ ] Basic package structure set up

---

### Day 2: Advanced Collections + Utilities (6-8 hours)

**Morning Session (3-4 hours):**

**Targets:** `SplayTreeMap<K,V>`, `SplayTreeSet<T>`

**Workflow:**
1. Human: "Translate SplayTreeMap from Dart collection"
2. AI: [Generates GoodScript implementation]
3. Human: Compile, test, iterate
4. Result: Working sorted map in 2-3 hours

**Afternoon Session (3-4 hours):**

**Target:** Start Quiver utilities (multimap, collection helpers)

**Expected:** 3-5 utility classes/functions

**End of Day 2:**
- [ ] Sorted collections working (SplayTree)
- [ ] Quiver multimap, bimap working
- [ ] Collection algorithms (zip, enumerate, partition)

---

### Day 3: Async Utilities + LRU Cache (6-8 hours)

**Morning Session (3-4 hours):**

**Target:** Quiver async utilities

**Key focus:** Ensure `Future<T>` → `Promise<T>` works end-to-end

**Workflow:**
1. Human: "Translate FutureGroup from Quiver"
2. AI: [Generates async GoodScript]
3. Human: Compile (triggers C++20 coroutine generation)
4. Validate: async/await works
5. Test: Promise chaining, error handling

**Afternoon Session (3-4 hours):**

**Target:** LRU Cache (showcase Pool Pattern!)

**Special attention:** This demonstrates GoodScript's ownership model

```typescript
// AI generates this, highlighting Pool Pattern
class LruMap<K, V> {
    private maxSize: number;
    private pool: Map<K, V> = new Map();  // Pool owns all values
    private accessOrder: K[] = [];        // Non-owning key references
    
    set(key: K, value: V): void {
        if (this.pool.size >= this.maxSize) {
            const oldest = this.accessOrder.shift()!;
            this.pool.delete(oldest);  // Pool manages lifecycle
        }
        this.pool.set(key, value);
        this.accessOrder.push(key);
    }
}
```

**End of Day 3:**
- [ ] Async utilities working
- [ ] LRU cache working (Pool Pattern example!)
- [ ] Documentation started

---

### Day 4: Crypto Library (4-6 hours)

**Target:** Core crypto functions from Dart's `crypto` package

**Workflow:**
1. Human: "Translate SHA-256 from Dart crypto package"
2. AI: [Generates implementation]
3. Human: Compile, run test vectors
4. Critical validation: Hash outputs MUST match Dart byte-for-byte
5. Iterate until perfect match

**Libraries:**
- SHA-1 (legacy, but useful)
- SHA-256 (modern standard)
- HMAC (authentication)

**Test approach:**
```typescript
// AI generates test from Dart's test suite
describe('SHA-256', () => {
    it('empty string', () => {
        expect(sha256.encode("")).toBe(
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        );
    });
    
    it('hello world', () => {
        expect(sha256.encode("hello world")).toBe(
            "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
        );
    });
    
    // 20+ more test vectors
});
```

**End of Day 4:**
- [ ] SHA-256, HMAC working
- [ ] All test vectors passing
- [ ] Crypto package ready

---

### Day 5-7: Polish, Examples, Docs (flexible)

**Day 5: Documentation**
- API reference (link to Dart docs)
- Migration guide for Dart developers
- GoodScript-specific notes (Pool Pattern, ownership, etc.)
- Examples

**Day 6: Performance + Testing**
- Benchmark against Node.js/Dart
- Memory leak testing (valgrind)
- Stress tests (large datasets)
- Optimize if needed

**Day 7: Package + Publish**
- npm package setup
- README, examples
- Internal release / beta testing
- Gather feedback

---

### Typical AI-Assisted Translation Session

**Example: Translating PriorityQueue (actual time: 1-2 hours)**

**Workflow:**

1. **Human:** Provides Dart source to AI (GitHub link or paste)
2. **AI:** Translates to GoodScript, applying type mappings
3. **Human:** Creates file, compiles with GoodScript
4. **AI:** Fixes any validation errors
5. **Human:** Runs C++ compilation and tests  
6. **AI:** Fixes runtime issues if any
7. **Human:** Ports unit tests
8. **AI:** Converts test syntax
9. **Done:** Working, tested library in 1-2 hours

**Key advantage:** No need to build a formal translator tool. The AI IS the translator, and it iterates in real-time based on feedback.

---

## Technical Approach (AI-Assisted Workflow)

### Skip the Formal Translator

**Traditional approach:** Build Dart AST parser + type mapper + codegen (2-4 weeks)

**AI-assisted approach:** Human + AI conversation (same day)

**Why skip the formal tool:**
- AI already understands Dart syntax
- AI can apply type mappings contextually  
- Human validates via compilation + tests
- Faster iteration than writing translation rules
- Tool would be used once then discarded

### Type Mapping Reference (for AI)t
describe('SHA-256', () => {
    it('matches Dart implementation', () => {
        const input = "hello world";
        const expected = "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9";
        const actual = sha256.encode(input);
        expect(actual).toBe(expected);
    });
});
```

**Critical:** Crypto must be **byte-for-byte identical** to Dart.

### Week 11-12: HTTP Client (API Surface)

**Deliverables:**
- [ ] Design HTTP client API (matches Dart's `http` package)
- [ ] Translate request/response objects
- [ ] Implement basic GET/POST with libcurl or C++ HTTP library
- [ ] Document async I/O patterns
**Deliverables:**
- [ ] Polish documentation
- [ ] Create examples
- [ ] Performance benchmarks
- [ ] Public announcement preparation

**AI-assisted timeline:** 2-3 days

**Total: 1-2 weeks to working, documented stdlib**de
3. Ensure async/await pattern matches Dart

---

## Quality Assurance

### Testing Strategy

**Three-tier validation:**

#### Tier 1: Translation Correctness
- **Input:** Dart source code
- **Output:** GoodScript source code
- **Validation:** 
  - [ ] GoodScript passes Phase 1 validator (no forbidden features)
  - [ ] GoodScript passes Phase 2 ownership analyzer (no cycles)
  - [ ] Type signatures preserved correctly

#### Tier 2: Compilation
- **Input:** Generated GoodScript
- **Output:** C++ code
- **Validation:**
  - [ ] C++ compiles with g++ -std=c++20
  - [ ] C++ compiles with clang++ -std=c++20
  - [ ] No compiler warnings
  - [ ] Links successfully with GoodScript runtime

#### Tier 3: Runtime Behavior
- **Input:** Dart unit tests (ported to GoodScript)
- **Output:** Test results
- **Validation:**
  - [ ] All tests pass
  - [ ] Output matches Dart exactly (for deterministic operations)
  - [ ] No memory leaks (valgrind clean)
  - [ ] Performance acceptable (within 2-3x of Dart/Node.js)

### Continuous Integration

**Automated pipeline:**

```yaml
# .github/workflows/dart-stdlib.yml
name: Dart Stdlib Translation

on: [push, pull_request]

jobs:
  translate-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install Dart SDK
        uses: dart-lang/setup-dart@v1
      - name: Install GoodScript
        run: npm install
      - name: Translate Dart libraries
        run: npm run translate:dart
      - name: Compile GoodScript output
        run: npm run compile:all
      - name: Run tests
        run: npm test
      - name: Check for memory leaks
        run: |
          valgrind --leak-check=full --error-exitcode=1 \
            ./dist/native/test-runner
```

### Performance Benchmarks

**Track performance over time:**

```typescript
// benchmarks/priority-queue.bench.ts
import { benchmark } from './harness';

benchmark('PriorityQueue: insert 10k items', () => {
    const pq = new PriorityQueue<number>();
    for (let i = 0; i < 10000; i++) {
        pq.add(Math.random());
    }
});

benchmark('PriorityQueue: remove 10k items', () => {
    const pq = new PriorityQueue<number>();
    for (let i = 0; i < 10000; i++) {
        pq.add(i);
    }
    for (let i = 0; i < 10000; i++) {
        pq.removeFirst();
    }
});
```

**Targets:**
- Collections: within 1.5x of Node.js/Dart
- Crypto: within 2x of Node.js/Dart
- HTTP: within 2x of Node.js/Dart

---

## Documentation Strategy

### For Users

**Create migration guides:**

```markdown
# Using Dart-Translated Libraries in GoodScript

## Collections

GoodScript includes Dart's `collection` package:

\`\`\`typescript
import { PriorityQueue } from '@goodscript/collection';

const pq = new PriorityQueue<number>();
pq.add(5);
pq.add(2);
pq.add(8);

console.log(pq.removeFirst()); // 2
\`\`\`

## Async Utilities

From Quiver:

\`\`\`typescript
import { FutureGroup } from '@goodscript/quiver/async';

const group = new FutureGroup<User>();
group.add(fetchUser(1));
group.add(fetchUser(2));

const users = await group.future;
\`\`\`
```

### For Contributors

**Translation guidelines:**

```markdown
# Contributing Dart Translations

## Before Translating a New Library

1. Check if library uses only supported Dart features
2. Verify null safety is enabled
3. Check dependencies (prefer zero dependencies)
4. Review license (Apache/MIT/BSD preferred)

## Translation Checklist

- [ ] Run dart-translator on library
- [ ] Fix any manual adjustments needed
- [ ] Port unit tests from Dart
- [ ] Add to stdlib package.json
- [ ] Document API (link to Dart docs)
- [ ] Add to translation registry
```

---

## Package Structure

**Proposed organization:**

```
goodscript/
├── compiler/              # Existing compiler
├── dart-translator/       # NEW: Dart→GoodScript translator
│   ├── src/
│   │   ├── parser.ts      # Dart AST parsing
│   │   ├── type-mapper.ts # Type conversions
│   │   ├── codegen.ts     # GoodScript emission
│   │   └── index.ts
│   ├── test/
│   │   ├── type-mapping.test.ts
│   │   ├── class-translation.test.ts
│   │   └── async-translation.test.ts
│   └── package.json
├── stdlib/                # NEW: Translated standard library
│   ├── collection/
│   │   ├── src/
│   │   │   ├── queue.gs.ts
│   │   │   ├── priority-queue.gs.ts
│   │   │   └── index.ts
│   │   ├── test/
│   │   └── package.json
│   ├── quiver/
│   │   ├── src/
│   │   │   ├── collection/
│   │   │   ├── async/
│   │   │   └── index.ts
│   │   └── package.json
│   ├── crypto/
│   │   ├── src/
│   │   │   ├── sha256.gs.ts
│   │   │   ├── hmac.gs.ts
│   │   │   └── index.ts
│   │   └── package.json
│   └── http/
│       └── ...
└── docs/
    ├── DART-STDLIB-TRANSLATION-GUIDE.md  # This file
    └── dart-api-reference/               # Generated docs
```

---

## Decision Log

### Decisions Made

1. **[2024-12-05] Use Dart as primary stdlib source**
   - Rationale: Null safety + async/await + quality
   - Alternatives considered: Haxe (easier syntax, but lacks null safety/async), Java (poor async story)

2. **[TBD] Dart analyzer integration approach**
   - Options: (A) Native binding via N-API, (B) Subprocess + JSON output
   - Decision: TBD week 1 based on complexity assessment
   - Criteria: Simplicity, maintainability, cross-platform support

3. **[TBD] Handling extension methods**
   - Options: (A) Static utility classes, (B) Prototype extension (discouraged), (C) Symbol-based
   - Decision: TBD - likely static utility classes
   - Criteria: GoodScript compatibility, TypeScript idioms

### Open Questions

1. **How to handle Dart isolates (concurrency)?**
   - Dart uses isolates (separate memory spaces)
   - GoodScript uses C++20 coroutines (single-threaded async)
   - **Punt to Phase 5** - focus on async/await first

2. **How to handle dart:io platform-specific APIs?**
   - File I/O, sockets, processes
   - **Strategy:** Translate API surface, implement with C++ libraries
   - **Timeline:** After core stdlib is complete

3. **Should we maintain fork of Dart packages or snapshot?**
   - Fork: Can modify, but maintenance burden
   - Snapshot: Simpler, but miss updates
   - **Decision:** Snapshot initially, evaluate fork later

---

## Success Metrics

### Phase 1 Success (Week 4)
- [ ] 3+ data structures translated and working
- [ ] 100% of translated code passes GoodScript validation
- [ ] 100% of ported tests pass
- [ ] Documentation published

### Phase 2 Success (Week 8)
- [ ] 10+ utilities/algorithms translated
- [ ] Async/await working end-to-end
- [ ] LRU cache showcases Pool Pattern
- [ ] Performance benchmarks published

### Phase 3 Success (Week 10)
- [ ] SHA-256, HMAC implemented
- [ ] Crypto outputs match Dart byte-for-byte
- [ ] No memory leaks in long-running crypto operations

### Phase 4 Success (Week 12)
- [ ] HTTP client GET/POST working
- [ ] Can build simple REST API client
- [ ] Documentation includes HTTP examples
- [ ] **Public announcement: "GoodScript includes Dart stdlib"**

### Long-term Success Metrics
- [ ] 50+ Dart packages translated
- [ ] Community contributions (users translate packages)
- [ ] Performance competitive (within 2x of Node.js)
- [ ] Adoption: 100+ developers using GoodScript with Dart stdlib

---

## Risk Mitigation

### Risk 1: Dart Analyzer Integration Complexity
**Impact:** High (blocks everything)
**Likelihood:** Medium
**Mitigation:**
- Week 1: Evaluate two approaches (native binding vs subprocess)
- Have fallback: Manual AST parsing with TypeScript (slower but works)
- Worst case: Use Dart's JSON AST output (well-documented)

### Risk 2: Semantic Mismatches
**Impact:** Medium (incorrect behavior)
**Likelihood:** Medium
**Mitigation:**
- Extensive runtime testing (port all Dart unit tests)
- Benchmark against Dart to catch performance regressions
- Start with simple libraries (collections) before complex (HTTP)

### Risk 3: Performance Problems
**Impact:** Medium (adoption blocker)
**Likelihood:** Low (C++ should be fast)
**Mitigation:**
- Profile early and often
- Optimize hot paths (heap allocation, copy vs move)
- Document any performance caveats

### Risk 4: Maintenance Burden
**Impact:** Medium (libraries diverge from Dart)
**Likelihood:** Medium
**Mitigation:**
- Automate translation as much as possible
- Version-lock Dart dependencies (snapshot approach)
- Re-translate when Dart updates (not continuous tracking)

---

## FAQ

### Q: Why not just use TypeScript libraries?

**A:** Most TypeScript libraries violate GoodScript's "Good Parts":
- Use `any` extensively
- Dynamic property access
- Type coercion (`if (x)` where x is mixed types)
- `==` instead of `===`

Dart libraries are **already strict** and match GoodScript's safety model.

### Q: Why not write GoodScript stdlib from scratch?

**A:** Time to market. Writing + testing + documenting a complete stdlib takes **12-24 months**. Translating Dart takes **8-12 weeks**. That's **4-12x faster**.

### Q: What if Dart changes?

**A:** We control the translation timing. Lock to specific Dart SDK version, update when we choose. Dart is stable (mature language), so breaking changes are rare.

### Q: Will performance be acceptable?

**A:** Yes:
- GoodScript compiles to C++ (fast)
- Dart's algorithms are already optimized
- We use C++ STL for collections (very fast)
- Expected: within 1.5-2x of Node.js/Dart

### Q: Can users contribute translations?

**A:** Yes! Once translator is stable:
1. User finds Dart package they want
2. Run `goodscript translate <package>`
3. Test, fix any issues
4. Submit PR to stdlib repo

### Q: What about libraries that don't translate well?

**A:** Pick different library or write from scratch. Focus on:
- ✅ Pure algorithms (collections, crypto, math)
- ✅ Async/await based I/O
- ❌ Avoid: Reflection, code generation, platform-specific

---

## Next Steps

### Immediate (This Week)
1. ✅ Document strategy (this file)
2. [ ] Create `dart-translator` package stub
3. [ ] Research Dart analyzer integration options
4. [ ] Set up development environment (Dart SDK, etc.)

### Week 1-2
1. [ ] Implement basic type mapper
2. [ ] Implement simple class translator
3. [ ] Translate first example (Point class)
4. [ ] Validate end-to-end pipeline

### Week 3-4
1. [ ] Translate PriorityQueue
2. [ ] Port Dart tests
3. [ ] Publish internal preview

### Week 1-2
1. [ ] Follow roadmap above
2. [ ] Iterate based on learnings
3. [ ] Internal preview at day 3-4
4. [ ] Public release at day 7-10

---

## Conclusion

This strategy leverages GoodScript's core philosophy: **pragmatic choices for maximum velocity**.

By translating Dart's battle-tested stdlib with AI assistance instead of writing from scratch, we get:
- ✅ **1-2 weeks to working stdlib** (not months/years)
- ✅ **Null-safe APIs** (matches GoodScript's type system)
- ✅ **Async/await throughout** (maps to C++20 coroutines)
- ✅ **Google-backed quality** (Flutter-proven code)
- ✅ **Immediate credibility** ("Uses Dart's stdlib")

**AI advantage:** Skip building translation tooling (2-4 weeks), translate directly in conversation (days).

**Timeline:** 
- Traditional: 8-12 weeks
- AI-assisted: **1-2 weeks** 🚀
- **Efficiency: 5-10x faster**

**Market impact:** Transforms GoodScript from "interesting experiment" to "production-ready alternative to Go."

**Execution pattern:** Same pragmatic approach as every GoodScript decision:
1. Identify pragmatic choice (Dart stdlib)
2. Leverage existing work (battle-tested libraries)  
3. Use AI to accelerate (skip building tools)
4. Focus on unique value (ownership, single binary)
5. Ship fast (prove value, iterate)

**Ready to start Day 1?** 🏃‍♂️
**Efficiency gain: 5-10x faster**

**Why it works:**
- ✅ AI reads Dart natively (no parser needed)
- ✅ AI applies patterns instantly (no codegen needed)
- ✅ Human validates via compilation (catches errors immediately)
- ✅ Iterative refinement in minutes (not hours/days)
- ✅ Learned patterns accelerate subsequent translations

**Key insight:** Building a translator tool is unnecessary when AI can translate directly in conversation. The tool would take weeks to build and be used once.

---

## Conclusion

This strategy leverages GoodScript's core philosophy: **pragmatic choices for maximum velocity**.

By translating Dart's battle-tested stdlib instead of writing from scratch, we get:
- ✅ **Weeks to working stdlib** (not months/years)
- ✅ **Null-safe APIs** (matches GoodScript's type system)
- ✅ **Async/await throughout** (maps to C++20 coroutines)
- ✅ **Google-backed quality** (Flutter-proven code)
- ✅ **Immediate credibility** ("Uses Dart's stdlib")

**Timeline:** 8-12 weeks from start to public announcement.

**Market impact:** Transforms GoodScript from "interesting experiment" to "production-ready alternative to Go."

**Execution:** This is the same pragmatic pattern that's driven every GoodScript decision. Focus on unique value (ownership analysis, single binary), leverage existing work (Dart stdlib), ship fast.

Let's build it! 🚀
