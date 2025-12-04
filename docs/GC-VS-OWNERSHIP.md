# GC Mode vs Ownership Mode: Complete Guide

**Audience:** TypeScript developers choosing between GoodScript's two compilation modes.

**Purpose:** Explain when to use GC mode (default) vs ownership mode (advanced), with practical examples and migration paths.

---

## Quick Decision Guide

**Use GC Mode if:**
- ✅ You want to ship standalone executables without deployment complexity
- ✅ Your app is a CLI, API server, data processor, or automation tool
- ✅ You're migrating from Node.js/Deno/Bun
- ✅ You want single-file binaries with no runtime dependencies
- ✅ You want to ship fast and iterate quickly

**Use Ownership Mode if:**
- ✅ You need zero-GC deterministic memory management
- ✅ You're building embedded systems or IoT devices
- ✅ Real-time performance with no GC pauses is critical
- ✅ Memory footprint must be minimized
- ✅ You're comfortable with Rust-like ownership concepts

---

## Part 1: GC Mode (Recommended)

### What is GC Mode?

GC Mode compiles TypeScript to native code with **automatic garbage collection**. You write clean TypeScript following "The Good Parts" rules, and get native binaries that run **faster than Node.js**.

### Getting Started

1. **Write TypeScript** - No ownership annotations needed
2. **Avoid "bad parts"** - No `var`, no `==`, etc. (see [GOOD-PARTS.md](GOOD-PARTS.md))
3. **Compile** - `gsc -t native -b -o dist src/main.gs.ts`
4. **Deploy** - Single native binary, no dependencies

### Performance Characteristics

**Advantages over Node.js:**
- **Single binary deployment** - No Node.js installation required
- **2-10MB executables** - vs 50-200MB for Node.js apps  
- **Cross-compile anywhere** - Build for any platform from your laptop
- **No dependencies** - Self-contained executable
- **Fast startup** - Instant, no JIT warmup
- **1.2-2x faster execution** - Optimized C++ standard library
- **Smaller Docker images** - 5-10MB vs 200MB+ with Node.js
- **Predictable performance** - No deoptimization surprises

### Memory Management

**Garbage Collection:**
- Based on industry-proven MPS library (Memory Pool System)
- Generational collection for efficiency
- Configurable collection triggers
- Suitable for server workloads with typical 10-100ms latencies

**Trade-offs:**
- ❌ Non-deterministic collection pauses (typically <10ms)
- ❌ Slightly higher memory usage than ownership mode
- ✅ No manual memory management needed
- ✅ No ownership cycles to worry about
- ✅ Natural TypeScript coding patterns work

### Example: Simple CLI Tool

```typescript
// word-count.gs.ts
import * as fs from 'fs';

function countWords(text: string): number {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    return words.length;
}

const content = fs.readFileSync(process.argv[2], 'utf-8');
const count = countWords(content);
console.log(`Word count: ${count}`);
```

```bash
# Compile to native
gsc -t native -b -o dist word-count.gs.ts

# Run (faster than Node.js!)
./dist/word-count large-file.txt
```

---

## Part 2: Ownership Mode (Advanced)

### What is Ownership Mode?

Ownership Mode compiles TypeScript to zero-GC native code using **smart pointer-based ownership**. Memory is freed deterministically when the last owner goes out of scope - no garbage collection needed.

### When to Use

**Critical use cases:**
- **Embedded systems** - Limited memory, no GC acceptable
- **Real-time systems** - Must guarantee <1ms latencies
- **High-performance libraries** - Maximum throughput needed
- **Long-running daemons** - Predictable memory behavior over days/weeks
- **Safety-critical systems** - Deterministic behavior required

### Ownership Types

```typescript
declare type own<T> = T;      // Exclusive ownership (→ std::unique_ptr<T>)
declare type share<T> = T;    // Shared ownership (→ gs::shared_ptr<T>)
declare type use<T> = T | null | undefined;  // Non-owning reference (→ gs::weak_ptr<T>)
```

**Derivation Rules:**
- From `own<T>` → only `use<T>` can be derived
- From `share<T>` → `share<T>` or `use<T>`
- From `use<T>` → only `use<T>`

These rules prevent ownership cycles and guarantee memory safety.

### DAG (Directed Acyclic Graph) Analysis

The compiler builds an ownership graph and rejects cycles:

```typescript
// ❌ REJECTED - Ownership cycle
class TreeNode {
    parent: share<TreeNode>;     // Creates cycle!
    children: share<TreeNode>[];
}

// ✅ ACCEPTED - Arena/Pool pattern
class Tree {
    nodes: own<TreeNode>[];  // Tree owns all nodes
}

class TreeNode {
    parent: use<TreeNode>;       // Non-owning reference
    children: use<TreeNode>[];   // Non-owning references
}
```

### Performance Characteristics

**Advantages over GC Mode:**
- **Zero GC pauses** - Completely deterministic
- **Lower memory usage** - No GC metadata overhead
- **Immediate cleanup** - Memory freed when last owner destroyed
- **Better cache locality** - Predictable allocation patterns

**Trade-offs:**
- ❌ Must learn ownership rules
- ❌ Arena/Pool pattern needed for complex graphs
- ❌ More upfront design thinking required
- ✅ Maximum performance and control
- ✅ Predictable behavior under all loads

### Example: High-Performance LRU Cache

```typescript
declare type own<T> = T;
declare type share<T> = T;
declare type use<T> = T | null | undefined;

class CacheNode {
    key: string;
    value: string;
    prev: use<CacheNode>;
    next: use<CacheNode>;
}

class LRUCache {
    private capacity: number;
    private cache: Map<string, share<CacheNode>>;
    private head: use<CacheNode>;
    private tail: use<CacheNode>;

    constructor(capacity: number) {
        this.capacity = capacity;
        this.cache = new Map();
    }

    get(key: string): string | undefined {
        const node = this.cache.get(key);
        if (node === undefined) return undefined;
        
        this.moveToHead(node);
        return node.value;
    }

    put(key: string, value: string): void {
        let node = this.cache.get(key);
        
        if (node !== undefined) {
            node.value = value;
            this.moveToHead(node);
        } else {
            // Create new shared node
            const newNode: share<CacheNode> = {
                key,
                value,
                prev: undefined,
                next: undefined
            };
            
            this.cache.set(key, newNode);
            this.addToHead(newNode);
            
            if (this.cache.size > this.capacity) {
                this.removeTail();
            }
        }
    }

    private moveToHead(node: share<CacheNode>): void {
        this.removeNode(node);
        this.addToHead(node);
    }

    private removeNode(node: share<CacheNode>): void {
        const prev = node.prev;
        const next = node.next;
        
        if (prev !== undefined) {
            prev.next = next;
        } else {
            this.head = next;
        }
        
        if (next !== undefined) {
            next.prev = prev;
        } else {
            this.tail = prev;
        }
    }

    private addToHead(node: share<CacheNode>): void {
        node.prev = undefined;
        node.next = this.head;
        
        if (this.head !== undefined) {
            this.head.prev = node;
        }
        
        this.head = node;
        
        if (this.tail === undefined) {
            this.tail = node;
        }
    }

    private removeTail(): void {
        if (this.tail === undefined) return;
        
        this.cache.delete(this.tail.key);
        
        const prev = this.tail.prev;
        if (prev !== undefined) {
            prev.next = undefined;
            this.tail = prev;
        } else {
            this.head = undefined;
            this.tail = undefined;
        }
    }
}
```

**Key observations:**
- Map owns shared references to nodes
- Linked list uses weak references for prev/next
- No ownership cycles possible
- Memory freed immediately when evicted from cache

---

## Part 3: Migration Path

### Start with GC Mode

```typescript
// Step 1: Write TypeScript (GC mode)
class DataProcessor {
    private cache: Map<string, Result>;
    
    constructor() {
        this.cache = new Map();
    }
    
    process(input: string): Result {
        const cached = this.cache.get(input);
        if (cached !== undefined) return cached;
        
        const result = this.compute(input);
        this.cache.set(input, result);
        return result;
    }
    
    private compute(input: string): Result {
        // Expensive computation
        return { data: input.toUpperCase() };
    }
}

type Result = {
    data: string;
};
```

```bash
# Compile with GC
gsc -t native -b -o dist processor.gs.ts
```

### Optimize Hot Paths with Ownership

```typescript
// Step 2: Add ownership to critical sections
declare type share<T> = T;
declare type use<T> = T | null | undefined;

class DataProcessor {
    private cache: Map<string, share<Result>>;  // Shared results
    
    constructor() {
        this.cache = new Map();
    }
    
    process(input: string): share<Result> {
        const cached = this.cache.get(input);
        if (cached !== undefined) return cached;
        
        const result: share<Result> = {
            data: input.toUpperCase()
        };
        this.cache.set(input, result);
        return result;
    }
}

type Result = {
    data: string;
};
```

```bash
# Compile with ownership mode
gsc -t native -m ownership -b -o dist processor.gs.ts
```

### Gradual Migration Strategy

1. **Profile** - Identify performance bottlenecks
2. **Annotate** - Add ownership types to hot code paths
3. **Test** - Verify behavior matches GC mode
4. **Benchmark** - Measure performance improvement
5. **Iterate** - Gradually convert more code if needed

**You don't have to convert everything!** Mix GC and ownership modes:
- Core performance-critical library: Ownership mode
- CLI wrapper/API server: GC mode

---

## Part 4: Decision Matrix

| Criterion | GC Mode | Ownership Mode |
|-----------|---------|----------------|
| **Learning Curve** | ✅ Low (just TypeScript) | ⚠️ Medium (ownership rules) |
| **Development Speed** | ✅ Fast | ⚠️ Slower (design thinking) |
| **Performance vs Node.js** | ✅ 1.2-2x faster | ✅✅ 2-5x faster |
| **Memory Footprint** | ✅ Low | ✅✅ Very Low |
| **Latency Predictability** | ⚠️ GC pauses (<10ms) | ✅ Fully deterministic |
| **Complex Data Structures** | ✅ Natural | ⚠️ Arena/Pool pattern |
| **Migration from Node.js** | ✅ Straightforward | ⚠️ Requires redesign |
| **Real-time Systems** | ❌ GC pauses | ✅ Zero GC |
| **Embedded Systems** | ⚠️ GC overhead | ✅ Minimal runtime |
| **Production Maturity** | ✅ Battle-tested GC | ✅ Proven smart ptrs |

---

## Part 5: Common Patterns

### Pattern 1: Simple Objects (Both Modes)

```typescript
// Works in both GC and ownership modes
class Point {
    x: number;
    y: number;
    
    distance(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
}

const p = new Point();
p.x = 3;
p.y = 4;
console.log(p.distance());  // 5
```

### Pattern 2: Collections (GC Mode)

```typescript
// GC mode - simple and natural
class Database {
    private users: Map<string, User>;
    
    addUser(user: User): void {
        this.users.set(user.id, user);
    }
    
    getUser(id: string): User | undefined {
        return this.users.get(id);
    }
}
```

### Pattern 3: Collections (Ownership Mode)

```typescript
// Ownership mode - shared references
declare type share<T> = T;

class Database {
    private users: Map<string, share<User>>;
    
    addUser(user: share<User>): void {
        this.users.set(user.id, user);
    }
    
    getUser(id: string): share<User> | undefined {
        return this.users.get(id);
    }
}
```

### Pattern 4: Graphs (Ownership Mode - Arena Pattern)

```typescript
// Complex graph structure
declare type own<T> = T;
declare type use<T> = T | null | undefined;

class Graph {
    nodes: own<GraphNode>[];  // Graph owns all nodes
    
    addEdge(from: number, to: number): void {
        const fromNode = this.nodes[from];
        const toNode = this.nodes[to];
        
        // Weak references for edges (no ownership)
        fromNode.neighbors.push(toNode);
    }
}

class GraphNode {
    id: number;
    neighbors: use<GraphNode>[];  // Non-owning references
}
```

---

## Part 6: FAQ

### Q: Can I mix GC and ownership modes in one project?

**A:** Not in the same compilation unit, but you can have:
- Core library compiled with ownership mode (for performance)
- CLI/API wrapper compiled with GC mode (for productivity)

Communicate via C FFI or compile separately and link.

### Q: Is GC mode production-ready?

**A:** Yes! The MPS garbage collector is used in production systems worldwide. It's well-tested and reliable for server workloads.

### Q: How much faster is ownership mode vs GC mode?

**A:** Typically 1.5-3x faster for memory-intensive workloads:
- No GC scanning overhead
- Better cache locality
- Immediate memory reclamation

For compute-bound workloads, difference is smaller (<20%).

### Q: Do I need to understand Rust to use ownership mode?

**A:** No, but familiarity helps. GoodScript's ownership model is **simpler** than Rust:
- No borrow checker
- No lifetime annotations
- No `&` vs `&mut` distinctions
- Just three types: `own<T>`, `share<T>`, `use<T>`

### Q: What about async/await?

**A:** Both modes support async/await:
- GC mode: Natural TypeScript Promises
- Ownership mode: C++20 coroutines with smart pointer safety

### Q: Can I gradually migrate from GC to ownership?

**A:** Yes! Recommended migration path:
1. Start with GC mode (fastest development)
2. Profile and identify bottlenecks
3. Add ownership annotations to hot paths
4. Switch to ownership mode compilation
5. Measure and iterate

---

## Part 7: Recommendations

### For New Projects

**Start with GC mode** unless you have a specific reason not to:
- Faster time to market
- Easier onboarding for team members
- Natural TypeScript patterns
- Still faster than Node.js

**Switch to ownership mode if:**
- Profiling shows GC pauses are problematic
- Memory footprint needs to be minimized
- Real-time constraints require determinism

### For Existing Node.js Projects

**Use GC mode** for migration:
- Minimal code changes needed
- Just follow "Good Parts" restrictions
- Immediate performance improvement
- Gradual optimization path available

### For Systems Programming

**Use ownership mode** from day one:
- Deterministic behavior is critical
- Memory constraints are tight
- Real-time performance required
- You're comfortable with ownership concepts

---

## Conclusion

**Default recommendation: GC Mode**
- ✅ Fastest path to productivity
- ✅ Faster than Node.js
- ✅ Native binaries without ownership complexity
- ✅ Gradual optimization path available

**When you need maximum performance: Ownership Mode**
- ✅ Zero GC overhead
- ✅ Deterministic memory management
- ✅ Suitable for embedded/real-time systems
- ⚠️ Requires ownership understanding

Both modes produce safe, fast native code. Choose based on your team's expertise and application requirements.

---

*See also:*
- [GOOD-PARTS.md](GOOD-PARTS.md) - Language restrictions for both modes
- [MEMORY-OWNERSHIP.md](MEMORY-OWNERSHIP.md) - Deep dive into ownership model
- [DAG-ANALYSIS.md](DAG-ANALYSIS.md) - How cycle detection works
- [GC-MODE.md](GC-MODE.md) - GC implementation details
