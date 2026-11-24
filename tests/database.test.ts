import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
test('PostgreSQL schema: previews, member bodies, VOD entitlements and payment idempotency', async () => {
  const pg = new PGlite();
  await pg.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`,
  );
  await pg.exec(readFileSync('supabase/migrations/20261124161430_initial_library.sql', 'utf8'));
  const user = '11111111-1111-4111-8111-111111111111',
    other = '22222222-2222-4222-8222-222222222222',
    id = '33333333-3333-4333-8333-333333333333',
    course = '44444444-4444-4444-8444-444444444444',
    lesson = '55555555-5555-4555-8555-555555555555';
  await pg.exec(`insert into auth.users values('${user}'),('${other}');`);
  const meta = {
    id,
    slug: 'test-article',
    title: 'Test',
    excerpt: 'Preview summary',
    category: 'AI 입문',
    theme: 'mint',
    read_minutes: 5,
    status: 'published',
    cover: null,
  };
  await pg.query('select public.save_article($1,$2,$3,$4,$5)', [
    JSON.stringify(meta),
    JSON.stringify({ text: 'public' }),
    JSON.stringify({ text: 'secret' }),
    JSON.stringify({ text: 'editor' }),
    [],
  ]);
  await pg.query('select public.save_course($1)', [
    JSON.stringify({
      id: course,
      slug: 'test-course',
      title: 'Test course',
      description: 'Description',
      category: 'AI 입문',
      theme: 'dark',
      status: 'published',
      lessons: [
        { id: lesson, title: 'Lesson', duration: '10:00', vimeo_id: '123456789', vimeo_hash: '' },
      ],
    }),
  ]);
  await pg.exec('set role anon;');
  assert.equal((await pg.query('select * from public.articles')).rows.length, 1);
  await assert.rejects(pg.query('select * from public.article_bodies'));
  await assert.rejects(pg.query('select * from public.lesson_videos'));
  await assert.rejects(pg.query('select public.save_course($1)', [JSON.stringify({})]));
  await pg.exec(`reset role;set role authenticated;set request.jwt.claim.sub='${user}';`);
  assert.equal((await pg.query('select * from public.article_bodies')).rows.length, 1);
  assert.equal((await pg.query('select * from public.lesson_videos')).rows.length, 0);
  await assert.rejects(
    pg.query(
      `insert into public.subscriptions values('${user}','active',now()+interval '1 month',false,now())`,
    ),
  );
  await assert.rejects(pg.query('select * from public.billing_customers'));
  await pg.exec(
    `reset role;insert into public.billing_orders values('test_order','${user}',now(),now()+interval '1 month','pending',now());`,
  );
  await pg.query('select public.settle_payment($1,$2,$3)', [
    'test_order',
    'payment_key',
    'https://example.com/receipt',
  ]);
  await pg.query('select public.settle_payment($1,$2,$3)', [
    'test_order',
    'payment_key',
    'https://example.com/receipt',
  ]);
  assert.equal((await pg.query('select * from public.payments')).rows.length, 1);
  assert.equal((await pg.query('select * from public.notification_outbox')).rows.length, 1);
  await pg.exec(`set role authenticated;set request.jwt.claim.sub='${user}';`);
  assert.equal((await pg.query('select * from public.lesson_videos')).rows.length, 1);
  await pg.exec(`set request.jwt.claim.sub='${other}';`);
  assert.equal((await pg.query('select * from public.payments')).rows.length, 0);
  assert.equal((await pg.query('select * from public.subscriptions')).rows.length, 0);
  assert.equal((await pg.query('select * from public.lesson_videos')).rows.length, 0);
  await pg.exec(
    `reset role;update public.subscriptions set current_period_end=now()-interval '1 second';set role authenticated;set request.jwt.claim.sub='${user}';`,
  );
  assert.equal((await pg.query('select * from public.lesson_videos')).rows.length, 0);
  await pg.exec(`reset role;update public.articles set status='draft';set role authenticated;`);
  assert.equal((await pg.query('select * from public.article_bodies')).rows.length, 0);
  await pg.close();
});
