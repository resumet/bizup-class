'use client';
import { useState } from 'react';
import Link from 'next/link';
type LessonInput = {
  id: string;
  title: string;
  duration: string;
  vimeo_id: string;
  vimeo_hash: string;
};
export type CourseInput = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  status: string;
  theme: string;
  lessons: LessonInput[];
};
export function CourseEditor({ initial, demo }: { initial?: CourseInput; demo: boolean }) {
  const [value, setValue] = useState<CourseInput>(
    () =>
      initial || {
        id: crypto.randomUUID(),
        slug: '',
        title: '',
        description: '',
        category: 'AI 업무 활용',
        status: 'draft',
        theme: 'dark',
        lessons: [
          { id: crypto.randomUUID(), title: '', duration: '10:00', vimeo_id: '', vimeo_hash: '' },
        ],
      },
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  function field(key: keyof CourseInput, text: string) {
    setValue((v) => ({ ...v, [key]: text }));
  }
  function lesson(i: number, key: keyof LessonInput, text: string) {
    setValue((v) => ({
      ...v,
      lessons: v.lessons.map((l, j) => (i === j ? { ...l, [key]: text } : l)),
    }));
  }
  async function save(status: string) {
    setBusy(true);
    try {
      const data = { ...value, status };
      if (demo) {
        localStorage.setItem('ai-library:course:v1', JSON.stringify(data));
        setMessage(
          '현재 브라우저에 강좌 초안을 저장했습니다. 실제 등록은 서비스 연결 후 가능합니다.',
        );
      } else {
        const res = await fetch('/api/admin/courses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error);
        setMessage('강좌를 저장했습니다.');
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="admin-title">
        <h1>강좌 · 회차 편집</h1>
        <Link className="button secondary small" href="/admin?tab=courses">
          목록으로
        </Link>
      </div>
      {demo && (
        <div className="notice">
          강좌 등록 체험입니다. 실제 Vimeo 영상은 서비스 연결 후 재생됩니다.{' '}
          <button
            className="button secondary small"
            onClick={() => {
              try {
                const saved = localStorage.getItem('ai-library:course:v1');
                if (saved) setValue(JSON.parse(saved));
                else setMessage('저장한 초안이 없습니다.');
              } catch {
                setMessage('초안을 불러오지 못했습니다.');
              }
            }}
          >
            초안 불러오기
          </button>
        </div>
      )}
      <div className="panel">
        <div className="form-grid">
          <label className="field">
            강좌 이름
            <input value={value.title} onChange={(e) => field('title', e.target.value)} />
          </label>
          <label className="field">
            영문 주소
            <input
              value={value.slug}
              placeholder="ai-workflow"
              onChange={(e) => field('slug', e.target.value)}
            />
          </label>
          <label className="field">
            카테고리
            <input value={value.category} onChange={(e) => field('category', e.target.value)} />
          </label>
          <label className="field">
            표지
            <select value={value.theme} onChange={(e) => field('theme', e.target.value)}>
              {['dark', 'mint', 'lilac', 'blue'].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          강좌 소개
          <textarea
            value={value.description}
            onChange={(e) => field('description', e.target.value)}
          />
        </label>
        <h2>회차 구성</h2>
        {value.lessons.map((l, i) => (
          <div className="lesson-edit" key={l.id}>
            <div className="admin-title">
              <strong>{i + 1}회차</strong>
              <div className="actions">
                <button
                  className="button secondary small"
                  disabled={i === 0}
                  onClick={() =>
                    setValue((v) => {
                      const lessons = [...v.lessons];
                      [lessons[i - 1], lessons[i]] = [lessons[i], lessons[i - 1]];
                      return { ...v, lessons };
                    })
                  }
                >
                  위로
                </button>
                <button
                  className="button secondary small"
                  disabled={value.lessons.length === 1}
                  onClick={() =>
                    setValue((v) => ({ ...v, lessons: v.lessons.filter((_, j) => j !== i) }))
                  }
                >
                  삭제
                </button>
              </div>
            </div>
            <div className="form-grid">
              <label className="field">
                회차 제목
                <input value={l.title} onChange={(e) => lesson(i, 'title', e.target.value)} />
              </label>
              <label className="field">
                길이 (분:초)
                <input value={l.duration} onChange={(e) => lesson(i, 'duration', e.target.value)} />
              </label>
              <label className="field">
                Vimeo 영상 ID
                <input
                  value={l.vimeo_id}
                  placeholder="123456789"
                  onChange={(e) => lesson(i, 'vimeo_id', e.target.value)}
                />
              </label>
              <label className="field">
                비공개 영상 해시 (선택)
                <input
                  value={l.vimeo_hash}
                  onChange={(e) => lesson(i, 'vimeo_hash', e.target.value)}
                />
              </label>
            </div>
          </div>
        ))}
        <button
          className="button secondary"
          onClick={() =>
            setValue((v) => ({
              ...v,
              lessons: [
                ...v.lessons,
                {
                  id: crypto.randomUUID(),
                  title: '',
                  duration: '10:00',
                  vimeo_id: '',
                  vimeo_hash: '',
                },
              ],
            }))
          }
        >
          회차 추가
        </button>
        <div className="actions">
          <button className="button secondary" disabled={busy} onClick={() => save('draft')}>
            초안 저장
          </button>
          <button className="button" disabled={busy} onClick={() => save('published')}>
            {demo ? '공개 설정 저장' : '강좌 공개하기'}
          </button>
        </div>
        {message && (
          <p className="notice" role="status">
            {message}
          </p>
        )}
      </div>
    </>
  );
}
