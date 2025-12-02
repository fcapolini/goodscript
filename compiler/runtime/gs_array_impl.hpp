#pragma once

#include "gs_string.hpp"
#include "gs_string_builder.hpp"
#include "gs_array.hpp"

namespace gs {

// Implementation of Array::join that depends on String
template<typename T>
String Array<T>::join(const String& separator) const {
  if (impl_.empty()) {
    return String("");
  }
  
  // Use StringBuilder for efficient concatenation
  StringBuilder sb;
  
  // Pre-calculate capacity for better performance
  size_t total_size = 0;
  if constexpr (std::is_same_v<T, String>) {
    for (const auto& elem : impl_) {
      total_size += elem.length();
    }
  }
  if (impl_.size() > 1) {
    total_size += separator.length() * (impl_.size() - 1);
  }
  if (total_size > 0) {
    sb.reserve(static_cast<int>(total_size));
  }
  
  for (size_t i = 0; i < impl_.size(); ++i) {
    if (i > 0) {
      sb.append(separator);
    }
    
    // Convert element to string
    if constexpr (std::is_same_v<T, String>) {
      sb.append(impl_[i]);
    } else if constexpr (std::is_same_v<T, std::string>) {
      sb.append(impl_[i]);
    } else if constexpr (std::is_same_v<T, double>) {
      sb.append(String::from(impl_[i]));
    } else if constexpr (std::is_same_v<T, int>) {
      sb.append(String::from(impl_[i]));
    } else if constexpr (std::is_same_v<T, bool>) {
      sb.append(String::from(impl_[i]));
    } else if constexpr (std::is_arithmetic_v<T>) {
      // For other numeric types
      sb.append(String::from(static_cast<double>(impl_[i])));
    } else {
      // For other types, use ostringstream as fallback
      std::ostringstream oss;
      oss << impl_[i];
      sb.append(oss.str());
    }
  }
  
  return sb.toString();
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
