import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
export const configured = () =>
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
export const demoMode = () => !configured() && process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
export async function db() {
  if (!configured()) return null;
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (items) => {
          try {
            items.forEach(({ name, value, options }) => jar.set(name, value, options));
          } catch {
            /* Server components cannot set cookies; proxy refreshes them. */
          }
        },
      },
    },
  );
}
export function service() {
  if (!configured() || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    throw new Error('서버 연결 설정이 필요합니다.');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export async function viewer() {
  const client = await db();
  if (!client) return null;
  const {
    data: { user },
  } = await client.auth.getUser();
  return user;
}
export async function requireAdmin() {
  const user = await viewer();
  if (!user) throw new Error('로그인이 필요합니다.');
  const { data, error } = await service()
    .from('admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error || !data) throw new Error('관리자 권한이 필요합니다.');
  return user;
}
