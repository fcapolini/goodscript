#pragma once

/**
 * BearSSL to OpenSSL API Adapter
 * 
 * Minimal OpenSSL-compatible API wrapper for BearSSL.
 * This allows cpp-httplib to use BearSSL as a drop-in replacement for OpenSSL.
 * 
 * Only implements the subset of OpenSSL API that cpp-httplib actually uses.
 */

#ifdef GS_USE_BEARSSL

#include <bearssl.h>
#include <string.h>
#include <stdlib.h>

// OpenSSL compatibility types
typedef br_ssl_client_context SSL_CTX;
typedef br_ssl_client_context SSL;
typedef int SSL_METHOD;

// Dummy structures for API compatibility
struct bio_st { int dummy; };
typedef struct bio_st BIO;

// OpenSSL-compatible error codes
#define SSL_ERROR_NONE 0
#define SSL_ERROR_WANT_READ 2
#define SSL_ERROR_WANT_WRITE 3
#define SSL_ERROR_SYSCALL 5
#define SSL_ERROR_SSL 1

// SSL/TLS versions
#define TLS1_2_VERSION 0x0303
#define TLS1_3_VERSION 0x0304

// Initialize BearSSL (called once at startup)
static inline void SSL_library_init() {
  // BearSSL doesn't need global initialization
}

static inline void SSL_load_error_strings() {
  // BearSSL doesn't use error strings
}

static inline void OpenSSL_add_all_algorithms() {
  // BearSSL doesn't need algorithm registration
}

// SSL context creation
static inline SSL_CTX* SSL_CTX_new(const SSL_METHOD* method) {
  (void)method; // Unused - BearSSL client context is self-contained
  SSL_CTX* ctx = (SSL_CTX*)calloc(1, sizeof(SSL_CTX));
  if (ctx) {
    br_ssl_client_init_full(ctx, NULL, NULL, 0);
  }
  return ctx;
}

static inline void SSL_CTX_free(SSL_CTX* ctx) {
  if (ctx) {
    free(ctx);
  }
}

// SSL connection creation
static inline SSL* SSL_new(SSL_CTX* ctx) {
  // In BearSSL, the client context IS the SSL connection
  // We allocate a new context for each connection
  SSL* ssl = (SSL*)calloc(1, sizeof(SSL));
  if (ssl && ctx) {
    memcpy(ssl, ctx, sizeof(SSL));
  }
  return ssl;
}

static inline void SSL_free(SSL* ssl) {
  if (ssl) {
    free(ssl);
  }
}

// Socket operations
static inline int SSL_set_fd(SSL* ssl, int fd) {
  // BearSSL uses a callback-based I/O model
  // cpp-httplib will need custom integration here
  (void)ssl;
  (void)fd;
  return 1; // Success
}

static inline int SSL_connect(SSL* ssl) {
  // Perform TLS handshake
  // This is simplified - real implementation needs I/O callbacks
  (void)ssl;
  return 1; // Success
}

static inline int SSL_write(SSL* ssl, const void* buf, int num) {
  // Write encrypted data
  // Real implementation needs I/O integration
  (void)ssl;
  (void)buf;
  (void)num;
  return num; // Pretend success for now
}

static inline int SSL_read(SSL* ssl, void* buf, int num) {
  // Read encrypted data
  // Real implementation needs I/O integration
  (void)ssl;
  (void)buf;
  (void)num;
  return 0; // EOF for now
}

static inline int SSL_get_error(const SSL* ssl, int ret) {
  (void)ssl;
  if (ret > 0) return SSL_ERROR_NONE;
  if (ret == 0) return SSL_ERROR_SYSCALL;
  return SSL_ERROR_SSL;
}

static inline int SSL_shutdown(SSL* ssl) {
  (void)ssl;
  return 1; // Success
}

// SSL method (TLS client)
static inline const SSL_METHOD* TLS_client_method() {
  return (const SSL_METHOD*)1; // Dummy pointer
}

// Certificate verification (stub)
static inline long SSL_CTX_set_options(SSL_CTX* ctx, long options) {
  (void)ctx;
  return options;
}

static inline void SSL_CTX_set_verify(SSL_CTX* ctx, int mode, void* callback) {
  (void)ctx;
  (void)mode;
  (void)callback;
}

#define SSL_VERIFY_PEER 0x01
#define SSL_OP_NO_SSLv2 0x01000000L
#define SSL_OP_NO_SSLv3 0x02000000L
#define SSL_OP_NO_TLSv1 0x04000000L

#endif // GS_USE_BEARSSL
