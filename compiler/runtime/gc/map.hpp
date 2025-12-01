#pragma once

#include "allocator-simple.hpp"
#include <unordered_map>
#include <optional>
#include <type_traits>

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

    // Get value by key
    // When V is a pointer type (T*), returns T* directly (not T**)
    // When V is a value type, returns V*
    auto get(const K& key) -> V {
        static_assert(std::is_pointer<V>::value, 
            "Map value type must be a pointer in GC mode");
        auto it = impl_.find(key);
        if (it != impl_.end()) {
            return it->second;  // Return the pointer directly
        }
        return nullptr;
    }

    auto get(const K& key) const -> V {
        static_assert(std::is_pointer<V>::value,
            "Map value type must be a pointer in GC mode");
        auto it = impl_.find(key);
        if (it != impl_.end()) {
            return it->second;  // Return the pointer directly
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
