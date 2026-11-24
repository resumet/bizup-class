import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { requireAdmin, service } from '@/lib/supabase';
import { sameOrigin, failure } from '@/lib/http';
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    await requireAdmin();
    if (Number(req.headers.get('content-length') || 0) > 4200000)
      return NextResponse.json({ error: '4MB 이하 이미지를 사용해주세요.' }, { status: 413 });
    const form = await req.formData();
    const file = form.get('file');
    if (
      !(file instanceof File) ||
      file.size > 4000000 ||
      !['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)
    )
      return NextResponse.json(
        { error: '4MB 이하 JPG, PNG, WebP, AVIF 이미지만 업로드할 수 있어요.' },
        { status: 400 },
      );
    const cover = form.get('kind') === 'cover';
    const id = crypto.randomUUID();
    const buffer = await sharp(Buffer.from(await file.arrayBuffer()), {
      limitInputPixels: 40000000,
    })
      .rotate()
      .resize({ width: cover ? 1200 : 1800, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    const client = service();
    const bucket = cover ? 'covers' : 'content-images';
    const path = `${id}.webp`;
    const { error } = await client.storage
      .from(bucket)
      .upload(path, buffer, { contentType: 'image/webp', upsert: false });
    if (error) throw error;
    if (cover)
      return NextResponse.json({
        url: client.storage.from(bucket).getPublicUrl(path).data.publicUrl,
      });
    const { error: dbError } = await client.from('media').insert({ id, path });
    if (dbError) {
      await client.storage.from(bucket).remove([path]);
      throw dbError;
    }
    return NextResponse.json({ url: `/api/media/${id}` });
  } catch (e) {
    return failure(e);
  }
}
