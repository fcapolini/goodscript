/**
 * GoodScript Object Runtime
 * 
 * Provides Object class with immutability methods as no-ops.
 * These methods are restricted in GoodScript (GS123) but provided here
 * for potential interop scenarios.
 */

#pragma once

namespace gs {

/**
 * Object class - provides static methods for object operations
 * 
 * Immutability methods (freeze, seal, preventExtensions) are no-ops because:
 * - GoodScript's ownership system provides memory safety
 * - Type-level immutability (readonly) is a better fit (when implemented)
 * - Runtime tracking of frozen/sealed state adds overhead
 * 
 * Query methods return constants:
 * - isFrozen() -> false (objects are never frozen)
 * - isSealed() -> false (objects are never sealed)
 * - isExtensible() -> true (objects are always extensible)
 */
class Object {
public:
  /**
   * Freeze - no-op in GoodScript
   * Returns the object unchanged
   */
  template<typename T>
  static T& freeze(T& obj) {
    // No-op: GoodScript doesn't track frozen state
    return obj;
  }

  /**
   * Seal - no-op in GoodScript
   * Returns the object unchanged
   */
  template<typename T>
  static T& seal(T& obj) {
    // No-op: GoodScript doesn't track sealed state
    return obj;
  }

  /**
   * PreventExtensions - no-op in GoodScript
   * Returns the object unchanged
   */
  template<typename T>
  static T& preventExtensions(T& obj) {
    // No-op: GoodScript doesn't track extensible state
    return obj;
  }

  /**
   * Check if object is frozen
   * Always returns false in GoodScript
   */
  template<typename T>
  static bool isFrozen(const T& obj) {
    (void)obj;  // Unused parameter
    return false;
  }

  /**
   * Check if object is sealed
   * Always returns false in GoodScript
   */
  template<typename T>
  static bool isSealed(const T& obj) {
    (void)obj;  // Unused parameter
    return false;
  }

  /**
   * Check if object is extensible
   * Always returns true in GoodScript
   */
  template<typename T>
  static bool isExtensible(const T& obj) {
    (void)obj;  // Unused parameter
    return true;
  }
};

}  // namespace gs
