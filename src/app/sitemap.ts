import type { MetadataRoute } from 'next';
import { articles, courses } from '@/lib/data';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const [a, c] = await Promise.all([articles(), courses()]);
  return [
    { url: base },
    { url: `${base}/courses` },
    { url: `${base}/membership` },
    ...a.map((x) => ({ url: `${base}/articles/${x.slug}`, lastModified: x.published_at })),
    ...c.map((x) => ({ url: `${base}/courses/${x.slug}` })),
  ];
}
