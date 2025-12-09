#pragma once

#include "allocator.hpp"
#include <vector>
#include <unordered_map>

namespace gs {

/**
 * GC-allocated Set implementation.
 * Preserves insertion order like JavaScript Set.
 * Uses vector for ordered storage and unordered_map for O(1) lookup.
 */
template<typename T>
class Set {
private:
    std::vector<T> items_;               // Insertion-ordered storage
    std::unordered_map<T, size_t> index_; // Value -> index in items_ for O(1) lookup

    // Compact the items_ vector by removing tombstones
    void compact() {
        std::vector<T> new_items;
        new_items.reserve(index_.size());
        std::unordered_map<T, size_t> new_index;
        new_index.reserve(index_.size());
        
        for (size_t i = 0; i < items_.size(); ++i) {
            // Check if this position is the canonical one for this value
            auto it = index_.find(items_[i]);
            if (it != index_.end() && it->second == i) {
                new_index[items_[i]] = new_items.size();
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
        typename std::vector<T>::iterator current_;
        typename std::vector<T>::iterator end_;
        const std::unordered_map<T, size_t>* index_;
        typename std::vector<T>::iterator begin_;
        
        void skip_tombstones() {
            while (current_ != end_) {
                size_t pos = std::distance(begin_, current_);
                auto it = index_->find(*current_);
                // This position is valid if the index points to it
                if (it != index_->end() && it->second == pos) {
                    break;
                }
                ++current_;
            }
        }
        
    public:
        using iterator_category = std::forward_iterator_tag;
        using value_type = T;
        using difference_type = std::ptrdiff_t;
        using pointer = T*;
        using reference = T&;
        
        iterator(typename std::vector<T>::iterator begin,
                 typename std::vector<T>::iterator current,
                 typename std::vector<T>::iterator end,
                 const std::unordered_map<T, size_t>* index)
          : current_(current), end_(end), index_(index), begin_(begin) {
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
        typename std::vector<T>::const_iterator current_;
        typename std::vector<T>::const_iterator end_;
        const std::unordered_map<T, size_t>* index_;
        typename std::vector<T>::const_iterator begin_;
        
        void skip_tombstones() {
            while (current_ != end_) {
                size_t pos = std::distance(begin_, current_);
                auto it = index_->find(*current_);
                // This position is valid if the index points to it
                if (it != index_->end() && it->second == pos) {
                    break;
                }
                ++current_;
            }
        }
        
    public:
        using iterator_category = std::forward_iterator_tag;
        using value_type = T;
        using difference_type = std::ptrdiff_t;
        using pointer = const T*;
        using reference = const T&;
        
        const_iterator(typename std::vector<T>::const_iterator begin,
                       typename std::vector<T>::const_iterator current,
                       typename std::vector<T>::const_iterator end,
                       const std::unordered_map<T, size_t>* index)
          : current_(current), end_(end), index_(index), begin_(begin) {
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

    Set() = default;

    // Add value (insertion-order preserving)
    void add(const T& value) {
        // Check if already exists
        if (index_.find(value) != index_.end()) {
            return; // Already in set, maintain original insertion order
        }
        
        // Add to vector and index
        index_[value] = items_.size();
        items_.push_back(value);
        
        // Compact if too many tombstones (same threshold as Map)
        if (items_.size() > index_.size() * 2) {
            compact();
        }
    }

    // Check if value exists
    bool has(const T& value) const {
        return index_.find(value) != index_.end();
    }

    // Delete value (uses tombstone pattern)
    bool delete_(const T& value) {
        auto it = index_.find(value);
        if (it == index_.end()) {
            return false;
        }
        
        // Remove from index (creates tombstone in items_)
        index_.erase(it);
        
        // Compact if too many tombstones
        if (items_.size() > index_.size() * 2) {
            compact();
        }
        
        return true;
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

    // Forward declaration for Array<T>
    template<typename U> friend class Array;

    // Get values as array (in insertion order)
    Array<T> values() const;

    // Iterators for range-based for loops (skip tombstones, preserve insertion order)
    iterator begin() { return iterator(items_.begin(), items_.begin(), items_.end(), &index_); }
    iterator end() { return iterator(items_.begin(), items_.end(), items_.end(), &index_); }
    const_iterator begin() const { return const_iterator(items_.begin(), items_.begin(), items_.end(), &index_); }
    const_iterator end() const { return const_iterator(items_.begin(), items_.end(), items_.end(), &index_); }
};

// Include Array for values() implementation
template<typename T> class Array;

} // namespace gs

// Include array.hpp after Set declaration to avoid circular dependency
#include "array.hpp"

namespace gs {

// Implement values() after Array is defined (in insertion order)
template<typename T>
Array<T> Set<T>::values() const {
    Array<T> result;
    for (const auto& value : *this) {
        result.push(value);
    }
    return result;
}

} // namespace gs

