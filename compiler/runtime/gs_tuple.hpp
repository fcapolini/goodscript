#pragma once

#include <utility>

namespace gs {

// Tuple class providing JavaScript-like semantics for tuple types
// Maps TypeScript tuple [T1, T2] to a simple struct with first/second accessors
// 
// Usage in generated code:
//   TypeScript: const entry: [string, number] = ["hello", 42];
//   C++: gs::Tuple<gs::String, double> entry = gs::make_tuple("hello", 42.0);
//
//   TypeScript: const key = entry[0];
//   C++: auto key = entry.first();  // codegen translates [0] to .first()
//
//   TypeScript: const value = entry[1];
//   C++: auto value = entry.second();  // codegen translates [1] to .second()
//
template<typename T1, typename T2>
class Tuple {
private:
  T1 first_;
  T2 second_;

public:
  // Default constructor
  Tuple() : first_(), second_() {}
  
  // Value constructor
  Tuple(const T1& first, const T2& second) 
    : first_(first), second_(second) {}
  
  // Move constructor
  Tuple(T1&& first, T2&& second) 
    : first_(std::move(first)), second_(std::move(second)) {}
  
  // Copy constructor
  Tuple(const Tuple& other) = default;
  
  // Move constructor
  Tuple(Tuple&& other) = default;
  
  // Assignment operators
  Tuple& operator=(const Tuple& other) = default;
  Tuple& operator=(Tuple&& other) = default;
  
  // Accessors (codegen maps tuple[0] -> first(), tuple[1] -> second())
  T1& first() { return first_; }
  const T1& first() const { return first_; }
  
  T2& second() { return second_; }
  const T2& second() const { return second_; }
};

// Helper function to create tuples (like std::make_pair)
template<typename T1, typename T2>
Tuple<T1, T2> make_tuple(T1&& first, T2&& second) {
  return Tuple<T1, T2>(std::forward<T1>(first), std::forward<T2>(second));
}

template<typename T1, typename T2>
Tuple<T1, T2> make_tuple(const T1& first, const T2& second) {
  return Tuple<T1, T2>(first, second);
}

} // namespace gs
