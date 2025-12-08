# @goodscript/http

HTTP client utilities for GoodScript with async/sync dual API.

## Features

- **Async-first API**: Non-blocking HTTP requests with Promise-based async/await
- **Sync variants**: Blocking HTTP requests for system scripts (Node.js, native)
- **Dual error handling**: Throwing and safe (try*) variants for both async and sync
- **JSON helpers**: Built-in JSON parsing with type safety
- **TypeScript/C++/Haxe**: Cross-platform support with platform-specific optimizations
- **Modern fetch API**: Compatible with Web Fetch API standards

## Installation

```bash
pnpm add @goodscript/http
```

## Usage

### Async HTTP Requests (Recommended)

```typescript
import { Http } from '@goodscript/http';

// Simple GET request
const response = await Http.fetch('https://api.example.com/data');
console.log(response.status); // 200
console.log(response.body);   // Response body as string

// POST request with headers
const headers = new Map<string, string>();
headers.set('Content-Type', 'application/json');
headers.set('Authorization', 'Bearer token123');

const response = await Http.fetch('https://api.example.com/users', {
  method: 'POST',
  headers: headers,
  body: JSON.stringify({ name: 'Alice', email: 'alice@example.com' }),
  timeout: 5000
});

// Check response
if (response.ok) {
  console.log('Success:', response.body);
} else {
  console.error('HTTP error:', response.status, response.statusText);
}
```

### Safe Error Handling (No Exceptions)

```typescript
// Use tryFetch() for safe error handling
const result = await Http.tryFetch('https://api.example.com/data');

if (result.success) {
  console.log('Status:', result.response.status);
  console.log('Body:', result.response.body);
} else {
  console.error('Request failed:', result.error);
}

// Distinguish HTTP errors from network errors
const result = await Http.tryFetch('https://api.example.com/users/999');

if (result.success && result.response.ok) {
  // Success (2xx status)
  processUser(result.response.body);
} else if (result.success) {
  // HTTP error (4xx, 5xx)
  console.error('HTTP error:', result.response.status);
} else {
  // Network error (DNS, connection, timeout)
  console.error('Network error:', result.error);
}
```

### JSON Requests

```typescript
// Fetch and parse JSON automatically
interface User {
  id: number;
  name: string;
  email: string;
}

const user = await Http.fetchJson<User>('https://api.example.com/user/1');
console.log(user.name); // Type-safe!

// Safe JSON fetch
const result = await Http.tryFetchJson<User>('https://api.example.com/user/1');

if (result.success) {
  console.log('User:', result.value.name);
} else {
  console.error('Failed to fetch user:', result.error);
}
```

### Synchronous HTTP Requests (System Targets Only)

**Note**: Sync methods are only available on system targets (Node.js, native C++). They will throw a runtime error in browsers.

```typescript
// Blocking GET request (only in Node.js or native)
const response = Http.syncFetch('https://api.example.com/config');
const config = JSON.parse(response.body);

// Safe sync variant
const result = Http.trySyncFetch('https://api.example.com/config');
if (result.success) {
  console.log('Config loaded:', result.response.body);
} else {
  console.error('Failed to load config:', result.error);
  // Use defaults
}

// Sync JSON fetch
interface Config {
  apiKey: string;
  endpoint: string;
}

const config = Http.syncFetchJson<Config>('https://api.example.com/config');
console.log('API endpoint:', config.endpoint);
```

## API Reference

### Types

```typescript
interface HttpResponse {
  status: integer;           // HTTP status code (200, 404, etc.)
  statusText: string;        // Status text ("OK", "Not Found", etc.)
  headers: Map<string, string>;  // Response headers
  body: string;              // Response body as UTF-8 text
  ok: boolean;               // true if status is 2xx
}

interface HttpOptions {
  method?: string;           // HTTP method (GET, POST, PUT, DELETE, etc.)
  headers?: Map<string, string>;  // Request headers
  body?: string;             // Request body
  timeout?: integer;         // Timeout in milliseconds (0 = no timeout)
}
```

### Methods

| Method | Async/Sync | Error Handling | Returns | Description |
|--------|-----------|----------------|---------|-------------|
| `fetch()` | Async | Throws | `Promise<HttpResponse>` | Make HTTP request (recommended default) |
| `tryFetch()` | Async | Safe | `Promise<HttpTryResult>` | Make HTTP request, return result object |
| `syncFetch()` | Sync | Throws | `HttpResponse` | Blocking HTTP request (system targets only) |
| `trySyncFetch()` | Sync | Safe | `HttpTryResult` | Blocking HTTP request with safe errors |
| `fetchJson<T>()` | Async | Throws | `Promise<T>` | Fetch and parse JSON |
| `tryFetchJson<T>()` | Async | Safe | `Promise<Result<T>>` | Fetch and parse JSON safely |
| `syncFetchJson<T>()` | Sync | Throws | `T` | Blocking JSON fetch |
| `trySyncFetchJson<T>()` | Sync | Safe | `Result<T>` | Blocking JSON fetch safely |

## Design Principles

### Async by Default

Async methods have no prefix (e.g., `fetch()`). This encourages non-blocking I/O and scales better for concurrent operations.

### Explicit Sync

Sync methods have `sync*` prefix (e.g., `syncFetch()`). This makes blocking behavior explicit and discourages overuse.

### Dual Error Handling

- **Throwing variants** (e.g., `fetch()`, `syncFetch()`): Throw exceptions on errors
- **Safe variants** (e.g., `tryFetch()`, `trySyncFetch()`): Return result objects with `success` flag

## Platform Support

| Platform | Async | Sync | Implementation |
|----------|-------|------|----------------|
| Node.js 18+ | ✅ | ✅ | Native fetch API (async), sync-request (sync) |
| Browser | ✅ | ❌ | Native fetch API |
| C++ | ✅ | ✅ | libcurl with cppcoro (async), libcurl sync API |
| Haxe | ✅ | ✅ | haxe.Http callbacks → Promise (async), sys.Http (sync) |

## Examples

### REST API Client

```typescript
import { Http } from '@goodscript/http';

class ApiClient {
  constructor(private baseUrl: string, private apiKey: string) {}

  async getUser(id: number): Promise<User | undefined> {
    const headers = new Map<string, string>();
    headers.set('Authorization', `Bearer ${this.apiKey}`);

    const result = await Http.tryFetchJson<User>(
      `${this.baseUrl}/users/${id}`,
      { headers }
    );

    return result.success ? result.value : undefined;
  }

  async createUser(user: Omit<User, 'id'>): Promise<User> {
    const headers = new Map<string, string>();
    headers.set('Authorization', `Bearer ${this.apiKey}`);
    headers.set('Content-Type', 'application/json');

    return await Http.fetchJson<User>(`${this.baseUrl}/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify(user)
    });
  }
}
```

### Configuration Loader

```typescript
import { Http } from '@goodscript/http';

function loadConfig(): Config {
  // Synchronous config loading at startup
  const result = Http.trySyncFetchJson<Config>('https://api.example.com/config');
  
  if (result.success) {
    return result.value;
  } else {
    console.warn('Failed to load remote config, using defaults:', result.error);
    return getDefaultConfig();
  }
}
```

## Testing

```bash
pnpm test
```

## License

MIT OR Apache-2.0
