import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, service } from '@/lib/supabase';
import { articleSchema, imageIds } from '@/lib/validation';
import { splitContent } from '@/lib/model';
import { sameOrigin, failure } from '@/lib/http';
import { revalidatePath } from 'next/cache';
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    await requireAdmin();
    const raw = await req.text();
    if (raw.length > 1000000)
      return NextResponse.json({ error: '글이 너무 큽니다.' }, { status: 413 });
    const input = articleSchema.parse(JSON.parse(raw));
    const { document, ...meta } = input;
    const { preview, body } = splitContent(document);
    const ids = imageIds(document);
    if (ids.some((id) => !/^[0-9a-f-]{36}$/.test(id))) throw new Error('Invalid image');
    if (
      meta.cover &&
      !meta.cover.startsWith(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/covers/`,
      )
    )
      throw new Error('Invalid cover');
    const client = service();
    const { error } = await client.rpc('save_article', {
      p_meta: meta,
      p_preview: preview,
      p_body: body,
      p_document: document,
      p_media_ids: ids,
    });
    if (error) throw error;
    revalidatePath('/');
    revalidatePath(`/articles/${meta.slug}`);
    return NextResponse.json({ slug: meta.slug });
  } catch (e) {
    return failure(e);
  }
}
