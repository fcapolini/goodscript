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
#include <errno.h>

#ifdef _WIN32
#include <winsock2.h>
#include <ws2tcpip.h>
#else
#include <unistd.h>
#include <sys/socket.h>
#endif

// BearSSL context wrapper
struct BearSSLContext {
  br_ssl_client_context client_ctx;
  br_x509_minimal_context x509_ctx;
  br_sslio_context io_ctx;
  unsigned char iobuf[BR_SSL_BUFSIZE_BIDI];
  int socket_fd;
  int last_error;
  bool handshake_done;
};

// OpenSSL compatibility types
typedef BearSSLContext SSL_CTX;
typedef BearSSLContext SSL;
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

// Certificate verification modes
#define SSL_VERIFY_PEER 0x01
#define SSL_OP_NO_SSLv2 0x01000000L
#define SSL_OP_NO_SSLv3 0x02000000L
#define SSL_OP_NO_TLSv1 0x04000000L

// Socket I/O callbacks for BearSSL
static int bearssl_sock_read(void* ctx, unsigned char* buf, size_t len) {
  int fd = *(int*)ctx;
  for (;;) {
#ifdef _WIN32
    int rlen = recv(fd, (char*)buf, (int)len, 0);
#else
    ssize_t rlen = read(fd, buf, len);
#endif
    if (rlen <= 0) {
#ifdef _WIN32
      if (rlen < 0 && WSAGetLastError() == WSAEINTR) {
        continue;
      }
#else
      if (rlen < 0 && errno == EINTR) {
        continue;
      }
#endif
      return -1;
    }
    return (int)rlen;
  }
}

static int bearssl_sock_write(void* ctx, const unsigned char* buf, size_t len) {
  int fd = *(int*)ctx;
  for (;;) {
#ifdef _WIN32
    int wlen = send(fd, (const char*)buf, (int)len, 0);
#else
    ssize_t wlen = write(fd, buf, len);
#endif
    if (wlen <= 0) {
#ifdef _WIN32
      if (wlen < 0 && WSAGetLastError() == WSAEINTR) {
        continue;
      }
#else
      if (wlen < 0 && errno == EINTR) {
        continue;
      }
#endif
      return -1;
    }
    return (int)wlen;
  }
}

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
  (void)method;
  SSL_CTX* ctx = (SSL_CTX*)calloc(1, sizeof(SSL_CTX));
  if (ctx) {
    // Initialize with default full profile (all algorithms)
    // Note: No trust anchors yet - we'll accept all certificates (insecure but simple)
    br_ssl_client_init_full(&ctx->client_ctx, &ctx->x509_ctx, nullptr, 0);
    ctx->socket_fd = -1;
    ctx->last_error = 0;
    ctx->handshake_done = false;
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
  if (!ctx) return nullptr;
  
  // Allocate a new SSL context (copy from the template)
  SSL* ssl = (SSL*)calloc(1, sizeof(SSL));
  if (ssl) {
    // Re-initialize the SSL context for this connection
    br_ssl_client_init_full(&ssl->client_ctx, &ssl->x509_ctx, nullptr, 0);
    ssl->socket_fd = -1;
    ssl->last_error = 0;
    ssl->handshake_done = false;
  }
  return ssl;
}

static inline void SSL_free(SSL* ssl) {
  if (ssl) {
    free(ssl);
  }
}

// Set socket file descriptor
static inline int SSL_set_fd(SSL* ssl, int fd) {
  if (!ssl) return 0;
  ssl->socket_fd = fd;
  return 1;
}

// Perform TLS handshake and connection
static inline int SSL_connect(SSL* ssl) {
  if (!ssl || ssl->socket_fd < 0) {
    return -1;
  }
  
  if (ssl->handshake_done) {
    return 1; // Already connected
  }
  
  // Set up I/O buffer for BearSSL
  br_ssl_engine_set_buffer(&ssl->client_ctx.eng, ssl->iobuf, sizeof(ssl->iobuf), 1);
  
  // Reset the client context for a new handshake
  // Note: Using "localhost" as SNI - real implementation should get hostname from URL
  br_ssl_client_reset(&ssl->client_ctx, "localhost", 0);
  
  // Initialize the simplified I/O wrapper
  br_sslio_init(&ssl->io_ctx, &ssl->client_ctx.eng,
                bearssl_sock_read, &ssl->socket_fd,
                bearssl_sock_write, &ssl->socket_fd);
  
  // The handshake happens implicitly on first read/write
  // For now, we'll trigger it by flushing (sends ClientHello)
  if (br_sslio_flush(&ssl->io_ctx) < 0) {
    ssl->last_error = br_ssl_engine_last_error(&ssl->client_ctx.eng);
    return -1;
  }
  
  ssl->handshake_done = true;
  return 1;
}

// Write encrypted data
static inline int SSL_write(SSL* ssl, const void* buf, int num) {
  if (!ssl || !ssl->handshake_done) {
    return -1;
  }
  
  int written = br_sslio_write(&ssl->io_ctx, buf, (size_t)num);
  if (written < 0) {
    ssl->last_error = br_ssl_engine_last_error(&ssl->client_ctx.eng);
    return -1;
  }
  
  // Flush to ensure data is sent
  if (br_sslio_flush(&ssl->io_ctx) < 0) {
    ssl->last_error = br_ssl_engine_last_error(&ssl->client_ctx.eng);
    return -1;
  }
  
  return written;
}

// Read encrypted data
static inline int SSL_read(SSL* ssl, void* buf, int num) {
  if (!ssl || !ssl->handshake_done) {
    return -1;
  }
  
  int read_bytes = br_sslio_read(&ssl->io_ctx, buf, (size_t)num);
  if (read_bytes < 0) {
    ssl->last_error = br_ssl_engine_last_error(&ssl->client_ctx.eng);
    return -1;
  }
  
  return read_bytes;
}

// Get error code from last operation
static inline int SSL_get_error(const SSL* ssl, int ret) {
  if (!ssl) return SSL_ERROR_SSL;
  
  if (ret > 0) return SSL_ERROR_NONE;
  if (ret == 0) {
    // Check if SSL connection is closed properly
    if (br_ssl_engine_current_state(&ssl->client_ctx.eng) == BR_SSL_CLOSED) {
      return SSL_ERROR_NONE; // Clean shutdown
    }
    return SSL_ERROR_SYSCALL;
  }
  
  // Check BearSSL error
  if (ssl->last_error != 0) {
    return SSL_ERROR_SSL;
  }
  
  return SSL_ERROR_SYSCALL;
}

// Shutdown SSL connection
static inline int SSL_shutdown(SSL* ssl) {
  if (!ssl || !ssl->handshake_done) {
    return 1;
  }
  
  // Send close_notify alert
  br_sslio_close(&ssl->io_ctx);
  return 1;
}

// SSL method (TLS client)
static inline const SSL_METHOD* TLS_client_method() {
  return (const SSL_METHOD*)1; // Dummy pointer
}

// Set SSL options
static inline long SSL_CTX_set_options(SSL_CTX* ctx, long options) {
  (void)ctx;
  return options;
}

// Set certificate verification mode
static inline void SSL_CTX_set_verify(SSL_CTX* ctx, int mode, void* callback) {
  (void)ctx;
  (void)mode;
  (void)callback;
  // Note: BearSSL requires trust anchors for verification
  // Current implementation skips verification (nullptr trust anchors)
}

#endif // GS_USE_BEARSSL
