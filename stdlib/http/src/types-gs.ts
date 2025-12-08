/**
 * HTTP response representation
 * 
 * Represents an HTTP response with status, headers, and body data.
 * Compatible with Fetch API response structure.
 */
export interface HttpResponse {
  /** HTTP status code (e.g., 200, 404, 500) */
  status: number;
  
  /** HTTP status text (e.g., "OK", "Not Found") */
  statusText: string;
  
  /** Response headers as key-value pairs */
  headers: Map<string, string>;
  
  /** Response body as UTF-8 text */
  body: string;
  
  /** Whether the response was successful (status 200-299) */
  ok: boolean;
}

/**
 * HTTP request options
 */
export interface HttpOptions {
  /** HTTP method (GET, POST, PUT, DELETE, etc.) */
  method?: string;
  
  /** Request headers as key-value pairs */
  headers?: Map<string, string>;
  
  /** Request body (for POST, PUT, PATCH) */
  body?: string;
  
  /** Request timeout in milliseconds (0 = no timeout) */
  timeout?: number;
}

/**
 * HTTP request result (success case)
 */
export interface HttpResult {
  success: true;
  response: HttpResponse;
}

/**
 * HTTP request error result (failure case)
 */
export interface HttpError {
  success: false;
  error: string;
}

/**
 * HTTP request result (either success or error)
 */
export type HttpTryResult = HttpResult | HttpError;
