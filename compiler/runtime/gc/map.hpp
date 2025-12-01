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
    // For pointer types: returns V (pointer) or nullptr
    // For value types: returns V* (pointer to value) or nullptr
    auto get(const K& key) {
        if constexpr (std::is_pointer<V>::value) {
            // V is already a pointer (e.g., gs::Person*)
            auto it = impl_.find(key);
            return (it != impl_.end()) ? it->second : nullptr;
        } else {
            // V is a value type (e.g., bool, gs::String)
            // Return pointer to value or nullptr
            auto it = impl_.find(key);
            return (it != impl_.end()) ? &it->second : static_cast<V*>(nullptr);
        }
    }

    auto get(const K& key) const {
        if constexpr (std::is_pointer<V>::value) {
            auto it = impl_.find(key);
            return (it != impl_.end()) ? it->second : nullptr;
        } else {
            auto it = impl_.find(key);
            // Cast away const for value types - needed for compatibility
            // The pointer is only used temporarily for dereference
            return (it != impl_.end()) ? const_cast<V*>(&it->second) : static_cast<V*>(nullptr);
        }
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
