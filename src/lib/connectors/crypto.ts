import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'crypto';

// Connector credentials are encrypted at rest with AES-256-GCM.
// Key is derived from AUTH_SECRET — rotate AUTH_SECRET and connectors must be
// re-entered. For production consider a dedicated KMS-managed key.

function key() {
  return createHash('sha256')
    .update(process.env.AUTH_SECRET ?? 'dev-only-secret-change-me-in-production')
    .digest();
}

export function encryptJson(value: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return JSON.stringify({
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: data.toString('base64'),
  });
}

export function decryptJson<T = Record<string, string>>(payload: string | null): T | null {
  if (!payload) return null;
  try {
    const { iv, tag, data } = JSON.parse(payload);
    const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    const out = Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]);
    return JSON.parse(out.toString('utf8'));
  } catch {
    return null;
  }
}

export function newWebhookSecret() {
  return randomBytes(24).toString('base64url');
}

export function secretsMatch(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}
