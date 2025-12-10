#pragma once

#include <string>
#include <string_view>
#include <optional>
#include <sstream>
#include <cmath>

namespace gs {

// Forward declarations
template<typename T> class Array;
class RegExp;

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
  
  // Static factory methods
  
  /**
   * Converts any value to a String (for template literal support)
   * Handles: String, const char*, numeric types
   */
  static String from(const String& s) {
    return s;
  }
  
  static String from(const char* s) {
    return String(s);
  }
  
  static String from(const std::string& s) {
    return String(s);
  }
  
  static String from(double value) {
    // Match JavaScript number formatting:
    // - Integers don't show decimal point
    // - Floats show minimal decimal places
    if (std::floor(value) == value && std::abs(value) < 1e15) {
      // It's an integer value
      return String(std::to_string(static_cast<long long>(value)));
    } else {
      // It's a float - use minimal representation
      std::ostringstream out;
      out << value;
      return String(out.str());
    }
  }
  
  static String from(int value) {
    return String(std::to_string(value));
  }
  
  static String from(long value) {
    return String(std::to_string(value));
  }
  
  static String from(long long value) {
    return String(std::to_string(value));
  }
  
  static String from(bool value) {
    return String(value ? "true" : "false");
  }
  
  // Support for optional types
  static String from(const std::optional<double>& opt) {
    return opt.has_value() ? from(opt.value()) : String("null");
  }
  
  static String from(const std::optional<int>& opt) {
    return opt.has_value() ? from(opt.value()) : String("null");
  }
  
  static String from(const std::optional<bool>& opt) {
    return opt.has_value() ? from(opt.value()) : String("null");
  }
  
  static String from(const std::optional<String>& opt) {
    return opt.has_value() ? opt.value() : String("null");
  }
  
  // TypeScript/JavaScript String API
  
  /**
   * Returns the length of the string
   * Equivalent to TypeScript: str.length
   */
  int length() const {
    return static_cast<int>(impl_.length());
  }
  
  /**
   * Reserve capacity for string growth (performance optimization)
   * Not part of JavaScript API, but useful for performance-critical code
   */
  void reserve(int capacity) {
    impl_.reserve(capacity);
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
   * Returns the character at the specified index (as char, not String)
   * Optimized for character comparison: str[i] === 'x'
   * Not part of JavaScript API - C++ optimization only
   */
  char charCodeAt_char(int index) const {
    return impl_[index];
  }
  
  /**
   * Concatenates strings
   * Equivalent to TypeScript: str.concat(str2, str3, ...)
   */
  String concat(const String& other) const {
    return String(impl_ + other.impl_);
  }
  
  /**
   * Efficiently concatenate string with a number
   * Optimized for common pattern: "prefix" + number.toString()
   * Not part of JavaScript API - C++ optimization only
   */
  String concat_number(double value) const {
    std::string result;
    result.reserve(impl_.size() + 24); // Current string + space for number
    result = impl_;
    // Format double without unnecessary decimals
    if (std::floor(value) == value && std::abs(value) < 1e15) {
      result += std::to_string(static_cast<long long>(value));
    } else {
      result += std::to_string(value);
    }
    return String(std::move(result));
  }
  
  String concat_number(int value) const {
    std::string result;
    result.reserve(impl_.size() + 12); // Current string + space for int
    result = impl_;
    result += std::to_string(value);
    return String(std::move(result));
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
   * Extracts a substring from a string
   * Equivalent to TypeScript: str.substr(start, length)
   * Note: This method is deprecated in JavaScript but included for compatibility
   */
  String substr(int start, std::optional<int> length = std::nullopt) const {
    int len = static_cast<int>(impl_.length());
    
    // Handle negative start (counts from end)
    int actualStart = start < 0 ? std::max(0, len + start) : std::min(start, len);
    
    // Determine length
    int actualLength = length.has_value() 
      ? std::max(0, std::min(length.value(), len - actualStart))
      : len - actualStart;
    
    return String(impl_.substr(actualStart, actualLength));
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
    // C++17 compatible implementation (C++20 has starts_with)
    if (searchString.impl_.length() > impl_.length()) {
      return false;
    }
    return impl_.compare(0, searchString.impl_.length(), searchString.impl_) == 0;
  }
  
  /**
   * Checks if the string ends with the specified suffix
   * Equivalent to TypeScript: str.endsWith(searchString)
   */
  bool endsWith(const String& searchString) const {
    // C++17 compatible implementation (C++20 has ends_with)
    if (searchString.impl_.length() > impl_.length()) {
      return false;
    }
    return impl_.compare(impl_.length() - searchString.impl_.length(), 
                         searchString.impl_.length(), 
                         searchString.impl_) == 0;
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
  
  /**
   * Splits the string into an array of substrings using a separator
   * Equivalent to TypeScript: str.split(separator)
   * Implementation in gs_array_impl.hpp (after Array<T> is defined)
   */
  Array<String> split(const String& separator) const;
  
  /**
   * Splits the string using a regular expression
   * Equivalent to TypeScript: str.split(regex)
   * Implementation in gs_regexp_impl.hpp (after RegExp is defined)
   */
  Array<String> split(const RegExp& regex) const;
  
  /**
   * Splits using a pattern string
   * Convenience overload that constructs RegExp from String
   * Implementation in gs_regexp_impl.hpp
   */
  Array<String> split(const String& pattern, const String& flags) const;
  
  /**
   * Matches a string against a regular expression
   * Equivalent to TypeScript: str.match(regex)
   * Returns array of matches (global) or match with groups (non-global)
   * Implementation in gs_regexp_impl.hpp
   */
  std::optional<Array<String>> match(const RegExp& regex) const;
  
  /**
   * Matches a string against a regular expression pattern
   * Convenience overload that constructs RegExp from String
   * Implementation in gs_regexp_impl.hpp
   */
  std::optional<Array<String>> match(const String& pattern) const;
  
  /**
   * Searches for a match between a regular expression and this string
   * Equivalent to TypeScript: str.search(regex)
   * Returns the index of the first match, or -1 if not found
   * Implementation in gs_regexp_impl.hpp
   */
  int search(const RegExp& regex) const;
  
  /**
   * Searches for a match using a pattern string
   * Convenience overload that constructs RegExp from String
   * Implementation in gs_regexp_impl.hpp
   */
  int search(const String& pattern) const;
  
  /**
   * Replaces text in a string using a search string
   * Equivalent to TypeScript: str.replace(searchValue, replaceValue)
   */
  String replace(const String& searchValue, const String& replaceValue) const {
    std::string result = impl_;
    size_t pos = result.find(searchValue.impl_);
    if (pos != std::string::npos) {
      result.replace(pos, searchValue.impl_.length(), replaceValue.impl_);
    }
    return String(std::move(result));
  }
  
  /**
   * Replaces text in a string using a regular expression
   * Equivalent to TypeScript: str.replace(regex, replaceValue)
   * Implementation in gs_regexp_impl.hpp
   */
  String replace(const RegExp& regex, const String& replaceValue) const;
  
  /**
   * Replaces text using a pattern string
   * Convenience overload that constructs RegExp from String
   * Implementation in gs_regexp_impl.hpp
   */
  String replace(const String& pattern, const String& replaceValue, const String& flags) const;
  
  /**
   * Replaces all occurrences of a search string
   * Equivalent to TypeScript: str.replaceAll(searchValue, replaceValue)
   */
  String replaceAll(const String& searchValue, const String& replaceValue) const {
    std::string result = impl_;
    size_t pos = 0;
    while ((pos = result.find(searchValue.impl_, pos)) != std::string::npos) {
      result.replace(pos, searchValue.impl_.length(), replaceValue.impl_);
      pos += replaceValue.impl_.length();
    }
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
  
  // Optimize for rvalue (temporary) on left side: String("temp") + other
  String operator+(String&& other) const {
    other.impl_.insert(0, impl_);
    return std::move(other);
  }
  
  // Optimize for lvalue += rvalue
  friend String operator+(String&& left, const String& right) {
    left.impl_ += right.impl_;
    return std::move(left);
  }
  
  // Optimize for both rvalues
  friend String operator+(String&& left, String&& right) {
    left.impl_ += right.impl_;
    return std::move(left);
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
    os << str.impl_;
    return os;
  }
  
  // Optimized concatenation of string literal + integer
  // This avoids creating an intermediate String object for the number
  static String concat(const char* prefix, int value) {
    std::string result;
    result.reserve(std::strlen(prefix) + 12); // prefix + max int digits
    result = prefix;
    result += std::to_string(value);
    return String(std::move(result));
  }
  
  static String concat(const char* prefix, double value) {
    std::string result;
    result.reserve(std::strlen(prefix) + 24); // prefix + max double digits
    result = prefix;
    // Format double without unnecessary decimals
    if (std::floor(value) == value && std::abs(value) < 1e15) {
      result += std::to_string(static_cast<long long>(value));
    } else {
      result += std::to_string(value);
    }
    return String(std::move(result));
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
