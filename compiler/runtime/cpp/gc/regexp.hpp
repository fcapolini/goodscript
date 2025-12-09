#pragma once

#define PCRE2_CODE_UNIT_WIDTH 8
#include <pcre2.h>
#include <string>
#include <vector>
#include <optional>
#include <memory>
#include <stdexcept>

namespace gs {

// Forward declarations
class String;
template<typename T> class Array;

/**
 * GoodScript RegExp class - TypeScript/JavaScript-compatible regular expression wrapper
 * 
 * Uses PCRE2 library to provide full JavaScript regex semantics including:
 * - Lookbehind assertions (positive and negative)
 * - Named capture groups
 * - Unicode support
 * - All standard flags (g, i, m, s, u, y)
 */
class RegExp {
private:
  pcre2_code* compiled_;
  std::string pattern_;
  std::string flags_;
  mutable int lastIndex_;  // Mutable for global/sticky regex state
  bool global_;
  bool ignoreCase_;
  bool multiline_;
  bool dotAll_;
  bool unicode_;
  bool sticky_;
  
  // Match data for reuse
  mutable pcre2_match_data* match_data_;  // Mutable for internal caching
  
  // Compile the pattern with appropriate flags
  void compile() {
    // Always enable UTF mode to match JavaScript/TypeScript behavior
    // JavaScript regex always operates in UTF-16, so we use UTF-8 mode in PCRE2
    uint32_t options = PCRE2_UTF;
    
    if (ignoreCase_) {
      options |= PCRE2_CASELESS;
    }
    if (multiline_) {
      options |= PCRE2_MULTILINE;
    }
    if (dotAll_) {
      options |= PCRE2_DOTALL;
    }
    if (unicode_) {
      // The 'u' flag enables full Unicode property support
      options |= PCRE2_UCP;
    }
    
    int error_number;
    PCRE2_SIZE error_offset;
    
    compiled_ = pcre2_compile(
      reinterpret_cast<PCRE2_SPTR>(pattern_.c_str()),
      PCRE2_ZERO_TERMINATED,
      options,
      &error_number,
      &error_offset,
      nullptr
    );
    
    if (compiled_ == nullptr) {
      PCRE2_UCHAR buffer[256];
      pcre2_get_error_message(error_number, buffer, sizeof(buffer));
      throw std::runtime_error(
        std::string("RegExp compilation failed: ") + 
        reinterpret_cast<char*>(buffer)
      );
    }
    
    match_data_ = pcre2_match_data_create_from_pattern(compiled_, nullptr);
  }
  
  void parseFlags(const std::string& flags) {
    global_ = false;
    ignoreCase_ = false;
    multiline_ = false;
    dotAll_ = false;
    unicode_ = false;
    sticky_ = false;
    
    for (char c : flags) {
      switch (c) {
        case 'g': global_ = true; break;
        case 'i': ignoreCase_ = true; break;
        case 'm': multiline_ = true; break;
        case 's': dotAll_ = true; break;
        case 'u': unicode_ = true; break;
        case 'y': sticky_ = true; break;
        default:
          throw std::runtime_error(std::string("Invalid RegExp flag: ") + c);
      }
    }
  }

public:
  // Constructors
  // Accept both std::string and gs::String (which converts to std::string_view)
  RegExp(std::string_view pattern, std::string_view flags = "")
    : compiled_(nullptr), pattern_(pattern), flags_(flags), 
      lastIndex_(0), match_data_(nullptr) {
    parseFlags(std::string(flags));
    compile();
  }
  
  // Destructor
  ~RegExp() {
    if (match_data_) {
      pcre2_match_data_free(match_data_);
    }
    if (compiled_) {
      pcre2_code_free(compiled_);
    }
  }
  
  // Copy constructor
  RegExp(const RegExp& other)
    : pattern_(other.pattern_), flags_(other.flags_),
      lastIndex_(other.lastIndex_),
      global_(other.global_), ignoreCase_(other.ignoreCase_),
      multiline_(other.multiline_), dotAll_(other.dotAll_),
      unicode_(other.unicode_), sticky_(other.sticky_),
      compiled_(nullptr), match_data_(nullptr) {
    compile();
  }
  
  // Move constructor
  RegExp(RegExp&& other) noexcept
    : compiled_(other.compiled_), pattern_(std::move(other.pattern_)),
      flags_(std::move(other.flags_)), lastIndex_(other.lastIndex_),
      global_(other.global_), ignoreCase_(other.ignoreCase_),
      multiline_(other.multiline_), dotAll_(other.dotAll_),
      unicode_(other.unicode_), sticky_(other.sticky_),
      match_data_(other.match_data_) {
    other.compiled_ = nullptr;
    other.match_data_ = nullptr;
  }
  
  // Assignment operators
  RegExp& operator=(const RegExp& other) {
    if (this != &other) {
      if (match_data_) pcre2_match_data_free(match_data_);
      if (compiled_) pcre2_code_free(compiled_);
      
      pattern_ = other.pattern_;
      flags_ = other.flags_;
      lastIndex_ = other.lastIndex_;
      global_ = other.global_;
      ignoreCase_ = other.ignoreCase_;
      multiline_ = other.multiline_;
      dotAll_ = other.dotAll_;
      unicode_ = other.unicode_;
      sticky_ = other.sticky_;
      compiled_ = nullptr;
      match_data_ = nullptr;
      
      compile();
    }
    return *this;
  }
  
  RegExp& operator=(RegExp&& other) noexcept {
    if (this != &other) {
      if (match_data_) pcre2_match_data_free(match_data_);
      if (compiled_) pcre2_code_free(compiled_);
      
      compiled_ = other.compiled_;
      pattern_ = std::move(other.pattern_);
      flags_ = std::move(other.flags_);
      lastIndex_ = other.lastIndex_;
      global_ = other.global_;
      ignoreCase_ = other.ignoreCase_;
      multiline_ = other.multiline_;
      dotAll_ = other.dotAll_;
      unicode_ = other.unicode_;
      sticky_ = other.sticky_;
      match_data_ = other.match_data_;
      
      other.compiled_ = nullptr;
      other.match_data_ = nullptr;
    }
    return *this;
  }
  
  // Properties (read-only in JS, but we provide getters)
  
  const std::string& source() const { return pattern_; }
  bool global() const { return global_; }
  bool ignoreCase() const { return ignoreCase_; }
  bool multiline() const { return multiline_; }
  bool dotAll() const { return dotAll_; }
  bool unicode() const { return unicode_; }
  bool sticky() const { return sticky_; }
  const std::string& flags() const { return flags_; }
  
  // lastIndex property (mutable for global/sticky regexes)
  int lastIndex() const { return lastIndex_; }
  void setLastIndex(int index) { lastIndex_ = index; }
  
  /**
   * Tests if the pattern matches the string
   * Equivalent to TypeScript: regex.test(str)
   */
  bool test(const std::string& subject) const {
    uint32_t options = 0;
    PCRE2_SIZE start_offset = 0;
    
    if (sticky_) {
      options |= PCRE2_ANCHORED;
      start_offset = lastIndex_;
    } else if (global_) {
      start_offset = lastIndex_;
    }
    
    int rc = pcre2_match(
      compiled_,
      reinterpret_cast<PCRE2_SPTR>(subject.c_str()),
      subject.length(),
      start_offset,
      options,
      match_data_,
      nullptr
    );
    
    if (rc >= 0) {
      if (global_ || sticky_) {
        PCRE2_SIZE* ovector = pcre2_get_ovector_pointer(match_data_);
        lastIndex_ = static_cast<int>(ovector[1]);
      }
      return true;
    }
    
    if (global_ || sticky_) {
      lastIndex_ = 0;
    }
    
    return false;
  }
  
  // Overload for gs::String
  bool test(const gs::String& subject) const {
    return test(subject.str());
  }
  
  /**
   * Execute a search for a match and return detailed results
   * Equivalent to TypeScript: regex.exec(str)
   * Returns null if no match found
   */
  std::optional<std::vector<std::string>> exec(const std::string& subject) const {
    uint32_t options = 0;
    PCRE2_SIZE start_offset = 0;
    
    if (sticky_) {
      options |= PCRE2_ANCHORED;
      start_offset = lastIndex_;
    } else if (global_) {
      start_offset = lastIndex_;
    }
    
    int rc = pcre2_match(
      compiled_,
      reinterpret_cast<PCRE2_SPTR>(subject.c_str()),
      subject.length(),
      start_offset,
      options,
      match_data_,
      nullptr
    );
    
    if (rc < 0) {
      if (global_ || sticky_) {
        lastIndex_ = 0;
      }
      return std::nullopt;
    }
    
    PCRE2_SIZE* ovector = pcre2_get_ovector_pointer(match_data_);
    std::vector<std::string> matches;
    
    // First element is the full match
    matches.push_back(subject.substr(ovector[0], ovector[1] - ovector[0]));
    
    // Subsequent elements are capture groups
    for (int i = 1; i < rc; i++) {
      if (ovector[2 * i] == PCRE2_UNSET) {
        matches.push_back("");  // Unmatched group
      } else {
        matches.push_back(subject.substr(
          ovector[2 * i], 
          ovector[2 * i + 1] - ovector[2 * i]
        ));
      }
    }
    
    if (global_ || sticky_) {
      lastIndex_ = static_cast<int>(ovector[1]);
    }
    
    return matches;
  }
  
  // Overload for gs::String
  std::optional<std::vector<std::string>> exec(const gs::String& subject) const {
    return exec(subject.str());
  }
  
  /**
   * Internal helper: match at specific position
   * Used by String.match() and String.search()
   */
  std::optional<std::vector<std::string>> matchAt(
    const std::string& subject, 
    PCRE2_SIZE start_offset = 0
  ) const {
    int rc = pcre2_match(
      compiled_,
      reinterpret_cast<PCRE2_SPTR>(subject.c_str()),
      subject.length(),
      start_offset,
      0,
      match_data_,
      nullptr
    );
    
    if (rc < 0) {
      return std::nullopt;
    }
    
    PCRE2_SIZE* ovector = pcre2_get_ovector_pointer(match_data_);
    std::vector<std::string> matches;
    
    matches.push_back(subject.substr(ovector[0], ovector[1] - ovector[0]));
    
    for (int i = 1; i < rc; i++) {
      if (ovector[2 * i] == PCRE2_UNSET) {
        matches.push_back("");
      } else {
        matches.push_back(subject.substr(
          ovector[2 * i], 
          ovector[2 * i + 1] - ovector[2 * i]
        ));
      }
    }
    
    return matches;
  }
  
  /**
   * Find all matches (for global flag)
   */
  std::vector<std::string> matchAll(const std::string& subject) const {
    std::vector<std::string> results;
    PCRE2_SIZE offset = 0;
    
    while (offset < subject.length()) {
      int rc = pcre2_match(
        compiled_,
        reinterpret_cast<PCRE2_SPTR>(subject.c_str()),
        subject.length(),
        offset,
        0,
        match_data_,
        nullptr
      );
      
      if (rc < 0) {
        break;
      }
      
      PCRE2_SIZE* ovector = pcre2_get_ovector_pointer(match_data_);
      results.push_back(subject.substr(ovector[0], ovector[1] - ovector[0]));
      
      offset = ovector[1];
      
      // Prevent infinite loop on zero-length matches
      if (ovector[0] == ovector[1]) {
        offset++;
      }
    }
    
    return results;
  }
  
  /**
   * Get the index of the first match
   * Returns -1 if not found
   */
  int search(const std::string& subject) const {
    int rc = pcre2_match(
      compiled_,
      reinterpret_cast<PCRE2_SPTR>(subject.c_str()),
      subject.length(),
      0,
      0,
      match_data_,
      nullptr
    );
    
    if (rc < 0) {
      return -1;
    }
    
    PCRE2_SIZE* ovector = pcre2_get_ovector_pointer(match_data_);
    return static_cast<int>(ovector[0]);
  }
  
  // Overload for gs::String
  int search(const gs::String& subject) const {
    return search(subject.str());
  }
  
  // Friend declarations for String methods that need access to internals
  friend class String;
  
  // Internal accessors for String methods
  pcre2_code* getCompiledPattern() const { return compiled_; }
  pcre2_match_data* getMatchData() const { return match_data_; }
};

} // namespace gs
