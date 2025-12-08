/**
 * @goodscript/http - HTTP client utilities
 * 
 * Provides HTTP/HTTPS request capabilities with async/sync dual API:
 * - `Http.fetch()` - Async HTTP requests (Promise-based)
 * - `Http.syncFetch()` - Sync HTTP requests (blocking, system targets only)
 * - Both with throwing and safe (try*) variants
 * - JSON parsing helpers
 * 
 * @example Async HTTP request
 * ```typescript
 * import { Http } from '@goodscript/http';
 * 
 * const response = await Http.fetch('https://api.example.com/data');
 * console.log(response.status); // 200
 * console.log(response.body);   // Response body as string
 * ```
 * 
 * @example Safe error handling
 * ```typescript
 * const result = await Http.tryFetch('https://api.example.com/data');
 * if (result.success) {
 *   console.log(result.response.body);
 * } else {
 *   console.error('Request failed:', result.error);
 * }
 * ```
 * 
 * @example JSON fetch
 * ```typescript
 * interface User { id: number; name: string; }
 * const user = await Http.fetchJson<User>('https://api.example.com/user/1');
 * console.log(user.name);
 * ```
 * 
 * @module
 */

export { Http } from './http-gs.js';
export type { HttpResponse, HttpOptions, HttpTryResult, HttpResult, HttpError } from './types-gs.js';
