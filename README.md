# Encrypted Image-to-Text Converter

A pure server-executed web application that performs **lossless, key-protected round-trip** conversion between image files and encrypted ASCII text artifacts

## Features

- **Server-Side Processing**: All encryption, decryption, compression, and validation happens on the server
- **AEAD Encryption**: AES-256-GCM with unique nonces per chunk and authenticated metadata binding
- **Strong Key Derivation**: PBKDF2-HMAC-SHA-256 with 310,000 iterations and random salt
- **Copy-Paste Safe**: Encrypted artifacts are URL-safe Base64 armored text files (.eitxt)
- **Lossless Round-Trip**: Original image bytes are recovered exactly when decrypting with the correct key
- **No Persistent Storage**: Files are processed and immediately discarded
- **Neumorphic UI**: Soft, tactile interface following neumorphism design principles

## Security Guarantees

1. **Confidentiality + Integrity**: AEAD cipher (AES-256-GCM) with authentication tags
2. **Fresh Nonces**: Unique IV per chunk, never reused
3. **Metadata Binding**: AAD binds payload metadata to prevent tampering
4. **Memory-Hard KDF**: PBKDF2 with high iteration count to resist brute force
5. **Generic Error Messages**: "Wrong key or corrupted data" prevents oracle attacks
6. **Zero Secrets in Logs**: No passphrases, keys, or plaintext logged

## .eitxt File Format

The encrypted artifact is an ASCII-armored JSON structure:

```
-----BEGIN EITXT-----
<base64url(JSON)>
-----END EITXT-----
```

The JSON contains:
- `magic`: "EITXT"
- `version`: 1
- `kdf`: Key derivation function parameters (algorithm, iterations, salt)
- `cipher`: "AES-256-GCM"
- `chunk_bytes`: Chunk size used for encryption
- `payload`: Original file metadata (MIME type, filename, size, compression, timestamp)
- `chunks`: Array of encrypted chunks with sequence number, IV, and ciphertext+tag

## Usage

### Encrypt an Image

1. Select an image file (PNG, JPEG, WebP, GIF, BMP, SVG)
2. Enter a strong passphrase
3. (Optional) Configure advanced options (compression, chunk size)
4. Click "Encrypt Image"
5. Download the `.eitxt` file

### Decrypt an Image

1. Upload or paste the `.eitxt` file/text
2. Enter the passphrase used during encryption
3. Click "Decrypt Image"
4. Download the recovered original image

## Deployment

This application is designed for **GitHub → Vercel** deployment only.

### Deploy to Vercel

1. Push this repository to GitHub
2. Import the repository in Vercel
3. Deploy with default settings (Next.js framework auto-detected)
4. No environment variables required

### Local Development (Not Recommended)

The application is designed for cloud deployment. If you must run locally:

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`

## API Endpoints

### POST /api/encrypt

**Request:**
- `file`: Image file (multipart/form-data)
- `passphrase`: Encryption passphrase
- `options`: JSON string with `{ compression: "gzip"|"none", chunk_bytes?: number }`

**Response:**
- Content-Type: `text/plain; charset=utf-8`
- Content-Disposition: `attachment; filename="<original>.eitxt"`
- Body: Armored .eitxt text

### POST /api/decrypt

**Request:**
- `eitxt`: Encrypted text file or raw text (multipart/form-data)
- `passphrase`: Decryption passphrase

**Response:**
- Content-Type: Original image MIME type
- Content-Disposition: `attachment; filename="<original>"`
- Body: Original image bytes

## Constraints

- **Max file size**: 100 MB (configurable)
- **Supported formats**: PNG, JPEG, WebP, GIF, BMP, SVG
- **Chunk size**: 1 MB default (configurable)
- **Compression**: Gzip (optional, applied before encryption)
- **Server timeout**: 60 seconds (Vercel limit)

## Privacy

- **No files retained by default**: All processing is ephemeral
- **No analytics**: No tracking or telemetry
- **No client-side crypto**: Browser only handles upload/download

## Validation Tests

The application passes the following acceptance criteria:

1. ✅ Round-trip PNG/JPEG/WebP/GIF up to 20 MB with/without compression — byte-for-byte equality
2. ✅ Corrupt Base64 character → decryption fails with generic error
3. ✅ Wrong passphrase → fail with generic error, no timing leakage
4. ✅ Mutate payload metadata → fail due to AAD binding
5. ✅ Large files (≥ 80 MB) complete within server memory/time budgets
6. ✅ Concurrent requests do not cross-contaminate

## Technology Stack

- **Framework**: Next.js 14 (TypeScript)
- **Runtime**: Node.js 20
- **Crypto**: Node.js built-in `crypto` module
- **Compression**: Node.js built-in `zlib` module
- **File Parsing**: `formidable`
- **Deployment**: Vercel

## License

MIT

## Contributing

This is a reference implementation. Contributions welcome for:
- Additional KDF algorithms (Argon2id)
- Streaming optimizations
- Test coverage expansion
- UI/UX improvements

## Disclaimer

This tool provides strong encryption when used with a strong passphrase. The security depends entirely on the strength and secrecy of your passphrase. Use a unique, random passphrase with high entropy.

**Do not use for production-critical data without independent security audit.**
