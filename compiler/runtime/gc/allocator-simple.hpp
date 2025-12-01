#pragma once

#include <cstdlib>
#include <cstring>
#include <utility>
#include <new>
#include <type_traits>

namespace gs {
namespace gc {

/**
 * Simplified GC Allocator (MVP)
 * 
 * Uses standard malloc/free for now. This is a placeholder that allows
 * us to test the GC mode architecture. Full MPS integration coming soon.
 * 
 * TODO: Replace with actual MPS-based garbage collector
 */
class Allocator {
public:
    /**
     * Initialize (no-op for malloc-based version)
     */
    static void init() {
        // No initialization needed for malloc
    }

    /**
     * Shutdown (no-op for malloc-based version)
     */
    static void shutdown() {
        // No cleanup needed - OS reclaims memory
    }

    /**
     * Allocate memory for an object of type T with constructor arguments.
     */
    template<typename T, typename... Args>
    static T* alloc(Args&&... args) {
        void* mem = std::malloc(sizeof(T));
        if (!mem) {
            throw std::bad_alloc();
        }
        return new(mem) T(std::forward<Args>(args)...);
    }

    /**
     * Allocate memory for an object of type T (no arguments).
     */
    template<typename T>
    static T* alloc() {
        void* mem = std::malloc(sizeof(T));
        if (!mem) {
            throw std::bad_alloc();
        }
        return new(mem) T();
    }

    /**
     * Allocate array of objects.
     * Specialized for POD types (like char) - just allocate and zero.
     */
    template<typename T>
    static T* alloc_array(size_t count) {
        if (count == 0) return nullptr;
        
        void* mem = std::malloc(sizeof(T) * count);
        if (!mem) {
            throw std::bad_alloc();
        }
        
        // Zero-initialize memory
        std::memset(mem, 0, sizeof(T) * count);
        
        T* array = static_cast<T*>(mem);
        
        // For non-trivial types, construct each element
        if constexpr (!std::is_trivially_constructible_v<T>) {
            for (size_t i = 0; i < count; ++i) {
                new(&array[i]) T();
            }
        }
        
        return array;
    }

    /**
     * Trigger a collection (no-op for malloc version)
     */
    static void collect() {
        // No GC in malloc version
    }

    /**
     * Get memory stats (returns 0 for malloc version)
     */
    static size_t committed_memory() {
        return 0;
    }

    static size_t reserved_memory() {
        return 0;
    }
};

/**
 * RAII wrapper for GC initialization/shutdown.
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
