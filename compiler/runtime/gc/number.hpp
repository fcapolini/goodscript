#pragma once

#include "string.hpp"
#include <sstream>
#include <iomanip>
#include <cmath>

namespace gs {

/**
 * Number utility functions (GC mode).
 * Static methods for number formatting.
 */
class Number {
public:
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
