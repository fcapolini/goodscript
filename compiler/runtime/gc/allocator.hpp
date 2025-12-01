#pragma once

#include "mps.h"
#include <stdexcept>
#include <cstdlib>
#include <cstring>
#include <utility>

namespace gs {
namespace gc {

/**
 * GoodScript MPS Allocator
 * 
 * Provides a simple C++ interface to the Memory Pool System (MPS).
 * Uses conservative garbage collection for simplicity - no precise
 * format information needed.
 * 
 * Thread-safety: Single-threaded for now (can be extended).
 */
class Allocator {
private:
    static mps_arena_t arena;
    static mps_pool_t pool;
    static mps_ap_t ap;  // Allocation point for fast inline allocation
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
        MPS_ARGS_BEGIN(arena_args) {
            MPS_ARGS_ADD(arena_args, MPS_KEY_ARENA_SIZE, 64 * 1024 * 1024); // 64 MB
        } MPS_ARGS_END(arena_args);
        
        res = mps_arena_create_k(&arena, mps_arena_class_vm(), arena_args);
        if (res != MPS_RES_OK) {
            throw std::runtime_error("Failed to create MPS arena");
        }

        // Create AMS (Automatic Mark-and-Sweep) pool for objects
        // AMS is simpler than AMC and works well with conservative GC
        MPS_ARGS_BEGIN(pool_args) {
            MPS_ARGS_ADD(pool_args, MPS_KEY_AMS_SUPPORT_AMBIGUOUS, 1); // Enable conservative scanning
        } MPS_ARGS_END(pool_args);
        
        res = mps_pool_create_k(&pool, arena, mps_class_ams(), pool_args);
        if (res != MPS_RES_OK) {
            mps_arena_destroy(arena);
            throw std::runtime_error("Failed to create MPS pool");
        }

        // Create allocation point for fast allocation
        res = mps_ap_create_k(&ap, pool, mps_args_none);
        if (res != MPS_RES_OK) {
            mps_pool_destroy(pool);
            mps_arena_destroy(arena);
            throw std::runtime_error("Failed to create allocation point");
        }

        // Register stack as GC root (conservative scanning)
        // Create a thread and register it
        void* cold;
        res = mps_thread_reg(&thread, arena);
        if (res != MPS_RES_OK) {
            mps_ap_destroy(ap);
            mps_pool_destroy(pool);
            mps_arena_destroy(arena);
            throw std::runtime_error("Failed to register thread");
        }
        
        res = mps_root_create_thread(&thread_root, arena, thread, &cold);
        if (res != MPS_RES_OK) {
            mps_thread_dereg(thread);
            mps_ap_destroy(ap);
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
        mps_ap_destroy(ap);
        mps_pool_destroy(pool);
        mps_arena_destroy(arena);
        initialized = false;
    }

    /**
     * Allocate memory for an object of type T with constructor arguments.
     * Uses fast inline allocation via allocation point.
     */
    template<typename T, typename... Args>
    static T* alloc(Args&&... args) {
        if (!initialized) init();

        mps_addr_t addr;
        size_t size = sizeof(T);

        // Align to pointer size for conservative GC
        size = (size + sizeof(void*) - 1) & ~(sizeof(void*) - 1);

        do {
            mps_res_t res = mps_reserve(&addr, ap, size);
            if (res != MPS_RES_OK) {
                throw std::bad_alloc();
            }

            // Initialize memory to zero (safe for conservative GC)
            std::memset(addr, 0, size);

            // Construct object in-place with forwarded arguments
            T* obj = new(addr) T(std::forward<Args>(args)...);

            // Commit the allocation
            if (mps_commit(ap, addr, size)) {
                return obj;
            }
            // If commit failed, GC happened - retry
        } while (true);
    }

    /**
     * Allocate memory for an object of type T (no arguments).
     * Uses fast inline allocation via allocation point.
     */
    template<typename T>
    static T* alloc() {
        if (!initialized) init();

        mps_addr_t addr;
        size_t size = sizeof(T);

        // Align to pointer size for conservative GC
        size = (size + sizeof(void*) - 1) & ~(sizeof(void*) - 1);

        do {
            mps_res_t res = mps_reserve(&addr, ap, size);
            if (res != MPS_RES_OK) {
                throw std::bad_alloc();
            }

            // Initialize memory to zero (safe for conservative GC)
            std::memset(addr, 0, size);

            // Construct object in-place
            T* obj = new(addr) T();

            // Commit the allocation
            if (mps_commit(ap, addr, size)) {
                return obj;
            }
            // If commit failed, GC happened - retry
        } while (true);
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

        do {
            mps_res_t res = mps_reserve(&addr, ap, size);
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

            // Commit
            if (mps_commit(ap, addr, size)) {
                return array;
            }
        } while (true);
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
inline mps_ap_t Allocator::ap = nullptr;
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
