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
 *   - gs::JSON: JSON.stringify() and JSON.parse()
 *   - gs::console: console.log(), console.error(), console.warn()
 *   - gs::shared_ptr<T>: Non-atomic shared pointer for single-threaded use
 *   - gs::weak_ptr<T>: Non-atomic weak pointer for single-threaded use
 */

#include "gs_string.hpp"
#include "gs_array.hpp"
#include "gs_map.hpp"
#include "gs_json.hpp"
#include "gs_console.hpp"
#include "gs_tuple.hpp"
#include "gs_array_impl.hpp"

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

} // namespace gs
