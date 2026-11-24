import { NextRequest, NextResponse } from 'next/server';
import { db, service } from '@/lib/supabase';
import { safeNext } from '@/lib/model';
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const client = await db();
  if (code && client) {
    const { data, error } = await client.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const user = data.user;
      const { error: profileError } = await service()
        .from('profiles')
        .upsert(
          {
            id: user.id,
            email: user.email || null,
            display_name:
              user.user_metadata?.name || user.user_metadata?.preferred_username || '회원',
          },
          { onConflict: 'id' },
        );
      if (profileError) return NextResponse.redirect(new URL('/login?error=profile', request.url));
      await service()
        .from('notification_outbox')
        .upsert(
          {
            event_key: `signup:${user.id}`,
            user_id: user.id,
            event_type: 'member_joined',
            payload: {},
          },
          { onConflict: 'event_key', ignoreDuplicates: true },
        );
      return NextResponse.redirect(
        new URL(safeNext(request.nextUrl.searchParams.get('next')), request.url),
      );
    }
  }
  return NextResponse.redirect(new URL('/login?error=auth', request.url));
}
