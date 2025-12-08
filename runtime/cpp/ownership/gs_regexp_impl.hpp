#pragma once

#include "gs_regexp.hpp"
#include "gs_string.hpp"
#include "gs_array.hpp"

namespace gs {

// String convenience methods for regex operations

inline std::optional<Array<String>> String::match(const String& pattern) const {
  return match(RegExp(pattern.str()));
}

inline int String::search(const String& pattern) const {
  return search(RegExp(pattern.str()));
}

inline String String::replace(const String& pattern, const String& replaceValue, const String& flags) const {
  return replace(RegExp(pattern.str(), flags.str()), replaceValue);
}

inline Array<String> String::split(const String& pattern, const String& flags) const {
  return split(RegExp(pattern.str(), flags.str()));
}

// String methods that depend on RegExp

inline std::optional<Array<String>> String::match(const RegExp& regex) const {
  if (regex.global()) {
    // Global match: return all matches
    auto matches = regex.matchAll(impl_);
    if (matches.empty()) {
      return std::nullopt;
    }
    
    Array<String> result;
    for (const auto& match : matches) {
      result.push(String(match));
    }
    return result;
  } else {
    // Non-global match: return match with capture groups
    auto match = regex.matchAt(impl_, 0);
    if (!match.has_value()) {
      return std::nullopt;
    }
    
    Array<String> result;
    for (const auto& str : match.value()) {
      result.push(String(str));
    }
    return result;
  }
}

inline int String::search(const RegExp& regex) const {
  return regex.search(impl_);
}

inline String String::replace(const RegExp& regex, const String& replaceValue) const {
  if (regex.global()) {
    // Global replace: replace all matches
    std::string result = impl_;
    std::string replacement = replaceValue.str();
    
    // We need to rebuild the regex for replacement
    // PCRE2 substitute function
    PCRE2_SIZE output_length = result.length() * 2 + 1024; // Initial buffer size
    std::vector<PCRE2_UCHAR> output_buffer(output_length);
    
    int rc = pcre2_substitute(
      regex.getCompiledPattern(),
      reinterpret_cast<PCRE2_SPTR>(result.c_str()),
      result.length(),
      0,  // start offset
      PCRE2_SUBSTITUTE_GLOBAL | PCRE2_SUBSTITUTE_EXTENDED,
      regex.getMatchData(),
      nullptr,
      reinterpret_cast<PCRE2_SPTR>(replacement.c_str()),
      replacement.length(),
      output_buffer.data(),
      &output_length
    );
    
    if (rc < 0 && rc != PCRE2_ERROR_NOMATCH) {
      // Buffer too small, try again with larger buffer
      if (rc == PCRE2_ERROR_NOMEMORY) {
        output_buffer.resize(output_length);
        rc = pcre2_substitute(
          regex.getCompiledPattern(),
          reinterpret_cast<PCRE2_SPTR>(result.c_str()),
          result.length(),
          0,
          PCRE2_SUBSTITUTE_GLOBAL | PCRE2_SUBSTITUTE_EXTENDED,
          regex.getMatchData(),
          nullptr,
          reinterpret_cast<PCRE2_SPTR>(replacement.c_str()),
          replacement.length(),
          output_buffer.data(),
          &output_length
        );
      }
    }
    
    if (rc < 0 && rc != PCRE2_ERROR_NOMATCH) {
      // Error occurred, return original string
      return *this;
    }
    
    if (rc == PCRE2_ERROR_NOMATCH) {
      // No match, return original
      return *this;
    }
    
    return String(std::string(
      reinterpret_cast<char*>(output_buffer.data()), 
      output_length
    ));
  } else {
    // Non-global replace: replace first match only
    auto match = regex.matchAt(impl_, 0);
    if (!match.has_value()) {
      return *this;
    }
    
    std::string result = impl_;
    std::string replacement = replaceValue.str();
    
    PCRE2_SIZE output_length = result.length() * 2 + 1024;
    std::vector<PCRE2_UCHAR> output_buffer(output_length);
    
    int rc = pcre2_substitute(
      regex.getCompiledPattern(),
      reinterpret_cast<PCRE2_SPTR>(result.c_str()),
      result.length(),
      0,
      PCRE2_SUBSTITUTE_EXTENDED,
      regex.getMatchData(),
      nullptr,
      reinterpret_cast<PCRE2_SPTR>(replacement.c_str()),
      replacement.length(),
      output_buffer.data(),
      &output_length
    );
    
    if (rc < 0 && rc != PCRE2_ERROR_NOMATCH) {
      if (rc == PCRE2_ERROR_NOMEMORY) {
        output_buffer.resize(output_length);
        rc = pcre2_substitute(
          regex.getCompiledPattern(),
          reinterpret_cast<PCRE2_SPTR>(result.c_str()),
          result.length(),
          0,
          PCRE2_SUBSTITUTE_EXTENDED,
          regex.getMatchData(),
          nullptr,
          reinterpret_cast<PCRE2_SPTR>(replacement.c_str()),
          replacement.length(),
          output_buffer.data(),
          &output_length
        );
      }
    }
    
    if (rc < 0) {
      return *this;
    }
    
    return String(std::string(
      reinterpret_cast<char*>(output_buffer.data()), 
      output_length
    ));
  }
}

inline Array<String> String::split(const RegExp& regex) const {
  Array<String> result;
  
  PCRE2_SIZE offset = 0;
  
  while (offset <= impl_.length()) {
    int rc = pcre2_match(
      regex.getCompiledPattern(),
      reinterpret_cast<PCRE2_SPTR>(impl_.c_str()),
      impl_.length(),
      offset,
      0,
      regex.getMatchData(),
      nullptr
    );
    
    if (rc < 0) {
      // No more matches, add the rest
      result.push(String(impl_.substr(offset)));
      break;
    }
    
    PCRE2_SIZE* ovector = pcre2_get_ovector_pointer(regex.getMatchData());
    
    // Add the part before the match
    result.push(String(impl_.substr(offset, ovector[0] - offset)));
    
    // Add capture groups (if any)
    for (int i = 1; i < rc; i++) {
      if (ovector[2 * i] != PCRE2_UNSET) {
        result.push(String(impl_.substr(
          ovector[2 * i], 
          ovector[2 * i + 1] - ovector[2 * i]
        )));
      }
    }
    
    offset = ovector[1];
    
    // Prevent infinite loop on zero-length matches
    if (ovector[0] == ovector[1]) {
      offset++;
    }
  }
  
  return result;
}

} // namespace gs
