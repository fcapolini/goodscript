#pragma once

/**
 * GoodScript HTTP Runtime Library
 * 
 * Cross-platform HTTP/HTTPS client using libcurl.
 * Provides both synchronous and asynchronous HTTP operations.
 * 
 * Platform support:
 *   - macOS: HTTPS via Secure Transport (native)
 *   - Windows: HTTPS via Schannel (native)
 *   - Linux: HTTP only (or HTTPS with OpenSSL if available)
 * 
 * Requires: libcurl 7.x or later
 * 
 * Note: This header should be included AFTER gs_string.hpp, gs_map.hpp, and gs_error.hpp
 * It is automatically included by gs_runtime.hpp and gs_gc_runtime.hpp
 */

#include <curl/curl.h>
#include <string>
#include <sstream>
#include <vector>
#include <optional>
#include <memory>
#include <cstdint>

#ifdef CPPCORO_TASK_HPP_INCLUDED
#include <cppcoro/task.hpp>
#include <cppcoro/sync_wait.hpp>
#endif

// Forward declarations - actual types provided by gs_runtime.hpp or gs_gc_runtime.hpp
// #include "gs_string.hpp"
// #include "gs_map.hpp"
// #include "gs_error.hpp"

// Helper macros for string access (different APIs in GC vs ownership mode)
#ifdef GS_GC_MODE
#define GS_STRING_CSTR(s) ((s).c_str())
#define GS_STRING_TO_STD(s) ((s).to_std_string())
#define GS_STRING_FROM_STD(s) (gs::String(s))
#else
#define GS_STRING_CSTR(s) ((s).str().c_str())
#define GS_STRING_TO_STD(s) ((s).str())
#define GS_STRING_FROM_STD(s) (gs::String(s))
#endif

namespace gs {
namespace http {

/**
 * HTTP Response structure
 */
struct HttpResponse {
  int status;
  gs::String statusText;
  gs::Map<gs::String, gs::String> headers;
  gs::String body;
  
  HttpResponse() : status(0) {}
};

/**
 * HTTP Request options
 */
struct HttpOptions {
  std::optional<gs::String> method;
  std::optional<gs::Map<gs::String, gs::String>> headers;
  std::optional<gs::String> body;
  std::optional<int> timeout; // Timeout in milliseconds
  
  HttpOptions() = default;
};

/**
 * Internal helper for CURL write callback
 */
static size_t write_callback(char* ptr, size_t size, size_t nmemb, void* userdata) {
  std::string* response = static_cast<std::string*>(userdata);
  size_t total_size = size * nmemb;
  response->append(ptr, total_size);
  return total_size;
}

/**
 * Internal helper for CURL header callback
 */
static size_t header_callback(char* buffer, size_t size, size_t nitems, void* userdata) {
  std::map<std::string, std::string>* headers = 
    static_cast<std::map<std::string, std::string>*>(userdata);
  
  size_t total_size = size * nitems;
  std::string header(buffer, total_size);
  
  // Parse header line (Format: "Key: Value\r\n")
  size_t colon_pos = header.find(':');
  if (colon_pos != std::string::npos) {
    std::string key = header.substr(0, colon_pos);
    std::string value = header.substr(colon_pos + 1);
    
    // Trim whitespace
    value.erase(0, value.find_first_not_of(" \t\r\n"));
    value.erase(value.find_last_not_of(" \t\r\n") + 1);
    
    (*headers)[key] = value;
  }
  
  return total_size;
}

/**
 * Internal helper to perform HTTP request
 */
static HttpResponse perform_http_request(
  const std::string& url,
  const HttpOptions& options
) {
  // Initialize curl
  CURL* curl = curl_easy_init();
  if (!curl) {
    throw gs::Error("Failed to initialize libcurl");
  }
  
  // Cleanup guard
  std::unique_ptr<CURL, decltype(&curl_easy_cleanup)> curl_guard(curl, curl_easy_cleanup);
  
  // Set URL
  curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
  
  // Set HTTP method
  std::string method = "GET";
  if (options.method.has_value()) {
    method = GS_STRING_TO_STD(options.method.value());
  }
  
  if (method == "POST") {
    curl_easy_setopt(curl, CURLOPT_POST, 1L);
  } else if (method == "PUT") {
    curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, "PUT");
  } else if (method == "DELETE") {
    curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, "DELETE");
  } else if (method == "PATCH") {
    curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, "PATCH");
  } else if (method == "HEAD") {
    curl_easy_setopt(curl, CURLOPT_NOBODY, 1L);
  }
  // GET is default
  
  // Set request body
  if (options.body.has_value()) {
    std::string body_str = GS_STRING_TO_STD(options.body.value());
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, body_str.c_str());
    curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, body_str.length());
  }
  
  // Set request headers
  struct curl_slist* curl_headers = nullptr;
  if (options.headers.has_value()) {
    const auto& headers_map = options.headers.value();
    
    // Convert gs::Map to curl_slist
    // Note: We need to iterate through the map
    // For now, assume map has forEach method or we can access entries
    // This is a simplified version - actual implementation depends on gs::Map API
    
    // TODO: Implement proper header iteration once gs::Map API is finalized
    // For now, we'll leave headers empty in this initial version
  }
  
  if (curl_headers) {
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, curl_headers);
  }
  
  // Set timeout
  if (options.timeout.has_value()) {
    long timeout_ms = options.timeout.value();
    curl_easy_setopt(curl, CURLOPT_TIMEOUT_MS, timeout_ms);
  }
  
  // Set up response buffers
  std::string response_body;
  std::map<std::string, std::string> response_headers;
  
  curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_callback);
  curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response_body);
  curl_easy_setopt(curl, CURLOPT_HEADERFUNCTION, header_callback);
  curl_easy_setopt(curl, CURLOPT_HEADERDATA, &response_headers);
  
  // Follow redirects
  curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);
  curl_easy_setopt(curl, CURLOPT_MAXREDIRS, 10L);
  
  // Perform request
  CURLcode res = curl_easy_perform(curl);
  
  // Cleanup headers
  if (curl_headers) {
    curl_slist_free_all(curl_headers);
  }
  
  // Check for errors
  if (res != CURLE_OK) {
    std::string error_msg = "HTTP request failed: ";
    error_msg += curl_easy_strerror(res);
    throw gs::Error(error_msg);
  }
  
  // Get response status code
  long http_code = 0;
  curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &http_code);
  
  // Build response object
  HttpResponse response;
  response.status = static_cast<int>(http_code);
  response.body = GS_STRING_FROM_STD(response_body);
  
  // Convert status code to status text
  std::string status_text;
  switch (http_code) {
    case 200: status_text = "OK"; break;
    case 201: status_text = "Created"; break;
    case 204: status_text = "No Content"; break;
    case 301: status_text = "Moved Permanently"; break;
    case 302: status_text = "Found"; break;
    case 304: status_text = "Not Modified"; break;
    case 400: status_text = "Bad Request"; break;
    case 401: status_text = "Unauthorized"; break;
    case 403: status_text = "Forbidden"; break;
    case 404: status_text = "Not Found"; break;
    case 500: status_text = "Internal Server Error"; break;
    case 502: status_text = "Bad Gateway"; break;
    case 503: status_text = "Service Unavailable"; break;
    default: status_text = "Unknown"; break;
  }
  response.statusText = GS_STRING_FROM_STD(status_text);
  
  // Convert headers to gs::Map
  for (const auto& header : response_headers) {
    gs::String key = GS_STRING_FROM_STD(header.first);
    gs::String value = GS_STRING_FROM_STD(header.second);
    response.headers.set(key, value);
  }
  
  return response;
}

/**
 * HTTP - Synchronous HTTP client
 * 
 * Static class providing synchronous (blocking) HTTP operations.
 * Methods block until the request completes.
 */
class HTTP {
public:
  /**
   * Perform synchronous HTTP GET request
   * 
   * @param url - The URL to fetch
   * @returns HttpResponse with status, headers, and body
   * @throws gs::Error on network errors or timeouts
   */
  static HttpResponse syncFetch(const gs::String& url) {
    HttpOptions options;
    return syncFetch(url, options);
  }
  
  /**
   * Perform synchronous HTTP request with options
   * 
   * @param url - The URL to fetch
   * @param options - Request options (method, headers, body, timeout)
   * @returns HttpResponse with status, headers, and body
   * @throws gs::Error on network errors or timeouts
   */
  static HttpResponse syncFetch(const gs::String& url, const HttpOptions& options) {
    std::string url_str = GS_STRING_TO_STD(url);
    return perform_http_request(url_str, options);
  }
  
  /**
   * Initialize curl library (called automatically, but can be called manually)
   */
  static void init() {
    static bool initialized = false;
    if (!initialized) {
      curl_global_init(CURL_GLOBAL_DEFAULT);
      initialized = true;
    }
  }
  
  /**
   * Cleanup curl library (called automatically at program exit)
   */
  static void cleanup() {
    curl_global_cleanup();
  }
};

#ifdef CPPCORO_TASK_HPP_INCLUDED
/**
 * HTTPAsync - Asynchronous HTTP client
 * 
 * Static class providing asynchronous (non-blocking) HTTP operations.
 * Methods return cppcoro::task<T> for use with co_await.
 */
class HTTPAsync {
public:
  /**
   * Perform asynchronous HTTP GET request
   * 
   * @param url - The URL to fetch
   * @returns cppcoro::task<HttpResponse>
   */
  static cppcoro::task<HttpResponse> fetch(const gs::String& url) {
    HttpOptions options;
    co_return co_await fetch(url, options);
  }
  
  /**
   * Perform asynchronous HTTP request with options
   * 
   * @param url - The URL to fetch
   * @param options - Request options (method, headers, body, timeout)
   * @returns cppcoro::task<HttpResponse>
   */
  static cppcoro::task<HttpResponse> fetch(const gs::String& url, const HttpOptions& options) {
    // For now, async version just wraps the sync version
    // TODO: Implement true async using libcurl multi interface
    std::string url_str = GS_STRING_TO_STD(url);
    co_return perform_http_request(url_str, options);
  }
};
#endif

// Initialize curl at program start
static struct CurlInitializer {
  CurlInitializer() { HTTP::init(); }
  ~CurlInitializer() { HTTP::cleanup(); }
} curl_initializer;

} // namespace http
} // namespace gs
