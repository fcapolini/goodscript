#pragma once

#include "string.hpp"
#include <sstream>
#include <iomanip>
#include <cmath>
#include <limits>

namespace gs {

/**
 * Number utility functions (GC mode).
 * Static methods for number formatting.
 */
class Number {
public:
    // Constants
    static constexpr double NaN = std::numeric_limits<double>::quiet_NaN();
    static constexpr double POSITIVE_INFINITY = std::numeric_limits<double>::infinity();
    static constexpr double NEGATIVE_INFINITY = -std::numeric_limits<double>::infinity();

    // Type checking
    static bool isNaN(double value) {
        return std::isnan(value);
    }

    static bool isFinite(double value) {
        return std::isfinite(value);
    }

    static String toString(double value) {
        return String::from(value);
    }

    static String toFixed(double value, int digits) {
        std::ostringstream oss;
        oss << std::fixed << std::setprecision(digits) << value;
        return String(oss.str().c_str());
    }

    static String toExponential(double value, int digits) {
        std::ostringstream oss;
        oss << std::scientific << std::setprecision(digits) << value;
        return String(oss.str().c_str());
    }

    static String toPrecision(double value, int precision) {
        std::ostringstream oss;
        oss << std::setprecision(precision) << value;
        return String(oss.str().c_str());
    }
};

} // namespace gs
