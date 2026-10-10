import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

// Passwords never leave this module as plaintext hashes, and are never logged.
const N = 65536;
let activeHashes = 0;
const derive = (password: string, salt: string) => new Promise<Buffer>((resolve, reject) => {
  if (activeHashes >= 3) { reject(new Error('Password service busy')); return; }
  activeHashes++;
  scrypt(password, salt, 64, { N, r: 8, p: 2, maxmem: 128 * 1024 * 1024 }, (error, key) => {
    activeHashes--;
    if (error) reject(error); else resolve(key);
  });
});
export const strongPassword = (password: string) =>
  [...password].length >= 9 && password.length <= 128 &&
  /\p{L}/u.test(password) && /\p{N}/u.test(password) && /[\p{P}\p{S}]/u.test(password);
export async function hashPassword(password: string) {
  const salt = randomBytes(24).toString('hex');
  const hash = await derive(password, salt);
  return `scrypt-v1$${salt}$${hash.toString('hex')}`;
}
export async function verifyPassword(password: string, stored?: string) {
  const [version, salt, encoded] = (stored ?? `scrypt-v1$${'0'.repeat(48)}$${'0'.repeat(128)}`).split('$');
  if (version !== 'scrypt-v1' || !/^[a-f0-9]{48}$/.test(salt ?? '') || !/^[a-f0-9]{128}$/.test(encoded ?? '')) return false;
  const actual = await derive(password, salt);
  return timingSafeEqual(actual, Buffer.from(encoded, 'hex')) && !!stored;
}
