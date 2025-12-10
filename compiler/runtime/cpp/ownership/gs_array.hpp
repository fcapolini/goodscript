#pragma once

#include <vector>
#include <deque>
#include <algorithm>
#include <functional>
#include <optional>
#include <sstream>

namespace gs {

// Forward declaration
class String;

/**
 * GoodScript Array class - TypeScript-compatible array wrapper
 * 
 * Wraps std::vector with a TypeScript/JavaScript-like API.
 * Designed for composition, not inheritance from std::vector.
 */
template<typename T>
class Array {
  // Allow all Array instantiations to access each other's private members
  // This is needed for map() which creates Array<R> from Array<T>
  template<typename U>
  friend class Array;

private:
  std::vector<T> impl_;

public:
  // Type aliases for STL compatibility
  using value_type = T;
  using iterator = typename std::vector<T>::iterator;
  using const_iterator = typename std::vector<T>::const_iterator;
  
  // Constructors
  Array() = default;
  Array(std::initializer_list<T> init) : impl_(init) {}
  explicit Array(int size) : impl_(size) {}
  Array(int size, const T& value) : impl_(size, value) {}
  Array(std::vector<T> vec) : impl_(std::move(vec)) {}
  Array(const Array& other) = default;
  Array(Array&& other) noexcept = default;
  
  // Assignment
  Array& operator=(const Array& other) = default;
  Array& operator=(Array&& other) noexcept = default;
  
  // TypeScript/JavaScript Array API
  
  /**
   * Returns the number of elements in the array
   * Equivalent to TypeScript: arr.length
   */
  int length() const {
    return static_cast<int>(impl_.size());
  }
  
  /**
   * Sets the length of the array (JavaScript semantics)
   * Equivalent to TypeScript: arr.length = newLength
   * Truncates if newLength < current length, pads with default values if larger
   */
  void setLength(int newLength) {
    if (newLength < 0) {
      throw std::invalid_argument("Array length must be non-negative");
    }
    impl_.resize(static_cast<size_t>(newLength));
  }
  
  /**
   * Adds one or more elements to the end of the array
   * Equivalent to TypeScript: arr.push(element)
   * Returns the new length
   */
  int push(const T& element) {
    impl_.push_back(element);
    return static_cast<int>(impl_.size());
  }
  
  int push(T&& element) {
    impl_.push_back(std::move(element));
    return static_cast<int>(impl_.size());
  }
  
  // STL compatibility aliases for std::back_inserter and algorithms
  void push_back(const T& element) {
    impl_.push_back(element);
  }
  
  void push_back(T&& element) {
    impl_.push_back(std::move(element));
  }
  
  size_t size() const {
    return impl_.size();
  }
  
  /**
   * Resizes the array to contain the specified number of elements
   * If the new size is larger, new elements are value-initialized
   * Equivalent to C++: vector.resize(count)
   */
  void resize(size_t count) {
    impl_.resize(count);
  }
  
  void resize(size_t count, const T& value) {
    impl_.resize(count, value);
  }
  
  /**
   * Reserves capacity for at least the specified number of elements
   * Equivalent to C++: vector.reserve(capacity)
   * This is a performance optimization to avoid reallocations during push()
   */
  void reserve(size_t capacity) {
    impl_.reserve(capacity);
  }
  
  /**
   * Returns the current capacity (number of elements that can be stored without reallocation)
   */
  size_t capacity() const {
    return impl_.capacity();
  }
  
  /**
   * Removes the last element from the array and returns it
   * Equivalent to TypeScript: arr.pop()
   */
  std::optional<T> pop() {
    if (impl_.empty()) {
      return std::nullopt;
    }
    T value = std::move(impl_.back());
    impl_.pop_back();
    return value;
  }
  
  /**
   * Removes the first element from the array and returns it
   * Equivalent to TypeScript: arr.shift()
   */
  std::optional<T> shift() {
    if (impl_.empty()) {
      return std::nullopt;
    }
    T value = std::move(impl_.front());
    impl_.erase(impl_.begin());
    return value;
  }
  
  /**
   * Adds one or more elements to the beginning of the array
   * Equivalent to TypeScript: arr.unshift(element)
   * Returns the new length
   */
  int unshift(const T& element) {
    impl_.insert(impl_.begin(), element);
    return static_cast<int>(impl_.size());
  }
  
  int unshift(T&& element) {
    impl_.insert(impl_.begin(), std::move(element));
    return static_cast<int>(impl_.size());
  }
  
  /**
   * Returns a shallow copy of a portion of the array.
   * Equivalent to TypeScript: arr.slice(start, end)
   */
  Array<T> slice(std::optional<int> start = std::nullopt, std::optional<int> end = std::nullopt) const {
    int len = static_cast<int>(impl_.size());
    
    // Handle negative indices
    int startIdx = start.has_value()
      ? (start.value() < 0 ? std::max(0, len + start.value()) : std::min(start.value(), len))
      : 0;
    int endIdx = end.has_value() 
      ? (end.value() < 0 ? std::max(0, len + end.value()) : std::min(end.value(), len))
      : len;
    
    if (startIdx >= endIdx) {
      return Array<T>();
    }
    
    return Array<T>(std::vector<T>(impl_.begin() + startIdx, impl_.begin() + endIdx));
  }
  
  /**
   * Changes the contents of the array by removing or replacing elements
   * Equivalent to TypeScript: arr.splice(start, deleteCount, ...items)
   */
  Array<T> splice(int start, int deleteCount) {
    int len = static_cast<int>(impl_.size());
    int startIdx = start < 0 ? std::max(0, len + start) : std::min(start, len);
    int actualDeleteCount = std::max(0, std::min(deleteCount, len - startIdx));
    
    Array<T> deleted;
    if (actualDeleteCount > 0) {
      auto startIt = impl_.begin() + startIdx;
      auto endIt = startIt + actualDeleteCount;
      deleted = Array<T>(std::vector<T>(startIt, endIt));
      impl_.erase(startIt, endIt);
    }
    
    return deleted;
  }
  
  /**
   * Creates a new array with the results of calling a function for every element
   * Equivalent to TypeScript: arr.map(callback)
   */
  template<typename Fn>
  auto map(Fn&& callback) const -> Array<decltype(callback(std::declval<T>()))> {
    using ResultType = decltype(callback(std::declval<T>()));
    Array<ResultType> result;
    result.impl_.reserve(impl_.size());
    
    for (const auto& element : impl_) {
      result.impl_.push_back(callback(element));
    }
    
    return result;
  }
  
  /**
   * Creates a new array with all elements that pass the test
   * Equivalent to TypeScript: arr.filter(callback)
   */
  template<typename Fn>
  Array<T> filter(Fn&& callback) const {
    Array<T> result;
    
    for (const auto& element : impl_) {
      if (callback(element)) {
        result.impl_.push_back(element);
      }
    }
    
    return result;
  }
  
  /**
   * Executes a reducer function on each element, resulting in a single output value
   * Equivalent to TypeScript: arr.reduce(callback, initialValue)
   * 
   * Note: The return type is deduced from the callback's return type, not the initial value.
   * This matches TypeScript semantics where reduce(callback, 0) with a callback returning
   * number produces a number result, even though 0 could be int.
   */
  template<typename Fn, typename U>
  auto reduce(Fn&& callback, U initialValue) const 
    -> decltype(callback(std::declval<U>(), std::declval<T>())) {
    using ResultType = decltype(callback(std::declval<U>(), std::declval<T>()));
    ResultType accumulator = static_cast<ResultType>(std::move(initialValue));
    
    for (const auto& element : impl_) {
      accumulator = callback(std::move(accumulator), element);
    }
    
    return accumulator;
  }
  
  /**
   * Tests whether all elements in the array pass the test
   * Equivalent to TypeScript: arr.every(callback)
   */
  template<typename Fn>
  bool every(Fn&& callback) const {
    return std::all_of(impl_.begin(), impl_.end(), std::forward<Fn>(callback));
  }
  
  /**
   * Tests whether at least one element in the array passes the test
   * Equivalent to TypeScript: arr.some(callback)
   */
  template<typename Fn>
  bool some(Fn&& callback) const {
    return std::any_of(impl_.begin(), impl_.end(), std::forward<Fn>(callback));
  }
  
  /**
   * Returns the first element that satisfies the testing function
   * Equivalent to TypeScript: arr.find(callback)
   */
  template<typename Fn>
  std::optional<T> find(Fn&& callback) const {
    auto it = std::find_if(impl_.begin(), impl_.end(), std::forward<Fn>(callback));
    if (it != impl_.end()) {
      return *it;
    }
    return std::nullopt;
  }
  
  /**
   * Returns the index of the first element that satisfies the testing function
   * Equivalent to TypeScript: arr.findIndex(callback)
   * Returns -1 if not found
   */
  template<typename Fn>
  int findIndex(Fn&& callback) const {
    auto it = std::find_if(impl_.begin(), impl_.end(), std::forward<Fn>(callback));
    if (it != impl_.end()) {
      return static_cast<int>(std::distance(impl_.begin(), it));
    }
    return -1;
  }
  
  /**
   * Returns the first index at which a given element can be found
   * Equivalent to TypeScript: arr.indexOf(searchElement)
   * Returns -1 if not found
   */
  int indexOf(const T& searchElement) const {
    auto it = std::find(impl_.begin(), impl_.end(), searchElement);
    if (it != impl_.end()) {
      return static_cast<int>(std::distance(impl_.begin(), it));
    }
    return -1;
  }
  
  /**
   * Returns the last index at which a given element can be found
   * Equivalent to TypeScript: arr.lastIndexOf(searchElement)
   * Returns -1 if not found
   */
  int lastIndexOf(const T& searchElement) const {
    auto it = std::find(impl_.rbegin(), impl_.rend(), searchElement);
    if (it != impl_.rend()) {
      return static_cast<int>(std::distance(impl_.begin(), it.base()) - 1);
    }
    return -1;
  }
  
  /**
   * Determines whether an array includes a certain element
   * Equivalent to TypeScript: arr.includes(searchElement)
   */
  bool includes(const T& searchElement) const {
    return std::find(impl_.begin(), impl_.end(), searchElement) != impl_.end();
  }
  
  /**
   * Joins all elements of an array into a string
   * Equivalent to TypeScript: arr.join(separator)
   */
  String join(const String& separator = String(",")) const;
  
  /**
   * Reverses the array in place
   * Equivalent to TypeScript: arr.reverse()
   */
  Array<T>& reverse() {
    std::reverse(impl_.begin(), impl_.end());
    return *this;
  }
  
  /**
   * Sorts the elements of an array in place
   * Equivalent to TypeScript: arr.sort()
   */
  Array<T>& sort() {
    std::sort(impl_.begin(), impl_.end());
    return *this;
  }
  
  /**
   * Sorts the elements of an array in place using a comparison function
   * Equivalent to TypeScript: arr.sort(compareFn)
   * 
   * Note: TypeScript comparators return a number (negative/zero/positive),
   * but C++ std::sort expects a boolean comparator. We wrap the user's
   * comparator to convert the numeric result to boolean.
   */
  template<typename Fn>
  Array<T>& sort(Fn&& compareFn) {
    std::sort(impl_.begin(), impl_.end(), [&](const T& a, const T& b) {
      auto result = compareFn(a, b);
      return result < 0;
    });
    return *this;
  }
  
  /**
   * Calls a function for each element in the array
   * Equivalent to TypeScript: arr.forEach(callback)
   */
  template<typename Fn>
  void forEach(Fn&& callback) {
    for (auto& element : impl_) {
      callback(element);
    }
  }
  
  /**
   * Calls a function for each element in the array (const version)
   */
  template<typename Fn>
  void forEach(Fn&& callback) const {
    for (const auto& element : impl_) {
      callback(element);
    }
  }
  
  /**
   * Flattens the array one level deep
   * Equivalent to TypeScript: arr.flat()
   */
  template<typename U = T>
  auto flat() const -> Array<typename U::value_type> {
    Array<typename U::value_type> result;
    
    for (const auto& element : impl_) {
      for (const auto& inner : element) {
        result.push(inner);
      }
    }
    
    return result;
  }
  
  // Array subscript operators return pointers (nullable)
  // Returns nullptr for out-of-bounds access (JavaScript undefined semantics)
  // In GoodScript, null and undefined are synonyms
  
  // Static bool constants for vector<bool> edge case
  // std::vector<bool> is specialized and doesn't allow &impl_[index]
  // So we return pointers to these static constants instead
  static inline const bool TRUE_VALUE = true;
  static inline const bool FALSE_VALUE = false;
  
  // Non-const int index
  T* operator[](int index) {
    if (index < 0) {
      return nullptr;
    }
    // Auto-expand array to accommodate the index (JavaScript semantics)
    if (index >= static_cast<int>(impl_.size())) {
      impl_.resize(index + 1);
    }
    if constexpr (std::is_same_v<T, bool>) {
      // For bool arrays, return pointer to static constant
      return impl_[index] ? const_cast<bool*>(&TRUE_VALUE) : const_cast<bool*>(&FALSE_VALUE);
    } else {
      return &impl_[index];
    }
  }
  
  // Const int index
  const T* operator[](int index) const {
    if (index < 0 || index >= static_cast<int>(impl_.size())) {
      return nullptr;
    }
    if constexpr (std::is_same_v<T, bool>) {
      return impl_[index] ? &TRUE_VALUE : &FALSE_VALUE;
    } else {
      return &impl_[index];
    }
  }
  
  // Non-const size_t index
  T* operator[](size_t index) {
    // Auto-expand array to accommodate the index (JavaScript semantics)
    if (index >= impl_.size()) {
      impl_.resize(index + 1);
    }
    if constexpr (std::is_same_v<T, bool>) {
      return impl_[index] ? const_cast<bool*>(&TRUE_VALUE) : const_cast<bool*>(&FALSE_VALUE);
    } else {
      return &impl_[index];
    }
  }
  
  // Const size_t index
  const T* operator[](size_t index) const {
    if (index >= impl_.size()) {
      return nullptr;
    }
    if constexpr (std::is_same_v<T, bool>) {
      return impl_[index] ? &TRUE_VALUE : &FALSE_VALUE;
    } else {
      return &impl_[index];
    }
  }
  
  /**
   * Safe element access with default value (JavaScript semantics)
   * Returns default value for out-of-bounds or negative indices
   * Equivalent to JavaScript: arr[index] || defaultValue
   */
  T get_or_default(int index, const T& defaultValue = T{}) const {
    if (index < 0 || index >= static_cast<int>(impl_.size())) {
      return defaultValue;
    }
    return impl_[static_cast<size_t>(index)];
  }
  
  /**
   * Direct element access by reference (bounds-checked)
   * For performance-critical code where bounds are known to be valid
   * Not part of JavaScript API - C++ optimization
   */
  T& at_ref(int index) {
    return impl_[static_cast<size_t>(index)];
  }
  
  const T& at_ref(int index) const {
    return impl_[static_cast<size_t>(index)];
  }
  
  /**
   * Direct element assignment without bounds checking or resize
   * For performance-critical code where bounds are known to be valid
   * Not part of JavaScript API - C++ optimization
   */
  void set_unchecked(int index, const T& value) {
    impl_[static_cast<size_t>(index)] = value;
  }
  
  void set_unchecked(int index, T&& value) {
    impl_[static_cast<size_t>(index)] = std::move(value);
  }
  
  /**
   * Element assignment with inline bounds checking and auto-resize
   * More efficient than IIFE pattern for dynamic array access
   * Not part of JavaScript API - C++ optimization for arr[idx] = value
   */
  void set(int index, const T& value) {
    size_t idx = static_cast<size_t>(index);
    if (idx >= impl_.size()) {
      impl_.resize(idx + 1);
    }
    impl_[idx] = value;
  }
  
  void set(int index, T&& value) {
    size_t idx = static_cast<size_t>(index);
    if (idx >= impl_.size()) {
      impl_.resize(idx + 1);
    }
    impl_[idx] = std::move(value);
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
   * Explicit access to underlying std::vector
   */
  const std::vector<T>& vec() const {
    return impl_;
  }
  
  /**
   * Get underlying std::vector (mutable)
   */
  std::vector<T>& vec() {
    return impl_;
  }
  
  // Comparison operators
  
  bool operator==(const Array<T>& other) const {
    return impl_ == other.impl_;
  }
  
  bool operator!=(const Array<T>& other) const {
    return impl_ != other.impl_;
  }
};

/**
 * Template specialization for Array<bool>
 * 
 * std::vector<bool> is specialized to use bit-packing, which returns
 * a proxy object instead of bool& from operator[]. This breaks our
 * at_ref() method. We use std::vector<uint8_t> internally (1 byte per bool)
 * to provide true references while maintaining better cache locality than deque.
 * 
 * Note: This uses 1 byte per boolean instead of 1 bit. For most use cases,
 * the performance benefits of true references and better cache behavior
 * outweigh the 8x memory overhead.
 */
template<>
class Array<bool> {
  template<typename U>
  friend class Array;

private:
  std::vector<uint8_t> impl_;  // Use uint8_t to avoid vector<bool> proxy issues

public:
  // Type aliases for STL compatibility
  using value_type = bool;
  
  // Constructors
  Array() = default;
  Array(std::initializer_list<bool> init) {
    impl_.reserve(init.size());
    for (bool val : init) {
      impl_.push_back(val ? 1 : 0);
    }
  }
  explicit Array(int size) : impl_(size, 0) {}
  Array(int size, bool value) : impl_(size, value ? 1 : 0) {}
  Array(const Array& other) = default;
  Array(Array&& other) noexcept = default;
  
  // Assignment
  Array& operator=(const Array& other) = default;
  Array& operator=(Array&& other) noexcept = default;
  
  // Core array methods
  int getLength() const { return static_cast<int>(impl_.size()); }
  void setLength(int newLength) { 
    if (newLength < 0) {
      throw std::invalid_argument("Array length must be non-negative");
    }
    impl_.resize(static_cast<size_t>(newLength), 0); 
  }
  int length() const { return getLength(); }  // Alias for compatibility
  
  void push(bool value) { impl_.push_back(value ? 1 : 0); }
  
  std::optional<bool> pop() {
    if (impl_.empty()) return std::nullopt;
    bool value = impl_.back() != 0;
    impl_.pop_back();
    return value;
  }
  
  std::optional<bool> shift() {
    if (impl_.empty()) return std::nullopt;
    bool value = impl_.front() != 0;
    impl_.erase(impl_.begin());
    return value;
  }
  
  void unshift(bool value) { impl_.insert(impl_.begin(), value ? 1 : 0); }
  
  Array<bool> slice(int start, std::optional<int> end = std::nullopt) const {
    int len = static_cast<int>(impl_.size());
    int actualStart = start < 0 ? std::max(0, len + start) : std::min(start, len);
    int actualEnd = end.has_value() 
      ? (end.value() < 0 ? std::max(0, len + end.value()) : std::min(end.value(), len))
      : len;
    
    if (actualStart >= actualEnd) return Array<bool>();
    
    Array<bool> result;
    result.impl_.reserve(actualEnd - actualStart);
    for (int i = actualStart; i < actualEnd; i++) {
      result.impl_.push_back(impl_[i]);
    }
    return result;
  }
  
  Array<bool> concat(const Array<bool>& other) const {
    Array<bool> result;
    result.impl_.reserve(impl_.size() + other.impl_.size());
    result.impl_ = impl_;
    result.impl_.insert(result.impl_.end(), other.impl_.begin(), other.impl_.end());
    return result;
  }
  
  std::optional<int> indexOf(bool searchElement, int fromIndex = 0) const {
    int len = static_cast<int>(impl_.size());
    int start = fromIndex < 0 ? std::max(0, len + fromIndex) : fromIndex;
    uint8_t searchVal = searchElement ? 1 : 0;
    
    for (int i = start; i < len; i++) {
      if (impl_[i] == searchVal) {
        return i;
      }
    }
    return std::nullopt;
  }
  
  bool includes(bool searchElement, int fromIndex = 0) const {
    return indexOf(searchElement, fromIndex).has_value();
  }
  
  String join(const String& separator) const;
  
  void forEach(std::function<void(bool, int)> callback) const {
    for (size_t i = 0; i < impl_.size(); i++) {
      callback(impl_[i] != 0, static_cast<int>(i));
    }
  }
  
  template<typename R>
  Array<R> map(std::function<R(bool, int)> callback) const {
    std::vector<R> result;
    result.reserve(impl_.size());
    for (size_t i = 0; i < impl_.size(); i++) {
      result.push_back(callback(impl_[i] != 0, static_cast<int>(i)));
    }
    return Array<R>(std::move(result));
  }
  
  Array<bool> filter(std::function<bool(bool, int)> predicate) const {
    Array<bool> result;
    for (size_t i = 0; i < impl_.size(); i++) {
      bool val = impl_[i] != 0;
      if (predicate(val, static_cast<int>(i))) {
        result.impl_.push_back(impl_[i]);
      }
    }
    return result;
  }
  
  std::optional<bool> find(std::function<bool(bool, int)> predicate) const {
    for (size_t i = 0; i < impl_.size(); i++) {
      bool val = impl_[i] != 0;
      if (predicate(val, static_cast<int>(i))) {
        return val;
      }
    }
    return std::nullopt;
  }
  
  bool some(std::function<bool(bool, int)> predicate) const {
    for (size_t i = 0; i < impl_.size(); i++) {
      if (predicate(impl_[i] != 0, static_cast<int>(i))) {
        return true;
      }
    }
    return false;
  }
  
  bool every(std::function<bool(bool, int)> predicate) const {
    for (size_t i = 0; i < impl_.size(); i++) {
      if (!predicate(impl_[i] != 0, static_cast<int>(i))) {
        return false;
      }
    }
    return true;
  }
  
  void reverse() {
    std::reverse(impl_.begin(), impl_.end());
  }
  
  void sort(std::function<int(bool, bool)> compareFn = nullptr) {
    if (compareFn) {
      std::sort(impl_.begin(), impl_.end(), 
        [&compareFn](uint8_t a, uint8_t b) { 
          return compareFn(a != 0, b != 0) < 0; 
        });
    } else {
      std::sort(impl_.begin(), impl_.end());
    }
  }
  
  /**
   * Safe element access with default value (JavaScript semantics)
   * Returns default value for out-of-bounds or negative indices
   */
  bool get_or_default(int index, bool defaultValue = false) const {
    if (index < 0 || index >= static_cast<int>(impl_.size())) {
      return defaultValue;
    }
    return impl_[static_cast<size_t>(index)] != 0;
  }
  
  // Direct element access - returns uint8_t& which implicitly converts to bool
  // For reading: uint8_t implicitly converts to bool
  // For writing: use set_unchecked() or operator[]
  uint8_t& at_ref(int index) {
    return impl_[static_cast<size_t>(index)];
  }
  
  const uint8_t& at_ref(int index) const {
    return impl_[static_cast<size_t>(index)];
  }
  
  // Subscript operators - return value for reading
  bool operator[](int index) const {
    return impl_[static_cast<size_t>(index)] != 0;
  }
  
  // For writing, provide a helper
  void set_unchecked(int index, bool value) {
    impl_[static_cast<size_t>(index)] = value ? 1 : 0;
  }
  
  /**
   * Element assignment with inline bounds checking and auto-resize
   * More efficient than IIFE pattern for dynamic array access
   * Matches JavaScript semantics for arr[idx] = value
   */
  void set(int index, bool value) {
    if (index < 0) {
      throw std::invalid_argument("Array index must be non-negative");
    }
    size_t idx = static_cast<size_t>(index);
    if (idx >= impl_.size()) {
      impl_.resize(idx + 1, 0);
    }
    impl_[idx] = value ? 1 : 0;
  }
  
  // STL compatibility - iterator support for range-based for loops
  // We create a custom iterator that converts uint8_t to bool on the fly
  class BoolIterator {
    typename std::vector<uint8_t>::iterator it_;
  public:
    using iterator_category = std::random_access_iterator_tag;
    using value_type = bool;
    using difference_type = std::ptrdiff_t;
    using pointer = bool*;
    using reference = bool;
    
    BoolIterator(typename std::vector<uint8_t>::iterator it) : it_(it) {}
    bool operator*() const { return *it_ != 0; }
    BoolIterator& operator++() { ++it_; return *this; }
    BoolIterator operator++(int) { BoolIterator tmp = *this; ++it_; return tmp; }
    bool operator==(const BoolIterator& other) const { return it_ == other.it_; }
    bool operator!=(const BoolIterator& other) const { return it_ != other.it_; }
  };
  
  class ConstBoolIterator {
    typename std::vector<uint8_t>::const_iterator it_;
  public:
    using iterator_category = std::random_access_iterator_tag;
    using value_type = bool;
    using difference_type = std::ptrdiff_t;
    using pointer = const bool*;
    using reference = bool;
    
    ConstBoolIterator(typename std::vector<uint8_t>::const_iterator it) : it_(it) {}
    bool operator*() const { return *it_ != 0; }
    ConstBoolIterator& operator++() { ++it_; return *this; }
    ConstBoolIterator operator++(int) { ConstBoolIterator tmp = *this; ++it_; return tmp; }
    bool operator==(const ConstBoolIterator& other) const { return it_ == other.it_; }
    bool operator!=(const ConstBoolIterator& other) const { return it_ != other.it_; }
  };
  
  BoolIterator begin() { return BoolIterator(impl_.begin()); }
  BoolIterator end() { return BoolIterator(impl_.end()); }
  ConstBoolIterator begin() const { return ConstBoolIterator(impl_.begin()); }
  ConstBoolIterator end() const { return ConstBoolIterator(impl_.end()); }
  ConstBoolIterator cbegin() const { return ConstBoolIterator(impl_.cbegin()); }
  ConstBoolIterator cend() const { return ConstBoolIterator(impl_.cend()); }
  
  bool empty() const { return impl_.empty(); }
  size_t size() const { return impl_.size(); }
  void clear() { impl_.clear(); }
  
  // Equality operators
  bool operator==(const Array<bool>& other) const {
    return impl_ == other.impl_;
  }
  
  bool operator!=(const Array<bool>& other) const {
    return impl_ != other.impl_;
  }
};

} // namespace gs
