import type { HttpResponse, HttpOptions, HttpTryResult } from './types-gs.js';

/**
 * HTTP client for making HTTP/HTTPS requests
 * 
 * Provides both async and sync variants:
 * - Async (default): `fetch()`, `tryFetch()` - non-blocking, returns Promise
 * - Sync (explicit): `syncFetch()`, `trySyncFetch()` - blocking, returns value directly
 * 
 * **Async vs Sync:**
 * - Async: Default, recommended for most use cases. Non-blocking, allows concurrent operations.
 * - Sync: Explicit prefix `sync*`. Blocking, only for system targets (Node.js, native), not available in browser.
 * 
 * **Error Handling:**
 * - Throwing: `fetch()`, `syncFetch()` - throws on error (network, timeout, HTTP errors)
 * - Safe: `tryFetch()`, `trySyncFetch()` - returns result with `success` flag
 * 
 * @example Async with throwing (recommended)
 * ```typescript
 * const response = await Http.fetch('https://api.example.com/data');
 * console.log(response.body);
 * ```
 * 
 * @example Async with safe error handling
 * ```typescript
 * const result = await Http.tryFetch('https://api.example.com/data');
 * if (result.success) {
 *   console.log(result.response.body);
 * } else {
 *   console.error('Request failed:', result.error);
 * }
 * ```
 * 
 * @example Sync (blocking, system targets only)
 * ```typescript
 * const response = Http.syncFetch('https://api.example.com/data');
 * console.log(response.body);
 * ```
 */
export class Http {
  /**
   * Make an HTTP request (async, throws on error)
   * 
   * This is the recommended default. Returns a Promise that:
   * - Resolves with HttpResponse on success (2xx-5xx status codes)
   * - Rejects on network errors, timeouts, or invalid URLs
   * 
   * **When to use:**
   * - Default choice for most HTTP requests
   * - When you want exceptions for error handling
   * - When using try/catch blocks
   * 
   * **Throws:**
   * - Network errors (DNS, connection refused, etc.)
   * - Timeout errors (if timeout option is set)
   * - Invalid URL errors
   * 
   * @param url - The URL to request
   * @param options - Optional request configuration
   * @returns Promise resolving to HttpResponse
   * @throws Error on network failures, timeouts, or invalid URLs
   * 
   * @example GET request
   * ```typescript
   * const response = await Http.fetch('https://api.example.com/users');
   * console.log(response.status); // 200
   * console.log(response.body);   // JSON string
   * ```
   * 
   * @example POST request with headers
   * ```typescript
   * const headers = new Map<string, string>();
   * headers.set('Content-Type', 'application/json');
   * 
   * const response = await Http.fetch('https://api.example.com/users', {
   *   method: 'POST',
   *   headers: headers,
   *   body: '{"name":"Alice"}',
   *   timeout: 5000
   * });
   * ```
   * 
   * @example Error handling with try/catch
   * ```typescript
   * try {
   *   const response = await Http.fetch('https://api.example.com/data');
   *   console.log(response.body);
   * } catch (error) {
   *   console.error('Request failed:', error);
   * }
   * ```
   */
  static async fetch(url: string, options?: HttpOptions): Promise<HttpResponse> {
    // Implementation using native fetch() API (Node.js 18+, browsers)
    // Haxe: Wrap haxe.Http callbacks in Promise
    // C++: Use libcurl with cppcoro async
    
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      const init: RequestInit = {
        method: options?.method || 'GET',
        signal: controller.signal
      };

      // Add headers if provided
      if (options?.headers) {
        const headers = new Headers();
        options.headers.forEach((value, key) => {
          headers.set(key, value);
        });
        init.headers = headers;
      }

      // Add body if provided
      if (options?.body) {
        init.body = options.body;
      }

      // Set timeout if provided
      if (options?.timeout && options.timeout > 0) {
        timeoutId = setTimeout(() => controller.abort(), options.timeout);
      }

      const response = await fetch(url, init);

      // Clear timeout on success
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }

      // Convert headers to Map
      const headersMap = new Map<string, string>();
      response.headers.forEach((value, key) => {
        headersMap.set(key, value);
      });

      // Read body as text
      const body = await response.text();

      return {
        status: response.status,
        statusText: response.statusText,
        headers: headersMap,
        body,
        ok: response.ok
      };
    } catch (error) {
      // Clear timeout on error
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }

      // Handle abort/timeout errors
      const err = error as Error;
      if (err.name === 'AbortError') {
        throw new Error(`Request timeout after ${options?.timeout}ms: ${url}`);
      }
      
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Make an HTTP request (async, safe - returns result)
   * 
   * Non-throwing variant of `fetch()`. Returns a result object with a `success` flag
   * instead of throwing exceptions.
   * 
   * **When to use:**
   * - When you want to avoid try/catch blocks
   * - When errors are expected and should be handled explicitly
   * - When you need detailed error information without exceptions
   * 
   * @param url - The URL to request
   * @param options - Optional request configuration
   * @returns Promise resolving to HttpTryResult with success flag
   * 
   * @example Safe error handling
   * ```typescript
   * const result = await Http.tryFetch('https://api.example.com/users');
   * if (result.success) {
   *   console.log('Status:', result.response.status);
   *   console.log('Body:', result.response.body);
   * } else {
   *   console.error('Error:', result.error);
   * }
   * ```
   * 
   * @example Checking HTTP status
   * ```typescript
   * const result = await Http.tryFetch('https://api.example.com/data');
   * if (result.success && result.response.ok) {
   *   // Success (2xx status)
   *   processData(result.response.body);
   * } else if (result.success) {
   *   // HTTP error (4xx, 5xx)
   *   console.error('HTTP error:', result.response.status);
   * } else {
   *   // Network error
   *   console.error('Network error:', result.error);
   * }
   * ```
   */
  static async tryFetch(url: string, options?: HttpOptions): Promise<HttpTryResult> {
    try {
      const response = await Http.fetch(url, options);
      return { success: true, response };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Make an HTTP request (sync, throws on error)
   * 
   * Synchronous (blocking) variant of `fetch()`. Only available on system targets
   * (Node.js, native C++), not in browsers.
   * 
   * **When to use:**
   * - In system scripts where blocking is acceptable
   * - In initialization code that must complete before proceeding
   * - When async/await is not available or practical
   * 
   * **Limitations:**
   * - Blocks the thread until request completes
   * - Not available in browsers (will throw runtime error)
   * - Cannot run concurrent requests in same thread
   * 
   * **Throws:**
   * - Network errors (DNS, connection refused, etc.)
   * - Timeout errors (if timeout option is set)
   * - Invalid URL errors
   * - Runtime error if called in browser environment
   * 
   * @param url - The URL to request
  /**
   * Fetch and parse JSON response (async, throws on error)
   * 
   * Convenience method that combines `fetch()` with JSON parsing.
   * 
   * **Throws:**
   * - Network errors, timeouts, invalid URLs (from fetch)
   * - JSON parse errors (invalid JSON in response body)
   * 
   * @param url - The URL to request
   * @param options - Optional request configuration
   * @returns Promise resolving to parsed JSON value
   * @throws Error on network failures or JSON parse errors
   * 
   * @example Fetch JSON data
   * ```typescript
   * interface User { id: number; name: string; }
   * const user = await Http.fetchJson<User>('https://api.example.com/user/1');
   * console.log(user.name);
   * ```
   */
  static async fetchJson<T>(url: string, options?: HttpOptions): Promise<T> {
    const response = await Http.fetch(url, options);
    try {
      return JSON.parse(response.body) as T;
    } catch (error) {
      throw new Error(`Failed to parse JSON response from ${url}: ${(error as Error).message}`);
    }
  }

  /**
   * Make an HTTP request (sync, throws on error)
   * 
   * Synchronous (blocking) variant of `fetch()`. Only available on system targets
   * (Node.js, native C++), not in browsers.
   * 
   * **When to use:**
   * - In system scripts where blocking is acceptable
   * - In initialization code that must complete before proceeding
   * - When async/await is not available or practical
   * 
   * **Limitations:**
   * - Blocks the thread until request completes
   * - Not available in browsers (will throw runtime error)
   * - Cannot run concurrent requests in same thread
   * 
   * **Throws:**
   * - Network errors (DNS, connection refused, etc.)
   * - Timeout errors (if timeout option is set)
   * - Invalid URL errors
   * - Runtime error if called in browser environment
   * 
   * @param url - The URL to request
   * @param options - Optional request configuration
   * @returns HttpResponse
   * @throws Error on network failures, timeouts, invalid URLs, or if called in browser
   * 
   * @example Synchronous GET request
   * ```typescript
   * const response = Http.syncFetch('https://api.example.com/config');
   * const config = JSON.parse(response.body);
   * console.log('Config loaded:', config);
   * ```
   * 
   * @example Error handling with try/catch
   * ```typescript
   * try {
   *   const response = Http.syncFetch('https://api.example.com/data');
   *   processData(response.body);
   * } catch (error) {
   *   console.error('Failed to load data:', error);
   * }
   * ```
   */
  static syncFetch(url: string, options?: HttpOptions): HttpResponse {
    // TODO: Implementation
    // - TypeScript/Node.js: Use sync HTTP library or child_process + curl
    // - Haxe: Use sys.Http (synchronous)
    // - C++: Use libcurl synchronous API
    // - Browser: throw Error('syncFetch not supported in browser')
    throw new Error('Http.syncFetch() not yet implemented');
  }

  /**
   * Make an HTTP request (sync, safe - returns result)
   * 
   * Non-throwing variant of `syncFetch()`. Returns a result object with a `success` flag
   * instead of throwing exceptions. Only available on system targets.
   * 
   * **When to use:**
   * - In system scripts where blocking is acceptable AND you want safe error handling
   * - When you need synchronous requests without try/catch blocks
   * 
   * @param url - The URL to request
   * @param options - Optional request configuration
   * @returns HttpTryResult with success flag
   * 
   * @example Safe synchronous request
   * ```typescript
   * const result = Http.trySyncFetch('https://api.example.com/config');
   * if (result.success) {
   *   const config = JSON.parse(result.response.body);
   *   console.log('Config loaded:', config);
   * } else {
   *   console.error('Failed to load config:', result.error);
   *   // Use defaults
   * }
   * ```
   */
  static trySyncFetch(url: string, options?: HttpOptions): HttpTryResult {
    try {
      const response = Http.syncFetch(url, options);
      return { success: true, response };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Fetch and parse JSON response (async, throws on error)
   * 
   * Convenience method that combines `fetch()` with JSON parsing.
   * 
   * **Throws:**
   * - Network errors, timeouts, invalid URLs (from fetch)
   * - JSON parse errors (invalid JSON in response body)
   * 
   * @param url - The URL to request
   * @param options - Optional request configuration
   * @returns Promise resolving to parsed JSON value
   * @throws Error on network failures or JSON parse errors
  /**
   * Fetch and parse JSON response (async, safe - returns result)
   * 
   * Non-throwing variant of `fetchJson()`.
   * 
   * @param url - The URL to request
   * @param options - Optional request configuration
   * @returns Promise resolving to result with parsed JSON or error
   * 
   * @example Safe JSON fetch
   * ```typescript
   * interface User { id: number; name: string; }
   * const result = await Http.tryFetchJson<User>('https://api.example.com/user/1');
   * if (result.success) {
   *   console.log('User:', result.value.name);
   * } else {
   *   console.error('Failed:', result.error);
   * }
   * ```
   */
  static async tryFetchJson<T>(url: string, options?: HttpOptions): Promise<{ success: true; value: T } | { success: false; error: string }> {
    try {
      const value = await Http.fetchJson<T>(url, options);
      return { success: true, value };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Fetch and parse JSON response (sync, throws on error)
   * 
   * Synchronous variant of `fetchJson()`. Only available on system targets.
   * 
   * @param url - The URL to request
   * @param options - Optional request configuration
   * @returns Parsed JSON value
   * @throws Error on network failures, JSON parse errors, or if called in browser
   * 
   * @example Synchronous JSON fetch
   * ```typescript
   * interface Config { apiKey: string; endpoint: string; }
   * const config = Http.syncFetchJson<Config>('https://api.example.com/config');
   * console.log('API endpoint:', config.endpoint);
   * ```
   */
  static syncFetchJson<T>(url: string, options?: HttpOptions): T {
    const response = Http.syncFetch(url, options);
    return JSON.parse(response.body) as T;
  }

  /**
   * Fetch and parse JSON response (sync, safe - returns result)
   * 
   * Non-throwing variant of `syncFetchJson()`. Only available on system targets.
   * 
   * @param url - The URL to request
   * @param options - Optional request configuration
   * @returns Result with parsed JSON or error
   * 
   * @example Safe synchronous JSON fetch
   * ```typescript
   * interface Config { apiKey: string; endpoint: string; }
   * const result = Http.trySyncFetchJson<Config>('https://api.example.com/config');
   * if (result.success) {
   *   console.log('API endpoint:', result.value.endpoint);
   * } else {
   *   console.error('Failed to load config:', result.error);
   * }
   * ```
   */
  static trySyncFetchJson<T>(url: string, options?: HttpOptions): { success: true; value: T } | { success: false; error: string } {
    try {
      const value = Http.syncFetchJson<T>(url, options);
      return { success: true, value };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
}
