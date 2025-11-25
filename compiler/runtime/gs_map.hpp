#pragma once

#include <unordered_map>
#include <unordered_set>
#include <optional>
#include <vector>

namespace gs {

// Forward declarations
template<typename T> class Array;

/**
 * GoodScript Map class - TypeScript-compatible map wrapper
 * 
 * Wraps std::unordered_map with a TypeScript/JavaScript Map-like API.
 * Designed for composition, not inheritance from std::unordered_map.
 */
template<typename K, typename V>
class Map {
private:
  std::unordered_map<K, V> impl_;
  
  // Allow Object class to access impl_ for keys/values/entries
  friend class Object;

public:
  // Type aliases for STL compatibility
  using key_type = K;
  using mapped_type = V;
  using value_type = typename std::unordered_map<K, V>::value_type;
  using iterator = typename std::unordered_map<K, V>::iterator;
  using const_iterator = typename std::unordered_map<K, V>::const_iterator;
  
  // Constructors
  Map() = default;
  Map(std::initializer_list<value_type> init) : impl_(init) {}
  Map(std::unordered_map<K, V> map) : impl_(std::move(map)) {}
  Map(const Map& other) = default;
  Map(Map&& other) noexcept = default;
  
  // Assignment
  Map& operator=(const Map& other) = default;
  Map& operator=(Map&& other) noexcept = default;
  
  // TypeScript/JavaScript Map API
  
  /**
   * Returns the number of key-value pairs in the map
   * Equivalent to TypeScript: map.size
   */
  int size() const {
    return static_cast<int>(impl_.size());
  }
  
  /**
   * Sets the value for the key in the map
   * Equivalent to TypeScript: map.set(key, value)
   * Returns the map itself for chaining
   */
  Map<K, V>& set(const K& key, const V& value) {
    impl_[key] = value;
    return *this;
  }
  
  Map<K, V>& set(const K& key, V&& value) {
    impl_[key] = std::move(value);
    return *this;
  }
  
  Map<K, V>& set(K&& key, const V& value) {
    impl_[std::move(key)] = value;
    return *this;
  }
  
  Map<K, V>& set(K&& key, V&& value) {
    impl_[std::move(key)] = std::move(value);
    return *this;
  }
  
  /**
   * Returns the value associated with the key, or nullptr if not found
   * Equivalent to TypeScript: map.get(key)
   * Returns pointer to allow null return (matches JS undefined semantics)
   */
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
  
  /**
   * Subscript operator - returns pointer to value or nullptr if not found
   * Equivalent to TypeScript: map[key] (though TS uses map.get(key))
   * Matches Array operator[] semantics (returns pointer)
   */
  V* operator[](const K& key) {
    auto it = impl_.find(key);
    if (it != impl_.end()) {
      return &it->second;
    }
    return nullptr;
  }
  
  const V* operator[](const K& key) const {
    auto it = impl_.find(key);
    if (it != impl_.end()) {
      return &it->second;
    }
    return nullptr;
  }
  
  /**
   * Returns a boolean indicating whether an element with the specified key exists
   * Equivalent to TypeScript: map.has(key)
   */
  bool has(const K& key) const {
    return impl_.find(key) != impl_.end();
  }
  
  /**
   * Removes the specified element from the map
   * Equivalent to TypeScript: map.delete(key)
   * Returns true if the element was removed, false otherwise
   */
  bool delete_(const K& key) {
    return impl_.erase(key) > 0;
  }
  
  // Note: 'delete' is a C++ keyword, so we use 'delete_' instead
  // The codegen should map map.delete() to map.delete_()
  
  /**
   * Removes all elements from the map
   * Equivalent to TypeScript: map.clear()
   */
  void clear() {
    impl_.clear();
  }
  
  /**
   * Calls a callback function for each key-value pair in the map
   * Equivalent to TypeScript: map.forEach(callback)
   */
  template<typename Fn>
  void forEach(Fn&& callback) {
    for (auto& [key, value] : impl_) {
      callback(value, key);
    }
  }
  
  template<typename Fn>
  void forEach(Fn&& callback) const {
    for (const auto& [key, value] : impl_) {
      callback(value, key);
    }
  }
  
  /**
   * Returns an array of all keys in the map
   * Equivalent to TypeScript: Array.from(map.keys())
   */
  Array<K> keys() const {
    Array<K> result;
    for (const auto& [key, value] : impl_) {
      result.push(key);
    }
    return result;
  }
  
  /**
   * Returns an array of all values in the map
   * Equivalent to TypeScript: Array.from(map.values())
   */
  Array<V> values() const {
    Array<V> result;
    for (const auto& [key, value] : impl_) {
      result.push(value);
    }
    return result;
  }
  
  /**
   * Returns an array of [key, value] pairs
   * Equivalent to TypeScript: Array.from(map.entries())
   */
  Array<std::pair<K, V>> entries() const {
    Array<std::pair<K, V>> result;
    for (const auto& [key, value] : impl_) {
      result.push(std::make_pair(key, value));
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
   * Explicit access to underlying std::unordered_map
   */
  const std::unordered_map<K, V>& map() const {
    return impl_;
  }
  
  /**
   * Get underlying std::unordered_map (mutable)
   */
  std::unordered_map<K, V>& map() {
    return impl_;
  }
  
  // Comparison operators
  
  bool operator==(const Map<K, V>& other) const {
    return impl_ == other.impl_;
  }
  
  bool operator!=(const Map<K, V>& other) const {
    return impl_ != other.impl_;
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
