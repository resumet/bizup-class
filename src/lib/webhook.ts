import { createHmac, timingSafeEqual } from 'node:crypto';
export function validTossSignature(
  raw: string,
  time: string | null,
  signatures: string | null,
  hexKey: string | undefined,
  now = Date.now(),
) {
  if (!time || !signatures || !hexKey || !/^[a-f0-9]{64}$/i.test(hexKey)) return false;
  const timestamp = Date.parse(time);
  if (!Number.isFinite(timestamp) || Math.abs(now - timestamp) > 300000) return false;
  const expected = createHmac('sha256', Buffer.from(hexKey, 'hex'))
    .update(`${raw}:${time}`)
    .digest();
  return signatures.split(',').some((part) => {
    const value = part.trim();
    if (!value.startsWith('v1:')) return false;
    const actual = Buffer.from(value.slice(3), 'base64');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  });
}
