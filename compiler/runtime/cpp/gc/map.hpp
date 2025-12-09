#pragma once

#include "allocator.hpp"
#include <unordered_map>
#include <vector>
#include <optional>
#include <type_traits>

namespace gs {

/**
 * GC-allocated Map implementation.
 * Preserves insertion order like JavaScript Map.
 * Uses a vector to track insertion order and an unordered_map for O(1) lookup.
 */
template<typename K, typename V>
class Map {
private:
    std::vector<std::pair<K, V>> items_;  // Insertion-ordered storage
    std::unordered_map<K, size_t> index_; // Key -> index in items_ for O(1) lookup

    // Compact the items_ vector by removing tombstones
    void compact() {
        std::vector<std::pair<K, V>> new_items;
        new_items.reserve(index_.size());
        std::unordered_map<K, size_t> new_index;
        new_index.reserve(index_.size());
        
        for (size_t i = 0; i < items_.size(); ++i) {
            // Check if this slot is occupied (not a tombstone)
            if (index_.find(items_[i].first) != index_.end()) {
                new_index[items_[i].first] = new_items.size();
                new_items.push_back(std::move(items_[i]));
            }
        }
        
        items_ = std::move(new_items);
        index_ = std::move(new_index);
    }

public:
    // Custom iterator that skips tombstones
    class iterator {
    private:
        typename std::vector<std::pair<K, V>>::iterator current_;
        typename std::vector<std::pair<K, V>>::iterator end_;
        const std::unordered_map<K, size_t>* index_;
        
        void skip_tombstones() {
            while (current_ != end_ && index_->find(current_->first) == index_->end()) {
                ++current_;
            }
        }
        
    public:
        using iterator_category = std::forward_iterator_tag;
        using value_type = std::pair<K, V>;
        using difference_type = std::ptrdiff_t;
        using pointer = std::pair<K, V>*;
        using reference = std::pair<K, V>&;
        
        iterator(typename std::vector<std::pair<K, V>>::iterator current,
                 typename std::vector<std::pair<K, V>>::iterator end,
                 const std::unordered_map<K, size_t>* index)
          : current_(current), end_(end), index_(index) {
            skip_tombstones();
        }
        
        reference operator*() { return *current_; }
        pointer operator->() { return &(*current_); }
        
        iterator& operator++() {
            ++current_;
            skip_tombstones();
            return *this;
        }
        
        iterator operator++(int) {
            iterator tmp = *this;
            ++(*this);
            return tmp;
        }
        
        bool operator==(const iterator& other) const {
            return current_ == other.current_;
        }
        
        bool operator!=(const iterator& other) const {
            return current_ != other.current_;
        }
    };

    class const_iterator {
    private:
        typename std::vector<std::pair<K, V>>::const_iterator current_;
        typename std::vector<std::pair<K, V>>::const_iterator end_;
        const std::unordered_map<K, size_t>* index_;
        
        void skip_tombstones() {
            while (current_ != end_ && index_->find(current_->first) == index_->end()) {
                ++current_;
            }
        }
        
    public:
        using iterator_category = std::forward_iterator_tag;
        using value_type = std::pair<K, V>;
        using difference_type = std::ptrdiff_t;
        using pointer = const std::pair<K, V>*;
        using reference = const std::pair<K, V>&;
        
        const_iterator(typename std::vector<std::pair<K, V>>::const_iterator current,
                       typename std::vector<std::pair<K, V>>::const_iterator end,
                       const std::unordered_map<K, size_t>* index)
          : current_(current), end_(end), index_(index) {
            skip_tombstones();
        }
        
        reference operator*() const { return *current_; }
        pointer operator->() const { return &(*current_); }
        
        const_iterator& operator++() {
            ++current_;
            skip_tombstones();
            return *this;
        }
        
        const_iterator operator++(int) {
            const_iterator tmp = *this;
            ++(*this);
            return tmp;
        }
        
        bool operator==(const const_iterator& other) const {
            return current_ == other.current_;
        }
        
        bool operator!=(const const_iterator& other) const {
            return current_ != other.current_;
        }
    };

    Map() = default;

    // Get value by key
    // For pointer types: returns V (pointer) or nullptr
    // For value types: returns V* (pointer to value) or nullptr
    V get(const K& key) const {
        auto it = index_.find(key);
        if (it == index_.end()) {
            // Return default-constructed value (matches JavaScript undefined for primitives)
            return V{};
        }
        return items_[it->second].second;
    }

    // Set key-value pair
    void set(const K& key, const V& value) {
        auto it = index_.find(key);
        if (it != index_.end()) {
            // Key exists - update value in place
            items_[it->second].second = value;
        } else {
            // New key - append to items and record index
            index_[key] = items_.size();
            items_.emplace_back(key, value);
        }
    }

    // Check if key exists
    bool has(const K& key) const {
        return index_.find(key) != index_.end();
    }

    // Delete key
    bool delete_(const K& key) {
        auto it = index_.find(key);
        if (it != index_.end()) {
            size_t idx = it->second;
            index_.erase(it);
            // Mark as deleted by clearing the pair (tombstone)
            items_[idx] = {};
            // Periodically compact if too many tombstones
            if (index_.size() < items_.size() / 2 && items_.size() > 100) {
                compact();
            }
            return true;
        }
        return false;
    }

    // Clear all entries
    void clear() {
        items_.clear();
        index_.clear();
    }

    // Get size
    size_t size() const {
        return index_.size();
    }

    // forEach - iterate over entries in insertion order
    // Callback signature: (value, key) => void (matches JavaScript Map.forEach)
    template<typename Func>
    void forEach(Func callback) const {
        for (size_t i = 0; i < items_.size(); ++i) {
            // Check if this slot is occupied (key exists in index)
            if (index_.find(items_[i].first) != index_.end()) {
                callback(items_[i].second, items_[i].first);
            }
        }
    }

    // Forward declaration for Array<T>
    template<typename T> friend class Array;

    // Get keys as array
    Array<K> keys() const;
    
    // Get values as array  
    Array<V> values() const;

    // Iterators for range-based for loops (in insertion order, skip tombstones)
    iterator begin() { return iterator(items_.begin(), items_.end(), &index_); }
    iterator end() { return iterator(items_.end(), items_.end(), &index_); }
    const_iterator begin() const { return const_iterator(items_.begin(), items_.end(), &index_); }
    const_iterator end() const { return const_iterator(items_.end(), items_.end(), &index_); }
    const_iterator cbegin() const { return const_iterator(items_.cbegin(), items_.cend(), &index_); }
    const_iterator cend() const { return const_iterator(items_.cend(), items_.cend(), &index_); }
};

// Include Array for keys()/values() implementations
template<typename T> class Array;

} // namespace gs

// Include array.hpp after Map declaration to avoid circular dependency
#include "array.hpp"

namespace gs {

// Implement keys() and values() after Array is defined
template<typename K, typename V>
Array<K> Map<K, V>::keys() const {
    Array<K> result;
    for (const auto& [key, value] : *this) {
        result.push(key);
    }
    return result;
}

template<typename K, typename V>
Array<V> Map<K, V>::values() const {
    Array<V> result;
    for (const auto& [key, value] : *this) {
        result.push(value);
    }
    return result;
}

} // namespace gs
