#pragma once

#include <memory>
#include <optional>

namespace gs {

/**
 * Iterator protocol support for GoodScript
 * 
 * TypeScript:
 *   interface IteratorResult<T> {
 *     done: boolean;
 *     value: T;
 *   }
 *   
 *   interface Iterator<T> {
 *     next(): IteratorResult<T>;
 *     return?(value?: T): IteratorResult<T>;
 *   }
 *   
 *   interface Iterable<T> {
 *     [Symbol.iterator](): Iterator<T>;
 *   }
 * 
 * C++ Mapping:
 *   - Iterable<T> classes must have __iterator() method returning shared_ptr<Iterator<T>>
 *   - for-of loops call __iterator() and iterate until done == true
 *   - Range-based for works directly with C++ iterators (no conversion needed)
 */

template<typename T>
struct IteratorResult {
  bool done;
  T value;
  
  IteratorResult() : done(true), value(T()) {}
  IteratorResult(bool d, T v) : done(d), value(std::move(v)) {}
  
  // Factory methods for clarity
  static IteratorResult<T> yield(T v) {
    return IteratorResult<T>(false, std::move(v));
  }
  
  static IteratorResult<T> finish() {
    return IteratorResult<T>(true, T());
  }
  
  static IteratorResult<T> finish(T v) {
    return IteratorResult<T>(true, std::move(v));
  }
};

/**
 * Base class for TypeScript-style iterators
 * Subclasses implement next() method
 */
template<typename T>
class Iterator {
public:
  virtual ~Iterator() = default;
  
  virtual IteratorResult<T> next() = 0;
  
  virtual std::optional<IteratorResult<T>> return_(std::optional<T> value = std::nullopt) {
    // Default implementation: just finish
    if (value.has_value()) {
      return IteratorResult<T>::finish(std::move(value.value()));
    } else {
      return IteratorResult<T>::finish();
    }
  }
};

/**
 * C++ range adapter - wraps a TypeScript-style Iterator to work with range-based for
 * 
 * Usage:
 *   auto iter = obj->__iterator();  // Gets shared_ptr<Iterator<T>>
 *   for (const auto& item : make_range(iter)) {
 *     // use item
 *   }
 * 
 * Or generated code can call:
 *   for (const auto& item : obj->__iterable()) {
 *     // use item
 *   }
 * where __iterable() returns IteratorRange<T>
 */
template<typename T>
class IteratorRange {
private:
  std::shared_ptr<Iterator<T>> iter_;
  
public:
  class iterator {
  private:
    std::shared_ptr<Iterator<T>> iter_;
    IteratorResult<T> current_;
    bool is_end_;
    
    void advance() {
      if (!is_end_) {
        current_ = iter_->next();
        if (current_.done) {
          is_end_ = true;
        }
      }
    }
    
  public:
    using iterator_category = std::input_iterator_tag;
    using value_type = T;
    using difference_type = std::ptrdiff_t;
    using pointer = const T*;
    using reference = const T&;
    
    iterator(std::shared_ptr<Iterator<T>> iter, bool is_end)
      : iter_(iter), is_end_(is_end) {
      if (!is_end_) {
        advance();
      }
    }
    
    reference operator*() const { return current_.value; }
    pointer operator->() const { return &current_.value; }
    
    iterator& operator++() {
      advance();
      return *this;
    }
    
    iterator operator++(int) {
      iterator tmp = *this;
      advance();
      return tmp;
    }
    
    bool operator==(const iterator& other) const {
      return is_end_ == other.is_end_;
    }
    
    bool operator!=(const iterator& other) const {
      return !(*this == other);
    }
  };
  
  explicit IteratorRange(std::shared_ptr<Iterator<T>> iter)
    : iter_(std::move(iter)) {}
  
  iterator begin() { return iterator(iter_, false); }
  iterator end() { return iterator(iter_, true); }
};

/**
 * Helper function to create an IteratorRange from an Iterator
 */
template<typename T>
IteratorRange<T> make_range(std::shared_ptr<Iterator<T>> iter) {
  return IteratorRange<T>(std::move(iter));
}

} // namespace gs
