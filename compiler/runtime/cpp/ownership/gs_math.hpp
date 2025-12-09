#pragma once

#include <cmath>

namespace gs {

/**
 * Math - Mathematical functions and constants
 * Provides TypeScript-compatible Math API
 */
class Math {
public:
  // Mathematical constants
  static constexpr double PI = 3.141592653589793;
  static constexpr double E = 2.718281828459045;
  static constexpr double LN2 = 0.6931471805599453;
  static constexpr double LN10 = 2.302585092994046;
  static constexpr double LOG2E = 1.4426950408889634;
  static constexpr double LOG10E = 0.4342944819032518;
  static constexpr double SQRT1_2 = 0.7071067811865476;
  static constexpr double SQRT2 = 1.4142135623730951;

  // Basic functions
  static double abs(double x) {
    return std::abs(x);
  }

  static double ceil(double x) {
    return std::ceil(x);
  }

  static double floor(double x) {
    return std::floor(x);
  }

  static double round(double x) {
    return std::round(x);
  }

  static double trunc(double x) {
    return std::trunc(x);
  }

  // Power and logarithm
  static double sqrt(double x) {
    return std::sqrt(x);
  }

  static double pow(double base, double exponent) {
    return std::pow(base, exponent);
  }

  static double exp(double x) {
    return std::exp(x);
  }

  static double log(double x) {
    return std::log(x);
  }

  static double log10(double x) {
    return std::log10(x);
  }

  static double log2(double x) {
    return std::log2(x);
  }

  // Trigonometric functions
  static double sin(double x) {
    return std::sin(x);
  }

  static double cos(double x) {
    return std::cos(x);
  }

  static double tan(double x) {
    return std::tan(x);
  }

  static double asin(double x) {
    return std::asin(x);
  }

  static double acos(double x) {
    return std::acos(x);
  }

  static double atan(double x) {
    return std::atan(x);
  }

  static double atan2(double y, double x) {
    return std::atan2(y, x);
  }

  // Hyperbolic functions
  static double sinh(double x) {
    return std::sinh(x);
  }

  static double cosh(double x) {
    return std::cosh(x);
  }

  static double tanh(double x) {
    return std::tanh(x);
  }

  static double asinh(double x) {
    return std::asinh(x);
  }

  static double acosh(double x) {
    return std::acosh(x);
  }

  static double atanh(double x) {
    return std::atanh(x);
  }

  // Min/max
  static double min(double a, double b) {
    return std::min(a, b);
  }

  static double max(double a, double b) {
    return std::max(a, b);
  }

  // Random (simplified - returns value in [0, 1))
  static double random() {
    return static_cast<double>(std::rand()) / static_cast<double>(RAND_MAX);
  }

  // Sign
  static double sign(double x) {
    if (x > 0) return 1.0;
    if (x < 0) return -1.0;
    return x; // preserves +0, -0, NaN
  }
};

} // namespace gs
