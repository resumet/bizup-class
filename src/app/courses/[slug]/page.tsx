import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LockKeyhole, Play, ChevronLeft } from 'lucide-react';
import { courses, subscription } from '@/lib/data';
import { canWatch } from '@/lib/model';
import { db } from '@/lib/supabase';
export default async function CoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lesson?: string }>;
}) {
  const { slug } = await params;
  const c = (await courses()).find((c) => c.slug === slug);
  if (!c) notFound();
  const search = await searchParams;
  const selected = c.lessons.find((l) => l.id === search.lesson) || c.lessons[0];
  const allowed = canWatch(await subscription());
  let playback: string | null = null;
  if (allowed && selected) {
    const client = await db();
    const { data } = await client!
      .from('lesson_videos')
      .select('vimeo_id,vimeo_hash')
      .eq('lesson_id', selected.id)
      .maybeSingle();
    if (data)
      playback = `https://player.vimeo.com/video/${data.vimeo_id}${data.vimeo_hash ? `?h=${data.vimeo_hash}` : ''}`;
  }
  return (
    <div className="page">
      <Link className="back" href="/courses">
        <ChevronLeft size={16} /> 모든 클래스
      </Link>
      <div className="course-layout">
        <div>
          <div className="video-stage">
            {playback ? (
              <iframe
                src={playback}
                title={selected.title}
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div>
                <LockKeyhole size={32} />
                <h2>{allowed ? '영상을 준비하고 있어요' : '배움의 다음 장을 열어보세요.'}</h2>
                <p>
                  {allowed
                    ? '영상이 등록되면 이곳에서 시청할 수 있습니다.'
                    : '멤버십 하나로 모든 VOD를 자유롭게.'}
                </p>
                {!allowed && (
                  <Link className="button light" href="/membership">
                    월 19,900원으로 시작하기
                  </Link>
                )}
              </div>
            )}
          </div>
          <span className="category">{c.category}</span>
          <h1 className="course-title">{c.title}</h1>
          <p className="muted">{c.description}</p>
          {selected && <p>현재 회차 · {selected.title}</p>}
        </div>
        <aside className="lesson-panel">
          <h2>
            커리큘럼 <span>{c.lessons.length}개 회차</span>
          </h2>
          {c.lessons.map((l, i) => (
            <Link
              className={`lesson ${selected?.id === l.id ? 'selected' : ''}`}
              key={l.id}
              href={`/courses/${slug}?lesson=${l.id}`}
            >
              <span className="lesson-number">{String(i + 1).padStart(2, '0')}</span>
              <div>
                {l.title}
                <small>{l.duration}</small>
              </div>
              {allowed ? <Play size={15} /> : <LockKeyhole size={15} />}
            </Link>
          ))}
        </aside>
      </div>
    </div>
  );
}
