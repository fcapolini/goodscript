#pragma once

#include "allocator-simple.hpp"
#include <cstring>
#include <string>
#include <stdexcept>

namespace gs {

/**
 * GC-allocated String implementation.
 * Similar to ownership version but uses MPS allocation instead of std::string.
 */
class String {
private:
    char* data_;
    size_t length_;
    size_t capacity_;

    void resize(size_t new_capacity) {
        char* new_data = gc::Allocator::alloc_array<char>(new_capacity);
        if (data_) {
            std::memcpy(new_data, data_, length_);
        }
        data_ = new_data;
        capacity_ = new_capacity;
    }

public:
    String() : data_(nullptr), length_(0), capacity_(0) {}

    String(const char* str) {
        if (!str) {
            length_ = 0;
            capacity_ = 0;
            data_ = nullptr;
            return;
        }
        length_ = std::strlen(str);
        capacity_ = length_ + 1;
        data_ = gc::Allocator::alloc_array<char>(capacity_);
        std::memcpy(data_, str, length_);
        data_[length_] = '\0';
    }

    String(const std::string& str) : String(str.c_str()) {}

    String(const String& other) {
        length_ = other.length_;
        capacity_ = other.capacity_;
        if (capacity_ > 0) {
            data_ = gc::Allocator::alloc_array<char>(capacity_);
            std::memcpy(data_, other.data_, length_ + 1);
        } else {
            data_ = nullptr;
        }
    }

    String& operator=(const String& other) {
        if (this != &other) {
            length_ = other.length_;
            capacity_ = other.capacity_;
            if (capacity_ > 0) {
                data_ = gc::Allocator::alloc_array<char>(capacity_);
                std::memcpy(data_, other.data_, length_ + 1);
            } else {
                data_ = nullptr;
            }
        }
        return *this;
    }

    // String concatenation
    String operator+(const String& other) const {
        String result;
        result.length_ = length_ + other.length_;
        result.capacity_ = result.length_ + 1;
        result.data_ = gc::Allocator::alloc_array<char>(result.capacity_);
        
        if (data_) std::memcpy(result.data_, data_, length_);
        if (other.data_) std::memcpy(result.data_ + length_, other.data_, other.length_);
        result.data_[result.length_] = '\0';
        
        return result;
    }

    String& operator+=(const String& other) {
        size_t new_length = length_ + other.length_;
        if (new_length + 1 > capacity_) {
            resize(new_length + 1);
        }
        
        if (other.data_) {
            std::memcpy(data_ + length_, other.data_, other.length_);
        }
        length_ = new_length;
        data_[length_] = '\0';
        
        return *this;
    }

    // Comparisons
    bool operator==(const String& other) const {
        if (length_ != other.length_) return false;
        return std::memcmp(data_, other.data_, length_) == 0;
    }

    bool operator!=(const String& other) const {
        return !(*this == other);
    }

    bool operator<(const String& other) const {
        int cmp = std::strcmp(data_ ? data_ : "", other.data_ ? other.data_ : "");
        return cmp < 0;
    }

    // Properties
    size_t length() const { return length_; }
    
    // Methods
    int64_t indexOf(const String& search, size_t start = 0) const {
        if (!data_ || !search.data_) return -1;
        if (start >= length_) return -1;
        
        const char* found = std::strstr(data_ + start, search.data_);
        return found ? (found - data_) : -1;
    }

    String substring(size_t start, size_t end) const {
        if (start >= length_) return String();
        if (end > length_) end = length_;
        if (start >= end) return String();
        
        String result;
        result.length_ = end - start;
        result.capacity_ = result.length_ + 1;
        result.data_ = gc::Allocator::alloc_array<char>(result.capacity_);
        std::memcpy(result.data_, data_ + start, result.length_);
        result.data_[result.length_] = '\0';
        
        return result;
    }

    String toLowerCase() const {
        String result(*this);
        for (size_t i = 0; i < result.length_; ++i) {
            result.data_[i] = std::tolower(result.data_[i]);
        }
        return result;
    }

    String toUpperCase() const {
        String result(*this);
        for (size_t i = 0; i < result.length_; ++i) {
            result.data_[i] = std::toupper(result.data_[i]);
        }
        return result;
    }

    bool startsWith(const String& search) const {
        if (search.length_ > length_) return false;
        return std::memcmp(data_, search.data_, search.length_) == 0;
    }

    String trim() const {
        if (!data_ || length_ == 0) return String();
        
        size_t start = 0;
        while (start < length_ && std::isspace(data_[start])) ++start;
        
        size_t end = length_;
        while (end > start && std::isspace(data_[end - 1])) --end;
        
        return substring(start, end);
    }

    // Conversion
    const char* c_str() const {
        return data_ ? data_ : "";
    }

    std::string to_std_string() const {
        return std::string(data_ ? data_ : "");
    }

    // Static methods
    static String fromCharCode(int code) {
        char buf[2] = {static_cast<char>(code), '\0'};
        return String(buf);
    }
};

// Stream output operator
inline std::ostream& operator<<(std::ostream& os, const String& str) {
    return os << str.c_str();
}

} // namespace gs
