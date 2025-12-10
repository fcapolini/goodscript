#pragma once

/**
 * BearSSL Certificate Management
 * 
 * Loads system trust anchors (CA certificates) for TLS certificate verification.
 * Supports multiple platforms by checking common certificate bundle locations.
 */

#ifdef GS_USE_BEARSSL

#include <bearssl.h>
#include <vector>
#include <string>
#include <fstream>
#include <cstring>

namespace gs {
namespace bearssl {

// Common system CA certificate bundle paths
static const char* CA_BUNDLE_PATHS[] = {
    // macOS
    "/etc/ssl/cert.pem",
    "/usr/local/etc/openssl/cert.pem",
    "/usr/local/etc/openssl@3/cert.pem",
    // Linux
    "/etc/ssl/certs/ca-certificates.crt",  // Debian/Ubuntu/Gentoo
    "/etc/pki/tls/certs/ca-bundle.crt",    // Fedora/RHEL/CentOS
    "/etc/ssl/ca-bundle.pem",               // OpenSUSE
    "/etc/ssl/certs/ca-bundle.crt",
    "/usr/local/share/certs/ca-root-nss.crt", // FreeBSD
    // Fallback
    nullptr
};

/**
 * Certificate store - manages trust anchors
 */
class CertificateStore {
private:
    std::vector<unsigned char> pem_data_;
    std::vector<br_x509_trust_anchor> anchors_;
    std::vector<br_x509_certificate> certs_;
    bool loaded_ = false;

public:
    CertificateStore() = default;
    ~CertificateStore() {
        // Free allocated memory for trust anchors
        for (auto& anchor : anchors_) {
            if (anchor.dn.data) {
                free((void*)anchor.dn.data);
            }
            if (anchor.pkey.key_type == BR_KEYTYPE_RSA) {
                if (anchor.pkey.key.rsa.n) free((void*)anchor.pkey.key.rsa.n);
                if (anchor.pkey.key.rsa.e) free((void*)anchor.pkey.key.rsa.e);
            } else if (anchor.pkey.key_type == BR_KEYTYPE_EC) {
                if (anchor.pkey.key.ec.q) free((void*)anchor.pkey.key.ec.q);
            }
        }
        
        // Free certificate data
        for (auto& cert : certs_) {
            if (cert.data) {
                free((void*)cert.data);
            }
        }
    }

    /**
     * Find and load system CA certificate bundle
     */
    bool loadSystemCertificates() {
        if (loaded_) return true;

        // Try each path until we find one that exists
        for (int i = 0; CA_BUNDLE_PATHS[i] != nullptr; i++) {
            if (loadPEMFile(CA_BUNDLE_PATHS[i])) {
                loaded_ = true;
                return true;
            }
        }

        return false;
    }

    /**
     * Load PEM file and parse certificates
     */
    bool loadPEMFile(const char* path) {
        std::ifstream file(path, std::ios::binary | std::ios::ate);
        if (!file.good()) {
            return false;
        }

        // Read entire file
        std::streamsize size = file.tellg();
        file.seekg(0, std::ios::beg);
        
        pem_data_.resize(size);
        if (!file.read((char*)pem_data_.data(), size)) {
            return false;
        }

        // Parse PEM certificates into trust anchors
        return parsePEMCertificates();
    }

    /**
     * Parse PEM-encoded certificates and convert to trust anchors
     */
    bool parsePEMCertificates() {
        br_pem_decoder_context pem_ctx;
        br_pem_decoder_init(&pem_ctx);

        const unsigned char* p = pem_data_.data();
        size_t remaining = pem_data_.size();
        
        std::vector<unsigned char> current_cert;
        bool in_cert = false;

        while (remaining > 0) {
            size_t len = br_pem_decoder_push(&pem_ctx, p, remaining);
            p += len;
            remaining -= len;

            switch (br_pem_decoder_event(&pem_ctx)) {
                case BR_PEM_BEGIN_OBJ:
                    // Check if this is a certificate
                    if (strcmp(br_pem_decoder_name(&pem_ctx), "CERTIFICATE") == 0) {
                        current_cert.clear();
                        in_cert = true;
                    }
                    break;

                case BR_PEM_END_OBJ:
                    if (in_cert && !current_cert.empty()) {
                        // Convert certificate to trust anchor
                        if (!addCertificateAsTrustAnchor(current_cert)) {
                            // Skip invalid certificates
                        }
                        in_cert = false;
                    }
                    break;

                case BR_PEM_ERROR:
                    return false;

                default:
                    // Accumulate certificate data
                    if (in_cert) {
                        const unsigned char* cert_data;
                        size_t cert_len;
                        br_pem_decoder_get_data(&pem_ctx, (void**)&cert_data, &cert_len);
                        if (cert_len > 0) {
                            current_cert.insert(current_cert.end(), 
                                              cert_data, 
                                              cert_data + cert_len);
                        }
                    }
                    break;
            }
        }

        return !anchors_.empty();
    }

    /**
     * Add a certificate as a trust anchor
     */
    bool addCertificateAsTrustAnchor(const std::vector<unsigned char>& cert_der) {
        // Decode certificate
        br_x509_decoder_context dc;
        br_x509_decoder_init(&dc, nullptr, nullptr);
        br_x509_decoder_push(&dc, cert_der.data(), cert_der.size());

        int err = br_x509_decoder_last_error(&dc);
        if (err != 0) {
            return false;
        }

        // Get the public key from the certificate
        br_x509_pkey* pkey = br_x509_decoder_get_pkey(&dc);
        if (!pkey) {
            return false;
        }

        // Create trust anchor
        br_x509_trust_anchor ta;
        memset(&ta, 0, sizeof(ta));

        // Copy DN (Distinguished Name)
        const unsigned char* dn_data;
        size_t dn_len;
        br_x509_decoder_get_dn(&dc, (void**)&dn_data, &dn_len);
        
        ta.dn.data = (unsigned char*)malloc(dn_len);
        memcpy((void*)ta.dn.data, dn_data, dn_len);
        ta.dn.len = dn_len;

        // Mark as CA
        ta.flags = BR_X509_TA_CA;

        // Copy public key
        ta.pkey.key_type = pkey->key_type;
        
        if (pkey->key_type == BR_KEYTYPE_RSA) {
            ta.pkey.key.rsa.n = (unsigned char*)malloc(pkey->key.rsa.nlen);
            memcpy((void*)ta.pkey.key.rsa.n, pkey->key.rsa.n, pkey->key.rsa.nlen);
            ta.pkey.key.rsa.nlen = pkey->key.rsa.nlen;
            
            ta.pkey.key.rsa.e = (unsigned char*)malloc(pkey->key.rsa.elen);
            memcpy((void*)ta.pkey.key.rsa.e, pkey->key.rsa.e, pkey->key.rsa.elen);
            ta.pkey.key.rsa.elen = pkey->key.rsa.elen;
        } else if (pkey->key_type == BR_KEYTYPE_EC) {
            ta.pkey.key.ec.curve = pkey->key.ec.curve;
            ta.pkey.key.ec.q = (unsigned char*)malloc(pkey->key.ec.qlen);
            memcpy((void*)ta.pkey.key.ec.q, pkey->key.ec.q, pkey->key.ec.qlen);
            ta.pkey.key.ec.qlen = pkey->key.ec.qlen;
        } else {
            free((void*)ta.dn.data);
            return false;
        }

        anchors_.push_back(ta);
        return true;
    }

    /**
     * Get trust anchors for BearSSL
     */
    const br_x509_trust_anchor* getTrustAnchors() const {
        return anchors_.empty() ? nullptr : anchors_.data();
    }

    /**
     * Get number of trust anchors
     */
    size_t getTrustAnchorCount() const {
        return anchors_.size();
    }

    /**
     * Check if certificates are loaded
     */
    bool isLoaded() const {
        return loaded_ && !anchors_.empty();
    }
};

// Global certificate store (lazy-loaded)
static CertificateStore* g_cert_store = nullptr;

/**
 * Get or create the global certificate store
 */
static CertificateStore* getCertificateStore() {
    if (!g_cert_store) {
        g_cert_store = new CertificateStore();
        g_cert_store->loadSystemCertificates();
    }
    return g_cert_store;
}

} // namespace bearssl
} // namespace gs

#endif // GS_USE_BEARSSL
