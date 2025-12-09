#pragma once

#include "string.hpp"
#include "allocator.hpp"
#include <cstring>
#include <algorithm>

namespace gs {

/**
 * StringBuilder for efficient string concatenation in GC mode.
 * 
 * Uses a growable buffer with exponential growth strategy to minimize
 * allocations during repeated concatenation operations.
 * 
 * Usage:
 *   StringBuilder sb;
 *   for (int i = 0; i < n; i++) {
 *     sb.append("value");
 *   }
 *   String result = sb.toString();
 */
class StringBuilder {
private:
    char* buffer_;
    size_t length_;
    size_t capacity_;
    
    static constexpr size_t INITIAL_CAPACITY = 256;
    static constexpr size_t MAX_CAPACITY = 1024 * 1024 * 100; // 100MB max
    
    void ensureCapacity(size_t needed) {
        if (capacity_ >= needed) return;
        
        // Exponential growth: double capacity until we reach needed size
        size_t new_capacity = std::max(capacity_ * 2, needed);
        
        // Cap at MAX_CAPACITY
        if (new_capacity > MAX_CAPACITY) {
            new_capacity = std::max(needed, MAX_CAPACITY);
        }
        
        // Allocate new buffer
        char* new_buffer = gc::Allocator::alloc_array<char>(new_capacity);
        
        // Copy existing content
        if (buffer_ && length_ > 0) {
            std::memcpy(new_buffer, buffer_, length_);
        }
        
        buffer_ = new_buffer;
        capacity_ = new_capacity;
    }
    
public:
    StringBuilder() 
        : buffer_(nullptr), length_(0), capacity_(0) {
        ensureCapacity(INITIAL_CAPACITY);
    }
    
    explicit StringBuilder(size_t initial_capacity) 
        : buffer_(nullptr), length_(0), capacity_(0) {
        ensureCapacity(initial_capacity);
    }
    
    // Append a String
    StringBuilder& append(const String& str) {
        size_t str_len = str.length();
        if (str_len == 0) return *this;
        
        ensureCapacity(length_ + str_len + 1); // +1 for null terminator
        std::memcpy(buffer_ + length_, str.c_str(), str_len);
        length_ += str_len;
        return *this;
    }
    
    // Append a C string
    StringBuilder& append(const char* str) {
        if (!str) return *this;
        size_t str_len = std::strlen(str);
        if (str_len == 0) return *this;
        
        ensureCapacity(length_ + str_len + 1);
        std::memcpy(buffer_ + length_, str, str_len);
        length_ += str_len;
        return *this;
    }
    
    // Append a character
    StringBuilder& append(char c) {
        ensureCapacity(length_ + 2); // +1 for char, +1 for null terminator
        buffer_[length_++] = c;
        return *this;
    }
    
    // Get current length
    size_t length() const { return length_; }
    
    // Get current capacity
    size_t capacity() const { return capacity_; }
    
    // Clear the builder (keeps the buffer)
    void clear() {
        length_ = 0;
    }
    
    // Convert to String
    String toString() const {
        if (length_ == 0) {
            return String("");
        }
        
        // Null-terminate
        buffer_[length_] = '\0';
        
        // Create String from buffer
        return String(buffer_);
    }
    
    // Get raw C string (null-terminated)
    const char* c_str() const {
        if (!buffer_ || length_ == 0) {
            return "";
        }
        buffer_[length_] = '\0';
        return buffer_;
    }
};

} // namespace gs
