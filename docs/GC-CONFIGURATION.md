# GC Mode Memory Configuration

GoodScript's GC mode uses the Memory Pool System (MPS) for automatic memory management. You can configure the memory parameters using JVM-style options.

## AllocatorConfig

The `AllocatorConfig` struct provides three preset configurations and supports custom values:

```cpp
namespace gs::gc {
    struct AllocatorConfig {
        size_t arena_size;      // Initial arena size (like JVM -Xms)
        size_t commit_limit;    // Maximum committed memory (like JVM -Xmx)
        
        // Preset configurations
        static AllocatorConfig defaults();  // 64MB / 512MB
        static AllocatorConfig large();     // 256MB / 1GB
        static AllocatorConfig small();     // 16MB / 128MB
    };
}
```

## Usage

### Using Presets

```cpp
// Default configuration (64MB arena, 512MB max)
gs::gc::Runtime runtime;

// Large configuration (256MB arena, 1GB max)
gs::gc::Runtime runtime(gs::gc::AllocatorConfig::large());

// Small configuration (16MB arena, 128MB max)  
gs::gc::Runtime runtime(gs::gc::AllocatorConfig::small());
```

### Custom Configuration

```cpp
// Custom configuration (128MB arena, 2GB max)
gs::gc::AllocatorConfig custom{
    128 * 1024 * 1024,           // arena_size
    2UL * 1024 * 1024 * 1024     // commit_limit
};

gs::gc::Runtime runtime(custom);
```

## Memory Semantics

### Arena Size (Virtual Memory)

The `arena_size` reserves **virtual address space** but does NOT allocate physical RAM. On 64-bit systems, this is essentially free:

- **Cost**: Zero at startup (just address space reservation)
- **Purpose**: Sets the upper bound for MPS memory management
- **Actual Usage**: Only grows as objects are allocated

Example: A 256MB arena uses only ~176KB of actual RAM initially.

### Commit Limit (Physical Memory)

The `commit_limit` sets the **maximum physical RAM** the GC can use:

- **Cost**: Zero until memory is actually allocated
- **Purpose**: Prevents runaway memory growth
- **Actual Usage**: Grows incrementally as objects are allocated

Example: A 1GB limit uses only ~176KB until you allocate objects.

## Monitoring

You can query configuration and memory statistics:

```cpp
// Get current configuration
auto cfg = gs::gc::Allocator::get_config();
std::cout << "Arena size: " << (cfg.arena_size / 1024 / 1024) << " MB\n";
std::cout << "Commit limit: " << (cfg.commit_limit / 1024 / 1024) << " MB\n";

// Get memory statistics
auto stats = gs::gc::Allocator::stats();
std::cout << "Committed: " << (stats.committed / 1024) << " KB\n";
std::cout << "Reserved: " << (stats.reserved / 1024 / 1024) << " MB\n";
std::cout << "Arena size: " << (stats.arena_size / 1024 / 1024) << " MB\n";
std::cout << "Commit limit: " << (stats.commit_limit / 1024 / 1024) << " MB\n";
```

## When to Use Each Preset

### Defaults (64MB / 512MB)
- **Use for**: Most applications
- **Good for**: General-purpose programs, CLI tools, small servers
- **Memory**: Low overhead, suitable for most workloads

### Large (256MB / 1GB)
- **Use for**: Memory-intensive workloads
- **Good for**: Heavy string manipulation, large datasets, data processing
- **Memory**: Higher ceiling for allocation-heavy code
- **Example**: String concatenation benchmarks, JSON parsing

### Small (16MB / 128MB)
- **Use for**: Memory-constrained environments
- **Good for**: Embedded systems, containers with strict limits, microservices
- **Memory**: Minimal overhead, forces more aggressive GC

## Performance Impact

The configuration mainly affects **allocation headroom**:

- **Larger arena**: Fewer reallocations when growing memory pools
- **Larger commit limit**: More room before hitting memory limits
- **Smaller limits**: More frequent GC collection cycles

For most programs, **defaults are recommended**. Use `large()` for string-heavy or allocation-intensive workloads. Use `small()` when running in constrained environments (Docker, embedded systems).

## Relationship to JVM Options

| JVM Option | AllocatorConfig | Meaning |
|------------|-----------------|---------|
| `-Xms` | `arena_size` | Initial heap size (virtual) |
| `-Xmx` | `commit_limit` | Maximum heap size (physical) |

Unlike the JVM, GoodScript's GC uses **conservative collection** (not generational), so there's no equivalent to JVM's young/old generation sizing.

## Example: Benchmark Performance

In the GoodScript benchmark suite, string manipulation tests benefit from larger configurations:

```cpp
// String-heavy benchmark - use large() preset
gs::gc::Runtime runtime(gs::gc::AllocatorConfig::large());

// Run string concatenation benchmark
// Result: 98ms with large() vs potential slowdowns with defaults
```

## Technical Details

- **MPS Implementation**: Uses MVFF (Manual Variable First-Fit) pool
- **Collection Strategy**: Conservative (ambiguous references)
- **Allocation Strategy**: First-fit with 256KB extent chunks
- **Thread Safety**: Single-threaded (can be extended)

For more on the MPS internals, see `runtime/gc/allocator.hpp`.
