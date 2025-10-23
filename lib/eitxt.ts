import { base64UrlEncode, base64UrlDecode, EncryptChunk, KDFParams } from './crypto';
import { createGzip, createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { PassThrough } from 'stream';

export interface EITXTPayload {
  mime: string;
  name: string;
  size: number;
  compression: 'gzip' | 'none';
  createdAt: string;
}

export interface EITXTFormat {
  magic: 'EITXT';
  version: 1;
  kdf: KDFParams;
  cipher: 'AES-256-GCM';
  chunk_bytes: number;
  payload: EITXTPayload;
  chunks: EncryptChunk[];
}

const HEADER = '-----BEGIN EITXT-----';
const FOOTER = '-----END EITXT-----';

/**
 * Serialize EITXT format to armored text
 */
export function serializeEITXT(data: EITXTFormat): string {
  const json = JSON.stringify(data, null, 0);
  const encoded = base64UrlEncode(json);
  return `${HEADER}\n${encoded}\n${FOOTER}`;
}

/**
 * Parse armored EITXT text to format object
 */
export function parseEITXT(text: string): EITXTFormat {
  const trimmed = text.trim();

  if (!trimmed.startsWith(HEADER) || !trimmed.endsWith(FOOTER)) {
    throw new Error('Invalid EITXT format: missing header or footer');
  }

  const content = trimmed
    .substring(HEADER.length, trimmed.length - FOOTER.length)
    .trim();

  try {
    const json = base64UrlDecode(content);
    const data = JSON.parse(json) as EITXTFormat;

    // Validate magic and version
    if (data.magic !== 'EITXT') {
      throw new Error('Invalid EITXT magic');
    }
    if (data.version !== 1) {
      throw new Error('Unsupported EITXT version');
    }

    return data;
  } catch (error) {
    if (error instanceof Error && error.message.includes('EITXT')) {
      throw error;
    }
    throw new Error('Wrong key or corrupted data');
  }
}

/**
 * Create canonical AAD string from payload (must be deterministic)
 */
export function createAAD(payload: EITXTPayload): Buffer {
  // Use exact serialization order to ensure consistency
  const aadString = JSON.stringify(payload, null, 0);
  return Buffer.from(aadString, 'utf8');
}

/**
 * Compress a buffer using gzip
 */
export async function compressBuffer(data: Buffer): Promise<Buffer> {
  const chunks: Buffer[] = [];
  const passThrough = new PassThrough();
  const gzip = createGzip({ level: 6 });

  gzip.on('data', (chunk) => chunks.push(chunk));

  await pipeline(passThrough, gzip);
  passThrough.end(data);

  return Buffer.concat(chunks);
}

/**
 * Decompress a buffer using gzip
 */
export async function decompressBuffer(data: Buffer): Promise<Buffer> {
  const chunks: Buffer[] = [];
  const passThrough = new PassThrough();
  const gunzip = createGunzip();

  gunzip.on('data', (chunk) => chunks.push(chunk));

  try {
    await pipeline(passThrough, gunzip);
    passThrough.end(data);
    return Buffer.concat(chunks);
  } catch (error) {
    throw new Error('Wrong key or corrupted data');
  }
}

/**
 * Split buffer into chunks
 */
export function* chunkBuffer(buffer: Buffer, chunkSize: number): Generator<Buffer> {
  let offset = 0;
  while (offset < buffer.length) {
    const end = Math.min(offset + chunkSize, buffer.length);
    yield buffer.subarray(offset, end);
    offset = end;
  }
}
