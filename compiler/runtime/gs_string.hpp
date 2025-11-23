#pragma once

#include <string>
#include <string_view>
#include <optional>

namespace gs {

/**
 * GoodScript String class - TypeScript-compatible string wrapper
 * 
 * Wraps std::string with a TypeScript/JavaScript-like API.
 * Designed for composition, not inheritance from std::string.
 */
class String {
private:
  std::string impl_;

public:
  // Constructors
  String() = default;
  String(const char* s) : impl_(s) {}
  String(std::string s) : impl_(std::move(s)) {}
  String(std::string_view sv) : impl_(sv) {}
  String(const String& other) = default;
  String(String&& other) noexcept = default;
  
  // Assignment
  String& operator=(const String& other) = default;
  String& operator=(String&& other) noexcept = default;
  String& operator=(const char* s) { impl_ = s; return *this; }
  String& operator=(const std::string& s) { impl_ = s; return *this; }
  
  // TypeScript/JavaScript String API
  
  /**
   * Returns the length of the string
   * Equivalent to TypeScript: str.length
   */
  int length() const {
    return static_cast<int>(impl_.length());
  }
  
  /**
   * Returns the character at the specified index
   * Equivalent to TypeScript: str.charAt(index)
   */
  String charAt(int index) const {
    if (index < 0 || index >= static_cast<int>(impl_.length())) {
      return String("");
    }
    return String(std::string(1, impl_[index]));
  }
  
  /**
   * Returns the Unicode code point at the specified index
   * Equivalent to TypeScript: str.charCodeAt(index)
   */
  int charCodeAt(int index) const {
    if (index < 0 || index >= static_cast<int>(impl_.length())) {
      return 0; // NaN equivalent in integer context
    }
    return static_cast<int>(static_cast<unsigned char>(impl_[index]));
  }
  
  /**
   * Concatenates strings
   * Equivalent to TypeScript: str.concat(str2, str3, ...)
   */
  String concat(const String& other) const {
    return String(impl_ + other.impl_);
  }
  
  /**
   * Returns the index of the first occurrence of searchString
   * Equivalent to TypeScript: str.indexOf(searchString)
   * Returns -1 if not found
   */
  int indexOf(const String& searchString) const {
    auto pos = impl_.find(searchString.impl_);
    return (pos != std::string::npos) ? static_cast<int>(pos) : -1;
  }
  
  /**
   * Returns the index of the last occurrence of searchString
   * Equivalent to TypeScript: str.lastIndexOf(searchString)
   * Returns -1 if not found
   */
  int lastIndexOf(const String& searchString) const {
    auto pos = impl_.rfind(searchString.impl_);
    return (pos != std::string::npos) ? static_cast<int>(pos) : -1;
  }
  
  /**
   * Extracts a section of a string and returns it as a new string
   * Equivalent to TypeScript: str.slice(beginIndex, endIndex)
   */
  String slice(int beginIndex, std::optional<int> endIndex = std::nullopt) const {
    int len = static_cast<int>(impl_.length());
    
    // Handle negative indices
    int start = beginIndex < 0 ? std::max(0, len + beginIndex) : std::min(beginIndex, len);
    int end = endIndex.has_value() 
      ? (endIndex.value() < 0 ? std::max(0, len + endIndex.value()) : std::min(endIndex.value(), len))
      : len;
    
    if (start >= end) {
      return String("");
    }
    
    return String(impl_.substr(start, end - start));
  }
  
  /**
   * Extracts characters from a string
   * Equivalent to TypeScript: str.substring(indexStart, indexEnd)
   */
  String substring(int indexStart, std::optional<int> indexEnd = std::nullopt) const {
    int len = static_cast<int>(impl_.length());
    int start = std::max(0, std::min(indexStart, len));
    int end = indexEnd.has_value() ? std::max(0, std::min(indexEnd.value(), len)) : len;
    
    // substring swaps if start > end
    if (start > end) {
      std::swap(start, end);
    }
    
    return String(impl_.substr(start, end - start));
  }
  
  /**
   * Converts the string to lowercase
   * Equivalent to TypeScript: str.toLowerCase()
   */
  String toLowerCase() const {
    std::string result = impl_;
    for (char& c : result) {
      c = std::tolower(static_cast<unsigned char>(c));
    }
    return String(std::move(result));
  }
  
  /**
   * Converts the string to uppercase
   * Equivalent to TypeScript: str.toUpperCase()
   */
  String toUpperCase() const {
    std::string result = impl_;
    for (char& c : result) {
      c = std::toupper(static_cast<unsigned char>(c));
    }
    return String(std::move(result));
  }
  
  /**
   * Removes whitespace from both ends of the string
   * Equivalent to TypeScript: str.trim()
   */
  String trim() const {
    auto start = impl_.find_first_not_of(" \t\n\r\f\v");
    if (start == std::string::npos) {
      return String("");
    }
    auto end = impl_.find_last_not_of(" \t\n\r\f\v");
    return String(impl_.substr(start, end - start + 1));
  }
  
  /**
   * Checks if the string starts with the specified prefix
   * Equivalent to TypeScript: str.startsWith(searchString)
   */
  bool startsWith(const String& searchString) const {
    return impl_.starts_with(searchString.impl_);
  }
  
  /**
   * Checks if the string ends with the specified suffix
   * Equivalent to TypeScript: str.endsWith(searchString)
   */
  bool endsWith(const String& searchString) const {
    return impl_.ends_with(searchString.impl_);
  }
  
  /**
   * Checks if the string contains the specified substring
   * Equivalent to TypeScript: str.includes(searchString)
   */
  bool includes(const String& searchString) const {
    return impl_.find(searchString.impl_) != std::string::npos;
  }
  
  /**
   * Repeats the string a specified number of times
   * Equivalent to TypeScript: str.repeat(count)
   */
  String repeat(int count) const {
    if (count <= 0) {
      return String("");
    }
    std::string result;
    result.reserve(impl_.length() * count);
    for (int i = 0; i < count; ++i) {
      result += impl_;
    }
    return String(std::move(result));
  }
  
  /**
   * Pads the string with another string until it reaches the given length
   * Equivalent to TypeScript: str.padStart(targetLength, padString)
   */
  String padStart(int targetLength, const String& padString = String(" ")) const {
    int currentLen = static_cast<int>(impl_.length());
    if (currentLen >= targetLength || padString.impl_.empty()) {
      return *this;
    }
    
    int padLen = targetLength - currentLen;
    std::string result;
    result.reserve(targetLength);
    
    while (static_cast<int>(result.length()) < padLen) {
      result += padString.impl_;
    }
    result = result.substr(0, padLen);
    result += impl_;
    
    return String(std::move(result));
  }
  
  /**
   * Pads the string with another string until it reaches the given length
   * Equivalent to TypeScript: str.padEnd(targetLength, padString)
   */
  String padEnd(int targetLength, const String& padString = String(" ")) const {
    int currentLen = static_cast<int>(impl_.length());
    if (currentLen >= targetLength || padString.impl_.empty()) {
      return *this;
    }
    
    int padLen = targetLength - currentLen;
    std::string result = impl_;
    result.reserve(targetLength);
    
    while (static_cast<int>(result.length()) < targetLength) {
      result += padString.impl_;
    }
    result = result.substr(0, targetLength);
    
    return String(std::move(result));
  }
  
  // Static methods
  
  /**
   * Creates a string from a character code
   * Equivalent to TypeScript: String.fromCharCode(code)
   */
  static String fromCharCode(int code) {
    return String(std::string(1, static_cast<char>(code)));
  }
  
  // Conversion operators for C++ interop
  
  /**
   * Implicit conversion to std::string_view for efficient passing to C++ APIs
   */
  operator std::string_view() const {
    return impl_;
  }
  
  /**
   * Explicit access to underlying std::string
   */
  const std::string& str() const {
    return impl_;
  }
  
  /**
   * Get underlying std::string (mutable)
   */
  std::string& str() {
    return impl_;
  }
  
  // Comparison operators
  
  bool operator==(const String& other) const {
    return impl_ == other.impl_;
  }
  
  bool operator!=(const String& other) const {
    return impl_ != other.impl_;
  }
  
  bool operator<(const String& other) const {
    return impl_ < other.impl_;
  }
  
  bool operator<=(const String& other) const {
    return impl_ <= other.impl_;
  }
  
  bool operator>(const String& other) const {
    return impl_ > other.impl_;
  }
  
  bool operator>=(const String& other) const {
    return impl_ >= other.impl_;
  }
  
  // Concatenation operator
  
  String operator+(const String& other) const {
    return String(impl_ + other.impl_);
  }
  
  String& operator+=(const String& other) {
    impl_ += other.impl_;
    return *this;
  }
  
  // Array subscript operator (read-only)
  
  char operator[](int index) const {
    return impl_[index];
  }
  
  // Stream output
  
  friend std::ostream& operator<<(std::ostream& os, const String& str) {
    return os << str.impl_;
  }
};

} // namespace gs

// std::hash specialization for gs::String
namespace std {
  template<>
  struct hash<gs::String> {
    size_t operator()(const gs::String& s) const {
      return hash<string_view>()(s);
    }
  };
}
