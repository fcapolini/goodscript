#pragma once

#include "allocator-simple.hpp"
#include <unordered_map>
#include <optional>

namespace gs {

/**
 * GC-allocated Map implementation.
 * Wraps std::unordered_map with JavaScript-like API.
 */
template<typename K, typename V>
class Map {
private:
    std::unordered_map<K, V> impl_;

public:
    Map() = default;

    // Get value by key (returns pointer for API consistency with ownership mode)
    V* get(const K& key) {
        auto it = impl_.find(key);
        if (it != impl_.end()) {
            return &it->second;
        }
        return nullptr;
    }

    const V* get(const K& key) const {
        auto it = impl_.find(key);
        if (it != impl_.end()) {
            return &it->second;
        }
        return nullptr;
    }

    // Set key-value pair
    void set(const K& key, const V& value) {
        impl_[key] = value;
    }

    // Check if key exists
    bool has(const K& key) const {
        return impl_.find(key) != impl_.end();
    }

    // Delete key
    bool delete_(const K& key) {
        return impl_.erase(key) > 0;
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
