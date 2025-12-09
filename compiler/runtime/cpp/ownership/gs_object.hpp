/**
 * GoodScript Object Runtime
 * 
 * Provides Object class with useful utility methods and LiteralObject type.
 */

#pragma once

#include "gs_map.hpp"
#include "gs_array.hpp"
#include "gs_property.hpp"
#include <cmath>
#include <limits>

namespace gs {

/**
 * LiteralObject - Type for object literals with heterogeneous property values
 * 
 * Maps property names (strings) to Property values (type-erased).
 * Allows object literals like { a: 1, b: "hello", c: true }
 * 
 * Example:
 *   LiteralObject obj = {
 *     {"name", Property("Alice")},
 *     {"age", Property(30)},
 *     {"active", Property(true)}
 *   };
 *   
 *   auto name = obj.get("name")->asString();  // "Alice"
 *   auto age = obj.get("age")->asNumber();    // 30.0
 */
using LiteralObject = Map<gs::String, Property>;

/**
 * Object class - provides static methods for object operations
 * 
 * Implemented methods:
 * - keys(), values(), entries() - for gs::Map and LiteralObject
 * - assign() - merge maps
 * - is() - SameValue comparison
 * 
 * Immutability methods (freeze, seal, preventExtensions) are no-ops:
 * - GoodScript's ownership system provides memory safety
 * - Type-level immutability (readonly) is a better fit (when implemented)
 * - Runtime tracking of frozen/sealed state adds overhead
 */
class Object {
public:
  // ============================================================================
  // Property Inspection (for Map)
  // ============================================================================

  /**
   * Object.keys(map) - Get array of keys
   */
  template<typename K, typename V>
  static Array<K> keys(const Map<K, V>& map) {
    Array<K> result;
    for (const auto& pair : map) {
      result.push(pair.first);
    }
    return result;
  }

  /**
   * Object.values(map) - Get array of values
   */
  template<typename K, typename V>
  static Array<V> values(const Map<K, V>& map) {
    Array<V> result;
    for (const auto& pair : map) {
      result.push(pair.second);
    }
    return result;
  }

  /**
   * Object.entries(map) - Get array of [key, value] pairs
   */
  template<typename K, typename V>
  static Array<std::pair<K, V>> entries(const Map<K, V>& map) {
    Array<std::pair<K, V>> result;
    for (const auto& pair : map) {
      result.push(pair);
    }
    return result;
  }

  // ============================================================================
  // LiteralObject overloads (for object literals with mixed types)
  // ============================================================================

  /**
   * Object.keys(literalObject) - Get array of property names
   */
  static Array<gs::String> keys(const LiteralObject& obj) {
    Array<gs::String> result;
    for (const auto& pair : obj) {
      result.push(pair.first);
    }
    return result;
  }

  /**
   * Object.values(obj) - Get array of property values
   */
  static Array<Property> values(const LiteralObject& obj) {
    Array<Property> result;
    for (const auto& pair : obj) {
      result.push(pair.second);
    }
    return result;
  }

  /**
   * Object.entries(obj) - Get array of [key, value] pairs
   */
  static Array<std::pair<String, Property>> entries(const LiteralObject& obj) {
    Array<std::pair<String, Property>> result;
    for (const auto& pair : obj) {
      result.push(pair);
    }
    return result;
  }

  // ============================================================================
  // Object Manipulation
  // ============================================================================

  /**
   * Object.assign(target, source) - Merge source into target
   * Returns reference to target
   */
  template<typename K, typename V>
  static Map<K, V>& assign(Map<K, V>& target, const Map<K, V>& source) {
    for (const auto& pair : source) {
      target.set(pair.first, pair.second);
    }
    return target;
  }

  /**
   * Object.assign(target, source1, source2, ...) - Merge multiple sources
   * Variadic template for multiple sources
   */
  template<typename K, typename V, typename... Sources>
  static Map<K, V>& assign(Map<K, V>& target, const Map<K, V>& first, const Sources&... rest) {
    assign(target, first);
    return assign(target, rest...);
  }

  /**
   * Object.assign(target, source) - Merge LiteralObject
   */
  static LiteralObject& assign(LiteralObject& target, const LiteralObject& source) {
    for (const auto& pair : source) {
      target.set(pair.first, pair.second);
    }
    return target;
  }

  /**
   * Object.assign(target, source1, source2, ...) - Merge multiple LiteralObjects
   */
  template<typename... Sources>
  static LiteralObject& assign(LiteralObject& target, const LiteralObject& first, const Sources&... rest) {
    assign(target, first);
    return assign(target, rest...);
  }

  // ============================================================================
  // Comparison
  // ============================================================================

  /**
   * Object.is(a, b) - SameValue comparison
   * 
   * Differences from ===:
   * - Object.is(NaN, NaN) is true (=== is false)
   * - Object.is(+0, -0) is false (=== is true)
   */
  template<typename T>
  static bool is(const T& a, const T& b) {
    return a == b;
  }

  // Specialization for floating point to handle NaN and -0/+0
  static bool is(double a, double b) {
    // Handle NaN
    if (std::isnan(a) && std::isnan(b)) {
      return true;
    }
    // Handle -0 vs +0
    if (a == 0.0 && b == 0.0) {
      // Use signbit to distinguish -0 from +0
      return std::signbit(a) == std::signbit(b);
    }
    return a == b;
  }

  static bool is(float a, float b) {
    if (std::isnan(a) && std::isnan(b)) {
      return true;
    }
    if (a == 0.0f && b == 0.0f) {
      return std::signbit(a) == std::signbit(b);
    }
    return a == b;
  }

  // ============================================================================
  // Immutability Methods (No-ops - restricted by GS123)
  // ============================================================================
  /**
   * Freeze - no-op in GoodScript
   * Returns the object unchanged
   */
  template<typename T>
  static T& freeze(T& obj) {
    return obj;
  }

  /**
   * Seal - no-op in GoodScript
   * Returns the object unchanged
   */
  template<typename T>
  static T& seal(T& obj) {
    return obj;
  }

  /**
   * PreventExtensions - no-op in GoodScript
   * Returns the object unchanged
   */
  template<typename T>
  static T& preventExtensions(T& obj) {
    return obj;
  }

  /**
   * Check if object is frozen
   * Always returns false in GoodScript
   */
  template<typename T>
  static bool isFrozen(const T& obj) {
    (void)obj;
    return false;
  }

  /**
   * Check if object is sealed
   * Always returns false in GoodScript
   */
  template<typename T>
  static bool isSealed(const T& obj) {
    (void)obj;
    return false;
  }

  /**
   * Check if object is extensible
   * Always returns true in GoodScript
   */
  template<typename T>
  static bool isExtensible(const T& obj) {
    (void)obj;
    return true;
  }
};

}  // namespace gs