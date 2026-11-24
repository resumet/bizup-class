import { CourseEditor, CourseInput } from '@/components/course-editor';
import { demoMode, requireAdmin, service } from '@/lib/supabase';
import { demoCourses } from '@/lib/demo';
import { notFound } from 'next/navigation';
export default async function CourseEdit({ params }: { params: Promise<{ id: string }> }) {
  const demo = demoMode();
  if (!demo) {
    try {
      await requireAdmin();
    } catch {
      return null;
    }
  }
  const { id } = await params;
  let initial: CourseInput | undefined;
  if (demo && id !== 'new') {
    const c = demoCourses.find((c) => c.id === id);
    if (c)
      initial = {
        ...c,
        id: crypto.randomUUID(),
        lessons: c.lessons.map((l) => ({
          ...l,
          id: crypto.randomUUID(),
          vimeo_id: '',
          vimeo_hash: '',
        })),
      };
  } else if (!demo && id !== 'new') {
    const { data } = await service()
      .from('courses')
      .select('*,lessons(*,lesson_videos(*))')
      .eq('id', id)
      .maybeSingle();
    if (!data) notFound();
    initial = {
      ...data,
      lessons: data.lessons
        .sort((a: { position: number }, b: { position: number }) => a.position - b.position)
        .map(
          (l: {
            id: string;
            title: string;
            duration: string;
            lesson_videos: { vimeo_id: string; vimeo_hash: string };
          }) => ({ ...l, ...l.lesson_videos }),
        ),
    };
  }
  return <CourseEditor demo={demo} initial={initial} />;
}
