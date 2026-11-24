'use client';
import { useEffect, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Node } from '@tiptap/core';
import {
  Bold,
  Italic,
  Heading2,
  List,
  Quote,
  ImagePlus,
  Scissors,
  Undo2,
  Redo2,
  Code,
} from 'lucide-react';
import Link from 'next/link';
import { Block, splitContent } from '@/lib/model';
const PreviewBreak = Node.create({
  name: 'previewBreak',
  group: 'block',
  atom: true,
  parseHTML() {
    return [{ tag: 'div[data-preview-break]' }];
  },
  renderHTML() {
    return ['div', { 'data-preview-break': '', class: 'preview-break' }];
  },
});
export type EditorInitial = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  theme: string;
  read_minutes: number;
  cover: string | null;
  status: string;
  document: Block;
};
const initialDoc: Block = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: '독자의 관심을 끄는 첫 문단을 작성해보세요.' }],
    },
    { type: 'previewBreak' },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: '이곳부터는 카카오 가입 회원에게만 공개됩니다.' }],
    },
  ],
};
export function ArticleEditor({
  initial,
  demo,
  categories,
}: {
  initial?: EditorInitial;
  demo: boolean;
  categories: string[];
}) {
  const [id] = useState(() => initial?.id || crypto.randomUUID());
  const [title, setTitle] = useState(initial?.title || '');
  const [slug, setSlug] = useState(initial?.slug || '');
  const [excerpt, setExcerpt] = useState(initial?.excerpt || '');
  const [category, setCategory] = useState(initial?.category || categories[0] || 'AI 입문');
  const [theme, setTheme] = useState(initial?.theme || 'mint');
  const [cover, setCover] = useState<string | null>(initial?.cover || null);
  const [minutes, setMinutes] = useState(initial?.read_minutes || 5);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [published, setPublished] = useState(initial?.status === 'published' ? initial.slug : '');
  const [dirty, setDirty] = useState(false);
  const [slashOpen, setSlashOpen] = useState(false);
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Placeholder.configure({ placeholder: '글을 쓰거나 / 를 입력해 블록을 추가하세요.' }),
      PreviewBreak,
    ],
    content: initial?.document || initialDoc,
    immediatelyRender: false,
    editorProps: {
      handleKeyDown: (_view, event) => {
        if (event.key === '/' && !event.ctrlKey && !event.metaKey) {
          setSlashOpen(true);
          return true;
        }
        if (event.key === 'Escape') {
          setSlashOpen(false);
          return true;
        }
        return false;
      },
    },
    onUpdate: () => setDirty(true),
  });
  useEffect(() => {
    const listener = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', listener);
    return () => window.removeEventListener('beforeunload', listener);
  }, [dirty]);
  async function upload(file: File | undefined, kind: 'body' | 'cover') {
    if (!file) return;
    if (demo) {
      setMessage('이미지 업로드는 Supabase 연결 후 사용할 수 있습니다.');
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('kind', kind);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (kind === 'cover') setCover(data.url);
      else
        editor
          ?.chain()
          .focus()
          .setImage({ src: data.url, alt: file.name.replace(/\.[^.]+$/, '') })
          .run();
      setDirty(true);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '업로드 실패');
    } finally {
      setBusy(false);
    }
  }
  async function save(status: 'draft' | 'published') {
    if (!editor) return;
    setBusy(true);
    setMessage('');
    try {
      const document = editor.getJSON() as Block;
      splitContent(document);
      if (!title || !slug || excerpt.length < 10)
        throw new Error('제목, 영문 주소, 10자 이상의 요약을 입력해주세요.');
      const value = {
        id,
        title,
        slug,
        excerpt,
        category,
        theme,
        cover,
        read_minutes: minutes,
        status,
        document,
      };
      if (demo) {
        localStorage.setItem('ai-library:draft:v1', JSON.stringify(value));
        setMessage('이 브라우저에 초안을 저장했습니다. 실제 공개는 서비스 연결 후 가능합니다.');
      } else {
        const res = await fetch('/api/admin/articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(value),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setMessage(status === 'published' ? '글을 공개했습니다.' : '초안을 저장했습니다.');
        setPublished(status === 'published' ? slug : '');
      }
      setDirty(false);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setBusy(false);
    }
  }
  function restore() {
    try {
      const draft = JSON.parse(localStorage.getItem('ai-library:draft:v1') || 'null');
      if (!draft) {
        setMessage('저장한 초안이 없습니다.');
        return;
      }
      setTitle(draft.title);
      setSlug(draft.slug);
      setExcerpt(draft.excerpt);
      setCategory(draft.category);
      setTheme(draft.theme);
      setMinutes(draft.read_minutes);
      setCover(draft.cover);
      editor?.commands.setContent(draft.document);
      setMessage('브라우저에 저장한 초안을 불러왔습니다.');
    } catch {
      setMessage('초안을 불러오지 못했습니다.');
    }
  }
  return (
    <>
      <div className="admin-title">
        <h1>{initial ? '글 수정' : '새로운 지식 쓰기'}</h1>
        <Link className="button secondary small" href="/admin">
          목록으로
        </Link>
      </div>
      {demo && (
        <div className="notice">
          편집기 체험입니다. 초안은 현재 브라우저에 저장되며, 실제 게시되지 않습니다.{' '}
          <button className="button secondary small" onClick={restore}>
            저장한 초안 불러오기
          </button>
        </div>
      )}
      <div className="editor-layout">
        <div className="editor-main">
          <input
            className="editor-title"
            aria-label="글 제목"
            placeholder="제목을 입력하세요"
            value={title}
            maxLength={150}
            onChange={(e) => {
              setTitle(e.target.value);
              setDirty(true);
            }}
          />
          <div className="editor-toolbar" role="toolbar" aria-label="편집 도구">
            <button
              title="굵게"
              aria-label="굵게"
              onClick={() => editor?.chain().focus().toggleBold().run()}
            >
              <Bold size={16} />
            </button>
            <button
              title="기울임"
              aria-label="기울임"
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            >
              <Italic size={16} />
            </button>
            <button
              title="제목"
              aria-label="제목"
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              <Heading2 size={16} />
            </button>
            <button
              title="목록"
              aria-label="목록"
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
            >
              <List size={16} />
            </button>
            <button
              title="인용"
              aria-label="인용"
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            >
              <Quote size={16} />
            </button>
            <button
              title="코드"
              aria-label="코드"
              onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            >
              <Code size={16} />
            </button>
            <label className="button secondary small" style={{ cursor: 'pointer' }}>
              <ImagePlus size={15} /> 이미지
              <input
                type="file"
                hidden
                accept="image/jpeg,image/png,image/webp,image/avif"
                disabled={busy}
                onChange={(e) => upload(e.target.files?.[0], 'body')}
              />
            </label>
            <button
              onClick={() => {
                if (editor?.getJSON().content?.some((n) => n.type === 'previewBreak')) {
                  setMessage('기존 경계를 삭제한 뒤 원하는 위치에 다시 추가해주세요.');
                  return;
                }
                editor?.chain().focus().insertContent({ type: 'previewBreak' }).run();
              }}
            >
              <Scissors size={15} /> 미리보기 경계
            </button>
            <button aria-label="실행 취소" onClick={() => editor?.chain().focus().undo().run()}>
              <Undo2 size={15} />
            </button>
            <button aria-label="다시 실행" onClick={() => editor?.chain().focus().redo().run()}>
              <Redo2 size={15} />
            </button>
          </div>
          {slashOpen && (
            <div className="slash-menu" role="group" aria-label="블록 추가">
              {[
                ['paragraph', '본문'],
                ['heading', '제목'],
                ['list', '목록'],
                ['quote', '인용'],
                ['code', '코드'],
              ].map(([kind, label]) => (
                <button
                  className="chip"
                  key={kind}
                  onClick={() => {
                    const chain = editor?.chain().focus();
                    if (kind === 'paragraph') chain?.setParagraph().run();
                    if (kind === 'heading') chain?.toggleHeading({ level: 2 }).run();
                    if (kind === 'list') chain?.toggleBulletList().run();
                    if (kind === 'quote') chain?.toggleBlockquote().run();
                    if (kind === 'code') chain?.toggleCodeBlock().run();
                    setSlashOpen(false);
                  }}
                >
                  {label}
                </button>
              ))}
              <button
                className="chip"
                onClick={() => {
                  editor?.chain().focus().insertContent('/').run();
                  setSlashOpen(false);
                }}
              >
                / 문자 입력
              </button>
              <button className="chip" onClick={() => setSlashOpen(false)}>
                닫기
              </button>
            </div>
          )}
          <EditorContent editor={editor} className="prose" />
          <p className="muted" style={{ fontSize: 12 }}>
            문단, 제목, 목록, 인용, 코드, 이미지를 지원합니다. 이미지 설명은 본문에 함께 적어주세요.
          </p>
        </div>
        <aside className="editor-aside">
          <div className="panel">
            <h3>공개 설정</h3>
            <label className="field">
              공개 주소
              <input
                value={slug}
                placeholder="my-ai-guide"
                pattern="[a-z0-9-]+"
                onChange={(e) => {
                  setSlug(e.target.value);
                  setDirty(true);
                }}
              />
            </label>
            <label className="field">
              카테고리
              <input
                list="categories"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setDirty(true);
                }}
              />
              <datalist id="categories">
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </datalist>
            </label>
            <label className="field">
              요약 · 검색 및 SNS 소개
              <textarea
                value={excerpt}
                maxLength={250}
                onChange={(e) => {
                  setExcerpt(e.target.value);
                  setDirty(true);
                }}
                placeholder="콘텐츠를 소개하는 짧은 문장"
              />
            </label>
            <label className="field">
              읽는 시간 (분)
              <input
                type="number"
                min={1}
                max={120}
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
              />
            </label>
            <label className="field">
              기본 표지
              <select value={theme} onChange={(e) => setTheme(e.target.value)}>
                {['mint', 'blue', 'peach', 'lilac', 'yellow', 'gray'].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="field">
              공유용 대표 이미지
              <input
                type="file"
                disabled={busy}
                accept="image/jpeg,image/png,image/webp,image/avif"
                onChange={(e) => upload(e.target.files?.[0], 'cover')}
              />
            </label>
            {cover && <img src={cover} alt="대표 이미지 미리보기" />}
            <small>
              대표 이미지는 SNS 공유를 위해 공개됩니다. 본문 이미지는 열람 권한으로 보호됩니다.
            </small>
            <div className="actions">
              <button
                className="button secondary small"
                disabled={busy}
                onClick={() => save('draft')}
              >
                초안 저장
              </button>
              <button className="button small" disabled={busy} onClick={() => save('published')}>
                {busy ? '저장 중…' : demo ? '공개 설정 저장' : '공개하기'}
              </button>
            </div>
            {published && !demo && (
              <Link className="text-link" href={`/articles/${published}`}>
                공개된 글 보기
              </Link>
            )}
          </div>
          {message && (
            <p className="notice" role="status">
              {message}
            </p>
          )}
        </aside>
      </div>
    </>
  );
}
