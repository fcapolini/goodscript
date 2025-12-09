#pragma once

#include <cmath>
#include <limits>
#include <sstream>
#include <iomanip>

namespace gs {

/**
 * Number - Number-related utilities
 * Provides TypeScript-compatible Number API
 */
class Number {
public:
  // Constants
  static constexpr double MAX_VALUE = std::numeric_limits<double>::max();
  static constexpr double MIN_VALUE = std::numeric_limits<double>::min();
  static constexpr double POSITIVE_INFINITY = std::numeric_limits<double>::infinity();
  static constexpr double NEGATIVE_INFINITY = -std::numeric_limits<double>::infinity();
  static constexpr double NaN = std::numeric_limits<double>::quiet_NaN();

  // Type checking
  static bool isNaN(double value) {
    return std::isnan(value);
  }

  static bool isFinite(double value) {
    return std::isfinite(value);
  }

  static bool isInteger(double value) {
    return std::isfinite(value) && std::floor(value) == value;
  }

  static bool isSafeInteger(double value) {
    constexpr double MAX_SAFE_INTEGER = 9007199254740991.0; // 2^53 - 1
    return isInteger(value) && std::abs(value) <= MAX_SAFE_INTEGER;
  }

  // Parsing (basic implementation)
  static double parseFloat(const char* str) {
    return std::strtod(str, nullptr);
  }

  static int parseInt(const char* str, int radix = 10) {
    return static_cast<int>(std::strtol(str, nullptr, radix));
  }
  
  // Instance-like methods (for codegen)
  static gs::String toString(double value) {
    // Handle special cases
    if (std::isnan(value)) return gs::String("NaN");
    if (std::isinf(value)) return value > 0 ? gs::String("Infinity") : gs::String("-Infinity");
    
    // For integers, don't include decimal point
    if (std::floor(value) == value && std::abs(value) < 1e15) {
      std::ostringstream out;
      out << std::fixed << std::setprecision(0) << value;
      return gs::String(out.str());
    }
    
    // For floating point, use default formatting
    std::ostringstream out;
    out << value;
    return gs::String(out.str());
  }
  
  static gs::String toString(int value) {
    return gs::String(std::to_string(value));
  }
  
  static std::string toFixed(double value, int digits = 0) {
    std::ostringstream out;
    out << std::fixed << std::setprecision(digits) << value;
    return out.str();
  }
  
  static std::string toExponential(double value, int digits = 0) {
    std::ostringstream out;
    out << std::scientific << std::setprecision(digits) << value;
    return out.str();
  }
  
  static std::string toPrecision(double value, int precision) {
    std::ostringstream out;
    out << std::setprecision(precision) << value;
    return out.str();
  }
};

} // namespace gs
