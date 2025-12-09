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
    // encoding parameter is ignored (always UTF-8 in C++)
    #ifdef GS_GC_MODE
    std::filesystem::path p(GS_STRING_CSTR(path));
    #else
    std::filesystem::path p(GS_STRING_CSTR(path));
    #endif
    std::ifstream file(p, std::ios::binary);
    
    if (!file.is_open()) {
      throw gs::Error("Failed to open file: " + path);
    }
    
    // Read entire file into string
    std::string content((std::istreambuf_iterator<char>(file)),
                       std::istreambuf_iterator<char>());
    
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
    
    #ifdef GS_GC_MODE
    file << GS_STRING_WRITE(content);
    #else
    file << GS_STRING_WRITE(content);
    #endif
    
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
    
    #ifdef GS_GC_MODE
    file << GS_STRING_WRITE(content);
    #else
    file << GS_STRING_WRITE(content);
    #endif
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
