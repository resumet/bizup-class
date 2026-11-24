import { NextRequest, NextResponse } from 'next/server';
import { db, service, viewer } from '@/lib/supabase';
import { imageIds } from '@/lib/validation';
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new NextResponse(null, { status: 404 });
  const client = await db();
  if (!client) return new NextResponse(null, { status: 404 });
  const user = await viewer();
  const admin = user
    ? await service().from('admins').select('user_id').eq('user_id', user.id).maybeSingle()
    : null;
  const { data: media } = await service().from('media').select('*').eq('id', id).maybeSingle();
  if (!media) return new NextResponse(null, { status: 404 });
  if (!admin?.data) {
    if (!media.article_id) return new NextResponse(null, { status: 404 });
    const { data: a } = await client
      .from('articles')
      .select('preview,status')
      .eq('id', media.article_id)
      .eq('status', 'published')
      .maybeSingle();
    if (!a || (!user && !imageIds(a.preview).includes(id)))
      return new NextResponse(null, { status: 403 });
  }
  const { data, error } = await service().storage.from('content-images').download(media.path);
  if (error || !data) return new NextResponse(null, { status: 404 });
  return new NextResponse(data, {
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'private, no-store',
      'Cross-Origin-Resource-Policy': 'same-origin',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
