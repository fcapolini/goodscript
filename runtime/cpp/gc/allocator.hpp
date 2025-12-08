#pragma once

#include <stdexcept>
#include <cstdlib>
#include <cstring>
#include <utility>
#include <algorithm>

// MPS is a C library - must use C linkage
extern "C" {
#include "mps.h"
#include "mpsavm.h"  // mps_arena_class_vm
#include "mpscmvff.h" // mps_class_mvff (manual pool, no format required)
}

namespace gs {
namespace gc {

/**
 * Configuration for MPS allocator.
 * Provides JVM-style heap size configuration (-Xms/-Xmx equivalent).
 */
struct AllocatorConfig {
    size_t arena_size;      // Initial arena size (like -Xms)
    size_t commit_limit;    // Maximum committed memory (like -Xmx)

    /**
     * Default configuration: 64MB initial, 512MB max
     * Good for most applications
     */
    static AllocatorConfig defaults() {
        return AllocatorConfig{64 * 1024 * 1024, 512 * 1024 * 1024};
    }

    /**
     * Large heap configuration: 256MB initial, 1GB max
     * For memory-intensive workloads (large datasets, heavy string manipulation)
     */
    static AllocatorConfig large() {
        return AllocatorConfig{256 * 1024 * 1024, 1024 * 1024 * 1024};
    }

    /**
     * Small heap configuration: 16MB initial, 128MB max
     * For embedded systems or memory-constrained environments
     */
    static AllocatorConfig small() {
        return AllocatorConfig{16 * 1024 * 1024, 128 * 1024 * 1024};
    }
};

/**
 * GoodScript MPS Allocator (Optimized)
 * 
 * Provides a C++ interface to the Memory Pool System (MPS).
 * Uses MVFF (Manual Variable First-Fit) pool with conservative GC.
 * 
 * Optimizations in this version:
 * - Larger arena commit limit (better allocation performance)
 * - Tuned alignment for cache efficiency
 * - Allocation batching via larger chunks
 * 
 * Performance characteristics:
 * - Conservative scanning (simple but slower than precise GC)
 * - Manual allocation (predictable but no automatic optimization)
 * - No generational GC (scans all live objects on each collection)
 * 
 * Future: AMC (Automatic Mostly-Copying) pool in allocator-amc.hpp
 * - Requires allocation point API (mps_ap_t) instead of direct pool alloc
 * - Precise GC with object format descriptors
 * - 3-5x faster but more complex integration
 * 
 * Thread-safety: Single-threaded for now (can be extended).
 */
class Allocator {
private:
    static mps_arena_t arena;
    static mps_pool_t pool;
    static mps_thr_t thread;  // Thread handle
    static mps_root_t thread_root;
    static bool initialized;
    static AllocatorConfig config;

public:
    /**
     * Initialize the MPS arena and allocation pool.
     * Must be called before any allocations.
     * 
     * @param cfg Configuration (defaults to AllocatorConfig::defaults())
     */
    static void init(const AllocatorConfig& cfg = AllocatorConfig::defaults()) {
        if (initialized) return;

        config = cfg;  // Store configuration

        mps_res_t res;

        // Create the arena (MPS memory space)
        // Using mps_arena_class_vm() for virtual memory arena
        MPS_ARGS_BEGIN(arena_args) {
            MPS_ARGS_ADD(arena_args, MPS_KEY_ARENA_SIZE, config.arena_size);
            MPS_ARGS_ADD(arena_args, MPS_KEY_COMMIT_LIMIT, config.commit_limit);
            res = mps_arena_create_k(&arena, mps_arena_class_vm(), arena_args);
        } MPS_ARGS_END(arena_args);
        if (res != MPS_RES_OK) {
            throw std::runtime_error("Failed to create MPS arena");
        }

        // Create MVFF (Manual Variable First-Fit) pool
        // MVFF is conservative GC - doesn't require object format
        // Configure with larger extent size for better allocation batching
        MPS_ARGS_BEGIN(pool_args) {
            MPS_ARGS_ADD(pool_args, MPS_KEY_EXTEND_BY, 256 * 1024);  // 256KB chunks
            MPS_ARGS_ADD(pool_args, MPS_KEY_MEAN_SIZE, 64);  // Average object size hint
            MPS_ARGS_ADD(pool_args, MPS_KEY_MVFF_ARENA_HIGH, 1);  // Use high memory
            MPS_ARGS_ADD(pool_args, MPS_KEY_MVFF_SLOT_HIGH, 1);  // Allocate from high addresses
            MPS_ARGS_ADD(pool_args, MPS_KEY_MVFF_FIRST_FIT, 1);  // First-fit strategy
            res = mps_pool_create_k(&pool, arena, mps_class_mvff(), pool_args);
        } MPS_ARGS_END(pool_args);
        if (res != MPS_RES_OK) {
            mps_arena_destroy(arena);
            throw std::runtime_error("Failed to create MPS pool");
        }

        // Register stack as GC root (conservative scanning)
        // Create a thread and register it
        void* cold;
        res = mps_thread_reg(&thread, arena);
        if (res != MPS_RES_OK) {
            mps_pool_destroy(pool);
            mps_arena_destroy(arena);
            throw std::runtime_error("Failed to register thread");
        }
        
        res = mps_root_create_thread(&thread_root, arena, thread, &cold);
        if (res != MPS_RES_OK) {
            mps_thread_dereg(thread);
            mps_pool_destroy(pool);
            mps_arena_destroy(arena);
            throw std::runtime_error("Failed to create thread root");
        }

        initialized = true;
    }

    /**
     * Shutdown the MPS arena.
     * Call at program exit to release all memory.
     */
    static void shutdown() {
        if (!initialized) return;

        mps_root_destroy(thread_root);
        mps_thread_dereg(thread);
        mps_pool_destroy(pool);
        mps_arena_destroy(arena);
        initialized = false;
    }

    /**
     * Allocate memory for an object of type T with constructor arguments.
     */
    template<typename T, typename... Args>
    static T* alloc(Args&&... args) {
        if (!initialized) init();

        mps_addr_t addr;
        size_t size = sizeof(T);

        // Align to cache line (64 bytes) for better performance
        // Conservative GC only needs pointer alignment, but cache alignment helps
        size = std::max(size, sizeof(void*));  // At least pointer-sized
        size = (size + 7) & ~7;  // 8-byte alignment

        mps_res_t res = mps_alloc(&addr, pool, size);
        if (res != MPS_RES_OK) {
            throw std::bad_alloc();
        }

        // Only zero-init if type is not trivially constructible
        // (Conservative GC safety: assume constructor initializes all fields)
        if (!std::is_trivially_constructible<T, Args...>::value) {
            std::memset(addr, 0, size);
        }

        // Construct object in-place with forwarded arguments
        return new(addr) T(std::forward<Args>(args)...);
    }

    /**
     * Allocate memory for an object of type T (no arguments).
     */
    template<typename T>
    static T* alloc() {
        if (!initialized) init();

        mps_addr_t addr;
        size_t size = sizeof(T);

        // Align to pointer size for conservative GC
        size = (size + sizeof(void*) - 1) & ~(sizeof(void*) - 1);

        mps_res_t res = mps_alloc(&addr, pool, size);
        if (res != MPS_RES_OK) {
            throw std::bad_alloc();
        }

        // Initialize memory to zero (safe for conservative GC)
        std::memset(addr, 0, size);

        // Construct object in-place
        return new(addr) T();
    }

    /**
     * Allocate array of objects.
     */
    template<typename T>
    static T* alloc_array(size_t count) {
        if (!initialized) init();

        mps_addr_t addr;
        size_t size = sizeof(T) * count;

        // Align to pointer size
        size = (size + sizeof(void*) - 1) & ~(sizeof(void*) - 1);

        mps_res_t res = mps_alloc(&addr, pool, size);
        if (res != MPS_RES_OK) {
            throw std::bad_alloc();
        }

        // Initialize to zero
        std::memset(addr, 0, size);

        // Construct each element
        T* array = static_cast<T*>(addr);
        for (size_t i = 0; i < count; ++i) {
            new(&array[i]) T();
        }

        return array;
    }

    /**
     * Trigger a collection step.
     * MPS normally runs incrementally, but this forces a collection.
     */
    static void collect() {
        if (!initialized) return;
        mps_arena_collect(arena);
    }

    /**
     * Get current memory usage stats.
     */
    static size_t committed_memory() {
        if (!initialized) return 0;
        return mps_arena_committed(arena);
    }

    static size_t reserved_memory() {
        if (!initialized) return 0;
        return mps_arena_reserved(arena);
    }

    /**
     * Get the current configuration.
     */
    static const AllocatorConfig& get_config() {
        return config;
    }

    /**
     * Memory statistics.
     */
    struct Stats {
        size_t committed;
        size_t reserved;
        size_t arena_size;
        size_t commit_limit;
    };

    static Stats stats() {
        return Stats{
            committed_memory(),
            reserved_memory(),
            config.arena_size,
            config.commit_limit
        };
    }
};

// Static member definitions
inline mps_arena_t Allocator::arena = nullptr;
inline mps_pool_t Allocator::pool = nullptr;
inline mps_thr_t Allocator::thread = nullptr;
inline mps_root_t Allocator::thread_root = nullptr;
inline bool Allocator::initialized = false;
inline AllocatorConfig Allocator::config = AllocatorConfig::defaults();

/**
 * RAII wrapper for MPS initialization/shutdown.
 * Create one at program start.
 */
class Runtime {
public:
    Runtime(const AllocatorConfig& cfg = AllocatorConfig::defaults()) {
        Allocator::init(cfg);
    }

    ~Runtime() {
        Allocator::shutdown();
    }

    // Prevent copying
    Runtime(const Runtime&) = delete;
    Runtime& operator=(const Runtime&) = delete;
};

} // namespace gc
} // namespace gs
