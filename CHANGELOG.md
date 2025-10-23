# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-10-24

### Added
- Initial release of Encrypted Image-to-Text Converter
- Server-side AES-256-GCM encryption with AEAD authentication
- PBKDF2-HMAC-SHA-256 key derivation with 310,000 iterations
- .eitxt file format with URL-safe Base64 armor
- Lossless round-trip image conversion
- Support for PNG, JPEG, WebP, GIF, BMP, and SVG formats
- Optional gzip compression before encryption
- Neumorphic UI with Encrypt and Decrypt tabs
- Drag-and-drop file upload
- Progress indicators for encryption/decryption
- Generic error messages for security ("Wrong key or corrupted data")
- AAD binding for payload metadata integrity
- Configurable chunk size and KDF parameters
- Vercel deployment configuration
- Comprehensive documentation and README

### Security
- Fresh unique nonce (IV) per chunk
- Authenticated encryption with associated data (AEAD)
- No client-side crypto operations
- No persistent storage of user data
- Zero secrets logged

### Performance
- Chunked encryption/decryption for large files (up to 100 MB)
- Server-side streaming support
- 60-second timeout suitable for Vercel limits
- Efficient memory usage with buffer chunking
