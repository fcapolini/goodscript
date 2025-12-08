import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Http } from '../src/http-gs.js';
import type { HttpOptions } from '../src/types-gs.js';
import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';

/**
 * Test HTTP server for local testing
 * Avoids external dependencies and network flakiness
 */
let testServer: Server;
let testPort: number;
let testUrl: string;

beforeAll(async () => {
  // Create a simple test server
  testServer = createServer((req: IncomingMessage, res: ServerResponse) => {
    const url = req.url || '/';
    const method = req.method || 'GET';

    // CORS headers for browser testing
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Route handlers
    if (url === '/hello') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Hello, World!');
    } else if (url === '/json') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Hello', status: 'ok' }));
    } else if (url === '/echo' && method === 'POST') {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          method, 
          body, 
          headers: req.headers 
        }));
      });
    } else if (url === '/404') {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    } else if (url === '/500') {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    } else if (url === '/delay') {
      // Delay response for timeout testing (300ms delay)
      setTimeout(() => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Delayed response');
      }, 300);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });

  // Start server on random port
  await new Promise<void>((resolve) => {
    testServer.listen(0, () => {
      const address = testServer.address();
      if (address && typeof address === 'object') {
        testPort = address.port;
        testUrl = `http://localhost:${testPort}`;
        resolve();
      }
    });
  });
});

afterAll(async () => {
  // Close test server
  await new Promise<void>((resolve, reject) => {
    testServer.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
});

describe('Http (Async)', () => {
  describe('fetch()', () => {
    it('should fetch a simple GET request', async () => {
      const response = await Http.fetch(`${testUrl}/hello`);
      
      expect(response.status).toBe(200);
      expect(response.statusText).toBe('OK');
      expect(response.ok).toBe(true);
      expect(response.body).toBe('Hello, World!');
      expect(response.headers).toBeInstanceOf(Map);
      expect(response.headers.get('content-type')).toBe('text/plain');
    });

    it('should handle 404 errors', async () => {
      const response = await Http.fetch(`${testUrl}/404`);
      
      expect(response.status).toBe(404);
      expect(response.statusText).toBe('Not Found');
      expect(response.ok).toBe(false);
      expect(response.body).toBe('Not Found');
    });

    it('should handle 500 errors', async () => {
      const response = await Http.fetch(`${testUrl}/500`);
      
      expect(response.status).toBe(500);
      expect(response.ok).toBe(false);
    });

    it('should throw on invalid URL', async () => {
      await expect(Http.fetch('invalid-url')).rejects.toThrow();
    });

    it('should throw on network error', async () => {
      // Port that's definitely not listening
      await expect(Http.fetch('http://localhost:1')).rejects.toThrow();
    });

    it('should support POST with body', async () => {
      const options: HttpOptions = {
        method: 'POST',
        body: 'test data'
      };
      
      const response = await Http.fetch(`${testUrl}/echo`, options);
      expect(response.status).toBe(200);
      
      const data = JSON.parse(response.body);
      expect(data.method).toBe('POST');
      expect(data.body).toBe('test data');
    });

    it('should support custom headers', async () => {
      const headers = new Map<string, string>();
      headers.set('X-Custom-Header', 'test-value');
      headers.set('Content-Type', 'application/json');
      
      const options: HttpOptions = {
        method: 'POST',
        headers,
        body: '{"key":"value"}'
      };
      
      const response = await Http.fetch(`${testUrl}/echo`, options);
      const data = JSON.parse(response.body);
      
      expect(data.headers['x-custom-header']).toBe('test-value');
      expect(data.headers['content-type']).toBe('application/json');
    });

    it.skip('should support timeout option', async () => {
      const options: HttpOptions = {
        timeout: 100 // 100ms timeout, server delays for 300ms
      };
      
      // This should timeout (server delays for 300ms)
      await expect(Http.fetch(`${testUrl}/delay`, options)).rejects.toThrow();
    });
  });

  describe('tryFetch()', () => {
    it('should return success result for valid request', async () => {
      const result = await Http.tryFetch(`${testUrl}/hello`);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.response.status).toBe(200);
        expect(result.response.body).toBe('Hello, World!');
      }
    });

    it('should return success for HTTP errors (404, 500)', async () => {
      const result = await Http.tryFetch(`${testUrl}/404`);
      
      // HTTP errors are successful responses (no network error)
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.response.status).toBe(404);
        expect(result.response.ok).toBe(false);
      }
    });

    it('should return error result for invalid URL', async () => {
      const result = await Http.tryFetch('invalid-url');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy();
        expect(typeof result.error).toBe('string');
      }
    });

    it('should return error result for network error', async () => {
      const result = await Http.tryFetch('http://localhost:1');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy();
      }
    });

    it.skip('should return error result for timeout', async () => {
      const options: HttpOptions = { timeout: 100 }; // 100ms timeout, server delays for 300ms
      const result = await Http.tryFetch(`${testUrl}/delay`, options);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy();
      }
    });
  });

  describe('fetchJson()', () => {
    it('should fetch and parse JSON', async () => {
      interface TestResponse {
        message: string;
        status: string;
      }
      
      const data = await Http.fetchJson<TestResponse>(`${testUrl}/json`);
      
      expect(data.message).toBe('Hello');
      expect(data.status).toBe('ok');
    });

    it('should throw on invalid JSON', async () => {
      // /hello returns plain text, not JSON
      await expect(Http.fetchJson(`${testUrl}/hello`)).rejects.toThrow();
    });

    it('should throw on network error', async () => {
      await expect(Http.fetchJson('http://localhost:1')).rejects.toThrow();
    });
  });

  describe('tryFetchJson()', () => {
    it('should return success with parsed JSON', async () => {
      interface TestResponse {
        message: string;
        status: string;
      }
      
      const result = await Http.tryFetchJson<TestResponse>(`${testUrl}/json`);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.message).toBe('Hello');
        expect(result.value.status).toBe('ok');
      }
    });

    it('should return error for invalid JSON', async () => {
      const result = await Http.tryFetchJson(`${testUrl}/hello`);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy();
      }
    });

    it('should return error for network error', async () => {
      const result = await Http.tryFetchJson('http://localhost:1');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy();
      }
    });
  });
});

describe.skip('Http (Sync)', () => {
  describe('syncFetch()', () => {
    it('should fetch a simple GET request synchronously', () => {
      const response = Http.syncFetch(`${testUrl}/hello`);
      
      expect(response.status).toBe(200);
      expect(response.ok).toBe(true);
      expect(response.body).toBe('Hello, World!');
    });

    it('should handle 404 errors', () => {
      const response = Http.syncFetch(`${testUrl}/404`);
      
      expect(response.status).toBe(404);
      expect(response.ok).toBe(false);
    });

    it('should throw on invalid URL', () => {
      expect(() => Http.syncFetch('invalid-url')).toThrow();
    });

    it('should throw on network error', () => {
      expect(() => Http.syncFetch('http://localhost:1')).toThrow();
    });

    it('should support POST with body', () => {
      const options: HttpOptions = {
        method: 'POST',
        body: 'sync test data'
      };
      
      const response = Http.syncFetch(`${testUrl}/echo`, options);
      const data = JSON.parse(response.body);
      
      expect(data.method).toBe('POST');
      expect(data.body).toBe('sync test data');
    });

    it('should support custom headers', () => {
      const headers = new Map<string, string>();
      headers.set('X-Sync-Header', 'sync-value');
      
      const options: HttpOptions = {
        method: 'POST',
        headers,
        body: 'test'
      };
      
      const response = Http.syncFetch(`${testUrl}/echo`, options);
      const data = JSON.parse(response.body);
      
      expect(data.headers['x-sync-header']).toBe('sync-value');
    });
  });

  describe('trySyncFetch()', () => {
    it('should return success result for valid request', () => {
      const result = Http.trySyncFetch(`${testUrl}/hello`);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.response.status).toBe(200);
        expect(result.response.body).toBe('Hello, World!');
      }
    });

    it('should return success for HTTP errors', () => {
      const result = Http.trySyncFetch(`${testUrl}/404`);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.response.status).toBe(404);
      }
    });

    it('should return error result for invalid URL', () => {
      const result = Http.trySyncFetch('invalid-url');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy();
      }
    });

    it('should return error result for network error', () => {
      const result = Http.trySyncFetch('http://localhost:1');
      
      expect(result.success).toBe(false);
    });
  });

  describe('syncFetchJson()', () => {
    it('should fetch and parse JSON synchronously', () => {
      interface TestResponse {
        message: string;
        status: string;
      }
      
      const data = Http.syncFetchJson<TestResponse>(`${testUrl}/json`);
      
      expect(data.message).toBe('Hello');
      expect(data.status).toBe('ok');
    });

    it('should throw on invalid JSON', () => {
      expect(() => Http.syncFetchJson(`${testUrl}/hello`)).toThrow();
    });

    it('should throw on network error', () => {
      expect(() => Http.syncFetchJson('http://localhost:1')).toThrow();
    });
  });

  describe('trySyncFetchJson()', () => {
    it('should return success with parsed JSON', () => {
      interface TestResponse {
        message: string;
        status: string;
      }
      
      const result = Http.trySyncFetchJson<TestResponse>(`${testUrl}/json`);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.message).toBe('Hello');
        expect(result.value.status).toBe('ok');
      }
    });

    it('should return error for invalid JSON', () => {
      const result = Http.trySyncFetchJson(`${testUrl}/hello`);
      
      expect(result.success).toBe(false);
    });

    it('should return error for network error', () => {
      const result = Http.trySyncFetchJson('http://localhost:1');
      
      expect(result.success).toBe(false);
    });
  });
});
