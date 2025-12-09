#pragma once

#include <sstream>
#include <iomanip>
#include <string>
#include <vector>
// String/Array defined by mode-specific runtime

namespace gs {

/**
 * GoodScript JSON class - TypeScript-compatible JSON utilities (GC mode)
 * 
 * Provides JSON.stringify() functionality for basic types.
 * Uses c_str() for GC String access.
 */
class JSON {
public:
  /**
   * Converts a JavaScript value to a JSON string
   * Equivalent to TypeScript: JSON.stringify(value)
   */
  
  // Stringify for numbers
  static String stringify(double value) {
    std::ostringstream oss;
    // Check if it's an integer
    if (value == static_cast<int>(value)) {
      oss << static_cast<int>(value);
    } else {
      oss << std::fixed << std::setprecision(6) << value;
      // Remove trailing zeros
      std::string str = oss.str();
      str.erase(str.find_last_not_of('0') + 1, std::string::npos);
      if (str.back() == '.') {
        str.push_back('0');
      }
      return String(str);
    }
    return String(oss.str());
  }
  
  static String stringify(int value) {
    return String(std::to_string(value));
  }
  
  // Stringify for strings (add quotes)
  static String stringify(const String& value) {
    std::ostringstream oss;
    oss << '"';
    
    // Escape special characters
    const char* str = value.c_str();
    for (size_t i = 0; i < value.length(); i++) {
      char c = str[i];
      switch (c) {
        case '"':  oss << "\\\""; break;
        case '\\': oss << "\\\\"; break;
        case '\b': oss << "\\b"; break;
        case '\f': oss << "\\f"; break;
        case '\n': oss << "\\n"; break;
        case '\r': oss << "\\r"; break;
        case '\t': oss << "\\t"; break;
        default:
          if (c < 32) {
            // Non-printable ASCII → \uXXXX
            oss << "\\u" << std::hex << std::setw(4) << std::setfill('0') << static_cast<int>(c);
          } else {
            oss << c;
          }
      }
    }
    
    oss << '"';
    return String(oss.str());
  }
  
  static String stringify(const char* value) {
    return stringify(String(value));
  }
  
  // Stringify for booleans
  static String stringify(bool value) {
    return String(value ? "true" : "false");
  }
  
  // Stringify for null (represented as nullptr for pointers)
  static String stringify(std::nullptr_t) {
    return String("null");
  }
  
  // Stringify for arrays
  template<typename T>
  static String stringify(const Array<T>& arr) {
    if (arr.length() == 0) {
      return String("[]");
    }
    
    std::ostringstream oss;
    oss << "[";
    
    for (size_t i = 0; i < arr.length(); i++) {
      if (i > 0) {
        oss << ",";
      }
      
      // Recursive stringify for array elements
      String elem_json = stringify(arr[i]);
      oss << elem_json.c_str();
    }
    
    oss << "]";
    return String(oss.str());
  }
  
  /**
   * Parses a JSON string into a JavaScript value
   * Equivalent to TypeScript: JSON.parse(text)
   * 
   * Note: This is a stub - full implementation requires a JSON parser library.
   */
  static String parse(const String& text) {
    // TODO: Implement JSON parsing
    // For now, just return the input text
    return text;
  }
};

} // namespace gs
