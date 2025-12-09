#pragma once

#include "allocator.hpp"
#include "string.hpp"
#include "string-builder.hpp"
#include <iostream>  // For std::ostream and operator<<
#include <stdexcept>
#include <algorithm>
#include <optional>
#include <cstring>   // For memcpy, memmove
#include <type_traits>  // For std::is_trivially_copyable

namespace gs {

// Forward declaration
class StringBuilder;

/**
 * GC-allocated Array implementation (Optimized).
 * 
 * Optimizations:
 * - 1.5x growth factor (less memory waste than 2x)
 * - memcpy for POD types (faster bulk copy)
 * - Smarter initial capacity
 */
template<typename T>
class Array {
private:
    T* data_;
    size_t length_;
    size_t capacity_;

    // Growth factor: 1.5x is optimal balance between:
    // - Memory waste (2x wastes 50%, 1.5x wastes 33%)
    // - Reallocation frequency (1.5x reallocates ~2.7 more times)
    // - Cache efficiency (1.5x has better locality)
    static constexpr double GROWTH_FACTOR = 1.5;
    static constexpr size_t MIN_CAPACITY = 8;  // Start with 8 elements

    size_t calculate_growth(size_t current) const {
        if (current == 0) return MIN_CAPACITY;
        size_t growth = static_cast<size_t>(current * GROWTH_FACTOR);
        return std::max(growth, current + 1);  // Ensure at least +1
    }

    void resize_capacity(size_t new_capacity) {
        T* new_data = gc::Allocator::alloc_array<T>(new_capacity);
        
        if (data_ && length_ > 0) {
            // Use memcpy for POD types (10-50x faster than element copy)
            if (std::is_trivially_copyable<T>::value) {
                std::memcpy(new_data, data_, length_ * sizeof(T));
            } else {
                // Move existing elements for non-POD types
                for (size_t i = 0; i < length_; ++i) {
                    new_data[i] = std::move(data_[i]);
                }
            }
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

    // Element access with optimized auto-resize
    T& operator[](size_t index) {
        // Auto-resize if needed (1.5x growth for efficiency)
        if (index >= capacity_) {
            size_t new_capacity = std::max(index + 1, calculate_growth(capacity_));
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
    
    /**
     * Sets the length of the array (JavaScript semantics)
     * Equivalent to TypeScript: arr.length = newLength
     * Truncates if newLength < current length, pads with default values if larger
     */
    void setLength(int newLength) {
        if (newLength < 0) {
            throw std::invalid_argument("Array length must be non-negative");
        }
        size_t new_len = static_cast<size_t>(newLength);
        
        if (new_len > capacity_) {
            resize_capacity(new_len);
        }
        
        // Initialize new elements to default values if expanding
        for (size_t i = length_; i < new_len; ++i) {
            data_[i] = T{};
        }
        
        length_ = new_len;
    }

    // Methods with optimized growth
    void push(const T& value) {
        if (length_ >= capacity_) {
            resize_capacity(calculate_growth(capacity_));
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
            resize_capacity(calculate_growth(capacity_));
        }
        
        // Shift elements right - use memmove for POD types
        if (std::is_trivially_copyable<T>::value && length_ > 0) {
            std::memmove(data_ + 1, data_, length_ * sizeof(T));
        } else {
            for (size_t i = length_; i > 0; --i) {
                data_[i] = data_[i - 1];
            }
        }
        
        data_[0] = value;
        ++length_;
    }

    T shift() {
        if (length_ == 0) {
            throw std::runtime_error("Cannot shift from empty array");
        }
        
        T result = data_[0];
        
        // Shift elements left - use memmove for POD types
        if (std::is_trivially_copyable<T>::value && length_ > 1) {
            std::memmove(data_, data_ + 1, (length_ - 1) * sizeof(T));
        } else {
            for (size_t i = 1; i < length_; ++i) {
                data_[i - 1] = data_[i];
            }
        }
        
        --length_;
        return result;
    }

    // Resize array to new size
    void resize(size_t new_size) {
        if (new_size > capacity_) {
            resize_capacity(new_size);
        }
        // If shrinking, elements beyond new_size are abandoned
        // If growing, new elements are default-initialized
        if (new_size > length_) {
            for (size_t i = length_; i < new_size; ++i) {
                data_[i] = T();  // Default-initialize new elements
            }
        }
        length_ = new_size;
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
        
        if (length_ == 1) {
            return String::from(data_[0]);
        }
        
        // Use StringBuilder for efficient concatenation
        // Pre-calculate total size to allocate once
        size_t total_size = 0;
        for (size_t i = 0; i < length_; ++i) {
            String elem = String::from(data_[i]);
            total_size += elem.length();
        }
        if (length_ > 1) {
            total_size += separator.length() * (length_ - 1);
        }
        
        // Create StringBuilder with pre-calculated capacity
        StringBuilder sb(total_size + 1);
        
        // Build the result
        sb.append(String::from(data_[0]));
        for (size_t i = 1; i < length_; ++i) {
            sb.append(separator);
            sb.append(String::from(data_[i]));
        }
        
        return sb.toString();
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

    /**
     * Performance optimization methods (not part of JavaScript API)
     */

    /**
     * Safe element access with default value (JavaScript semantics)
     * Returns default value for out-of-bounds or negative indices
     * Equivalent to JavaScript: arr[index] || defaultValue
     */
    T get_or_default(int index, const T& defaultValue = T{}) const {
        if (index < 0 || index >= static_cast<int>(length_)) {
            return defaultValue;
        }
        return data_[static_cast<size_t>(index)];
    }

    /**
     * Direct element access by reference (no bounds checking)
     * For performance-critical code where bounds are known to be valid
     */
    T& at_ref(int index) {
        return data_[static_cast<size_t>(index)];
    }

    const T& at_ref(int index) const {
        return data_[static_cast<size_t>(index)];
    }

    /**
     * Subscript operator for convenient array indexing
     * Returns const reference for efficient access
     */
    const T& operator[](int index) const {
        return at_ref(index);
    }

    T& operator[](int index) {
        return at_ref(index);
    }

    /**
     * Direct element assignment without bounds checking or resize
     * For performance-critical code where bounds are known to be valid
     */
    void set_unchecked(int index, const T& value) {
        data_[static_cast<size_t>(index)] = value;
    }

    /**
     * Element assignment with inline bounds checking and auto-resize
     * More efficient than IIFE pattern for dynamic array access
     */
    void set(int index, const T& value) {
        size_t idx = static_cast<size_t>(index);
        if (idx >= length_) {
            resize(idx + 1);
        }
        data_[idx] = value;
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

    // Check if array includes a value
    bool includes(const T& searchElement) const {
        for (size_t i = 0; i < length_; ++i) {
            if (data_[i] == searchElement) {
                return true;
            }
        }
        return false;
    }

    // Iterators for range-based for loops
    T* begin() { return data_; }
    T* end() { return data_ + length_; }
    const T* begin() const { return data_; }
    const T* end() const { return data_ + length_; }
};

// String::split() implementation (must be after Array is defined)
inline Array<String> String::split(const String& separator) const {
    Array<String> result;
    
    if (length_ == 0) {
        return result;
    }
    
    if (separator.length_ == 0) {
        // Split into individual characters
        for (size_t i = 0; i < length_; ++i) {
            result.push(charAt(i));
        }
        return result;
    }
    
    size_t start = 0;
    while (start < length_) {
        // Find next occurrence of separator
        int64_t pos = indexOf(separator, start);
        
        if (pos == -1) {
            // No more separators, add rest of string
            result.push(substring(start));
            break;
        }
        
        // Add substring before separator
        result.push(substring(start, static_cast<size_t>(pos)));
        start = static_cast<size_t>(pos) + separator.length_;
    }
    
    return result;
}

// Stream output operators for Array types (must be after Array template definition)
inline std::ostream& operator<<(std::ostream& os, const Array<double>& arr) {
    os << "[";
    for (size_t i = 0; i < arr.length(); ++i) {
        if (i > 0) os << ", ";
        os << arr[static_cast<int>(i)];
    }
    os << "]";
    return os;
}

inline std::ostream& operator<<(std::ostream& os, const Array<int32_t>& arr) {
    os << "[";
    for (size_t i = 0; i < arr.length(); ++i) {
        if (i > 0) os << ", ";
        os << arr[static_cast<int>(i)];
    }
    os << "]";
    return os;
}

inline std::ostream& operator<<(std::ostream& os, const Array<String>& arr) {
    os << "[";
    for (size_t i = 0; i < arr.length(); ++i) {
        if (i > 0) os << ", ";
        // Use c_str() directly to avoid potential operator<< issues
        os << "\"" << arr[static_cast<int>(i)].c_str() << "\"";
    }
    os << "]";
    return os;
}

} // namespace gs
