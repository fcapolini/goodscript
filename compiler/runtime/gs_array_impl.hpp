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

} // namespace gs
