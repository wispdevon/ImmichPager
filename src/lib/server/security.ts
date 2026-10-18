import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { AppError } from '../contracts';
const derive = promisify(scrypt);
export const tokenHash = (value: string) => createHash('sha256').update(value).digest('hex');
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = await derive(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${key.toString('hex')}`;
}
export async function verifyPassword(password: string, encoded: string) {
  const [kind, salt, hash] = encoded.split(':');
  if (kind !== 'scrypt' || !salt || !hash) return false;
  const key = await derive(password, salt, 64) as Buffer;
  const expected = Buffer.from(hash, 'hex');
  return key.length === expected.length && timingSafeEqual(key, expected);
}

// One container/process owns the SQLite volume and this mutation queue.
const locks = new Set<string>();
export async function exclusive<T>(id: string, work: () => Promise<T>) {
  if (locks.has(id)) throw new AppError(409, 'This page is being updated. Try again shortly.');
  locks.add(id);
  try { return await work(); } finally { locks.delete(id); }
}

export function credentialHeaders(request: Request): Record<string, string> {
  const headers: Record<string, string> = {};
  // Browser management uses Immich cookies. API diagnostics may use a bearer token.
  for (const name of ['cookie', 'authorization']) {
    const value = request.headers.get(name);
    if (value) headers[name] = value;
  }
  return headers;
}
