'use client';
import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
export function LoginButton({ next, ready }: { next: string; ready: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function login() {
    if (!ready) {
      setError('카카오 간편가입을 준비하고 있습니다. 연결이 완료되면 이용할 수 있어요.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const client = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      );
      const { error } = await client.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) throw error;
    } catch {
      setError('로그인을 시작하지 못했습니다. 잠시 후 다시 시도해주세요.');
      setBusy(false);
    }
  }
  return (
    <>
      <button className="button kakao" onClick={login} disabled={busy}>
        {busy ? '카카오로 이동 중…' : '카카오로 3초 만에 시작하기'}
      </button>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
