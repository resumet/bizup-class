import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { article } from '@/lib/data';
import { BRAND } from '@/lib/model';
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug');
  const a = slug ? await article(slug) : null;
  const title = a?.title || 'AI를 아는 만큼, 나의 세상이 넓어집니다.';
  const text = `${BRAND}${title}${a?.category || 'AI KNOWLEDGE LIBRARY'}`;
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700&text=${encodeURIComponent(text)}`,
    { next: { revalidate: 86400 } },
  ).then((r) => r.text());
  const fontUrl = css.match(/src:\s*url\(([^)]+)\)/)?.[1];
  if (!fontUrl) throw new Error('OG font unavailable');
  const font = await fetch(fontUrl, { next: { revalidate: 86400 } }).then((r) => r.arrayBuffer());
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#e8f0e3',
        padding: 80,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        fontFamily: 'Noto',
        color: '#234932',
      }}
    >
      <div style={{ fontSize: 28, display: 'flex' }}>{BRAND}</div>
      <div style={{ fontSize: 66, lineHeight: 1.3, display: 'flex', maxWidth: 1000 }}>{title}</div>
      <div style={{ fontSize: 24, display: 'flex', color: '#608369' }}>
        {a?.category || 'AI KNOWLEDGE LIBRARY'}
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [{ name: 'Noto', data: font, weight: 700, style: 'normal' }],
      headers: { 'Cache-Control': 'public, max-age=3600' },
    },
  );
}
