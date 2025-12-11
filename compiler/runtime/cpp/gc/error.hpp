#pragma once

#include "allocator.hpp"
#include "string.hpp"
#include <exception>
#include <string>
#include <optional>

namespace gs {

/**
 * GC-allocated Error class
 * JavaScript/TypeScript-compatible error types for exception handling
 */
class Error : public std::exception {
protected:
  String _message;
  std::optional<String> _name;
  mutable std::string _what_cache;

public:
  // Public message field for JavaScript compatibility
  String message;
  
  // Constructors
  Error() : _message(""), _name(std::nullopt), message("") {}
  
  explicit Error(const String& msg) : _message(msg), _name(std::nullopt), message(msg) {
    updateWhatCache();
  }
  
  explicit Error(const char* msg) : _message(String(msg)), _name(std::nullopt), message(String(msg)) {
    updateWhatCache();
  }
  
  Error(const String& msg, const String& name) : _message(msg), _name(name), message(msg) {
    updateWhatCache();
  }
  
  // Virtual destructor for proper cleanup
  virtual ~Error() noexcept = default;
  
  // Copy constructor and assignment
  Error(const Error& other) : _message(other._message), _name(other._name), message(other.message) {
    updateWhatCache();
  }
  
  Error& operator=(const Error& other) {
    if (this != &other) {
      _message = other._message;
      _name = other._name;
      message = other.message;
      updateWhatCache();
    }
    return *this;
  }
  
  // Properties (matching JavaScript Error API)
  String getMessage() const { return _message; }
  void setMessage(const String& msg) { 
    _message = msg;
    message = msg;
    updateWhatCache();
  }
  
  String name() const { 
    return _name.value_or(String("Error"));
  }
  void setName(const String& n) { 
    _name = n;
    updateWhatCache();
  }
  
  // toString() - JavaScript compatibility
  String toString() const {
    if (message.length() > 0) {
      return name() + String(": ") + message;
    }
    return name();
  }
  
  // std::exception interface
  const char* what() const noexcept override {
    return _what_cache.c_str();
  }

protected:
  void updateWhatCache() {
    _what_cache = toString().c_str();
  }
};

/**
 * TypeError - type-related errors
 */
class TypeError : public Error {
public:
  TypeError() : Error() { setName(String("TypeError")); }
  explicit TypeError(const String& msg) : Error(msg) { setName(String("TypeError")); }
  explicit TypeError(const char* msg) : Error(msg) { setName(String("TypeError")); }
  virtual ~TypeError() noexcept = default;
};

/**
 * RangeError - numeric value out of range
 */
class RangeError : public Error {
public:
  RangeError() : Error() { setName(String("RangeError")); }
  explicit RangeError(const String& msg) : Error(msg) { setName(String("RangeError")); }
  explicit RangeError(const char* msg) : Error(msg) { setName(String("RangeError")); }
  virtual ~RangeError() noexcept = default;
};

/**
 * SyntaxError - parsing/syntax errors
 */
class SyntaxError : public Error {
public:
  SyntaxError() : Error() { setName(String("SyntaxError")); }
  explicit SyntaxError(const String& msg) : Error(msg) { setName(String("SyntaxError")); }
  explicit SyntaxError(const char* msg) : Error(msg) { setName(String("SyntaxError")); }
  virtual ~SyntaxError() noexcept = default;
};

/**
 * ReferenceError - reference to undefined variable
 */
class ReferenceError : public Error {
public:
  ReferenceError() : Error() { setName(String("ReferenceError")); }
  explicit ReferenceError(const String& msg) : Error(msg) { setName(String("ReferenceError")); }
  explicit ReferenceError(const char* msg) : Error(msg) { setName(String("ReferenceError")); }
  virtual ~ReferenceError() noexcept = default;
};

/**
 * URIError - URI handling errors
 */
class URIError : public Error {
public:
  URIError() : Error() { setName(String("URIError")); }
  explicit URIError(const String& msg) : Error(msg) { setName(String("URIError")); }
  explicit URIError(const char* msg) : Error(msg) { setName(String("URIError")); }
  virtual ~URIError() noexcept = default;
};

/**
 * EvalError - eval() related errors (mostly deprecated in modern JS)
 */
class EvalError : public Error {
public:
  EvalError() : Error() { setName(String("EvalError")); }
  explicit EvalError(const String& msg) : Error(msg) { setName(String("EvalError")); }
  explicit EvalError(const char* msg) : Error(msg) { setName(String("EvalError")); }
  virtual ~EvalError() noexcept = default;
};

// Stream operator for Error (for console.log compatibility)
inline std::ostream& operator<<(std::ostream& os, const Error& err) {
  return os << err.toString();
}

// Implementation of String::from(Error) - must be after Error is fully defined
inline String String::from(const Error& e) {
  return e.message;
}

} // namespace gs
