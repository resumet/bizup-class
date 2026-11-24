import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { LockKeyhole, Clock, ChevronLeft } from 'lucide-react';
import { article } from '@/lib/data';
import { Blocks } from '@/components/blocks';
import { Art } from '@/components/art';
import { ShareButton } from '@/components/share-button';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const a = await article(slug);
  if (!a) return {};
  return {
    title: a.title,
    description: a.excerpt,
    alternates: { canonical: `/articles/${slug}` },
    openGraph: {
      title: a.title,
      description: a.excerpt,
      type: 'article',
      images: [a.cover || `/api/og?slug=${slug}`],
    },
    twitter: {
      card: 'summary_large_image',
      title: a.title,
      description: a.excerpt,
      images: [a.cover || `/api/og?slug=${slug}`],
    },
  };
}
export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = await article(slug);
  if (!a) notFound();
  const json = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.title,
    description: a.excerpt,
    datePublished: a.published_at,
    isAccessibleForFree: true,
    hasPart: {
      '@type': 'WebPageElement',
      isAccessibleForFree: false,
      cssSelector: '.member-content',
    },
  };
  return (
    <article className="reading">
      <Link className="back" href="/">
        <ChevronLeft size={16} /> 지식창고
      </Link>
      <div className="article-heading">
        <span className="category">{a.category}</span>
        <h1>{a.title}</h1>
        <p>{a.excerpt}</p>
        <div className="meta">
          <span>AI 지식창고 에디터</span>
          <span>
            <Clock size={14} /> {a.read_minutes}분 읽기
          </span>
          <span>{new Date(a.published_at).toLocaleDateString('ko-KR')}</span>
        </div>
      </div>
      <div className="reading-cover">
        {a.cover ? <img src={a.cover} alt="" /> : <Art theme={a.theme} />}
      </div>
      <ShareButton title={a.title} />
      <div className="prose member-content">
        <Blocks block={a.body || a.preview} />
      </div>
      {!a.body && (
        <div className="member-gate">
          <div className="gate-icon">
            <LockKeyhole size={23} />
          </div>
          <h2>이 지식, 끝까지 내 것으로.</h2>
          <p>
            카카오로 간편하게 가입하고
            <br />
            모든 글을 무료로 읽어보세요.
          </p>
          <Link className="button kakao" href={`/login?next=/articles/${a.slug}`}>
            카카오로 무료로 시작하기
          </Link>
          <small>글은 언제나 무료 · VOD만 별도 구독</small>
        </div>
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(json).replace(/</g, '\\u003c') }}
      />
    </article>
  );
}
