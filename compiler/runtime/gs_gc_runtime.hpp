/**
 * GoodScript GC Runtime Header
 * 
 * Unified header for GC mode compilation.
 * Includes MPS allocator and GC-based runtime types.
 */

#pragma once

// Simple malloc-based allocator (MVP - MPS integration coming soon)
#include "gc/allocator-simple.hpp"

// GC runtime types
#include "gc/string.hpp"
#include "gc/array.hpp"

// Standard library equivalents (Map, Set will be added later)
#include <unordered_map>
#include <unordered_set>
#include <iostream>
#include <sstream>
#include <optional>
#include <stdexcept>
#include <cmath>
#include <limits>

namespace gs {

// Map: GC-allocated keys/values
template<typename K, typename V>
using Map = std::unordered_map<K, V>;

// Set: GC-allocated elements
template<typename T>
using Set = std::unordered_set<T>;

// Console namespace for logging
namespace console {
  inline void log(const String& str) {
    std::cout << str.c_str() << std::endl;
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
  inline String stringify(const auto& value) {
    std::ostringstream oss;
    oss << value;
    return String(oss.str());
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
}

} // namespace gs
