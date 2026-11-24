'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Search, Clock, ArrowUpRight } from 'lucide-react';
import { Article } from '@/lib/model';
import { Art } from './art';
export function Catalog({ articles }: { articles: Article[] }) {
  const [category, setCategory] = useState('전체');
  const [query, setQuery] = useState('');
  const categories = ['전체', ...new Set(articles.map((a) => a.category))];
  const filtered = articles.filter(
    (a) =>
      (category === '전체' || a.category === category) &&
      `${a.title} ${a.excerpt}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <section id="knowledge" className="catalog">
      <div className="section-heading">
        <div>
          <span className="eyebrow">THE KNOWLEDGE LIBRARY</span>
          <h2>궁금했던 AI, 하나씩 알아가요.</h2>
        </div>
        <label className="search">
          <Search size={18} />
          <input
            aria-label="콘텐츠 검색"
            placeholder="어떤 지식이 궁금하세요?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <div className="chips" role="group" aria-label="카테고리">
        {categories.map((c) => (
          <button
            key={c}
            aria-pressed={category === c}
            className={category === c ? 'chip active' : 'chip'}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="article-grid">
        {filtered.map((a, i) => (
          <Link className="article-card" key={a.id} href={`/articles/${a.slug}`}>
            <div className="cover">
              {a.cover ? <img src={a.cover} alt="" /> : <Art theme={a.theme} index={i} />}
              <span className="free-label">무료 콘텐츠</span>
            </div>
            <div className="card-copy">
              <span className="category">{a.category}</span>
              <h3>{a.title}</h3>
              <p>{a.excerpt}</p>
              <div className="card-bottom">
                <span>
                  <Clock size={13} />
                  {a.read_minutes}분 읽기
                </span>
                <ArrowUpRight size={17} />
              </div>
            </div>
          </Link>
        ))}
      </div>
      {!filtered.length && (
        <div className="empty">
          <Search />
          <h3>{query ? '검색 결과가 없어요' : '새로운 지식을 준비하고 있어요'}</h3>
          <p>{query ? '다른 검색어나 카테고리를 선택해보세요.' : '곧 새로운 콘텐츠로 만나요.'}</p>
        </div>
      )}
    </section>
  );
}
