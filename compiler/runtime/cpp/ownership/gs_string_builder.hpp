#pragma once

#include "gs_string.hpp"
#include <string>

namespace gs {

/**
 * StringBuilder class for efficient string concatenation
 * 
 * Unlike repeated string concatenation which is O(n²), StringBuilder
 * provides O(n) performance by using a single underlying buffer.
 * 
 * This is not part of the JavaScript API, but is provided as a 
 * performance optimization for GoodScript programs.
 * 
 * Usage:
 *   StringBuilder sb;
 *   sb.reserve(1000);  // Optional: pre-allocate capacity
 *   for (int i = 0; i < 1000; i++) {
 *     sb.append("x");
 *   }
 *   String result = sb.toString();
 */
class StringBuilder {
private:
  std::string buffer_;

public:
  // Constructors
  StringBuilder() = default;
  
  explicit StringBuilder(int capacity) {
    buffer_.reserve(capacity);
  }
  
  // Reserve capacity (performance optimization)
  void reserve(int capacity) {
    buffer_.reserve(capacity);
  }
  
  // Append operations
  StringBuilder& append(const String& str) {
    buffer_ += str;
    return *this;
  }
  
  StringBuilder& append(const char* str) {
    buffer_ += str;
    return *this;
  }
  
  StringBuilder& append(char c) {
    buffer_ += c;
    return *this;
  }
  
  StringBuilder& append(const std::string& str) {
    buffer_ += str;
    return *this;
  }
  
  // Convert to String
  String toString() const {
    return String(buffer_);
  }
  
  // Utility
  int length() const {
    return static_cast<int>(buffer_.length());
  }
  
  void clear() {
    buffer_.clear();
  }
};

} // namespace gs
