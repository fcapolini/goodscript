#pragma once

#include <iostream>
#include <sstream>
#include <optional>
#include "gs_string.hpp"

namespace gs {

/**
 * GoodScript console class - TypeScript-compatible console logging
 * 
 * Provides console.log(), console.error(), console.warn() functionality.
 */
class console {
public:
  /**
   * Prints to stdout with a newline
   * Equivalent to TypeScript: console.log(...args)
   */
  static void log() {
    std::cout << std::endl;
  }
  
  static void log(const String& message) {
    std::cout << message.str() << std::endl;
  }
  
  static void log(const char* message) {
    std::cout << message << std::endl;
  }
  
  static void log(int value) {
    std::cout << value << std::endl;
  }
  
  static void log(double value) {
    std::cout << value << std::endl;
  }
  
  static void log(bool value) {
    std::cout << (value ? "true" : "false") << std::endl;
  }
  
  // Variadic template for multiple arguments
  template<typename T, typename... Args>
  static void log(const T& first, const Args&... args) {
    log_impl(first);
    (log_space_impl(args), ...);
    std::cout << std::endl;
  }
  
  /**
   * Prints to stderr with a newline
   * Equivalent to TypeScript: console.error(...args)
   */
  static void error() {
    std::cerr << std::endl;
  }
  
  static void error(const String& message) {
    std::cerr << message.str() << std::endl;
  }
  
  static void error(const char* message) {
    std::cerr << message << std::endl;
  }
  
  static void error(int value) {
    std::cerr << value << std::endl;
  }
  
  static void error(double value) {
    std::cerr << value << std::endl;
  }
  
  static void error(bool value) {
    std::cerr << (value ? "true" : "false") << std::endl;
  }
  
  // Variadic template for multiple arguments
  template<typename T, typename... Args>
  static void error(const T& first, const Args&... args) {
    error_impl(first);
    (error_space_impl(args), ...);
    std::cerr << std::endl;
  }
  
  /**
   * Prints to stdout with a warning prefix
   * Equivalent to TypeScript: console.warn(...args)
   */
  static void warn() {
    std::cout << std::endl;
  }
  
  static void warn(const String& message) {
    std::cout << "Warning: " << message.str() << std::endl;
  }
  
  static void warn(const char* message) {
    std::cout << "Warning: " << message << std::endl;
  }
  
  static void warn(int value) {
    std::cout << "Warning: " << value << std::endl;
  }
  
  static void warn(double value) {
    std::cout << "Warning: " << value << std::endl;
  }
  
  static void warn(bool value) {
    std::cout << "Warning: " << (value ? "true" : "false") << std::endl;
  }
  
  // Variadic template for multiple arguments
  template<typename T, typename... Args>
  static void warn(const T& first, const Args&... args) {
    std::cout << "Warning: ";
    log_impl(first);
    (log_space_impl(args), ...);
    std::cout << std::endl;
  }

private:
  // Helper functions for printing without newlines
  
  static void log_impl(const String& value) {
    std::cout << value.str();
  }
  
  static void log_impl(const char* value) {
    std::cout << value;
  }
  
  static void log_impl(int value) {
    std::cout << value;
  }
  
  static void log_impl(double value) {
    std::cout << value;
  }
  
  static void log_impl(bool value) {
    std::cout << (value ? "true" : "false");
  }
  
  // Support for optional values - print "undefined" if empty
  template<typename T>
  static void log_impl(const std::optional<T>& value) {
    if (value.has_value()) {
      log_impl(*value);
    } else {
      std::cout << "undefined";
    }
  }
  
  // Support for arrays - print in JavaScript format
  template<typename T>
  static void log_impl(const Array<T>& value) {
    std::cout << "[ ";
    bool first = true;
    for (const auto& item : value) {
      if (!first) std::cout << ", ";
      log_impl(item);
      first = false;
    }
    std::cout << " ]";
  }
  
  template<typename T>
  static void log_space_impl(const T& value) {
    std::cout << ' ';
    log_impl(value);
  }
  
  static void error_impl(const String& value) {
    std::cerr << value.str();
  }
  
  static void error_impl(const char* value) {
    std::cerr << value;
  }
  
  static void error_impl(int value) {
    std::cerr << value;
  }
  
  static void error_impl(double value) {
    std::cerr << value;
  }
  
  static void error_impl(bool value) {
    std::cerr << (value ? "true" : "false");
  }
  
  // Support for arrays - print in JavaScript format
  template<typename T>
  static void error_impl(const Array<T>& value) {
    std::cerr << "[ ";
    bool first = true;
    for (const auto& item : value) {
      if (!first) std::cerr << ", ";
      error_impl(item);
      first = false;
    }
    std::cerr << " ]";
  }
  
  template<typename T>
  static void error_space_impl(const T& value) {
    std::cerr << ' ';
    error_impl(value);
  }
};

} // namespace gs
