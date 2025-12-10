#pragma once

/**
 * GoodScript HTTP Runtime Library (cpp-httplib backend)
 * 
 * Cross-platform HTTP/HTTPS client using cpp-httplib.
 * Provides both synchronous and asynchronous HTTP operations.
 * 
 * Platform support:
 *   - macOS: HTTP only (HTTPS requires OpenSSL)
 *   - Windows: HTTP only (HTTPS requires OpenSSL)
 *   - Linux: HTTP only (HTTPS requires OpenSSL)
 * 
 * Note: HTTPS support disabled to avoid OpenSSL dependency
 * Requires: cpp-httplib (header-only, MIT license)
 * 
 * Note: This header should be included AFTER gs_string.hpp, gs_map.hpp, and gs_error.hpp
 */

// Disable HTTPS to avoid OpenSSL dependency
// #define CPPHTTPLIB_OPENSSL_SUPPORT
#include "../../../vendor/cpp-httplib/httplib.h"

#include <string>
#include <optional>
#include <memory>

#ifdef CPPCORO_TASK_HPP_INCLUDED
#include <cppcoro/task.hpp>
#include <cppcoro/sync_wait.hpp>
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
 * Internal helper to convert httplib response to HttpResponse
 */
static HttpResponse convertResponse(const httplib::Response& res) {
  HttpResponse response;
  response.status = res.status;
  response.statusText = gs::String(res.reason);
  response.body = gs::String(res.body);
  
  // Convert headers
  for (const auto& header : res.headers) {
    response.headers.set(gs::String(header.first), gs::String(header.second));
  }
  
  return response;
}

/**
 * HTTP - Synchronous HTTP client
 * 
 * Static class providing synchronous (blocking) HTTP operations.
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
    std::string url_str = url.to_std_string();
    
    // Parse URL into scheme://host:port/path
    // For simplicity, assume http://hostname/path format
    std::string scheme, host, path;
    int port = 80;
    
    // Simple URL parsing
    size_t scheme_end = url_str.find("://");
    if (scheme_end != std::string::npos) {
      scheme = url_str.substr(0, scheme_end);
      url_str = url_str.substr(scheme_end + 3);
    }
    
    size_t path_start = url_str.find('/');
    if (path_start != std::string::npos) {
      host = url_str.substr(0, path_start);
      path = url_str.substr(path_start);
    } else {
      host = url_str;
      path = "/";
    }
    
    // Check for port in host
    size_t port_pos = host.find(':');
    if (port_pos != std::string::npos) {
      port = std::stoi(host.substr(port_pos + 1));
      host = host.substr(0, port_pos);
    }
    
    // Create client with host and port
    httplib::Client client(host, port);
    
    // Set reasonable timeouts (in seconds)
    client.set_connection_timeout(10, 0);  // 10 seconds connection timeout
    client.set_read_timeout(30, 0);         // 30 seconds read timeout
    client.set_write_timeout(30, 0);        // 30 seconds write timeout
    
    // Enable redirect following
    client.set_follow_location(true);
    
    // Perform GET request
    auto res = client.Get(path);
    
    if (!res) {
      throw gs::Error("HTTP request failed: " + std::string(httplib::to_string(res.error())));
    }
    
    return convertResponse(res.value());
  }
  
  /**
   * Perform synchronous HTTP POST request
   * 
   * @param url - The URL to post to
   * @param body - Request body
   * @param contentType - Content-Type header
   * @returns HttpResponse with status, headers, and body
   * @throws gs::Error on network errors or timeouts
   */
  static HttpResponse post(const gs::String& url, const gs::String& body, const gs::String& contentType) {
    std::string url_str = url.to_std_string();
    std::string host, path;
    int port = 80;
    
    // Simple URL parsing (same as above)
    size_t scheme_end = url_str.find("://");
    if (scheme_end != std::string::npos) {
      url_str = url_str.substr(scheme_end + 3);
    }
    
    size_t path_start = url_str.find('/');
    if (path_start != std::string::npos) {
      host = url_str.substr(0, path_start);
      path = url_str.substr(path_start);
    } else {
      host = url_str;
      path = "/";
    }
    
    size_t port_pos = host.find(':');
    if (port_pos != std::string::npos) {
      port = std::stoi(host.substr(port_pos + 1));
      host = host.substr(0, port_pos);
    }
    
    // Create client with timeouts
    httplib::Client client(host, port);
    client.set_connection_timeout(10, 0);
    client.set_read_timeout(30, 0);
    client.set_write_timeout(30, 0);
    client.set_follow_location(true);
    
    // Perform POST request
    auto res = client.Post(path, body.to_std_string(), contentType.to_std_string());
    
    if (!res) {
      throw gs::Error("HTTP POST failed: " + std::string(httplib::to_string(res.error())));
    }
    
    return convertResponse(res.value());
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
    // For now, async version wraps the sync version
    // TODO: Implement true async using cpp-httplib async API
    co_return HTTP::syncFetch(url);
  }
  
  /**
   * Perform asynchronous HTTP POST request
   * 
   * @param url - The URL to post to
   * @param body - Request body
   * @param contentType - Content-Type header
   * @returns cppcoro::task<HttpResponse>
   */
  static cppcoro::task<HttpResponse> post(const gs::String& url, const gs::String& body, const gs::String& contentType) {
    co_return HTTP::post(url, body, contentType);
  }
};
#endif

} // namespace http
} // namespace gs
