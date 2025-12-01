#pragma once

#include "allocator-simple.hpp"
#include "string.hpp"
#include <stdexcept>
#include <algorithm>
#include <optional>

namespace gs {

/**
 * GC-allocated Array implementation.
 * Elements are stored inline, and the array itself is GC-managed.
 */
template<typename T>
class Array {
private:
    T* data_;
    size_t length_;
    size_t capacity_;

    void resize_capacity(size_t new_capacity) {
        T* new_data = gc::Allocator::alloc_array<T>(new_capacity);
        
        // Move existing elements
        for (size_t i = 0; i < length_; ++i) {
            new_data[i] = data_[i];
        }
        
        data_ = new_data;
        capacity_ = new_capacity;
    }

public:
    Array() : data_(nullptr), length_(0), capacity_(0) {}

    explicit Array(size_t initial_capacity) {
        length_ = 0;
        capacity_ = initial_capacity;
        if (capacity_ > 0) {
            data_ = gc::Allocator::alloc_array<T>(capacity_);
        } else {
            data_ = nullptr;
        }
    }

    // Copy constructor
    Array(const Array& other) {
        length_ = other.length_;
        capacity_ = other.capacity_;
        if (capacity_ > 0) {
            data_ = gc::Allocator::alloc_array<T>(capacity_);
            for (size_t i = 0; i < length_; ++i) {
                data_[i] = other.data_[i];
            }
        } else {
            data_ = nullptr;
        }
    }

    // Initializer list constructor
    Array(std::initializer_list<T> init) {
        length_ = init.size();
        capacity_ = length_;
        if (capacity_ > 0) {
            data_ = gc::Allocator::alloc_array<T>(capacity_);
            size_t i = 0;
            for (const T& elem : init) {
                data_[i++] = elem;
            }
        } else {
            data_ = nullptr;
        }
    }

    // Assignment
    Array& operator=(const Array& other) {
        if (this != &other) {
            length_ = other.length_;
            capacity_ = other.capacity_;
            if (capacity_ > 0) {
                data_ = gc::Allocator::alloc_array<T>(capacity_);
                for (size_t i = 0; i < length_; ++i) {
                    data_[i] = other.data_[i];
                }
            } else {
                data_ = nullptr;
            }
        }
        return *this;
    }

    // Element access
    T& operator[](size_t index) {
        // Auto-resize if needed
        if (index >= capacity_) {
            size_t new_capacity = std::max(index + 1, capacity_ * 2);
            resize_capacity(new_capacity);
        }
        if (index >= length_) {
            length_ = index + 1;
        }
        return data_[index];
    }

    const T& operator[](size_t index) const {
        if (index >= length_) {
            throw std::out_of_range("Array index out of bounds");
        }
        return data_[index];
    }

    // Properties
    size_t length() const { return length_; }
    size_t size() const { return length_; }

    // Methods
    void push(const T& value) {
        if (length_ >= capacity_) {
            size_t new_capacity = capacity_ == 0 ? 4 : capacity_ * 2;
            resize_capacity(new_capacity);
        }
        data_[length_++] = value;
    }

    void push_back(const T& value) {
        push(value);
    }

    T pop() {
        if (length_ == 0) {
            throw std::runtime_error("Cannot pop from empty array");
        }
        return data_[--length_];
    }

    void unshift(const T& value) {
        if (length_ >= capacity_) {
            size_t new_capacity = capacity_ == 0 ? 4 : capacity_ * 2;
            resize_capacity(new_capacity);
        }
        
        // Shift elements right
        for (size_t i = length_; i > 0; --i) {
            data_[i] = data_[i - 1];
        }
        
        data_[0] = value;
        ++length_;
    }

    T shift() {
        if (length_ == 0) {
            throw std::runtime_error("Cannot shift from empty array");
        }
        
        T result = data_[0];
        
        // Shift elements left
        for (size_t i = 1; i < length_; ++i) {
            data_[i - 1] = data_[i];
        }
        
        --length_;
        return result;
    }

    int64_t indexOf(const T& value) const {
        for (size_t i = 0; i < length_; ++i) {
            if (data_[i] == value) {
                return static_cast<int64_t>(i);
            }
        }
        return -1;
    }

    // Join array elements into a string
    String join(const String& separator = String(",")) const {
        if (length_ == 0) {
            return String("");
        }
        
        String result = String::from(data_[0]);
        for (size_t i = 1; i < length_; ++i) {
            result += separator;
            result += String::from(data_[i]);
        }
        return result;
    }

    // Higher-order array methods

    template<typename F>
    auto map(F func) const -> Array<decltype(func(data_[0]))> {
        using R = decltype(func(data_[0]));
        Array<R> result(length_);
        for (size_t i = 0; i < length_; ++i) {
            result.push(func(data_[i]));
        }
        return result;
    }

    template<typename F>
    Array<T> filter(F predicate) const {
        Array<T> result;
        for (size_t i = 0; i < length_; ++i) {
            if (predicate(data_[i])) {
                result.push(data_[i]);
            }
        }
        return result;
    }

    template<typename R, typename F>
    R reduce(F func, R initial) const {
        R accumulator = initial;
        for (size_t i = 0; i < length_; ++i) {
            accumulator = func(accumulator, data_[i]);
        }
        return accumulator;
    }

    template<typename F>
    std::optional<T> find(F predicate) const {
        for (size_t i = 0; i < length_; ++i) {
            if (predicate(data_[i])) {
                return data_[i];
            }
        }
        return std::nullopt;
    }

    template<typename F>
    int64_t findIndex(F predicate) const {
        for (size_t i = 0; i < length_; ++i) {
            if (predicate(data_[i])) {
                return static_cast<int64_t>(i);
            }
        }
        return -1;
    }

    template<typename F>
    bool some(F predicate) const {
        for (size_t i = 0; i < length_; ++i) {
            if (predicate(data_[i])) {
                return true;
            }
        }
        return false;
    }

    template<typename F>
    bool every(F predicate) const {
        for (size_t i = 0; i < length_; ++i) {
            if (!predicate(data_[i])) {
                return false;
            }
        }
        return true;
    }

    template<typename F>
    void forEach(F func) const {
        for (size_t i = 0; i < length_; ++i) {
            func(data_[i]);
        }
    }

    Array<T> slice(int64_t start = 0, int64_t end = -1) const {
        if (start < 0) start = std::max(int64_t(0), int64_t(length_) + start);
        if (end < 0) end = length_;
        if (end > int64_t(length_)) end = length_;
        if (start >= end) return Array<T>();

        Array<T> result;
        for (int64_t i = start; i < end; ++i) {
            result.push(data_[i]);
        }
        return result;
    }

    template<typename F>
    Array<T> sort(F comparator) {
        // JavaScript comparators return number (negative/zero/positive)
        // C++ std::sort expects bool comparator
        std::sort(data_, data_ + length_, [&](const T& a, const T& b) {
            auto result = comparator(a, b);
            return result < 0;
        });
        return *this;
    }

    Array<T> reverse() {
        std::reverse(data_, data_ + length_);
        return *this;
    }

    // Iterators for range-based for loops
    T* begin() { return data_; }
    T* end() { return data_ + length_; }
    const T* begin() const { return data_; }
    const T* end() const { return data_ + length_; }
};

} // namespace gs
