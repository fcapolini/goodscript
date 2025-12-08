/**
 * GoodScript GC Runtime Header
 * 
 * Unified header for GC mode compilation.
 * Includes MPS allocator and GC-based runtime types.
 */

#pragma once

#define GS_GC_MODE  // Define GS_GC_MODE for conditional compilation

// MPS (Memory Pool System) garbage collector
#include "gc/allocator.hpp"
#include "gc/allocator-bump.hpp"  // Fast bump allocator for short-lived objects

// Memory profiling (optional, enabled with -DGS_MEMORY_PROFILE)
#ifdef GS_MEMORY_PROFILE
#include "gc/memory-profile.hpp"
#endif

// GC runtime types
#include "gc/string.hpp"
#include "gc/string-builder.hpp"
#include "gc/array.hpp"
#include "gc/map.hpp"
#include "gc/set.hpp"
#include "gc/number.hpp"
#include "gc/date.hpp"
#include "gc/error.hpp"
#include "gc/promise.hpp"  // Promise wrapper for async operations
#include "gs_iterator.hpp"  // Iterator protocol support
#include "gs_timer.hpp"      // Timer support (setTimeout/clearTimeout)
#include "gs_process.hpp"    // Process API (command-line arguments)

// FileSystem support (requires std::filesystem)
// Not available on wasm32-wasi and some embedded platforms
#ifdef GS_ENABLE_FILESYSTEM
#include "gs_filesystem.hpp" // Filesystem operations (FileSystem, FileSystemAsync)
#endif

// RegExp support (requires PCRE2 library)
#ifdef GS_ENABLE_REGEXP
#include "gs_regexp.hpp"     // Regular expression support (RegExp)
#else
// Stub RegExp class when PCRE2 not available
namespace gs {
  class RegExp {
  public:
    RegExp(const std::string& pattern, const std::string& flags = "") {
      throw std::runtime_error("RegExp support not enabled. Compile with -DGS_ENABLE_REGEXP -lpcre2-8");
    }
  };
}
#endif

#include <iostream>
#include <sstream>
#include <optional>
#include <stdexcept>
#include <cmath>
#include <limits>

namespace gs {

// Console namespace for logging
namespace console {
  inline void log(const String& str) {
    std::cout << str.c_str() << std::endl;
  }
  
  inline void log(bool value) {
    std::cout << (value ? "true" : "false") << std::endl;
  }
  
  template<typename T>
  void log(const T& value) {
    std::cout << value << std::endl;
  }

  inline void error(const String& str) {
    std::cerr << str.c_str() << std::endl;
  }
  
  template<typename T>
  void error(const T& value) {
    std::cerr << value << std::endl;
  }
}

// JSON namespace (simplified)
namespace JSON {
  // Forward declarations for template specializations
  template<typename T>
  String stringify(const Array<T>& arr);
  
  template<typename T>
  String stringify(const T& value) {
    std::ostringstream oss;
    oss << value;
    return String(oss.str());
  }
  
  // Specialization for String
  inline String stringify(const String& str) {
    return String("\"") + str + String("\"");
  }
  
  // Specialization for Array
  template<typename T>
  String stringify(const Array<T>& arr) {
    String result = String("[");
    for (size_t i = 0; i < arr.length(); ++i) {
      if (i > 0) {
        result += String(",");
      }
      result += stringify(arr[i]);
    }
    result += String("]");
    return result;
  }
}

// Global functions
inline int64_t parseInt(const String& str, int base = 10) {
  return std::strtoll(str.c_str(), nullptr, base);
}

inline double parseFloat(const String& str) {
  return std::strtod(str.c_str(), nullptr);
}

inline bool isNaN(double value) {
  return std::isnan(value);
}

inline bool isFinite(double value) {
  return std::isfinite(value);
}

// Math namespace
namespace Math {
  constexpr double PI = 3.14159265358979323846;
  constexpr double E = 2.71828182845904523536;
  
  inline double abs(double x) { return std::abs(x); }
  inline double floor(double x) { return std::floor(x); }
  inline double ceil(double x) { return std::ceil(x); }
  inline double round(double x) { return std::round(x); }
  inline double sqrt(double x) { return std::sqrt(x); }
  inline double pow(double x, double y) { return std::pow(x, y); }
  inline double sin(double x) { return std::sin(x); }
  inline double cos(double x) { return std::cos(x); }
  inline double tan(double x) { return std::tan(x); }
  inline double max(double a, double b) { return std::max(a, b); }
  inline double min(double a, double b) { return std::min(a, b); }
  inline double random() { return static_cast<double>(rand()) / RAND_MAX; }
  inline int sign(double x) { return (x > 0) - (x < 0); }
  inline int sign(int x) { return (x > 0) - (x < 0); }
}

// Type name helpers for runtime typeof checks
template<typename T>
inline String type_name(const T& value) {
  // Default: use typeid for class types
  // This returns "object" for any non-primitive type
  return String("object");
}

// Specializations for primitive types
inline String type_name(double value) {
  return String("number");
}

inline String type_name(int value) {
  return String("number");
}

inline String type_name(float value) {
  return String("number");
}

inline String type_name(bool value) {
  return String("boolean");
}

inline String type_name(const String& value) {
  return String("string");
}

inline String type_name(const char* value) {
  return String("string");
}

// For optionals, unwrap and check inner type
template<typename T>
inline String type_name(const std::optional<T>& value) {
  if (value.has_value()) {
    return type_name(value.value());
  }
  return String("undefined");
}

} // namespace gs

