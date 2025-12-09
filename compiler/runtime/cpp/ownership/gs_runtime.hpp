#pragma once

/**
 * GoodScript Runtime Library
 * 
 * Main header that includes all GoodScript standard library wrappers.
 * Include this file in generated C++ code to get TypeScript-compatible APIs.
 * 
 * Usage:
 *   #include "gs_runtime.hpp"
 * 
 * This provides:
 *   - gs::String: TypeScript-compatible string wrapper
 *   - gs::Array<T>: TypeScript-compatible array wrapper
 *   - gs::Map<K,V>: TypeScript-compatible map wrapper
 *   - gs::Set<T>: TypeScript-compatible set wrapper
 *   - gs::Property: Type-erased value wrapper for object literal properties
 *   - gs::LiteralObject: Object literals with heterogeneous property types
 *   - gs::JSON: JSON.stringify() and JSON.parse()
 *   - gs::console: console.log(), console.error(), console.warn()
 *   - gs::Math: Math functions (sin, cos, sqrt, PI, etc.)
 *   - gs::Number: Number utilities (isNaN, isFinite, etc.)
 *   - gs::Object: Object utilities (keys, values, entries, assign, is)
 *   - gs::RegExp: Regular expression support with full JS semantics (PCRE2)
 *   - gs::Error: Error classes (Error, TypeError, RangeError, SyntaxError, etc.)
 *   - gs::Iterator<T>: TypeScript-style iterator protocol
 *   - gs::Iterable<T>: TypeScript-style iterable protocol
 *   - gs::setTimeout/clearTimeout: Timer support for async operations
 *   - gs::setInterval/clearInterval: Interval timer support
 *   - gs::FileSystem: Cross-platform filesystem operations (sync)
 *   - gs::FileSystemAsync: Async filesystem operations (requires cppcoro)
 *   - gs::shared_ptr<T>: Non-atomic shared pointer for single-threaded use
 *   - gs::weak_ptr<T>: Non-atomic weak pointer for single-threaded use
 */

#include <functional>

// Ownership mode runtime types (must be included BEFORE common files)
#include "gs_string.hpp"
#include "gs_string_builder.hpp"
#include "gs_array.hpp"
#include "gs_map.hpp"
#include "gs_iterator.hpp"
#include "gs_property.hpp"
#include "gs_json.hpp"
#include "gs_console.hpp"
#include "gs_math.hpp"
#include "gs_object.hpp"
#include "gs_number.hpp"
#include "gs_tuple.hpp"
#include "gs_date.hpp"
#include "gs_error.hpp"
#include "gs_timer.hpp"
#include "gs_process.hpp"

// Memory profiling (optional, enabled with -DGS_MEMORY_PROFILE)
#ifdef GS_MEMORY_PROFILE
#include "memory-profile.hpp"
#endif

// FileSystem support (requires std::filesystem)
// Not available on wasm32-wasi and some embedded platforms
// Define GS_ENABLE_FILESYSTEM to include FileSystem support
#ifdef GS_ENABLE_FILESYSTEM
#include "gs_filesystem.hpp"
#endif

// HTTP support (requires libcurl)
// Define GS_ENABLE_HTTP to include HTTP support
#ifdef GS_ENABLE_HTTP
#include "gs_http.hpp"
#endif

// RegExp support (requires PCRE2 library)
// Define GS_ENABLE_REGEXP and link with: -lpcre2-8
#ifdef GS_ENABLE_REGEXP
#include "gs_regexp.hpp"
#else
// Stub RegExp class when PCRE2 not available
// Provides minimal interface so String methods compile
namespace gs {
  class RegExp {
  public:
    RegExp(const std::string& pattern, const std::string& flags = "") {
      throw std::runtime_error("RegExp support not enabled. Compile with -DGS_ENABLE_REGEXP -lpcre2-8");
    }
  };
}
#endif

// Promise support (requires cppcoro library)
// Only included when cppcoro headers are available (async/await usage)
#ifdef CPPCORO_TASK_HPP_INCLUDED
#include "gs_promise.hpp"
#endif

#include "gs_array_impl.hpp"

#ifdef GS_ENABLE_REGEXP
#include "gs_regexp_impl.hpp"
#endif

// Memory management utilities
#include <memory>

namespace gs {

/**
 * Non-atomic shared_ptr for single-threaded performance
 * 
 * GoodScript targets single-threaded execution, so we use non-atomic
 * reference counting for better performance.
 * 
 * Note: This is a placeholder. Full implementation requires custom allocator
 * or using boost::shared_ptr with non-atomic counting.
 * For now, we use std::shared_ptr (which is atomic).
 */
template<typename T>
using shared_ptr = std::shared_ptr<T>;

/**
 * Non-atomic weak_ptr for single-threaded performance
 */
template<typename T>
using weak_ptr = std::weak_ptr<T>;

/**
 * Helper to create shared_ptr
 */
template<typename T, typename... Args>
shared_ptr<T> make_shared(Args&&... args) {
  return std::make_shared<T>(std::forward<Args>(args)...);
}

/**
 * Helper to wrap values for container push operations
 * 
 * This function intelligently wraps values based on the expected type:
 * - If PtrType is a smart pointer and value is not, wrap it
 * - Otherwise, return value as-is or move it
 */
template<typename PtrType, typename ValueType>
auto wrap_for_push(ValueType&& value) {
  if constexpr (std::is_same_v<PtrType, std::unique_ptr<typename PtrType::element_type>>) {
    // Wrapping for unique_ptr
    if constexpr (std::is_same_v<std::remove_reference_t<ValueType>, typename PtrType::element_type>) {
      // Value is raw element type, wrap it
      return std::make_unique<typename PtrType::element_type>(std::forward<ValueType>(value));
    } else {
      // Value is already unique_ptr or compatible, move it
      return std::forward<ValueType>(value);
    }
  } else if constexpr (std::is_same_v<PtrType, shared_ptr<typename PtrType::element_type>>) {
    // Wrapping for shared_ptr
    if constexpr (std::is_same_v<std::remove_reference_t<ValueType>, typename PtrType::element_type>) {
      // Value is raw element type, wrap it
      return make_shared<typename PtrType::element_type>(std::forward<ValueType>(value));
    } else {
      // Value is already shared_ptr or compatible, move it
      return std::forward<ValueType>(value);
    }
  } else {
    // Not a smart pointer type, just forward the value
    return std::forward<ValueType>(value);
  }
}

// Type name helpers for runtime typeof checks
template<typename T>
inline String type_name(const T& value) {
  // Default: use "object" for any non-primitive type
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
