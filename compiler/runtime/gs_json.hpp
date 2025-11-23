#pragma once

#include <sstream>
#include <iomanip>
#include <string>
#include <vector>
#include <memory>
#include "gs_string.hpp"
#include "gs_array.hpp"

namespace gs {

/**
 * GoodScript JSON class - TypeScript-compatible JSON utilities
 * 
 * Provides JSON.parse() and JSON.stringify() functionality.
 * Note: Full JSON support requires a JSON library (e.g., nlohmann/json).
 * This is a minimal implementation for basic types.
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
  
  // Stringify for integers
  static String stringify(int value) {
    return String(std::to_string(value));
  }
  
  // Stringify for booleans
  static String stringify(bool value) {
    return String(value ? "true" : "false");
  }
  
  // Stringify for strings (adds quotes and escapes)
  static String stringify(const String& value) {
    std::ostringstream oss;
    oss << '"';
    
    for (int i = 0; i < value.length(); ++i) {
      char c = value[i];
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
            // Control character - use unicode escape
            oss << "\\u" << std::hex << std::setw(4) << std::setfill('0') << static_cast<int>(c);
          } else {
            oss << c;
          }
          break;
      }
    }
    
    oss << '"';
    return String(oss.str());
  }
  
  // Stringify for const char*
  static String stringify(const char* value) {
    return stringify(String(value));
  }
  
  // Stringify for number arrays
  static String stringify(const Array<double>& arr) {
    std::ostringstream oss;
    oss << '[';
    
    for (int i = 0; i < arr.length(); ++i) {
      if (i > 0) oss << ',';
      oss << stringify(arr[i]).str();
    }
    
    oss << ']';
    return String(oss.str());
  }
  
  // Stringify for integer arrays
  static String stringify(const Array<int>& arr) {
    std::ostringstream oss;
    oss << '[';
    
    for (int i = 0; i < arr.length(); ++i) {
      if (i > 0) oss << ',';
      oss << arr[i];
    }
    
    oss << ']';
    return String(oss.str());
  }
  
  // Stringify for string arrays
  static String stringify(const Array<String>& arr) {
    std::ostringstream oss;
    oss << '[';
    
    for (int i = 0; i < arr.length(); ++i) {
      if (i > 0) oss << ',';
      oss << stringify(arr[i]).str();
    }
    
    oss << ']';
    return String(oss.str());
  }
  
  // Stringify for boolean arrays
  static String stringify(const Array<bool>& arr) {
    std::ostringstream oss;
    oss << '[';
    
    for (int i = 0; i < arr.length(); ++i) {
      if (i > 0) oss << ',';
      oss << (arr[i] ? "true" : "false");
    }
    
    oss << ']';
    return String(oss.str());
  }
  
  // Stringify for std::vector (for interop)
  static String stringify(const std::vector<double>& vec) {
    return stringify(Array<double>(vec));
  }
  
  static String stringify(const std::vector<int>& vec) {
    return stringify(Array<int>(vec));
  }
  
  static String stringify(const std::vector<std::string>& vec) {
    Array<String> arr;
    for (const auto& s : vec) {
      arr.push(String(s));
    }
    return stringify(arr);
  }
  
  /**
   * Parses a JSON string
   * Equivalent to TypeScript: JSON.parse(text)
   * 
   * Note: This is a very basic implementation. For production use,
   * integrate a proper JSON library like nlohmann/json or simdjson.
   */
  static String parse(const String& text) {
    // TODO: Implement full JSON parsing
    // For now, just return the input (placeholder)
    // In production, use nlohmann::json or similar
    return text;
  }
};

} // namespace gs
