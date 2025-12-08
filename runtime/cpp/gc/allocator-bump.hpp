#pragma once

#include "allocator.hpp"
#include <cstddef>
#include <cstring>
#include <utility>

namespace gs {
namespace gc {

/**
 * Bump Allocator for Short-lived Objects
 * 
 * Fast inline allocation via pointer bumping. Ideal for:
 * - Temporary objects in loops
 * - Intermediate computation results
 * - Stack-like allocation patterns
 * 
 * Performance characteristics:
 * - Allocation: O(1) pointer bump (3-10 CPU cycles)
 * - Deallocation: Bulk reset (not per-object)
 * - Memory overhead: Near-zero (just bump pointer)
 * 
 * Usage pattern:
 * ```cpp
 * BumpAllocator bump(4096);  // 4KB arena
 * for (...) {
 *     auto* temp = bump.alloc<String>("temporary");
 *     // Use temp...
 * }
 * bump.reset();  // Free all at once
 * ```
 * 
 * Trade-offs:
 * - Cannot free individual objects (only bulk reset)
 * - Fixed arena size (must estimate capacity)
 * - No GC scanning during bump phase (scanned on reset)
 * 
 * Integration with MPS:
 * - Allocates arena from MPS pool
 * - Objects become MPS-managed on arena reset
 * - Provides fast path for transient allocations
 */
class BumpAllocator {
private:
    char* arena_;           // Start of allocation arena
    char* current_;         // Current allocation pointer
    char* end_;            // End of arena
    size_t arena_size_;    // Total arena capacity
    
    // Default arena size: 64KB (good for most use cases)
    static constexpr size_t DEFAULT_ARENA_SIZE = 64 * 1024;

public:
    /**
     * Create bump allocator with specified arena size.
     */
    explicit BumpAllocator(size_t arena_size = DEFAULT_ARENA_SIZE)
        : arena_size_(arena_size) {
        
        // Allocate arena from MPS pool
        arena_ = Allocator::alloc_array<char>(arena_size_);
        current_ = arena_;
        end_ = arena_ + arena_size_;
    }

    /**
     * Allocate object of type T with constructor arguments.
     * Fast path: just bump pointer if space available.
     */
    template<typename T, typename... Args>
    T* alloc(Args&&... args) {
        // Calculate aligned size
        size_t size = sizeof(T);
        size_t alignment = alignof(T);
        
        // Align current pointer
        char* aligned = reinterpret_cast<char*>(
            (reinterpret_cast<uintptr_t>(current_) + alignment - 1) & ~(alignment - 1)
        );
        
        // Check if we have space
        if (aligned + size > end_) {
            // Arena exhausted - fall back to MPS allocator
            return Allocator::alloc<T>(std::forward<Args>(args)...);
        }
        
        // Bump allocation - just move pointer
        current_ = aligned + size;
        
        // Construct object in-place
        return new(aligned) T(std::forward<Args>(args)...);
    }

    /**
     * Allocate array of objects.
     */
    template<typename T>
    T* alloc_array(size_t count) {
        size_t size = sizeof(T) * count;
        size_t alignment = alignof(T);
        
        // Align current pointer
        char* aligned = reinterpret_cast<char*>(
            (reinterpret_cast<uintptr_t>(current_) + alignment - 1) & ~(alignment - 1)
        );
        
        // Check if we have space
        if (aligned + size > end_) {
            // Arena exhausted - fall back to MPS
            return Allocator::alloc_array<T>(count);
        }
        
        // Bump allocation
        current_ = aligned + size;
        
        // Zero memory and construct elements
        std::memset(aligned, 0, size);
        T* array = reinterpret_cast<T*>(aligned);
        for (size_t i = 0; i < count; ++i) {
            new(&array[i]) T();
        }
        
        return array;
    }

    /**
     * Reset arena for reuse.
     * All allocated objects become invalid (caller's responsibility).
     * Arena memory stays allocated in MPS - just reset the pointer.
     */
    void reset() {
        current_ = arena_;
        // Note: Objects are not destructed - only safe for POD-like types
        // or when caller manages lifetimes manually
    }

    /**
     * Clear and zero the entire arena.
     * Slower than reset() but ensures clean state.
     */
    void clear() {
        std::memset(arena_, 0, arena_size_);
        current_ = arena_;
    }

    /**
     * Get current usage statistics.
     */
    size_t used() const {
        return current_ - arena_;
    }

    size_t available() const {
        return end_ - current_;
    }

    size_t capacity() const {
        return arena_size_;
    }

    double utilization() const {
        return static_cast<double>(used()) / arena_size_;
    }

    /**
     * Check if bump allocator still has capacity.
     */
    bool can_allocate(size_t size) const {
        return (current_ + size) <= end_;
    }

    /**
     * Prevent copying (arena is unique resource).
     */
    BumpAllocator(const BumpAllocator&) = delete;
    BumpAllocator& operator=(const BumpAllocator&) = delete;

    /**
     * Allow moving.
     */
    BumpAllocator(BumpAllocator&& other) noexcept
        : arena_(other.arena_)
        , current_(other.current_)
        , end_(other.end_)
        , arena_size_(other.arena_size_) {
        other.arena_ = nullptr;
        other.current_ = nullptr;
        other.end_ = nullptr;
        other.arena_size_ = 0;
    }

    BumpAllocator& operator=(BumpAllocator&& other) noexcept {
        if (this != &other) {
            arena_ = other.arena_;
            current_ = other.current_;
            end_ = other.end_;
            arena_size_ = other.arena_size_;
            
            other.arena_ = nullptr;
            other.current_ = nullptr;
            other.end_ = nullptr;
            other.arena_size_ = 0;
        }
        return *this;
    }

    /**
     * No explicit destructor needed - arena is MPS-managed.
     * MPS will clean up when no longer referenced.
     */
    ~BumpAllocator() = default;
};

/**
 * Scoped bump allocator - resets on destruction.
 * 
 * Usage:
 * ```cpp
 * {
 *     ScopedBumpAllocator scoped(8192);
 *     for (...) {
 *         auto* temp = scoped.alloc<MyObject>(...);
 *         // Use temp...
 *     }
 *     // Automatic reset on scope exit
 * }
 * ```
 */
class ScopedBumpAllocator {
private:
    BumpAllocator allocator_;

public:
    explicit ScopedBumpAllocator(size_t arena_size = 64 * 1024)
        : allocator_(arena_size) {}

    template<typename T, typename... Args>
    T* alloc(Args&&... args) {
        return allocator_.alloc<T>(std::forward<Args>(args)...);
    }

    template<typename T>
    T* alloc_array(size_t count) {
        return allocator_.alloc_array<T>(count);
    }

    size_t used() const { return allocator_.used(); }
    size_t available() const { return allocator_.available(); }
    double utilization() const { return allocator_.utilization(); }

    ~ScopedBumpAllocator() {
        allocator_.reset();
    }

    // Prevent copying/moving (RAII semantics)
    ScopedBumpAllocator(const ScopedBumpAllocator&) = delete;
    ScopedBumpAllocator& operator=(const ScopedBumpAllocator&) = delete;
    ScopedBumpAllocator(ScopedBumpAllocator&&) = delete;
    ScopedBumpAllocator& operator=(ScopedBumpAllocator&&) = delete;
};

/**
 * Thread-local bump allocator for per-thread fast allocation.
 * 
 * Usage:
 * ```cpp
 * auto* obj = ThreadBumpAllocator::alloc<MyType>(...);
 * ThreadBumpAllocator::reset();  // Clear thread's arena
 * ```
 */
class ThreadBumpAllocator {
private:
    static thread_local BumpAllocator allocator_;

public:
    template<typename T, typename... Args>
    static T* alloc(Args&&... args) {
        return allocator_.alloc<T>(std::forward<Args>(args)...);
    }

    template<typename T>
    static T* alloc_array(size_t count) {
        return allocator_.alloc_array<T>(count);
    }

    static void reset() {
        allocator_.reset();
    }

    static void clear() {
        allocator_.clear();
    }

    static size_t used() {
        return allocator_.used();
    }

    static size_t available() {
        return allocator_.available();
    }

    static double utilization() {
        return allocator_.utilization();
    }
};

// Thread-local allocator instance (default 64KB per thread)
inline thread_local BumpAllocator ThreadBumpAllocator::allocator_(64 * 1024);

} // namespace gc
} // namespace gs
