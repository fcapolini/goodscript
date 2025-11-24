#pragma once

#include <cmath>
#include <limits>

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
};

} // namespace gs
