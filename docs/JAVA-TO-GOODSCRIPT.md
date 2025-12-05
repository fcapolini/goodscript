# Java-to-GoodScript Automated Translation

**Audience:** Library porting developers, tooling implementors

**Purpose:** Explore the feasibility of automatically translating Java libraries to GoodScript, leveraging the similarity between Java and GoodScript Phase 1.

---

## The Opportunity

GoodScript Phase 1 is remarkably similar to Java as a language:
- Class-based OOP with single inheritance
- Strict typing (no `any`, no dynamic features)
- No pointer arithmetic or manual memory management
- Familiar control flow
- Method-based APIs

This creates a unique opportunity: **leverage Java's massive ecosystem** by translating Java libraries to GoodScript.

---

## Translation Mapping

### 1. Type System

| Java | GoodScript/TypeScript | Notes |
|------|----------------------|-------|
| `int`, `long`, `float`, `double` | `number` | All numeric types collapse to `number` |
| `boolean` | `boolean` | Direct mapping |
| `String` | `string` | Direct mapping |
| `void` | `void` | Direct mapping |
| `Integer`, `Long`, etc. | `number` | Boxed types → `number` |
| `T[]` | `T[]` | Arrays map directly |
| `List<T>` | `Array<T>` | Java collections → TypeScript arrays |
| `Map<K,V>` | `Map<K,V>` | Direct mapping |
| `Set<T>` | `Set<T>` | Direct mapping |
| `Optional<T>` | `T \| null` or `T \| undefined` | Explicit nullability |

### 2. Class Declarations

**Java:**
```java
public class LinkedList<T> {
    private Node<T> head;
    private int size;
    
    public void add(T item) {
        // ...
    }
    
    public T get(int index) {
        // ...
    }
}
```

**GoodScript:**
```typescript
class LinkedList<T> {
    private head: Node<T> | null = null;
    private size: number = 0;
    
    add(item: T): void {
        // ...
    }
    
    get(index: number): T {
        // ...
    }
}
```

**Translation rules:**
- Remove `public`/`protected`/`package-private` (TypeScript uses implicit public)
- Keep `private`
- Map primitive types to TypeScript equivalents
- Initialize fields explicitly (required in GoodScript)
- Remove return type from void methods (optional in TypeScript)

### 3. Null Safety

**Java:**
```java
@Nullable String getName() {
    return this.name;
}

@NonNull String getDefaultName() {
    return "default";
}
```

**GoodScript:**
```typescript
getName(): string | null {
    return this.name;
}

getDefaultName(): string {
    return "default";
}
```

**Translation rules:**
- `@Nullable` → `T | null`
- `@NonNull` or default → `T`
- Java's implicit nullability becomes explicit in GoodScript

### 4. Generics

**Java:**
```java
public <T extends Comparable<T>> T max(List<T> items) {
    // ...
}
```

**GoodScript:**
```typescript
function max<T>(items: T[]): T {
    // Note: TypeScript doesn't enforce Comparable constraint at compile time
    // Would need runtime checks or documentation
}
```

**Challenges:**
- Java's bounded type parameters (`extends`, `super`) don't translate directly
- Would need to drop compile-time constraints or add runtime checks
- Could use TypeScript's `extends` for structural constraints in some cases

### 5. Exceptions

**Java:**
```java
public void readFile(String path) throws IOException {
    // ...
}
```

**GoodScript:**
```typescript
function readFile(path: string): void {
    // No checked exceptions in TypeScript
    // Can still throw, just not declared
    throw new Error("File not found");
}
```

**Translation rules:**
- Remove `throws` declarations
- Keep `try`/`catch`/`finally` blocks as-is
- Standard exception types (`IOException`, etc.) would need TypeScript equivalents

### 6. Interfaces and Abstract Classes

**Java:**
```java
public interface Comparable<T> {
    int compareTo(T other);
}

public abstract class AbstractList<T> {
    public abstract T get(int index);
}
```

**GoodScript:**
```typescript
interface Comparable<T> {
    compareTo(other: T): number;
}

abstract class AbstractList<T> {
    abstract get(index: number): T;
}
```

**Translation rules:**
- Interfaces translate directly
- `abstract` classes translate directly
- Remove `public` modifiers

### 7. Static Members

**Java:**
```java
public class Math {
    public static final double PI = 3.14159;
    
    public static double sqrt(double x) {
        return StrictMath.sqrt(x);
    }
}
```

**GoodScript:**
```typescript
class Math {
    static readonly PI: number = 3.14159;
    
    static sqrt(x: number): number {
        return globalThis.Math.sqrt(x);
    }
}
```

**Translation rules:**
- `static final` → `static readonly`
- Static methods map directly
- Built-in Java classes (Math, String, etc.) may need different implementations

### 8. Enums

**Java:**
```java
public enum Color {
    RED, GREEN, BLUE;
    
    private final int rgb;
    
    Color(int rgb) {
        this.rgb = rgb;
    }
}
```

**GoodScript:**
```typescript
enum Color {
    RED = "RED",
    GREEN = "GREEN",
    BLUE = "BLUE"
}

// Or for rich enums:
class Color {
    static readonly RED = new Color(0xFF0000);
    static readonly GREEN = new Color(0x00FF00);
    static readonly BLUE = new Color(0x0000FF);
    
    private constructor(private readonly rgb: number) {}
}
```

**Translation rules:**
- Simple enums → TypeScript `enum`
- Rich enums → static readonly pattern
- Enum methods need to become separate functions or class methods

### 9. Iterators and Loops

**Java:**
```java
for (T item : collection) {
    // ...
}

Iterator<T> iter = list.iterator();
while (iter.hasNext()) {
    T item = iter.next();
}
```

**GoodScript:**
```typescript
for (const item of collection) {
    // ...
}

// Iterator protocol is different in TypeScript
// Would need to implement Symbol.iterator
```

**Translation rules:**
- Enhanced for-loop → `for...of`
- Iterator pattern needs TypeScript's iteration protocol

### 10. Package System

**Java:**
```java
package com.example.collections;

import java.util.List;
import java.util.ArrayList;
```

**GoodScript:**
```typescript
// File: collections/LinkedList.ts

import { List } from './List';
import { ArrayList } from './ArrayList';
```

**Translation rules:**
- Package declarations → directory structure + file names
- Imports need to be rewritten as ES module imports
- Fully qualified names → relative or named imports

---

## Automation Strategy

### Phase 1: Parser
Build a Java AST parser (or use existing like JavaParser) to extract:
- Class/interface/enum declarations
- Method signatures
- Field declarations
- Type parameters
- Imports and package structure

### Phase 2: Type Mapper
Create a type mapping system:
```typescript
const javaToGoodScript = {
    'int': 'number',
    'long': 'number',
    'float': 'number',
    'double': 'number',
    'String': 'string',
    'boolean': 'boolean',
    'List<T>': 'Array<T>',
    'Map<K,V>': 'Map<K,V>',
    // ...
};
```

### Phase 3: Code Generator
Walk the Java AST and emit TypeScript:
- Map Java syntax to TypeScript syntax
- Apply type mappings
- Rewrite imports
- Handle special cases (null safety, generics, etc.)

### Phase 4: Manual Fixup Layer
Some things can't be automated:
- Generic bounds (`extends Comparable<T>`)
- Platform-specific code (`java.io.*`, `java.nio.*`)
- Reflection-based code
- Native methods
- Thread synchronization primitives

Create a "fixup" annotation system:
```java
// @goodscript-replace: throw new Error("Not implemented");
private native void nativeMethod();
```

---

## Candidate Libraries for Translation

### High-Value Targets

1. **Apache Commons Collections**
   - Pure algorithms, no I/O dependencies
   - Well-documented, stable API
   - Useful: Bloom filters, bidirectional maps, circular buffers

2. **Google Guava (subset)**
   - Immutable collections
   - Caching utilities (CacheBuilder could map to GoodScript's Pool Pattern!)
   - Functional utilities (Predicates, Functions)

3. **Apache Commons Math**
   - Statistics, linear algebra, optimization
   - Minimal dependencies
   - Pure computation

4. **Apache Commons Codec**
   - Base64, Hex, URL encoding
   - No platform dependencies
   - Straightforward algorithms

5. **JGraphT** (graph library)
   - Graph algorithms (shortest path, MST, etc.)
   - Pure data structures
   - Could be very useful for GoodScript DAG analysis itself!

### Libraries to Avoid

- **Spring Framework**: Too much reflection, proxies, dynamic behavior
- **Hibernate**: Database-specific, uses reflection heavily
- **Java Swing/AWT**: UI libraries tied to JVM
- **Java I/O libraries**: Platform-specific file/network APIs (need custom implementations)

---

## Proof of Concept: Translating a Simple Class

### Original Java (Apache Commons Collections)

```java
package org.apache.commons.collections4.list;

import java.util.ArrayList;
import java.util.List;

public class CircularFifoQueue<E> extends ArrayList<E> {
    private final int maxElements;
    
    public CircularFifoQueue(int size) {
        super(size);
        this.maxElements = size;
    }
    
    @Override
    public boolean add(E element) {
        if (size() >= maxElements) {
            remove(0);
        }
        return super.add(element);
    }
}
```

### Translated GoodScript

```typescript
class CircularFifoQueue<E> {
    private elements: E[] = [];
    private readonly maxElements: number;
    
    constructor(size: number) {
        this.maxElements = size;
    }
    
    add(element: E): boolean {
        if (this.elements.length >= this.maxElements) {
            this.elements.shift();  // Remove first element
        }
        this.elements.push(element);
        return true;
    }
    
    get size(): number {
        return this.elements.length;
    }
}
```

**Translation decisions:**
- `extends ArrayList<E>` → composition (TypeScript arrays are not extendable)
- `remove(0)` → `shift()`
- `super.add(element)` → `this.elements.push(element)`
- Added `size` getter for compatibility

---

## Open Questions

### 1. How to Handle Java Standard Library?

Java code relies heavily on `java.util.*`, `java.io.*`, etc. Options:

**Option A: Polyfill Layer**
Create TypeScript equivalents:
```typescript
// java-compat/util/ArrayList.ts
export class ArrayList<T> extends Array<T> {
    // Implement Java's ArrayList API
}
```

**Option B: Direct Translation**
Rewrite calls to use native TypeScript/GoodScript:
```java
List<String> list = new ArrayList<>();
list.add("item");
```
→
```typescript
const list: string[] = [];
list.push("item");
```

**Recommendation**: Option B where possible (cleaner code), Option A for complex cases.

### 2. Performance Implications?

Java code may use idioms that don't translate efficiently:
- Heavy iterator use (TypeScript iteration protocol is different)
- Synchronized blocks (no direct equivalent in single-threaded TypeScript)
- Primitive arrays (`int[]` vs `number[]` - TypeScript uses boxed numbers)

**Mitigation**: Benchmark translated code, optimize hot paths manually.

### 3. Ownership Annotations?

For GoodScript Ownership Mode, translated code needs ownership qualifiers:
```typescript
class TreeNode<T> {
    value: T;
    children: share<TreeNode<T>>[];  // Needs ownership annotation
}
```

**Strategy**: 
- Phase 1: Generate GC mode code (no ownership)
- Phase 2: Add ownership inference pass
- Phase 3: Manual annotation for complex data structures

### 4. Testing Translated Code?

How to verify correctness?

**Strategy:**
1. **Unit test translation**: Port Java unit tests to TypeScript
2. **Property-based testing**: Use fast-check to verify behavior
3. **Reference implementation**: Keep original Java as reference, compare outputs

---

## Implementation Roadmap

### Stage 1: Proof of Concept (1-2 weeks)
- [ ] Build basic Java AST parser (use JavaParser library)
- [ ] Implement type mapper for primitives + common types
- [ ] Translate one simple class (e.g., CircularFifoQueue)
- [ ] Verify it compiles with GoodScript
- [ ] Run basic correctness tests

### Stage 2: Expand Coverage (2-4 weeks)
- [ ] Handle generics with bounds
- [ ] Support interfaces and abstract classes
- [ ] Implement package → ES module mapping
- [ ] Translate 5-10 classes from Apache Commons Collections
- [ ] Build test harness for translated code

### Stage 3: Polish & Productionize (4-6 weeks)
- [ ] Add manual fixup annotation system
- [ ] Handle edge cases (nested classes, varargs, etc.)
- [ ] Create polyfill layer for common Java APIs
- [ ] Document translation patterns
- [ ] Translate complete library (Apache Commons Codec as target)

### Stage 4: Ownership Mode (optional, future)
- [ ] Add ownership inference
- [ ] Generate `share<T>`, `own<T>`, `use<T>` annotations
- [ ] Verify DAG analysis passes on translated code

---

## Expected Value

### For GoodScript Ecosystem
- **Instant library ecosystem**: Access to battle-tested algorithms/data structures
- **Bootstrap standard library**: Port parts of Java stdlib (collections, math, etc.)
- **Credibility**: Show that GoodScript can run real-world code

### For TypeScript Developers
- **Familiar libraries**: Developers coming from Java can bring their knowledge
- **Algorithm reference**: Use translated Java code as learning material
- **Production-ready code**: Java libraries are usually well-tested and optimized

### Limitations
- Won't work for all Java libraries (I/O, reflection, platform-specific)
- Performance may differ (GoodScript number is float64, Java has int/long)
- Manual fixups needed for complex cases

---

## Conclusion

**Is this feasible?** **Yes, for a subset of Java libraries.**

The key is to:
1. **Target pure algorithmic libraries** (no I/O, reflection, or JVM-specific features)
2. **Build a robust type mapper** (handle generics, collections, null safety)
3. **Accept manual fixups** for edge cases
4. **Test extensively** (port unit tests from Java)

**Next steps:**
1. Build proof-of-concept translator for one simple class
2. Validate GoodScript compilation + runtime correctness
3. Expand to full library (Apache Commons Codec is good target)

This could be a **game-changer** for GoodScript's ecosystem bootstrapping.
