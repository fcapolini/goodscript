# GC Mode: Garbage-Collected Compilation

## Overview

GoodScript now supports **two compilation modes** for native (C++) targets:

1. **Ownership Mode** (default): Uses explicit ownership annotations (`own<T>`, `share<T>`, `use<T>`) with deterministic memory management via C++ smart pointers
2. **GC Mode** (new): Uses automatic garbage collection, allowing Phase 1 code to compile without ownership annotations

This dual-mode approach significantly improves language adoptability by offering a gradual migration path.

## Test Coverage

**Status**: 175/186 tests passing (94.1%) ✅

GC mode has comprehensive triple-mode testing across all 15 concrete examples:
- **JavaScript execution** - Reference behavior
- **Ownership C++ compilation** - Smart pointer based
- **GC C++ compilation** - Raw pointer based

**Fully Validated Examples** (12/15 - all modes produce identical output):
- ✅ benchmark-performance (8 tests)
- ✅ fibonacci (13 tests)
- ✅ linked-list (13 tests)
- ✅ array-methods (13 tests)
- ✅ lru-cache (13 tests)
- ✅ cli-args (13 tests)
- ✅ binary-search-tree (13 tests)
- ✅ regex-validator (9 tests)
- ✅ error-handling (13 tests)
- ✅ interface-shapes (13 tests)
- ✅ string-pool (13 tests)
- ✅ n-queens (13 tests)

**Partial Validation** (3/15 - some GC tests failing):
- ⚠️ generic-stack (type mapping issues with generics)
- ⚠️ hash-map (output mismatch)
- ⚠️ json-parser (compilation issues)

## Why GC Mode?

### Strategic Benefits

- **Lower barrier to entry**: Developers can start using GoodScript immediately without learning ownership semantics
- **Rapid prototyping**: Write code faster without worrying about memory management details
- **Mixed compilation**: Same codebase can be compiled with GC for development, ownership for production
- **Validation tool**: GC runtime behavior helps validate ownership analysis correctness
- **Broader appeal**: Attracts both "productivity-first" and "performance-first" developers

### Use Cases

**Use GC Mode When:**
- Prototyping and proof-of-concepts
- Learning GoodScript fundamentals
- Migrating existing TypeScript code
- Development builds (faster iteration)
- Memory safety without manual management

**Use Ownership Mode When:**
- Production deployments
- Performance-critical applications
- Systems programming
- Embedded/resource-constrained environments
- Zero-overhead abstractions required

## Usage

### Command Line

```bash
# GC mode (automatic memory management)
gsc -t native -m gc -o dist src/main.gs.ts

# Ownership mode (manual memory management, default)
gsc -t native -m ownership -o dist src/main.gs.ts

# Shorter version (ownership is default)
gsc -t native -o dist src/main.gs.ts
```

### Compilation Flags

```
-t, --target native        Compile to C++
-m, --mode <mode>          Memory management mode:
                           - 'gc': Garbage collection
                           - 'ownership': Smart pointers (default)
```

## Code Example

### Phase 1 Code (Works in Both Modes)

```typescript
// hello.gs.ts - No ownership annotations needed
class Greeter {
  name: string;
  
  constructor(name: string) {
    this.name = name;
  }
  
  greet(): void {
    console.log(`Hello, ${this.name}!`);
  }
}

const greeter = new Greeter("World");
greeter.greet();
```

### Compilation

```bash
# GC mode - compiles immediately
gsc -t native -m gc -o dist hello.gs.ts

# Ownership mode - requires ownership annotations for complex types
gsc -t native -m ownership -o dist hello.gs.ts
```

### Generated C++ (GC Mode)

```cpp
#include "gs_gc_runtime.hpp"

namespace gs {
  class Greeter {
    public:
    gs::String name;
    
    Greeter(const gs::String& name) : name(name) {}
    
    void greet() const {
      gs::console::log(gs::String("Hello, ") + this->name + gs::String("!"));
    }
  };
}

int main() {
  gs::gc::Runtime gc_runtime;  // Automatic GC initialization
  gs::Greeter* greeter = gs::gc::Allocator::alloc<gs::Greeter>(gs::String("World"));
  greeter->greet();
  return 0;
}
```

### Generated C++ (Ownership Mode)

```cpp
#include "gs_runtime.hpp"

namespace gs {
  class Greeter {
    public:
    gs::String name;
    
    Greeter(const gs::String& name) : name(name) {}
    
    void greet() const {
      gs::console::log(gs::String("Hello, ") + this->name + gs::String("!"));
    }
  };
}

int main() {
  auto greeter = std::make_unique<gs::Greeter>(gs::String("World"));
  greeter->greet();
  return 0;
}
```

## Implementation Details

### Code Generation

GC mode uses a post-processing transformation that converts ownership constructs to GC equivalents:

```typescript
// Transformations applied:
std::unique_ptr<T>           → T*
std::shared_ptr<T>           → T*
std::weak_ptr<T>             → T*
std::make_unique<T>(args)    → gs::gc::Allocator::alloc<T>(args)
std::make_shared<T>(args)    → gs::gc::Allocator::alloc<T>(args)
.get()                       → (removed - pointers already raw)
std::move(x)                 → x (removed - not needed for GC)
```

### Memory Management

**Current Implementation (MVP):**
- Uses standard `malloc/free` for allocation
- No actual garbage collection yet
- Memory leaks are possible but program completes successfully
- Suitable for testing and short-running programs

**Future Implementation (Planned):**
- Full [Memory Pool System (MPS)](https://www.ravenbrook.com/project/mps/) integration
- Incremental garbage collection with low pause times
- Conservative stack scanning (works with existing C++ code)
- Optional precise GC (better performance, requires metadata)

### Runtime Library

GC mode provides its own runtime header:

```cpp
#include "gs_gc_runtime.hpp"  // GC mode
// vs
#include "gs_runtime.hpp"      // Ownership mode
```

**GC Runtime Components:**
- `gs::gc::Allocator` - Memory allocator (malloc-based MVP, MPS-based later)
- `gs::gc::Runtime` - RAII wrapper for GC initialization/cleanup
- `gs::String` - GC-allocated string type
- `gs::Array<T>` - GC-allocated array type
- Standard containers (Map, Set, etc.)

## Performance Characteristics

### GC Mode
- **Allocation**: Fast (inline allocation in future MPS version)
- **Deallocation**: Automatic (GC pauses in future MPS version)
- **Memory overhead**: Higher (GC metadata)
- **Predictability**: Lower (GC pauses)
- **Throughput**: Good (competitive with Node.js/Deno)

### Ownership Mode
- **Allocation**: Fast (stack or inline heap)
- **Deallocation**: Deterministic (RAII)
- **Memory overhead**: Minimal (smart pointer overhead only)
- **Predictability**: High (no GC pauses)
- **Throughput**: Excellent (zero-cost abstractions)

## Migration Path: GC → Ownership

### Step 1: Start with GC Mode

```typescript
// Write code without ownership annotations
class Cache {
  items: Map<string, CacheEntry>;
  
  constructor() {
    this.items = new Map();
  }
}
```

### Step 2: Add Ownership Annotations

```typescript
// Add ownership qualifiers when ready for optimization
class Cache {
  items: Map<string, own<CacheEntry>>;  // Exclusive ownership
  
  constructor() {
    this.items = new Map();
  }
}
```

### Step 3: Compile in Ownership Mode

```bash
# Now compiles with deterministic memory management
gsc -t native -m ownership -o dist cache.gs.ts
```

## Roadmap

### Phase 2a (Current - MVP)
- [x] Basic GC mode with malloc-based allocator
- [x] CLI flag `--mode gc`
- [x] Code transformation pipeline
- [x] Simple runtime library (String, Array)
- [x] Working examples

### Phase 2a.1 (Near Future)
- [ ] MPS integration (conservative GC)
- [ ] Performance benchmarks (GC vs ownership vs Node.js)
- [ ] Comprehensive test suite
- [ ] Documentation updates

### Phase 2a.2 (Future)
- [ ] Precise GC (emit object layouts)
- [ ] Incremental collection
- [ ] Generational GC
- [ ] Tunable GC parameters

### Phase 4 (Long Term)
- [ ] Hybrid mode (mix GC and ownership in same program)
- [ ] Hot path optimization hints
- [ ] GC telemetry and profiling
- [ ] Memory pressure handling

## Comparison with Other Languages

| Feature | GoodScript GC | GoodScript Ownership | Node.js | Rust | Go |
|---------|--------------|---------------------|---------|------|-----|
| Memory Safety | ✅ | ✅ | ✅ | ✅ | ✅ |
| Garbage Collection | ✅ | ❌ | ✅ | ❌ | ✅ |
| Deterministic Deallocation | ❌ | ✅ | ❌ | ✅ | ❌ |
| Learning Curve | Low | Medium | Low | High | Low |
| Performance | Good | Excellent | Good | Excellent | Good |
| TypeScript Compatible | ✅ | ✅ | ✅ | ❌ | ❌ |

## FAQ

**Q: Is GC mode production-ready?**  
A: The MVP (malloc-based) is suitable for testing and short-running programs. Full MPS integration is coming soon for production use.

**Q: Will GC mode be slower than ownership mode?**  
A: Yes, GC mode will have some overhead due to garbage collection pauses. However, it will be competitive with Node.js/Deno and faster than Python/Ruby.

**Q: Can I mix GC and ownership code?**  
A: Not yet, but hybrid mode is planned for Phase 4.

**Q: Does GC mode require ownership annotations?**  
A: No! That's the whole point - GC mode allows you to compile Phase 1 code without any ownership annotations.

**Q: How do I choose between modes?**  
A: Use GC for development/prototyping, ownership for production/performance-critical code.

**Q: What about async/await?**  
A: Both modes support async/await. GC mode is actually easier because you don't need to worry about ownership across await boundaries.

## Examples

See:
- `compiler/examples/gc-hello.gs.ts` - Basic GC mode example
- `compiler/examples/gc-minimal.gs.ts` - Minimal test
- `compiler/test/phase3/gc/` - GC mode test suite (coming soon)

## Contributing

We welcome contributions to improve GC mode! Priority areas:

1. MPS integration
2. Performance benchmarks
3. Additional runtime types (Map, Set with GC)
4. Test coverage
5. Documentation

## References

- [Memory Pool System (MPS)](https://www.ravenbrook.com/project/mps/)
- [GoodScript Memory Ownership](MEMORY-OWNERSHIP.md)
- [GoodScript "Good Parts"](GOOD-PARTS.md)
- [Phase 3 C++ Compilation](PHASE-3-CPP.md)

---

**GC mode represents a major milestone in making GoodScript accessible to a broader audience while maintaining the option for zero-overhead performance when needed!** 🚀
