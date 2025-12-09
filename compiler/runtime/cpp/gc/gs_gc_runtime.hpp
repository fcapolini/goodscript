/**
 * GoodScript GC Runtime Header
 * 
 * Unified header for GC mode compilation.
 * Includes MPS allocator and GC-based runtime types.
 */

#pragma once

#define GS_GC_MODE  // Define GS_GC_MODE for conditional compilation

// MPS (Memory Pool System) garbage collector
#include "allocator.hpp"
#include "allocator-bump.hpp"  // Fast bump allocator for short-lived objects

// Memory profiling (optional, enabled with -DGS_MEMORY_PROFILE)
#ifdef GS_MEMORY_PROFILE
#include "memory-profile.hpp"
#endif

// GC runtime types (must be included BEFORE common files)
#include "string.hpp"
#include "string-builder.hpp"
#include "array.hpp"
#include "map.hpp"
#include "set.hpp"
#include "number.hpp"
#include "date.hpp"
#include "error.hpp"
#include "promise.hpp"  // Promise wrapper for async operations
#include "iterator.hpp"
#include "timer.hpp"
#include "process.hpp"
#include "console.hpp"
#include "math.hpp"
#include "json.hpp"

// FileSystem support (requires std::filesystem)
// Not available on wasm32-wasi and some embedded platforms
#ifdef GS_ENABLE_FILESYSTEM
#include "filesystem.hpp"
#endif

// HTTP support (requires libcurl)
#ifdef GS_ENABLE_HTTP
#include "http.hpp"
#endif

// RegExp support (requires PCRE2 library)
#ifdef GS_ENABLE_REGEXP
#include "regexp.hpp"
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

