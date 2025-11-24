#pragma once

#include "gs_string.hpp"
#include "gs_array.hpp"

namespace gs {

// Implementation of Array::join that depends on String
template<typename T>
String Array<T>::join(const String& separator) const {
  if (impl_.empty()) {
    return String("");
  }
  
  std::ostringstream oss;
  
  for (size_t i = 0; i < impl_.size(); ++i) {
    if (i > 0) {
      oss << separator.str();
    }
    
    // Convert element to string
    if constexpr (std::is_same_v<T, String>) {
      oss << impl_[i].str();
    } else if constexpr (std::is_same_v<T, std::string>) {
      oss << impl_[i];
    } else if constexpr (std::is_arithmetic_v<T>) {
      oss << impl_[i];
    } else {
      // For other types, try operator<<
      oss << impl_[i];
    }
  }
  
  return String(oss.str());
}

// Implementation of String::split that depends on Array
inline Array<String> String::split(const String& separator) const {
  Array<String> result;
  
  if (separator.impl_.empty()) {
    // Split into individual characters
    for (char c : impl_) {
      result.push(String(std::string(1, c)));
    }
    return result;
  }
  
  size_t start = 0;
  size_t pos = 0;
  
  while ((pos = impl_.find(separator.impl_, start)) != std::string::npos) {
    result.push(String(impl_.substr(start, pos - start)));
    start = pos + separator.impl_.length();
  }
  
  // Add the last part
  result.push(String(impl_.substr(start)));
  
  return result;
}

} // namespace gs
