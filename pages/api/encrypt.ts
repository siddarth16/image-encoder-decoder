import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import { readFile } from 'fs/promises';
import { deriveKey, encryptChunk, generateSalt } from '@/lib/crypto';
import {
  serializeEITXT,
  createAAD,
  compressBuffer,
  chunkBuffer,
  type EITXTFormat,
  type EITXTPayload,
} from '@/lib/eitxt';

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

interface EncryptOptions {
  compression?: 'gzip' | 'none';
  chunk_bytes?: number;
  kdf?: {
    alg: 'PBKDF2-HMAC-SHA256';
    iterations?: number;
  };
}

const SUPPORTED_MIMES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/svg+xml',
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const DEFAULT_CHUNK_SIZE = 1024 * 1024; // 1MB
const DEFAULT_ITERATIONS = 310000;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse multipart form data
    const form = formidable({
      maxFileSize: MAX_FILE_SIZE,
      maxFiles: 1,
      filter: (part) => part.mimetype?.startsWith('image/') || false,
    });

    const [fields, files] = await form.parse(req);

    // Extract passphrase
    const passphrase = fields.passphrase?.[0];
    if (!passphrase || passphrase.length < 1) {
      return res.status(400).json({ error: 'Invalid input: passphrase required' });
    }

    // Extract file
    const fileArray = files.file;
    if (!fileArray || fileArray.length === 0) {
      return res.status(400).json({ error: 'Invalid input: file required' });
    }

    const file = fileArray[0];

    // Validate MIME type
    if (!file.mimetype || !SUPPORTED_MIMES.includes(file.mimetype)) {
      return res.status(422).json({ error: 'Unsupported file type' });
    }

    // Parse options
    let options: EncryptOptions = {
      compression: 'gzip',
      chunk_bytes: DEFAULT_CHUNK_SIZE,
    };

    if (fields.options?.[0]) {
      try {
        const parsed = JSON.parse(fields.options[0]);
        options = { ...options, ...parsed };
      } catch {
        return res.status(400).json({ error: 'Invalid options format' });
      }
    }

    // Read file buffer
    const fileBuffer = await readFile(file.filepath);

    // Compress if requested
    let processedBuffer = fileBuffer;
    let compression: 'gzip' | 'none' = 'none';

    if (options.compression === 'gzip') {
      try {
        processedBuffer = Buffer.from(await compressBuffer(fileBuffer));
        compression = 'gzip';
      } catch (error) {
        // Fall back to no compression
        compression = 'none';
      }
    }

    // Generate KDF parameters
    const salt = generateSalt();
    const iterations = options.kdf?.iterations || DEFAULT_ITERATIONS;

    // Derive encryption key
    const key = await deriveKey(passphrase, salt, iterations);

    // Build payload metadata
    const payload: EITXTPayload = {
      mime: file.mimetype,
      name: file.originalFilename || 'image',
      size: fileBuffer.length,
      compression,
      createdAt: new Date().toISOString(),
    };

    // Create AAD from payload
    const aad = createAAD(payload);

    // Encrypt chunks
    const chunks = [];
    let seq = 0;

    for (const chunk of chunkBuffer(processedBuffer, options.chunk_bytes || DEFAULT_CHUNK_SIZE)) {
      chunks.push(encryptChunk(chunk, key, aad, seq++));
    }

    // Build EITXT format
    const eitxt: EITXTFormat = {
      magic: 'EITXT',
      version: 1,
      kdf: {
        alg: 'PBKDF2-HMAC-SHA256',
        iterations,
        salt_b64: salt.toString('base64url'),
      },
      cipher: 'AES-256-GCM',
      chunk_bytes: options.chunk_bytes || DEFAULT_CHUNK_SIZE,
      payload,
      chunks,
    };

    // Serialize to armored text
    const armored = serializeEITXT(eitxt);

    // Send response
    const filename = `${file.originalFilename || 'image'}.eitxt`;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(armored);
  } catch (error) {
    console.error('Encrypt error:', error instanceof Error ? error.message : 'Unknown');

    if (error instanceof Error) {
      if (error.message.includes('maxFileSize')) {
        return res.status(413).json({ error: 'Payload too large' });
      }
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}
