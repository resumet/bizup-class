import { ArticleEditor, EditorInitial } from '@/components/editor';
import { demoMode, requireAdmin, service } from '@/lib/supabase';
import { demoArticles } from '@/lib/demo';
import { notFound } from 'next/navigation';
export default async function EditorPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const demo = demoMode();
  if (!demo) {
    try {
      await requireAdmin();
    } catch {
      return null;
    }
  }
  const { id } = await searchParams;
  let initial: EditorInitial | undefined;
  let categories = ['AI 입문', 'AI 업무 활용', '생산성', '이미지 생성', '자동화'];
  if (demo && id) {
    const a = demoArticles.find((a) => a.id === id);
    if (a)
      initial = {
        ...a,
        id: crypto.randomUUID(),
        document: {
          type: 'doc',
          content: [
            ...(a.preview.content || []),
            { type: 'previewBreak' },
            ...(a.body?.content?.slice(2) || []),
          ],
        },
      };
  } else if (!demo) {
    const client = service();
    const { data: cats } = await client.from('categories').select('name');
    categories = [...new Set([...categories, ...(cats || []).map((c) => c.name)])];
    if (id) {
      const { data } = await client
        .from('articles')
        .select('*,article_bodies(document)')
        .eq('id', id)
        .maybeSingle();
      if (!data) notFound();
      initial = { ...data, document: data.article_bodies?.document };
    }
  }
  return <ArticleEditor initial={initial} demo={demo} categories={categories} />;
}
