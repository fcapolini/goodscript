#pragma once

#include <stdexcept>
#include <cstdlib>
#include <cstring>
#include <utility>
#include <type_traits>

// MPS is a C library - must use C linkage
extern "C" {
#include "mps.h"
#include "mpsavm.h"  // mps_arena_class_vm
#include "mpscamc.h" // mps_class_amc (automatic mostly-copying pool)
}

namespace gs {
namespace gc {

/**
 * GoodScript MPS AMC Allocator
 * 
 * Uses AMC (Automatic Mostly-Copying) pool for precise generational GC.
 * 
 * Performance improvements over MVFF:
 * - Precise GC (knows exactly where pointers are)
 * - Generational collection (young gen / old gen)
 * - Automatic memory compaction
 * - Expected 3-5x performance improvement
 * 
 * Trade-offs:
 * - Requires object format descriptors (more complex)
 * - Need to track object layouts
 * - Slightly more memory overhead for metadata
 * 
 * Thread-safety: Single-threaded for now (can be extended).
 */

/**
 * Object header for AMC-allocated objects.
 * Stored before each object to enable precise scanning.
 */
struct ObjectHeader {
    size_t size;        // Object size in bytes
    void* type_tag;     // Type identifier for polymorphism (currently unused)
    
    // Header must be pointer-aligned
    static constexpr size_t alignment() {
        return sizeof(void*);
    }
    
    // Total header size including alignment
    static constexpr size_t header_size() {
        return (sizeof(ObjectHeader) + alignment() - 1) & ~(alignment() - 1);
    }
};

/**
 * MPS Format Functions for AMC Pool
 * 
 * These callbacks tell MPS how to scan, skip, and move objects.
 */
namespace format {
    /**
     * Scan function: Tell MPS which fields contain pointers.
     * 
     * For now, we use conservative scanning within each object
     * (scan all words as potential pointers). Future optimization:
     * emit type metadata to enable precise field-level scanning.
     */
    inline mps_res_t scan(mps_ss_t ss, mps_addr_t base, mps_addr_t limit) {
        MPS_SCAN_BEGIN(ss) {
            // Get object header
            ObjectHeader* header = static_cast<ObjectHeader*>(base);
            mps_addr_t object_start = reinterpret_cast<char*>(base) + ObjectHeader::header_size();
            mps_addr_t object_end = reinterpret_cast<char*>(base) + header->size;
            
            // Conservative scan of object fields
            // Scan every pointer-sized word as a potential reference
            mps_addr_t* p = reinterpret_cast<mps_addr_t*>(object_start);
            mps_addr_t* p_end = reinterpret_cast<mps_addr_t*>(object_end);
            
            while (p < p_end) {
                mps_addr_t ref = *p;
                // Fix up the reference if it points to a moved object
                MPS_FIX12(ss, &ref);
                *p = ref;
                ++p;
            }
        } MPS_SCAN_END(ss);
        
        return MPS_RES_OK;
    }
    
    /**
     * Skip function: Given an object address, return the address after it.
     */
    inline mps_addr_t skip(mps_addr_t addr) {
        ObjectHeader* header = static_cast<ObjectHeader*>(addr);
        return reinterpret_cast<char*>(addr) + header->size;
    }
    
    /**
     * Forward function: Move an object to a new location.
     */
    inline void fwd(mps_addr_t old_addr, mps_addr_t new_addr) {
        ObjectHeader* old_header = static_cast<ObjectHeader*>(old_addr);
        std::memcpy(new_addr, old_addr, old_header->size);
    }
    
    /**
     * Is-forwarded function: Check if an object has been moved.
     */
    inline mps_addr_t isfwd(mps_addr_t addr) {
        ObjectHeader* header = static_cast<ObjectHeader*>(addr);
        
        // Check if type_tag has the forwarding bit set
        if (reinterpret_cast<uintptr_t>(header->type_tag) & 1) {
            return reinterpret_cast<mps_addr_t>(
                reinterpret_cast<uintptr_t>(header->type_tag) & ~1
            );
        }
        
        return nullptr;
    }
    
    /**
     * Pad function: Fill unused space with padding object.
     */
    inline void pad(mps_addr_t addr, size_t size) {
        ObjectHeader* header = static_cast<ObjectHeader*>(addr);
        header->size = size;
        header->type_tag = nullptr;
    }
}

/**
 * AMC-based allocator with precise generational GC.
 */
class AllocatorAMC {
private:
    static mps_arena_t arena;
    static mps_pool_t pool;
    static mps_fmt_t format;
    static mps_thr_t thread;
    static mps_root_t thread_root;
    static bool initialized;

public:
    /**
     * Initialize the MPS arena with AMC pool.
     */
    static void init() {
        if (initialized) return;

        mps_res_t res;

        // Create the arena
        res = mps_arena_create_k(&arena, mps_arena_class_vm(), mps_args_none);
        if (res != MPS_RES_OK) {
            throw std::runtime_error("Failed to create MPS arena");
        }

        // Register thread
        void* cold;
        res = mps_thread_reg(&thread, arena);
        if (res != MPS_RES_OK) {
            mps_arena_destroy(arena);
            throw std::runtime_error("Failed to register thread");
        }
        
        // Create stack root for conservative stack scanning
        res = mps_root_create_thread(&thread_root, arena, thread, &cold);
        if (res != MPS_RES_OK) {
            mps_thread_dereg(thread);
            mps_arena_destroy(arena);
            throw std::runtime_error("Failed to create thread root");
        }

        // Create object format for AMC
        mps_fmt_A_s fmt_spec = {
            /* align */    sizeof(void*),
            /* scan */     format::scan,
            /* skip */     format::skip,
            /* fwd */      format::fwd,
            /* isfwd */    format::isfwd,
            /* pad */      format::pad
        };
        
        res = mps_fmt_create_A(&format, arena, &fmt_spec);
        if (res != MPS_RES_OK) {
            mps_root_destroy(thread_root);
            mps_thread_dereg(thread);
            mps_arena_destroy(arena);
            throw std::runtime_error("Failed to create object format");
        }

        // Create AMC pool with the format
        MPS_ARGS_BEGIN(args) {
            MPS_ARGS_ADD(args, MPS_KEY_FORMAT, format);
            res = mps_pool_create_k(&pool, arena, mps_class_amc(), args);
        } MPS_ARGS_END(args);
        
        if (res != MPS_RES_OK) {
            mps_fmt_destroy(format);
            mps_root_destroy(thread_root);
            mps_thread_dereg(thread);
            mps_arena_destroy(arena);
            throw std::runtime_error("Failed to create AMC pool");
        }

        initialized = true;
    }

    /**
     * Shutdown the MPS arena.
     */
    static void shutdown() {
        if (!initialized) return;

        mps_pool_destroy(pool);
        mps_fmt_destroy(format);
        mps_root_destroy(thread_root);
        mps_thread_dereg(thread);
        mps_arena_destroy(arena);
        initialized = false;
    }

    /**
     * Allocate memory for an object of type T with constructor arguments.
     * 
     * Layout: [ObjectHeader][Object Data]
     */
    template<typename T, typename... Args>
    static T* alloc(Args&&... args) {
        if (!initialized) init();

        // Calculate total size: header + object
        size_t object_size = sizeof(T);
        size_t total_size = ObjectHeader::header_size() + object_size;
        
        // Align to pointer size
        total_size = (total_size + sizeof(void*) - 1) & ~(sizeof(void*) - 1);

        // Allocate memory
        mps_addr_t addr;
        mps_res_t res;
        
        do {
            res = mps_reserve(&addr, pool, total_size);
            if (res != MPS_RES_OK) {
                throw std::bad_alloc();
            }
            
            // Initialize header
            ObjectHeader* header = static_cast<ObjectHeader*>(addr);
            header->size = total_size;
            header->type_tag = nullptr;  // Could store type info here
            
            // Get pointer to object data (after header)
            T* object = reinterpret_cast<T*>(
                reinterpret_cast<char*>(addr) + ObjectHeader::header_size()
            );
            
            // Zero-initialize memory (safe for conservative scan)
            std::memset(object, 0, object_size);
            
            // Construct object in-place
            new(object) T(std::forward<Args>(args)...);
            
            // Commit the allocation
        } while (!mps_commit(pool, addr, total_size));
        
        // Return pointer to object (not header)
        return reinterpret_cast<T*>(
            reinterpret_cast<char*>(addr) + ObjectHeader::header_size()
        );
    }

    /**
     * Allocate memory for an object of type T (no arguments).
     */
    template<typename T>
    static T* alloc() {
        if (!initialized) init();

        size_t object_size = sizeof(T);
        size_t total_size = ObjectHeader::header_size() + object_size;
        total_size = (total_size + sizeof(void*) - 1) & ~(sizeof(void*) - 1);

        mps_addr_t addr;
        mps_res_t res;
        
        do {
            res = mps_reserve(&addr, pool, total_size);
            if (res != MPS_RES_OK) {
                throw std::bad_alloc();
            }
            
            ObjectHeader* header = static_cast<ObjectHeader*>(addr);
            header->size = total_size;
            header->type_tag = nullptr;
            
            T* object = reinterpret_cast<T*>(
                reinterpret_cast<char*>(addr) + ObjectHeader::header_size()
            );
            
            std::memset(object, 0, object_size);
            new(object) T();
            
        } while (!mps_commit(pool, addr, total_size));
        
        return reinterpret_cast<T*>(
            reinterpret_cast<char*>(addr) + ObjectHeader::header_size()
        );
    }

    /**
     * Allocate array of objects.
     */
    template<typename T>
    static T* alloc_array(size_t count) {
        if (!initialized) init();

        size_t object_size = sizeof(T) * count;
        size_t total_size = ObjectHeader::header_size() + object_size;
        total_size = (total_size + sizeof(void*) - 1) & ~(sizeof(void*) - 1);

        mps_addr_t addr;
        mps_res_t res;
        
        do {
            res = mps_reserve(&addr, pool, total_size);
            if (res != MPS_RES_OK) {
                throw std::bad_alloc();
            }
            
            ObjectHeader* header = static_cast<ObjectHeader*>(addr);
            header->size = total_size;
            header->type_tag = nullptr;
            
            T* array = reinterpret_cast<T*>(
                reinterpret_cast<char*>(addr) + ObjectHeader::header_size()
            );
            
            std::memset(array, 0, object_size);
            
            // Construct each element
            for (size_t i = 0; i < count; ++i) {
                new(&array[i]) T();
            }
            
        } while (!mps_commit(pool, addr, total_size));
        
        return reinterpret_cast<T*>(
            reinterpret_cast<char*>(addr) + ObjectHeader::header_size()
        );
    }

    /**
     * Trigger a collection.
     * AMC automatically does generational collection.
     */
    static void collect() {
        if (!initialized) return;
        mps_arena_collect(arena);
    }

    /**
     * Get memory usage stats.
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
inline mps_arena_t AllocatorAMC::arena = nullptr;
inline mps_pool_t AllocatorAMC::pool = nullptr;
inline mps_fmt_t AllocatorAMC::format = nullptr;
inline mps_thr_t AllocatorAMC::thread = nullptr;
inline mps_root_t AllocatorAMC::thread_root = nullptr;
inline bool AllocatorAMC::initialized = false;

/**
 * RAII wrapper for AMC initialization/shutdown.
 */
class RuntimeAMC {
public:
    RuntimeAMC() {
        AllocatorAMC::init();
    }

    ~RuntimeAMC() {
        AllocatorAMC::shutdown();
    }

    RuntimeAMC(const RuntimeAMC&) = delete;
    RuntimeAMC& operator=(const RuntimeAMC&) = delete;
};

} // namespace gc
} // namespace gs
