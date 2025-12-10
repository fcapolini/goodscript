#pragma once

/**
 * GoodScript FileSystem Runtime Library
 * 
 * Cross-platform filesystem operations compatible with TypeScript FileSystem API.
 * Provides both synchronous and asynchronous file I/O.
 * 
 * Platform support:
 *   - POSIX (Linux, macOS, Unix)
 *   - Windows (Win32 API)
 * 
 * Requires C++17 or later for std::filesystem
 * 
 * Note: This header should be included AFTER gs_string.hpp, gs_array.hpp, and gs_error.hpp
 * It is automatically included by gs_runtime.hpp and gs_gc_runtime.hpp
 */

#include <filesystem>
#include <fstream>
#include <vector>
#include <string>
#include <optional>
#include <cstdint>
#include <chrono>
#include <system_error>
#include <algorithm>
#include <codecvt>
#include <locale>

#ifdef CPPCORO_TASK_HPP_INCLUDED
#include <cppcoro/task.hpp>
#include <cppcoro/sync_wait.hpp>
#endif

// Forward declarations - actual types provided by gs_runtime.hpp or gs_gc_runtime.hpp
// // String/Array defined by mode-specific runtime
// // String/Array defined by mode-specific runtime
// #include "gs_error.hpp"

// Helper macros for string access (different APIs in GC vs ownership mode)
#ifdef GS_GC_MODE
#define GS_STRING_CSTR(s) ((s).c_str())
#define GS_STRING_WRITE(s) ((s).c_str())
#define GS_STRING_TO_STD(s) ((s).to_std_string())
#else
#define GS_STRING_CSTR(s) ((s).str().c_str())
#define GS_STRING_WRITE(s) ((s).str())
#define GS_STRING_TO_STD(s) ((s).str())
#endif

namespace gs {

// Internal encoding conversion helpers
namespace detail {
  // Convert bytes to UTF-8 string based on encoding
  inline std::string decodeBytes(const std::string& bytes, const std::string& encoding) {
    if (encoding == "utf-8" || encoding == "utf8") {
      return bytes; // Already UTF-8
    } else if (encoding == "ascii") {
      // ASCII is a subset of UTF-8, just validate
      for (char c : bytes) {
        if (static_cast<unsigned char>(c) > 127) {
          throw gs::Error("Invalid ASCII character in file");
        }
      }
      return bytes;
    } else if (encoding == "latin1" || encoding == "iso-8859-1") {
      // Convert Latin1 to UTF-8
      std::string result;
      for (unsigned char c : bytes) {
        if (c < 128) {
          result += c;
        } else {
          result += static_cast<char>(0xC0 | (c >> 6));
          result += static_cast<char>(0x80 | (c & 0x3F));
        }
      }
      return result;
    } else if (encoding == "utf-16le" || encoding == "utf16le") {
      // Convert UTF-16LE to UTF-8
      std::wstring_convert<std::codecvt_utf8_utf16<char16_t>, char16_t> convert;
      const char16_t* data = reinterpret_cast<const char16_t*>(bytes.data());
      size_t len = bytes.size() / 2;
      return convert.to_bytes(data, data + len);
    } else if (encoding == "utf-16be" || encoding == "utf16be") {
      // Convert UTF-16BE to UTF-8 (swap bytes first)
      std::string swapped;
      for (size_t i = 0; i + 1 < bytes.size(); i += 2) {
        swapped += bytes[i + 1];
        swapped += bytes[i];
      }
      std::wstring_convert<std::codecvt_utf8_utf16<char16_t>, char16_t> convert;
      const char16_t* data = reinterpret_cast<const char16_t*>(swapped.data());
      size_t len = swapped.size() / 2;
      return convert.to_bytes(data, data + len);
    } else {
      throw gs::Error("Unsupported encoding: " + encoding + ". Supported: utf-8, ascii, latin1, utf-16le, utf-16be");
    }
  }

  // Convert UTF-8 string to bytes based on encoding
  inline std::string encodeString(const std::string& str, const std::string& encoding) {
    if (encoding == "utf-8" || encoding == "utf8") {
      return str; // Already UTF-8
    } else if (encoding == "ascii") {
      // Validate ASCII range
      for (char c : str) {
        if (static_cast<unsigned char>(c) > 127) {
          throw gs::Error("String contains non-ASCII characters, cannot encode as ASCII");
        }
      }
      return str;
    } else if (encoding == "latin1" || encoding == "iso-8859-1") {
      // Convert UTF-8 to Latin1 (lossy for chars > 255)
      std::string result;
      for (size_t i = 0; i < str.size();) {
        unsigned char c = static_cast<unsigned char>(str[i]);
        if (c < 128) {
          result += c;
          i++;
        } else if ((c & 0xE0) == 0xC0 && i + 1 < str.size()) {
          // 2-byte UTF-8 sequence
          unsigned char c2 = static_cast<unsigned char>(str[i + 1]);
          uint32_t codepoint = ((c & 0x1F) << 6) | (c2 & 0x3F);
          if (codepoint > 255) {
            throw gs::Error("Character U+" + std::to_string(codepoint) + " cannot be encoded as Latin1");
          }
          result += static_cast<char>(codepoint);
          i += 2;
        } else {
          throw gs::Error("String contains characters that cannot be encoded as Latin1");
        }
      }
      return result;
    } else if (encoding == "utf-16le" || encoding == "utf16le") {
      // Convert UTF-8 to UTF-16LE
      std::wstring_convert<std::codecvt_utf8_utf16<char16_t>, char16_t> convert;
      std::u16string utf16 = convert.from_bytes(str);
      return std::string(reinterpret_cast<const char*>(utf16.data()), utf16.size() * 2);
    } else if (encoding == "utf-16be" || encoding == "utf16be") {
      // Convert UTF-8 to UTF-16BE (swap bytes)
      std::wstring_convert<std::codecvt_utf8_utf16<char16_t>, char16_t> convert;
      std::u16string utf16 = convert.from_bytes(str);
      std::string result;
      const char* data = reinterpret_cast<const char*>(utf16.data());
      for (size_t i = 0; i < utf16.size() * 2; i += 2) {
        result += data[i + 1];
        result += data[i];
      }
      return result;
    } else {
      throw gs::Error("Unsupported encoding: " + encoding + ". Supported: utf-8, ascii, latin1, utf-16le, utf-16be");
    }
  }
} // namespace detail

/**
 * File type enumeration
 */
enum class FileType {
  File,
  Directory,
  Symlink,
  Unknown
};

/**
 * File information structure
 */
struct FileInfo {
  gs::String path;
  FileType type;
  int64_t size;
  double modified; // Unix timestamp in milliseconds
};

/**
 * FileSystem - Synchronous filesystem operations
 * 
 * Static class providing cross-platform filesystem operations.
 * All methods are synchronous and may block.
 */
class FileSystem {
public:
  /**
   * Check if a path exists
   */
  static bool exists(const gs::String& path) {
    #ifdef GS_GC_MODE
    std::filesystem::path p(GS_STRING_CSTR(path));
    #else
    std::filesystem::path p(GS_STRING_CSTR(path));
    #endif
    std::error_code ec;
    return std::filesystem::exists(p, ec);
  }

  /**
   * Read entire file as text
   */
  static gs::String readText(const gs::String& path, const std::optional<gs::String>& encoding = std::nullopt) {
    #ifdef GS_GC_MODE
    std::filesystem::path p(GS_STRING_CSTR(path));
    #else
    std::filesystem::path p(GS_STRING_CSTR(path));
    #endif
    std::ifstream file(p, std::ios::binary);
    
    if (!file.is_open()) {
      throw gs::Error("Failed to open file: " + path);
    }
    
    // Read entire file as bytes
    std::string bytes((std::istreambuf_iterator<char>(file)),
                      std::istreambuf_iterator<char>());
    
    // Convert from specified encoding to UTF-8
    std::string enc = encoding.has_value() ? GS_STRING_TO_STD(*encoding) : "utf-8";
    std::string content = detail::decodeBytes(bytes, enc);
    
    return gs::String(content);
  }

  /**
   * Write text to file
   */
  static void writeText(const gs::String& path, const gs::String& content, 
                       const std::optional<gs::String>& encoding = std::nullopt,
                       const std::optional<int>& mode = std::nullopt) {
    #ifdef GS_GC_MODE
    std::filesystem::path p(GS_STRING_CSTR(path));
    #else
    std::filesystem::path p(GS_STRING_CSTR(path));
    #endif
    std::ofstream file(p, std::ios::binary | std::ios::trunc);
    
    if (!file.is_open()) {
      throw gs::Error("Failed to open file for writing: " + path);
    }
    
    // Convert from UTF-8 to specified encoding
    std::string enc = encoding.has_value() ? GS_STRING_TO_STD(*encoding) : "utf-8";
    std::string contentStr = GS_STRING_TO_STD(content);
    std::string bytes = detail::encodeString(contentStr, enc);
    
    file << bytes;
    
    // Set permissions if provided (POSIX only)
    #ifndef _WIN32
    if (mode.has_value()) {
      std::filesystem::permissions(p, 
        static_cast<std::filesystem::perms>(mode.value()),
        std::filesystem::perm_options::replace);
    }
    #endif
  }

  /**
   * Append text to file
   */
  static void appendText(const gs::String& path, const gs::String& content,
                        const std::optional<gs::String>& encoding = std::nullopt,
                        const std::optional<int>& mode = std::nullopt) {
    #ifdef GS_GC_MODE
    std::filesystem::path p(GS_STRING_CSTR(path));
    #else
    std::filesystem::path p(GS_STRING_CSTR(path));
    #endif
    std::ofstream file(p, std::ios::binary | std::ios::app);
    
    if (!file.is_open()) {
      throw gs::Error("Failed to open file for appending: " + path);
    }
    
    // Convert from UTF-8 to specified encoding
    std::string enc = encoding.has_value() ? GS_STRING_TO_STD(*encoding) : "utf-8";
    std::string contentStr = GS_STRING_TO_STD(content);
    std::string bytes = detail::encodeString(contentStr, enc);
    
    file << bytes;
  }

  /**
   * Read entire file as bytes
   */
  static gs::Array<uint8_t> readBytes(const gs::String& path) {
    #ifdef GS_GC_MODE
    std::filesystem::path p(GS_STRING_CSTR(path));
    #else
    std::filesystem::path p(GS_STRING_CSTR(path));
    #endif
    std::ifstream file(p, std::ios::binary);
    
    if (!file.is_open()) {
      throw gs::Error("Failed to open file: " + path);
    }
    
    // Get file size
    file.seekg(0, std::ios::end);
    size_t size = file.tellg();
    file.seekg(0, std::ios::beg);
    
    // Read into vector
    std::vector<uint8_t> buffer(size);
    file.read(reinterpret_cast<char*>(buffer.data()), size);
    
    // Convert to gs::Array
    gs::Array<uint8_t> result;
    for (uint8_t byte : buffer) {
      result.push(byte);
    }
    
    return result;
  }

  /**
   * Write bytes to file
   */
  static void writeBytes(const gs::String& path, const gs::Array<uint8_t>& data,
                         const std::optional<int>& mode = std::nullopt) {
    #ifdef GS_GC_MODE
    std::filesystem::path p(GS_STRING_CSTR(path));
    #else
    std::filesystem::path p(GS_STRING_CSTR(path));
    #endif
    std::ofstream file(p, std::ios::binary | std::ios::trunc);
    
    if (!file.is_open()) {
      throw gs::Error("Failed to open file for writing: " + path);
    }
    
    // Write array data
    for (int i = 0; i < data.length(); i++) {
      #ifdef GS_GC_MODE
      uint8_t byte = data[i];  // GC mode: operator[] returns T&
      #else
      uint8_t byte = *data[i]; // Ownership mode: operator[] returns T*
      #endif
      file.write(reinterpret_cast<const char*>(&byte), 1);
    }
    
    // Set permissions if provided (POSIX only)
    #ifndef _WIN32
    if (mode.has_value()) {
      std::filesystem::permissions(p,
        static_cast<std::filesystem::perms>(mode.value()),
        std::filesystem::perm_options::replace);
    }
    #endif
  }

  /**
   * Delete a file or empty directory
   */
  static void remove(const gs::String& path) {
    #ifdef GS_GC_MODE
    std::filesystem::path p(GS_STRING_CSTR(path));
    #else
    std::filesystem::path p(GS_STRING_CSTR(path));
    #endif
    std::error_code ec;
    
    if (!std::filesystem::remove(p, ec)) {
      if (ec) {
        throw gs::Error("Failed to remove: " + path + " (" + gs::String(ec.message()) + ")");
      }
    }
  }

  /**
   * Delete a file or directory recursively
   */
  static void removeRecursive(const gs::String& path) {
    #ifdef GS_GC_MODE
    std::filesystem::path p(GS_STRING_CSTR(path));
    #else
    std::filesystem::path p(GS_STRING_CSTR(path));
    #endif
    std::error_code ec;
    
    std::filesystem::remove_all(p, ec);
    
    if (ec) {
      throw gs::Error("Failed to remove recursively: " + path + " (" + gs::String(ec.message()) + ")");
    }
  }

  /**
   * Create a directory
   */
  static void mkdir(const gs::String& path, const std::optional<int>& mode = std::nullopt) {
    #ifdef GS_GC_MODE
    std::filesystem::path p(GS_STRING_CSTR(path));
    #else
    std::filesystem::path p(GS_STRING_CSTR(path));
    #endif
    std::error_code ec;
    
    if (!std::filesystem::create_directory(p, ec)) {
      if (ec) {
        throw gs::Error("Failed to create directory: " + path + " (" + gs::String(ec.message()) + ")");
      }
    }
    
    // Set permissions if provided (POSIX only)
    #ifndef _WIN32
    if (mode.has_value()) {
      std::filesystem::permissions(p,
        static_cast<std::filesystem::perms>(mode.value()),
        std::filesystem::perm_options::replace);
    }
    #endif
  }

  /**
   * Create a directory and all parent directories
   */
  static void mkdirRecursive(const gs::String& path, const std::optional<int>& mode = std::nullopt) {
    #ifdef GS_GC_MODE
    std::filesystem::path p(GS_STRING_CSTR(path));
    #else
    std::filesystem::path p(GS_STRING_CSTR(path));
    #endif
    std::error_code ec;
    
    std::filesystem::create_directories(p, ec);
    
    if (ec) {
      throw gs::Error("Failed to create directories: " + path + " (" + gs::String(ec.message()) + ")");
    }
    
    // Set permissions if provided (POSIX only)
    #ifndef _WIN32
    if (mode.has_value()) {
      std::filesystem::permissions(p,
        static_cast<std::filesystem::perms>(mode.value()),
        std::filesystem::perm_options::replace);
    }
    #endif
  }

  /**
   * List directory entries
   */
  static gs::Array<gs::String> readDir(const gs::String& path, bool recursive = false) {
    #ifdef GS_GC_MODE
    std::filesystem::path p(GS_STRING_CSTR(path));
    #else
    std::filesystem::path p(GS_STRING_CSTR(path));
    #endif
    gs::Array<gs::String> result;
    std::error_code ec;
    
    if (recursive) {
      for (const auto& entry : std::filesystem::recursive_directory_iterator(p, ec)) {
        if (ec) {
          throw gs::Error("Failed to read directory: " + path + " (" + gs::String(ec.message()) + ")");
        }
        auto relative = std::filesystem::relative(entry.path(), p);
        result.push(gs::String(relative.string()));
      }
    } else {
      for (const auto& entry : std::filesystem::directory_iterator(p, ec)) {
        if (ec) {
          throw gs::Error("Failed to read directory: " + path + " (" + gs::String(ec.message()) + ")");
        }
        result.push(gs::String(entry.path().filename().string()));
      }
    }
    
    return result;
  }

  /**
   * Get file information
   */
  static FileInfo stat(const gs::String& path) {
    #ifdef GS_GC_MODE
    std::filesystem::path p(GS_STRING_CSTR(path));
    #else
    std::filesystem::path p(GS_STRING_CSTR(path));
    #endif
    std::error_code ec;
    
    if (!std::filesystem::exists(p, ec)) {
      throw gs::Error("File not found: " + path);
    }
    
    auto status = std::filesystem::status(p, ec);
    if (ec) {
      throw gs::Error("Failed to get file status: " + path + " (" + gs::String(ec.message()) + ")");
    }
    
    FileInfo info;
    info.path = path;
    
    // Determine file type
    if (std::filesystem::is_regular_file(status)) {
      info.type = FileType::File;
    } else if (std::filesystem::is_directory(status)) {
      info.type = FileType::Directory;
    } else if (std::filesystem::is_symlink(status)) {
      info.type = FileType::Symlink;
    } else {
      info.type = FileType::Unknown;
    }
    
    // Get file size
    if (info.type == FileType::File) {
      info.size = std::filesystem::file_size(p, ec);
      if (ec) {
        info.size = 0;
      }
    } else {
      info.size = 0;
    }
    
    // Get last write time
    auto ftime = std::filesystem::last_write_time(p, ec);
    if (!ec) {
      auto sctp = std::chrono::time_point_cast<std::chrono::system_clock::duration>(
        ftime - std::filesystem::file_time_type::clock::now() + std::chrono::system_clock::now()
      );
      auto millis = std::chrono::duration_cast<std::chrono::milliseconds>(sctp.time_since_epoch()).count();
      info.modified = static_cast<double>(millis);
    } else {
      info.modified = 0.0;
    }
    
    return info;
  }

  /**
   * Check if path is a file
   */
  static bool isFile(const gs::String& path) {
    if (!exists(path)) {
      return false;
    }
    auto info = stat(path);
    return info.type == FileType::File;
  }

  /**
   * Check if path is a directory
   */
  static bool isDirectory(const gs::String& path) {
    if (!exists(path)) {
      return false;
    }
    auto info = stat(path);
    return info.type == FileType::Directory;
  }

  /**
   * Copy a file
   */
  static void copy(const gs::String& source, const gs::String& destination) {
    #ifdef GS_GC_MODE
    std::filesystem::path src(GS_STRING_CSTR(source));
    #else
    std::filesystem::path src(GS_STRING_CSTR(source));
    #endif
    #ifdef GS_GC_MODE
    std::filesystem::path dst(GS_STRING_CSTR(destination));
    #else
    std::filesystem::path dst(GS_STRING_CSTR(destination));
    #endif
    std::error_code ec;
    
    std::filesystem::copy_file(src, dst, 
      std::filesystem::copy_options::overwrite_existing, ec);
    
    if (ec) {
      throw gs::Error("Failed to copy file: " + source + " to " + destination + 
                     " (" + gs::String(ec.message()) + ")");
    }
  }

  /**
   * Move/rename a file or directory
   */
  static void move(const gs::String& source, const gs::String& destination) {
    #ifdef GS_GC_MODE
    std::filesystem::path src(GS_STRING_CSTR(source));
    #else
    std::filesystem::path src(GS_STRING_CSTR(source));
    #endif
    #ifdef GS_GC_MODE
    std::filesystem::path dst(GS_STRING_CSTR(destination));
    #else
    std::filesystem::path dst(GS_STRING_CSTR(destination));
    #endif
    std::error_code ec;
    
    std::filesystem::rename(src, dst, ec);
    
    if (ec) {
      throw gs::Error("Failed to move: " + source + " to " + destination + 
                     " (" + gs::String(ec.message()) + ")");
    }
  }

  /**
   * Get current working directory
   */
  static gs::String cwd() {
    std::error_code ec;
    auto current = std::filesystem::current_path(ec);
    
    if (ec) {
      throw gs::Error("Failed to get current directory: " + gs::String(ec.message()));
    }
    
    return gs::String(current.string());
  }

  /**
   * Get absolute path
   */
  static gs::String absolute(const gs::String& path) {
    #ifdef GS_GC_MODE
    std::filesystem::path p(GS_STRING_CSTR(path));
    #else
    std::filesystem::path p(GS_STRING_CSTR(path));
    #endif
    std::error_code ec;
    auto abs = std::filesystem::absolute(p, ec);
    
    if (ec) {
      throw gs::Error("Failed to get absolute path: " + path + " (" + gs::String(ec.message()) + ")");
    }
    
    return gs::String(abs.string());
  }

  /**
   * Join path segments
   */
  static gs::String join(const gs::Array<gs::String>& segments) {
    if (segments.length() == 0) {
      return gs::String("");
    }
    
    #ifdef GS_GC_MODE
    std::filesystem::path result(GS_STRING_CSTR(segments[0]));
    
    for (int i = 1; i < segments.length(); i++) {
      result /= GS_STRING_CSTR(segments[i]);
    }
    #else
    std::filesystem::path result(GS_STRING_CSTR((*segments[0])));
    
    for (int i = 1; i < segments.length(); i++) {
      result /= GS_STRING_CSTR((*segments[i]));
    }
    #endif
    
    return gs::String(result.string());
  }

  /**
   * Get directory name from path
   */
  static gs::String dirname(const gs::String& path) {
    #ifdef GS_GC_MODE
    std::filesystem::path p(GS_STRING_CSTR(path));
    #else
    std::filesystem::path p(GS_STRING_CSTR(path));
    #endif
    return gs::String(p.parent_path().string());
  }

  /**
   * Get base name from path
   */
  static gs::String basename(const gs::String& path, const std::optional<gs::String>& suffix = std::nullopt) {
    #ifdef GS_GC_MODE
    std::filesystem::path p(GS_STRING_CSTR(path));
    #else
    std::filesystem::path p(GS_STRING_CSTR(path));
    #endif
    std::string name = p.filename().string();
    
    if (suffix.has_value() && name.size() >= suffix->length()) {
      std::string suf = GS_STRING_TO_STD(*suffix);
      if (name.compare(name.size() - suf.size(), suf.size(), suf) == 0) {
        name = name.substr(0, name.size() - suf.size());
      }
    }
    
    return gs::String(name);
  }

  /**
   * Get file extension from path
   */
  static gs::String extname(const gs::String& path) {
    #ifdef GS_GC_MODE
    std::filesystem::path p(GS_STRING_CSTR(path));
    #else
    std::filesystem::path p(GS_STRING_CSTR(path));
    #endif
    return gs::String(p.extension().string());
  }
};

#ifdef CPPCORO_TASK_HPP_INCLUDED
/**
 * FileSystemAsync - Asynchronous filesystem operations
 * 
 * Provides async/await compatible filesystem operations using cppcoro.
 * All operations run synchronously but return cppcoro::task for compatibility.
 * 
 * Note: True async I/O would require platform-specific APIs (io_uring, IOCP, etc.)
 * For now, we provide task-based wrappers around synchronous operations.
 */
class FileSystemAsync {
public:
  static cppcoro::task<bool> exists(const gs::String& path) {
    co_return FileSystem::exists(path);
  }

  static cppcoro::task<gs::String> readText(const gs::String& path, 
                                            const std::optional<gs::String>& encoding = std::nullopt) {
    co_return FileSystem::readText(path, encoding);
  }

  static cppcoro::task<void> writeText(const gs::String& path, const gs::String& content,
                                       const std::optional<gs::String>& encoding = std::nullopt,
                                       const std::optional<int>& mode = std::nullopt) {
    FileSystem::writeText(path, content, encoding, mode);
    co_return;
  }

  static cppcoro::task<void> appendText(const gs::String& path, const gs::String& content,
                                        const std::optional<gs::String>& encoding = std::nullopt,
                                        const std::optional<int>& mode = std::nullopt) {
    FileSystem::appendText(path, content, encoding, mode);
    co_return;
  }

  static cppcoro::task<gs::Array<uint8_t>> readBytes(const gs::String& path) {
    co_return FileSystem::readBytes(path);
  }

  static cppcoro::task<void> writeBytes(const gs::String& path, const gs::Array<uint8_t>& data,
                                        const std::optional<int>& mode = std::nullopt) {
    FileSystem::writeBytes(path, data, mode);
    co_return;
  }

  static cppcoro::task<void> remove(const gs::String& path) {
    FileSystem::remove(path);
    co_return;
  }

  static cppcoro::task<void> removeRecursive(const gs::String& path) {
    FileSystem::removeRecursive(path);
    co_return;
  }

  static cppcoro::task<void> mkdir(const gs::String& path, const std::optional<int>& mode = std::nullopt) {
    FileSystem::mkdir(path, mode);
    co_return;
  }

  static cppcoro::task<void> mkdirRecursive(const gs::String& path, const std::optional<int>& mode = std::nullopt) {
    FileSystem::mkdirRecursive(path, mode);
    co_return;
  }

  static cppcoro::task<gs::Array<gs::String>> readDir(const gs::String& path, bool recursive = false) {
    co_return FileSystem::readDir(path, recursive);
  }

  static cppcoro::task<FileInfo> stat(const gs::String& path) {
    co_return FileSystem::stat(path);
  }

  static cppcoro::task<bool> isFile(const gs::String& path) {
    co_return FileSystem::isFile(path);
  }

  static cppcoro::task<bool> isDirectory(const gs::String& path) {
    co_return FileSystem::isDirectory(path);
  }

  static cppcoro::task<void> copy(const gs::String& source, const gs::String& destination) {
    FileSystem::copy(source, destination);
    co_return;
  }

  static cppcoro::task<void> move(const gs::String& source, const gs::String& destination) {
    FileSystem::move(source, destination);
    co_return;
  }

  static cppcoro::task<gs::String> cwd() {
    co_return FileSystem::cwd();
  }

  static cppcoro::task<gs::String> absolute(const gs::String& path) {
    co_return FileSystem::absolute(path);
  }
};
#endif // CPPCORO_TASK_HPP_INCLUDED

} // namespace gs
