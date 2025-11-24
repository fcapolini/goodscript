#pragma once

#include <vector>
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
   * Returns a shallow copy of a portion of the array
   * Equivalent to TypeScript: arr.slice(start, end)
   */
  Array<T> slice(int start, std::optional<int> end = std::nullopt) const {
    int len = static_cast<int>(impl_.size());
    
    // Handle negative indices
    int startIdx = start < 0 ? std::max(0, len + start) : std::min(start, len);
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
   */
  template<typename Fn, typename U>
  U reduce(Fn&& callback, U initialValue) const {
    U accumulator = std::move(initialValue);
    
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
   */
  template<typename Fn>
  Array<T>& sort(Fn&& compareFn) {
    std::sort(impl_.begin(), impl_.end(), std::forward<Fn>(compareFn));
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
  
  // Array subscript operators
  
  T& operator[](int index) {
    return impl_[index];
  }
  
  const T& operator[](int index) const {
    return impl_[index];
  }
  
  // Special handling for bool to avoid vector<bool> issues
  // Note: std::vector<bool> returns a proxy type, not a reference
  // So we provide value access for it
  auto operator[](size_t index) -> decltype(impl_[index]) {
    return impl_[index];
  }
  
  auto operator[](size_t index) const -> decltype(impl_[index]) {
    return impl_[index];
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

} // namespace gs
