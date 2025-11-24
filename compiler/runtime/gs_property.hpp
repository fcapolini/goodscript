/**
 * GoodScript Property Runtime
 * 
 * Type-erased wrapper for object literal property values.
 * Allows heterogeneous object literals like { a: 1, b: "hello", c: true }
 */

#pragma once

#include "gs_string.hpp"
#include <memory>
#include <stdexcept>
#include <type_traits>
#include <functional>

namespace gs {

/**
 * Property - Type-erased container for any value type
 * 
 * Used internally for object literal properties where values can have different types.
 * Provides runtime type checking and safe value extraction.
 * 
 * Example:
 *   Property p1(42);           // number
 *   Property p2("hello");      // string
 *   Property p3(true);         // bool
 *   
 *   double n = p1.asNumber();  // 42.0
 *   String s = p2.asString();  // "hello"
 *   bool b = p3.asBool();      // true
 */
class Property {
public:
  enum class Type {
    Undefined,
    Null,
    Bool,
    Number,
    String,
    Object  // For complex types (arrays, maps, custom classes, etc.)
  };

private:
  Type type_;
  
  // Storage for primitive types
  union PrimitiveValue {
    bool bool_val;
    double num_val;
    
    PrimitiveValue() : num_val(0.0) {}
  } value_;
  
  // Storage for string (uses unique_ptr for automatic cleanup)
  std::unique_ptr<gs::String> str_val_;
  
  // Storage for complex objects (type-erased)
  std::shared_ptr<void> obj_val_;
  std::function<void()> obj_deleter_;

public:
  // ============================================================================
  // Constructors
  // ============================================================================
  
  /** Default constructor - undefined */
  Property() : type_(Type::Undefined) {}
  
  /** Null constructor */
  static Property Null() {
    Property p;
    p.type_ = Type::Null;
    return p;
  }
  
  /** Boolean constructor */
  Property(bool b) : type_(Type::Bool) {
    value_.bool_val = b;
  }
  
  /** Number constructors */
  Property(int n) : type_(Type::Number) {
    value_.num_val = static_cast<double>(n);
  }
  
  Property(double n) : type_(Type::Number) {
    value_.num_val = n;
  }
  
  Property(float n) : type_(Type::Number) {
    value_.num_val = static_cast<double>(n);
  }
  
  /** String constructors */
  Property(const gs::String& s) : type_(Type::String), str_val_(new gs::String(s)) {}
  
  Property(const char* s) : type_(Type::String), str_val_(new gs::String(s)) {}
  
  /** Complex object constructor - for arrays, maps, custom classes */
  template<typename T, typename = std::enable_if_t<!std::is_same_v<T, bool> && 
                                                     !std::is_arithmetic_v<T> &&
                                                     !std::is_same_v<T, gs::String> &&
                                                     !std::is_same_v<T, const char*>>>
  Property(const T& val) : type_(Type::Object) {
    obj_val_ = std::make_shared<T>(val);
  }
  
  // ============================================================================
  // Copy and Move Semantics
  // ============================================================================
  
  Property(const Property& other) : type_(other.type_), value_(other.value_) {
    if (type_ == Type::String && other.str_val_) {
      str_val_ = std::make_unique<gs::String>(*other.str_val_);
    } else if (type_ == Type::Object) {
      obj_val_ = other.obj_val_;
      obj_deleter_ = other.obj_deleter_;
    }
  }
  
  Property(Property&& other) noexcept 
    : type_(other.type_), value_(other.value_),
      str_val_(std::move(other.str_val_)),
      obj_val_(std::move(other.obj_val_)),
      obj_deleter_(std::move(other.obj_deleter_)) {
    other.type_ = Type::Undefined;
  }
  
  Property& operator=(const Property& other) {
    if (this != &other) {
      type_ = other.type_;
      value_ = other.value_;
      
      if (type_ == Type::String && other.str_val_) {
        str_val_ = std::make_unique<gs::String>(*other.str_val_);
      } else {
        str_val_.reset();
      }
      
      if (type_ == Type::Object) {
        obj_val_ = other.obj_val_;
        obj_deleter_ = other.obj_deleter_;
      } else {
        obj_val_.reset();
        obj_deleter_ = nullptr;
      }
    }
    return *this;
  }
  
  Property& operator=(Property&& other) noexcept {
    if (this != &other) {
      type_ = other.type_;
      value_ = other.value_;
      str_val_ = std::move(other.str_val_);
      obj_val_ = std::move(other.obj_val_);
      obj_deleter_ = std::move(other.obj_deleter_);
      other.type_ = Type::Undefined;
    }
    return *this;
  }
  
  ~Property() = default;
  
  // ============================================================================
  // Type Checking
  // ============================================================================
  
  Type type() const { return type_; }
  
  bool isUndefined() const { return type_ == Type::Undefined; }
  bool isNull() const { return type_ == Type::Null; }
  bool isBool() const { return type_ == Type::Bool; }
  bool isNumber() const { return type_ == Type::Number; }
  bool isString() const { return type_ == Type::String; }
  bool isObject() const { return type_ == Type::Object; }
  
  // ============================================================================
  // Value Extraction (with runtime type checking)
  // ============================================================================
  
  /** Extract boolean value - throws if not a boolean */
  bool asBool() const {
    if (type_ != Type::Bool) {
      throw std::runtime_error("Property is not a boolean");
    }
    return value_.bool_val;
  }
  
  /** Extract number value - throws if not a number */
  double asNumber() const {
    if (type_ != Type::Number) {
      throw std::runtime_error("Property is not a number");
    }
    return value_.num_val;
  }
  
  /** Extract string value - throws if not a string */
  gs::String asString() const {
    if (type_ != Type::String) {
      throw std::runtime_error("Property is not a string");
    }
    return *str_val_;
  }
  
  /** Extract object value - throws if not an object or wrong type */
  template<typename T>
  T& asObject() {
    if (type_ != Type::Object) {
      throw std::runtime_error("Property is not an object");
    }
    T* ptr = static_cast<T*>(obj_val_.get());
    if (!ptr) {
      throw std::runtime_error("Property object has wrong type");
    }
    return *ptr;
  }
  
  template<typename T>
  const T& asObject() const {
    if (type_ != Type::Object) {
      throw std::runtime_error("Property is not an object");
    }
    const T* ptr = static_cast<const T*>(obj_val_.get());
    if (!ptr) {
      throw std::runtime_error("Property object has wrong type");
    }
    return *ptr;
  }
  
  // ============================================================================
  // Conversions to String (for console.log, etc.)
  // ============================================================================
  
  /** Convert property to string representation */
  gs::String toString() const {
    switch (type_) {
      case Type::Undefined:
        return gs::String("undefined");
      case Type::Null:
        return gs::String("null");
      case Type::Bool:
        return gs::String(value_.bool_val ? "true" : "false");
      case Type::Number: {
        // Format number without unnecessary decimals
        if (value_.num_val == static_cast<int>(value_.num_val)) {
          return gs::String(std::to_string(static_cast<int>(value_.num_val)));
        }
        return gs::String(std::to_string(value_.num_val));
      }
      case Type::String:
        return *str_val_;
      case Type::Object:
        return gs::String("[object Object]");
    }
    return gs::String("");
  }
  
  // ============================================================================
  // Equality Comparison
  // ============================================================================
  
  bool operator==(const Property& other) const {
    if (type_ != other.type_) {
      return false;
    }
    
    switch (type_) {
      case Type::Undefined:
      case Type::Null:
        return true;
      case Type::Bool:
        return value_.bool_val == other.value_.bool_val;
      case Type::Number:
        return value_.num_val == other.value_.num_val;
      case Type::String:
        return *str_val_ == *other.str_val_;
      case Type::Object:
        return obj_val_ == other.obj_val_;  // Pointer equality
    }
    return false;
  }
  
  bool operator!=(const Property& other) const {
    return !(*this == other);
  }
};

}  // namespace gs
