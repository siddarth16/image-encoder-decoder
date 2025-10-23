import { createCipheriv, createDecipheriv, randomBytes, pbkdf2 } from 'crypto';
import { promisify } from 'util';

const pbkdf2Async = promisify(pbkdf2);

export interface KDFParams {
  alg: 'PBKDF2-HMAC-SHA256';
  iterations: number;
  salt_b64: string;
}

export interface EncryptChunk {
  seq: number;
  iv_b64: string;
  ct_b64: string;
}

/**
 * Derive an encryption key from a passphrase using PBKDF2
 */
export async function deriveKey(
  passphrase: string,
  salt: Buffer,
  iterations: number = 310000
): Promise<Buffer> {
  return pbkdf2Async(passphrase, salt, iterations, 32, 'sha256');
}

/**
 * Encrypt a single chunk using AES-256-GCM with AAD
 */
export function encryptChunk(
  plaintext: Buffer,
  key: Buffer,
  aad: Buffer,
  seq: number
): EncryptChunk {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(aad);

  const encrypted = Buffer.concat([
    cipher.update(plaintext),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();
  const ciphertext = Buffer.concat([encrypted, tag]);

  return {
    seq,
    iv_b64: iv.toString('base64url'),
    ct_b64: ciphertext.toString('base64url'),
  };
}

/**
 * Decrypt a single chunk using AES-256-GCM with AAD verification
 */
export function decryptChunk(
  chunk: EncryptChunk,
  key: Buffer,
  aad: Buffer
): Buffer {
  const iv = Buffer.from(chunk.iv_b64, 'base64url');
  const ciphertext = Buffer.from(chunk.ct_b64, 'base64url');

  // Extract tag (last 16 bytes)
  const tag = ciphertext.subarray(-16);
  const encrypted = ciphertext.subarray(0, -16);

  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAAD(aad);
  decipher.setAuthTag(tag);

  try {
    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
  } catch (error) {
    throw new Error('Wrong key or corrupted data');
  }
}

/**
 * Generate a random salt for KDF
 */
export function generateSalt(): Buffer {
  return randomBytes(16);
}

/**
 * URL-safe Base64 encode
 */
export function base64UrlEncode(data: string): string {
  return Buffer.from(data, 'utf8').toString('base64url');
}

/**
 * URL-safe Base64 decode
 */
export function base64UrlDecode(data: string): string {
  return Buffer.from(data, 'base64url').toString('utf8');
}
