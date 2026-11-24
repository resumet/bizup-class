import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
function key() {
  const hex = process.env.BILLING_ENCRYPTION_KEY || '';
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) throw new Error('Billing encryption key missing');
  return Buffer.from(hex, 'hex');
}
export function encrypt(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((x) => x.toString('base64url')).join('.');
}
export function decrypt(value: string) {
  const [iv, tag, data] = value.split('.').map((x) => Buffer.from(x, 'base64url'));
  const cipher = createDecipheriv('aes-256-gcm', key(), iv);
  cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(data), cipher.final()]).toString('utf8');
}
