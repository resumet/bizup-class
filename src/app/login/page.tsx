import Link from 'next/link';
import { Library } from 'lucide-react';
import { LoginButton } from '@/components/login-button';
import { configured } from '@/lib/supabase';
import { safeNext } from '@/lib/model';
export const metadata = { title: '카카오로 시작하기', robots: { index: false } };
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const q = await searchParams;
  return (
    <div className="center-page">
      <div className="panel auth-panel">
        <div className="gate-icon">
          <Library />
        </div>
        <h1>배움의 문을 열어보세요.</h1>
        <p>
          카카오로 간편하게 가입하고
          <br />
          모든 AI 콘텐츠를 무료로 읽어보세요.
        </p>
        {q.error && (
          <p className="error-message">로그인을 완료하지 못했습니다. 다시 시도해주세요.</p>
        )}
        <LoginButton next={safeNext(q.next || null)} ready={configured()} />
        <small>
          가입 시 <Link href="/terms">이용약관</Link> 및{' '}
          <Link href="/privacy">개인정보처리방침</Link>을 확인해주세요.
          <br />
          VOD 구독은 가입 후 별도로 신청할 수 있습니다.
        </small>
      </div>
    </div>
  );
}
