import Link from 'next/link';
import { Play, ArrowUpRight } from 'lucide-react';
import { courses } from '@/lib/data';
import { Art } from '@/components/art';
export const metadata = { title: 'VOD 클래스' };
export default async function Courses() {
  const list = await courses();
  return (
    <div className="page">
      <div className="page-heading">
        <span className="eyebrow">PUT KNOWLEDGE INTO PRACTICE</span>
        <h1>배운 것을, 할 수 있는 것으로.</h1>
        <p>한 회차씩 따라 하며 내 것으로 만드는 AI 클래스.</p>
      </div>
      <div className="course-grid">
        {list.map((c) => (
          <Link className="article-card" key={c.id} href={`/courses/${c.slug}`}>
            <Art theme={c.theme} video />
            <div className="card-copy">
              <span className="category">{c.category}</span>
              <h2>{c.title}</h2>
              <p>{c.description}</p>
              <div className="card-bottom">
                <span>
                  <Play size={14} />
                  {c.lessons.length}개 회차 · 멤버십 전용
                </span>
                <ArrowUpRight size={18} />
              </div>
            </div>
          </Link>
        ))}
      </div>
      {!list.length && <div className="empty">새로운 클래스를 준비하고 있어요.</div>}
    </div>
  );
}
