import type { Metadata } from 'next';
import { Header, Footer } from '@/components/shell';
import { BRAND } from '@/lib/model';
import './globals.css';
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: { default: BRAND, template: `%s | ${BRAND}` },
  description: 'AI가 쉬워지는 곳. 무료 콘텐츠로 배우고, 실전 VOD로 내 일에 적용하세요.',
  openGraph: { type: 'website', locale: 'ko_KR', siteName: BRAND, images: ['/api/og'] },
  twitter: { card: 'summary_large_image' },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" data-scroll-behavior="smooth">
      <body>
        <a href="#main" className="skip">
          본문 바로가기
        </a>
        <Header />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
