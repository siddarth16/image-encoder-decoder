import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import { readFile } from 'fs/promises';
import { deriveKey, decryptChunk } from '@/lib/crypto';
import { parseEITXT, createAAD, decompressBuffer } from '@/lib/eitxt';

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

const MAX_TEXT_SIZE = 200 * 1024 * 1024; // 200MB (encrypted is larger than original)

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
      maxFileSize: MAX_TEXT_SIZE,
      maxFiles: 1,
    });

    const [fields, files] = await form.parse(req);

    // Extract passphrase
    const passphrase = fields.passphrase?.[0];
    if (!passphrase || passphrase.length < 1) {
      return res.status(400).json({ error: 'Invalid input: passphrase required' });
    }

    // Extract EITXT content (either from file or text field)
    let eitxtContent: string;

    if (files.eitxt && files.eitxt.length > 0) {
      const file = files.eitxt[0];
      eitxtContent = await readFile(file.filepath, 'utf-8');
    } else if (fields.eitxt?.[0]) {
      eitxtContent = fields.eitxt[0];
    } else {
      return res.status(400).json({ error: 'Invalid input: eitxt file or text required' });
    }

    // Parse EITXT format
    let eitxt;
    try {
      eitxt = parseEITXT(eitxtContent);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Wrong key or corrupted data';
      return res.status(400).json({ error: message });
    }

    // Validate format
    if (eitxt.cipher !== 'AES-256-GCM') {
      return res.status(422).json({ error: 'Unsupported cipher' });
    }

    if (eitxt.kdf.alg !== 'PBKDF2-HMAC-SHA256') {
      return res.status(422).json({ error: 'Unsupported KDF algorithm' });
    }

    // Derive decryption key
    const salt = Buffer.from(eitxt.kdf.salt_b64, 'base64url');
    const key = await deriveKey(passphrase, salt, eitxt.kdf.iterations);

    // Create AAD from payload
    const aad = createAAD(eitxt.payload);

    // Decrypt chunks in sequence
    const decryptedChunks: Buffer[] = [];

    try {
      for (const chunk of eitxt.chunks) {
        const decrypted = decryptChunk(chunk, key, aad);
        decryptedChunks.push(decrypted);
      }
    } catch (error) {
      return res.status(400).json({ error: 'Wrong key or corrupted data' });
    }

    // Concatenate decrypted chunks
    let decryptedBuffer = Buffer.concat(decryptedChunks);

    // Decompress if needed
    if (eitxt.payload.compression === 'gzip') {
      try {
        decryptedBuffer = await decompressBuffer(decryptedBuffer);
      } catch (error) {
        return res.status(400).json({ error: 'Wrong key or corrupted data' });
      }
    }

    // Validate size matches
    if (decryptedBuffer.length !== eitxt.payload.size) {
      return res.status(400).json({ error: 'Wrong key or corrupted data' });
    }

    // Send decrypted image
    res.setHeader('Content-Type', eitxt.payload.mime);
    res.setHeader('Content-Disposition', `attachment; filename="${eitxt.payload.name}"`);
    res.setHeader('Content-Length', decryptedBuffer.length);
    res.status(200).send(decryptedBuffer);
  } catch (error) {
    console.error('Decrypt error:', error instanceof Error ? error.message : 'Unknown');

    if (error instanceof Error) {
      if (error.message.includes('maxFileSize')) {
        return res.status(413).json({ error: 'Payload too large' });
      }
      if (error.message.includes('Wrong key')) {
        return res.status(400).json({ error: 'Wrong key or corrupted data' });
      }
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}
