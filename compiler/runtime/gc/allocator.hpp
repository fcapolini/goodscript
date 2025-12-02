#pragma once

#include <stdexcept>
#include <cstdlib>
#include <cstring>
#include <utility>

// MPS is a C library - must use C linkage
extern "C" {
#include "mps.h"
#include "mpsavm.h"  // mps_arena_class_vm
#include "mpscmvff.h" // mps_class_mvff (manual pool, no format required)
}

namespace gs {
namespace gc {

/**
 * GoodScript MPS Allocator
 * 
 * Provides a C++ interface to the Memory Pool System (MPS).
 * Currently uses MVFF (Manual Variable First-Fit) pool with conservative GC.
 * 
 * MVFF is simple but not optimal for performance:
 * - Conservative scanning (scans all memory as potential pointers)
 * - Manual allocation (no automatic collection optimization)
 * - No generational GC
 * 
 * Future optimization: Switch to AMC (Automatic Mostly-Copying) pool:
 * - Requires implementing format descriptors (scan, skip, fwd, isfwd, pad)
 * - Precise GC (knows exactly where pointers are)
 * - Generational collection (much faster)
 * - Expected 3-5x performance improvement
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

public:
    /**
     * Initialize the MPS arena and allocation pool.
     * Must be called before any allocations.
     */
    static void init() {
        if (initialized) return;

        mps_res_t res;

        // Create the arena (MPS memory space)
        // Using mps_arena_class_vm() for virtual memory arena
        res = mps_arena_create_k(&arena, mps_arena_class_vm(), mps_args_none);
        if (res != MPS_RES_OK) {
            throw std::runtime_error("Failed to create MPS arena");
        }

        // Create MVFF (Manual Variable First-Fit) pool
        // MVFF is conservative GC - doesn't require object format
        res = mps_pool_create_k(&pool, arena, mps_class_mvff(), mps_args_none);
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

        // Align to pointer size for conservative GC
        size = (size + sizeof(void*) - 1) & ~(sizeof(void*) - 1);

        mps_res_t res = mps_alloc(&addr, pool, size);
        if (res != MPS_RES_OK) {
            throw std::bad_alloc();
        }

        // Initialize memory to zero (safe for conservative GC)
        std::memset(addr, 0, size);

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
};

// Static member definitions
inline mps_arena_t Allocator::arena = nullptr;
inline mps_pool_t Allocator::pool = nullptr;
inline mps_thr_t Allocator::thread = nullptr;
inline mps_root_t Allocator::thread_root = nullptr;
inline bool Allocator::initialized = false;

/**
 * RAII wrapper for MPS initialization/shutdown.
 * Create one at program start.
 */
class Runtime {
public:
    Runtime() {
        Allocator::init();
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
