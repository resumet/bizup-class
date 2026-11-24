import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitContent, canWatch, nextMonth, safeNext } from '../src/lib/model';
import { encrypt, decrypt } from '../src/lib/crypto';
import { validTossSignature } from '../src/lib/webhook';
import { createHmac } from 'node:crypto';
test('preview never includes member-only blocks', () => {
  const output = splitContent({
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'public' }] },
      { type: 'previewBreak' },
      { type: 'paragraph', content: [{ type: 'text', text: 'secret' }] },
    ],
  });
  assert.equal(JSON.stringify(output.preview).includes('secret'), false);
  assert.equal(JSON.stringify(output.body).includes('secret'), true);
  assert.throws(() => splitContent({ type: 'doc', content: [] }));
});
test('only paid, unexpired subscriptions can watch, including scheduled cancellations', () => {
  const end = '2027-01-01T00:00:00Z',
    now = Date.parse('2026-12-01');
  assert.equal(canWatch(null, now), false);
  for (const status of ['active', 'canceling'])
    assert.equal(canWatch({ status, current_period_end: end }, now), true);
  assert.equal(canWatch({ status: 'past_due', current_period_end: end }, now), false);
  assert.equal(canWatch({ status: 'active', current_period_end: end }, Date.parse(end)), false);
});
test('billing months clamp end-of-month without overflowing', () => {
  assert.equal(nextMonth('2027-01-31T09:00:00Z'), '2027-02-28T09:00:00.000Z');
  assert.equal(nextMonth('2028-01-31T09:00:00Z'), '2028-02-29T09:00:00.000Z');
  assert.equal(nextMonth('2026-12-25T09:00:00Z'), '2027-01-25T09:00:00.000Z');
});
test('callback cannot redirect to external origin', () => {
  for (const path of ['//evil.com', 'https://evil.com', '/\\evil.com', '/\n/evil.com'])
    assert.equal(safeNext(path), '/');
  assert.equal(safeNext('/articles/test'), '/articles/test');
});
test('webhooks reject forgery, stale replay and modified payloads', () => {
  const raw = '{"eventType":"PAYMENT_STATUS_CHANGED"}',
    time = '2026-11-25T01:00:00+09:00',
    key = 'ab'.repeat(32);
  const signature = createHmac('sha256', Buffer.from(key, 'hex'))
    .update(`${raw}:${time}`)
    .digest('base64');
  const now = Date.parse(time);
  assert.equal(validTossSignature(raw, time, `v1:invalid,v1:${signature}`, key, now), true);
  assert.equal(validTossSignature(raw + 'x', time, `v1:${signature}`, key, now), false);
  assert.equal(validTossSignature(raw, time, `v1:${signature}`, key, now + 301000), false);
  assert.equal(validTossSignature(raw, time, null, key, now), false);
});
test('billing credentials are authenticated and encrypted', () => {
  process.env.BILLING_ENCRYPTION_KEY = 'ab'.repeat(32);
  const value = encrypt('billing_secret');
  assert.equal(value.includes('billing_secret'), false);
  assert.equal(decrypt(value), 'billing_secret');
  const pieces = value.split('.');
  pieces[2] = 'dGFtcGVyZWQ';
  assert.throws(() => decrypt(pieces.join('.')));
});
