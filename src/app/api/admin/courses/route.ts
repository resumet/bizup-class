import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, service } from '@/lib/supabase';
import { courseSchema } from '@/lib/validation';
import { sameOrigin, failure } from '@/lib/http';
import { revalidatePath } from 'next/cache';
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    await requireAdmin();
    const input = courseSchema.parse(await req.json());
    const { error } = await service().rpc('save_course', { p_course: input });
    if (error) throw error;
    revalidatePath('/courses');
    revalidatePath(`/courses/${input.slug}`);
    return NextResponse.json({ slug: input.slug });
  } catch (e) {
    return failure(e);
  }
}
