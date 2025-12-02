#pragma once

#include <chrono>

namespace gs {

/**
 * Date class providing timestamp functionality (GC mode).
 * Limited to Date.now() for performance benchmarking.
 */
class Date {
public:
  /**
   * Returns the number of milliseconds since the Unix epoch (January 1, 1970 00:00:00 UTC).
   * Equivalent to JavaScript's Date.now().
   */
  static double now() {
    auto now = std::chrono::system_clock::now();
    auto duration = now.time_since_epoch();
    auto millis = std::chrono::duration_cast<std::chrono::milliseconds>(duration);
    return static_cast<double>(millis.count());
  }
};

} // namespace gs
