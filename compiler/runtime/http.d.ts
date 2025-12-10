/**
 * HTTP Client API Type Definitions
 * 
 * These types are implemented in C++ runtime (http-httplib.hpp)
 * but exposed here for TypeScript type checking and IR type inference.
 */

/**
 * HTTP Response structure
 */
interface HttpResponse {
  status: number;
  statusText: string;
  headers: Map<string, string>;
  body: string;
}

/**
 * HTTP - Synchronous HTTP client
 */
declare class HTTP {
  /**
   * Perform synchronous HTTP GET request
   */
  static syncFetch(url: string): HttpResponse;
  
  /**
   * Perform synchronous HTTP POST request
   */
  static post(url: string, body: string, contentType: string): HttpResponse;
}

/**
 * HTTPAsync - Asynchronous HTTP client
 */
declare class HTTPAsync {
  /**
   * Perform asynchronous HTTP GET request
   */
  static fetch(url: string): Promise<HttpResponse>;
  
  /**
   * Perform asynchronous HTTP POST request
   */
  static post(url: string, body: string, contentType: string): Promise<HttpResponse>;
}
