#pragma once

#include <algorithm>
#include <unordered_map>
#include <unordered_set>
#include <optional>
#include <vector>
#include "gs_array.hpp"

namespace gs {

/**
 * GoodScript Map class - TypeScript-compatible map wrapper
 * 
 * Preserves insertion order like JavaScript Map.
 * Uses a vector to track insertion order and an unordered_map for O(1) lookup.
 * Designed for composition, not inheritance from std::unordered_map.
 */
template<typename K, typename V>
class Map {
private:
  std::vector<std::pair<K, V>> items_;  // Insertion-ordered storage
  std::unordered_map<K, size_t> index_; // Key -> index in items_ for O(1) lookup
  
  // Allow Object class to access impl_ for keys/values/entries
  friend class Object;

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

  // Type aliases for STL compatibility
  using key_type = K;
  using mapped_type = V;
  using value_type = std::pair<K, V>;
  // iterator and const_iterator are defined as classes above
  
  // Constructors
  Map() = default;
  Map(std::initializer_list<value_type> init) {
    for (const auto& [k, v] : init) {
      set(k, v);
    }
  }
  Map(std::unordered_map<K, V> map) {
    for (auto& [k, v] : map) {
      set(std::move(k), std::move(v));
    }
  }
  Map(const Map& other) = default;
  Map(Map&& other) noexcept = default;
  
  // Assignment
  Map& operator=(const Map& other) = default;
  Map& operator=(Map&& other) noexcept = default;
  
  // TypeScript/JavaScript Map API
  
  /**
   * Reserve space for expected number of elements
   * Helps avoid rehashing during bulk inserts
   */
  void reserve(int capacity) {
    items_.reserve(static_cast<size_t>(capacity));
    index_.reserve(static_cast<size_t>(capacity));
  }
  
  /**
   * Returns the number of key-value pairs in the map
   * Equivalent to TypeScript: map.size
   */
  int size() const {
    return static_cast<int>(index_.size());
  }
  
  /**
   * Sets the value for the key in the map
   * Equivalent to TypeScript: map.set(key, value)
   * Returns the map itself for chaining
   * Preserves insertion order - updates don't change order
   */
  Map<K, V>& set(const K& key, const V& value) {
    auto it = index_.find(key);
    if (it != index_.end()) {
      // Key exists - update value in place
      items_[it->second].second = value;
    } else {
      // New key - append to items and record index
      index_[key] = items_.size();
      items_.emplace_back(key, value);
    }
    return *this;
  }
  
  Map<K, V>& set(const K& key, V&& value) {
    auto it = index_.find(key);
    if (it != index_.end()) {
      items_[it->second].second = std::move(value);
    } else {
      index_[key] = items_.size();
      items_.emplace_back(key, std::move(value));
    }
    return *this;
  }
  
  Map<K, V>& set(K&& key, const V& value) {
    auto it = index_.find(key);
    if (it != index_.end()) {
      items_[it->second].second = value;
    } else {
      auto key_copy = key;
      index_[std::move(key)] = items_.size();
      items_.emplace_back(std::move(key_copy), value);
    }
    return *this;
  }
  
  Map<K, V>& set(K&& key, V&& value) {
    auto it = index_.find(key);
    if (it != index_.end()) {
      items_[it->second].second = std::move(value);
    } else {
      auto key_copy = key;
      index_[std::move(key)] = items_.size();
      items_.emplace_back(std::move(key_copy), std::move(value));
    }
    return *this;
  }
  
  /**
   * Returns the value associated with the key, or nullptr if not found
   * Equivalent to TypeScript: map.get(key)
   * Returns pointer to allow null return (matches JS undefined semantics)
   */
  V* get(const K& key) {
    auto it = index_.find(key);
    if (it != index_.end()) {
      return &items_[it->second].second;
    }
    return nullptr;
  }
  
  const V* get(const K& key) const {
    auto it = index_.find(key);
    if (it != index_.end()) {
      return &items_[it->second].second;
    }
    return nullptr;
  }
  
  /**
   * Subscript operator - returns pointer to value or nullptr if not found
   * Equivalent to TypeScript: map[key] (though TS uses map.get(key))
   * Matches Array operator[] semantics (returns pointer)
   */
  V* operator[](const K& key) {
    auto it = index_.find(key);
    if (it != index_.end()) {
      return &items_[it->second].second;
    }
    return nullptr;
  }
  
  const V* operator[](const K& key) const {
    auto it = index_.find(key);
    if (it != index_.end()) {
      return &items_[it->second].second;
    }
    return nullptr;
  }
  
  /**
   * Returns a boolean indicating whether an element with the specified key exists
   * Equivalent to TypeScript: map.has(key)
   */
  bool has(const K& key) const {
    return index_.find(key) != index_.end();
  }
  
  /**
   * Removes the specified element from the map
   * Equivalent to TypeScript: map.delete(key)
   * Returns true if the element was removed, false otherwise
   * Maintains insertion order by using tombstone (null key)
   */
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
  
  // Note: 'delete' is a C++ keyword, so we use 'delete_' instead
  // The codegen should map map.delete() to map.delete_()
  
  /**
   * Removes all elements from the map
   * Equivalent to TypeScript: map.clear()
   */
  void clear() {
    items_.clear();
    index_.clear();
  }

private:
  /**
   * Compact the items_ vector by removing tombstones
   * and updating the index_ map
   */
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
  
  /**
   * Calls a callback function for each key-value pair in the map
   * Equivalent to TypeScript: map.forEach(callback)
   * Iterates in insertion order
   */
  template<typename Fn>
  void forEach(Fn&& callback) {
    for (auto& [key, value] : *this) {
      callback(value, key);
    }
  }
  
  template<typename Fn>
  void forEach(Fn&& callback) const {
    for (const auto& [key, value] : *this) {
      callback(value, key);
    }
  }
  
  /**
   * Returns an array of all keys in the map
   * Equivalent to TypeScript: Array.from(map.keys())
   * Returns keys in insertion order
   */
  Array<K> keys() const {
    Array<K> result;
    for (const auto& [key, value] : *this) {
      result.push(key);
    }
    return result;
  }
  
  /**
   * Returns an array of all values in the map
   * Equivalent to TypeScript: Array.from(map.values())
   * Returns values in insertion order
   */
  Array<V> values() const {
    Array<V> result;
    for (const auto& [key, value] : *this) {
      result.push(value);
    }
    return result;
  }
  
  /**
   * Returns an array of [key, value] pairs
   * Equivalent to TypeScript: Array.from(map.entries())
   * Returns entries in insertion order
   */
  Array<std::pair<K, V>> entries() const {
    Array<std::pair<K, V>> result;
    for (const auto& [key, value] : *this) {
      result.push(std::make_pair(key, value));
    }
    return result;
  }
  
  // STL-compatible iterators (in insertion order, automatically skip tombstones)
  
  iterator begin() { return iterator(items_.begin(), items_.end(), &index_); }
  iterator end() { return iterator(items_.end(), items_.end(), &index_); }
  const_iterator begin() const { return const_iterator(items_.begin(), items_.end(), &index_); }
  const_iterator end() const { return const_iterator(items_.end(), items_.end(), &index_); }
  const_iterator cbegin() const { return const_iterator(items_.cbegin(), items_.cend(), &index_); }
  const_iterator cend() const { return const_iterator(items_.cend(), items_.cend(), &index_); }
  
  // Conversion operators for C++ interop
  
  /**
   * Build and return an unordered_map from current items
   * Note: This loses insertion order information
   */
  std::unordered_map<K, V> to_unordered_map() const {
    std::unordered_map<K, V> result;
    for (const auto& [key, value] : *this) {
      result[key] = value;
    }
    return result;
  }
  
  // Comparison operators
  
  bool operator==(const Map<K, V>& other) const {
    if (index_.size() != other.index_.size()) return false;
    // Compare all key-value pairs (order-independent)
    for (const auto& [key, idx] : index_) {
      auto it = other.index_.find(key);
      if (it == other.index_.end() || items_[idx].second != other.items_[it->second].second) {
        return false;
      }
    }
    return true;
  }
  
  bool operator!=(const Map<K, V>& other) const {
    return !(*this == other);
  }
};

/**
 * GoodScript Set class - TypeScript-compatible set wrapper
 * 
 * Wraps std::unordered_set with a TypeScript/JavaScript Set-like API.
 */
template<typename T>
class Set {
private:
  std::unordered_set<T> impl_;

public:
  // Type aliases for STL compatibility
  using value_type = T;
  using iterator = typename std::unordered_set<T>::iterator;
  using const_iterator = typename std::unordered_set<T>::const_iterator;
  
  // Constructors
  Set() = default;
  Set(std::initializer_list<T> init) : impl_(init) {}
  Set(std::unordered_set<T> set) : impl_(std::move(set)) {}
  Set(const Set& other) = default;
  Set(Set&& other) noexcept = default;
  
  // Assignment
  Set& operator=(const Set& other) = default;
  Set& operator=(Set&& other) noexcept = default;
  
  // TypeScript/JavaScript Set API
  
  /**
   * Returns the number of elements in the set
   * Equivalent to TypeScript: set.size
   */
  int size() const {
    return static_cast<int>(impl_.size());
  }
  
  /**
   * Adds a value to the set
   * Equivalent to TypeScript: set.add(value)
   * Returns the set itself for chaining
   */
  Set<T>& add(const T& value) {
    impl_.insert(value);
    return *this;
  }
  
  Set<T>& add(T&& value) {
    impl_.insert(std::move(value));
    return *this;
  }
  
  /**
   * Returns a boolean indicating whether an element exists in the set
   * Equivalent to TypeScript: set.has(value)
   */
  bool has(const T& value) const {
    return impl_.find(value) != impl_.end();
  }
  
  /**
   * Removes the specified element from the set
   * Equivalent to TypeScript: set.delete(value)
   * Returns true if the element was removed, false otherwise
   */
  bool delete_(const T& value) {
    return impl_.erase(value) > 0;
  }
  
  /**
   * Removes all elements from the set
   * Equivalent to TypeScript: set.clear()
   */
  void clear() {
    impl_.clear();
  }
  
  /**
   * Calls a callback function for each element in the set
   * Equivalent to TypeScript: set.forEach(callback)
   */
  template<typename Fn>
  void forEach(Fn&& callback) {
    for (auto& value : impl_) {
      callback(value);
    }
  }
  
  template<typename Fn>
  void forEach(Fn&& callback) const {
    for (const auto& value : impl_) {
      callback(value);
    }
  }
  
  /**
   * Returns an array of all values in the set
   * Equivalent to TypeScript: Array.from(set.values())
   */
  Array<T> values() const {
    Array<T> result;
    for (const auto& value : impl_) {
      result.push(value);
    }
    return result;
  }
  
  // STL-compatible iterators
  
  iterator begin() { return impl_.begin(); }
  iterator end() { return impl_.end(); }
  const_iterator begin() const { return impl_.begin(); }
  const_iterator end() const { return impl_.end(); }
  const_iterator cbegin() const { return impl_.cbegin(); }
  const_iterator cend() const { return impl_.cend(); }
  
  // Conversion operators for C++ interop
  
  /**
   * Explicit access to underlying std::unordered_set
   */
  const std::unordered_set<T>& set() const {
    return impl_;
  }
  
  /**
   * Get underlying std::unordered_set (mutable)
   */
  std::unordered_set<T>& set() {
    return impl_;
  }
  
  // Comparison operators
  
  bool operator==(const Set<T>& other) const {
    return impl_ == other.impl_;
  }
  
  bool operator!=(const Set<T>& other) const {
    return impl_ != other.impl_;
  }
};

} // namespace gs
