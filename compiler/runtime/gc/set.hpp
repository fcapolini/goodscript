#pragma once

#include "allocator-simple.hpp"
#include <unordered_set>

namespace gs {

/**
 * GC-allocated Set implementation.
 * Wraps std::unordered_set with JavaScript-like API.
 */
template<typename T>
class Set {
private:
    std::unordered_set<T> impl_;

public:
    Set() = default;

    // Add value
    void add(const T& value) {
        impl_.insert(value);
    }

    // Check if value exists
    bool has(const T& value) const {
        return impl_.find(value) != impl_.end();
    }

    // Delete value
    bool delete_(const T& value) {
        return impl_.erase(value) > 0;
    }

    // Clear all entries
    void clear() {
        impl_.clear();
    }

    // Get size
    size_t size() const {
        return impl_.size();
    }

    // Iterators for range-based for loops
    auto begin() { return impl_.begin(); }
    auto end() { return impl_.end(); }
    auto begin() const { return impl_.begin(); }
    auto end() const { return impl_.end(); }
};

} // namespace gs
