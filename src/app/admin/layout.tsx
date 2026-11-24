import Link from 'next/link';
import { demoMode, requireAdmin } from '@/lib/supabase';
export const metadata = { title: '관리자', robots: { index: false, follow: false } };
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!demoMode()) {
    try {
      await requireAdmin();
    } catch {
      return (
        <div className="center-page">
          <h1>관리자 전용 공간입니다.</h1>
          <p className="muted">관리자로 등록된 카카오 계정으로 로그인해주세요.</p>
          <Link className="button" href="/login?next=/admin">
            로그인하기
          </Link>
        </div>
      );
    }
  }
  return <div className="page">{children}</div>;
}
