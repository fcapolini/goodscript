/* Minimal curl configuration for GoodScript */
#ifndef CURL_CONFIG_H
#define CURL_CONFIG_H

/* Platform detection */
#if defined(_WIN32) || defined(_WIN64)
#  define OS "Windows"
#  define HAVE_WINDOWS_H 1
#  define HAVE_WINSOCK2_H 1
#  define HAVE_WS2TCPIP_H 1
#else
#  if defined(__APPLE__)
#    define OS "macOS"
#  elif defined(__linux__)
#    define OS "Linux"
#  else
#    define OS "Unix"
#  endif
#  define HAVE_UNISTD_H 1
#  define HAVE_SYS_SOCKET_H 1
#  define HAVE_NETINET_IN_H 1
#  define HAVE_ARPA_INET_H 1
#  define HAVE_NETDB_H 1
#  define HAVE_SYS_SELECT_H 1
#  define HAVE_POLL_H 1
#  define HAVE_FCNTL_H 1
#endif

/* Basic features */
#define HAVE_STDBOOL_H 1
#define HAVE_STDINT_H 1
#define HAVE_STDLIB_H 1
#define HAVE_STRING_H 1
#define HAVE_STRINGS_H 1
#define HAVE_SYS_TYPES_H 1
#define HAVE_SYS_STAT_H 1
#define HAVE_TIME_H 1
#define HAVE_ERRNO_H 1
#define HAVE_SIGNAL_H 1

/* Socket functions */
#define HAVE_SOCKET 1
#define HAVE_SELECT 1
#define HAVE_RECV 1
#define HAVE_SEND 1
#define HAVE_GETHOSTBYNAME 1
#define HAVE_GETADDRINFO 1
#define HAVE_FREEADDRINFO 1

/* String functions */
#define HAVE_STRCASECMP 1
#define HAVE_STRDUP 1
#define HAVE_STRERROR_R 1

/* Time functions */
#define HAVE_GETTIMEOFDAY 1

/* Other functions */
#define HAVE_FCNTL 1
#define HAVE_ALARM 1

/* Enable HTTP and HTTPS only */
#define USE_HTTP 1

/* Disable unnecessary protocols */
#define CURL_DISABLE_DICT 1
#define CURL_DISABLE_FILE 1
#define CURL_DISABLE_FTP 1
#define CURL_DISABLE_FTPS 1
#define CURL_DISABLE_GOPHER 1
#define CURL_DISABLE_GOPHERS 1
#define CURL_DISABLE_IMAP 1
#define CURL_DISABLE_IMAPS 1
#define CURL_DISABLE_LDAP 1
#define CURL_DISABLE_LDAPS 1
#define CURL_DISABLE_MQTT 1
#define CURL_DISABLE_POP3 1
#define CURL_DISABLE_POP3S 1
#define CURL_DISABLE_RTSP 1
#define CURL_DISABLE_SMB 1
#define CURL_DISABLE_SMBS 1
#define CURL_DISABLE_SMTP 1
#define CURL_DISABLE_SMTPS 1
#define CURL_DISABLE_TELNET 1
#define CURL_DISABLE_TFTP 1

/* Disable features we don't need */
#define CURL_DISABLE_COOKIES 1
#define CURL_DISABLE_CRYPTO_AUTH 1
#define CURL_DISABLE_NETRC 1
#define CURL_DISABLE_PARSEDATE 1
#define CURL_DISABLE_PROXY 1
#define CURL_DISABLE_VERBOSE_STRINGS 1

/* SSL/TLS - use system libraries */
#if defined(__APPLE__)
#  define USE_SECTRANSP 1  /* macOS Secure Transport */
#elif defined(_WIN32)
#  define USE_SCHANNEL 1   /* Windows Schannel */
#else
#  /* On Linux, we'll need OpenSSL or disable HTTPS */
#  /* For now, disable SSL on Linux for simplicity */
#  /* #define USE_OPENSSL 1 */
#endif

/* Size and type definitions */
#define SIZEOF_INT 4
#define SIZEOF_LONG 8
#define SIZEOF_SIZE_T 8
#define SIZEOF_CURL_OFF_T 8

/* Static library */
#define CURL_STATICLIB 1

/* Package information */
#define PACKAGE "curl"
#define PACKAGE_NAME "curl"
#define VERSION "8.7.1"

#endif /* CURL_CONFIG_H */
