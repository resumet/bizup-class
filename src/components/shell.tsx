import Link from 'next/link';
import { Library, ArrowUpRight } from 'lucide-react';
import { BRAND } from '@/lib/model';
import { viewer, demoMode } from '@/lib/supabase';
export async function Header() {
  const user = await viewer();
  return (
    <>
      <header className="header">
        <Link href="/" className="brand">
          <span className="brand-icon">
            <Library size={21} />
          </span>
          <span>{BRAND}</span>
        </Link>
        <nav aria-label="주 메뉴">
          <Link href="/">지식창고</Link>
          <Link href="/courses">VOD 클래스</Link>
          <Link href="/membership">멤버십</Link>
        </nav>
        <Link className="button small secondary" href={user ? '/account' : '/login'}>
          {user ? '내 계정' : '로그인'}
        </Link>
      </header>
      {demoMode() && (
        <div className="demo-banner">
          미리보기 사이트 · 콘텐츠와 강좌는 샘플입니다{' '}
          <Link href="/admin">
            관리자 체험 <ArrowUpRight size={12} />
          </Link>
        </div>
      )}
    </>
  );
}
export function Footer() {
  return (
    <footer>
      <div>
        <Link href="/" className="brand">
          <Library size={20} />
          {BRAND}
        </Link>
        <p>오늘의 배움이, 내일의 가능성으로.</p>
      </div>
      <div className="footer-links">
        <Link href="/terms">이용약관</Link>
        <Link href="/privacy">개인정보처리방침</Link>
        <Link href="/admin">관리자</Link>
      </div>
      <small>© {new Date().getFullYear()} AI 지식창고</small>
    </footer>
  );
}
