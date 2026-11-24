import { z } from 'zod';
import { Block } from './model';
export const slugSchema = z
  .string()
  .min(2)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const blockSchema: z.ZodType<Block> = z.lazy(() =>
  z.object({
    type: z.enum([
      'doc',
      'paragraph',
      'text',
      'heading',
      'bulletList',
      'orderedList',
      'listItem',
      'blockquote',
      'codeBlock',
      'hardBreak',
      'horizontalRule',
      'image',
      'previewBreak',
    ]),
    text: z.string().max(100000).optional(),
    attrs: z.record(z.string(), z.unknown()).optional(),
    marks: z
      .array(
        z.object({
          type: z.enum(['bold', 'italic', 'strike', 'code', 'link', 'underline']),
          attrs: z.record(z.string(), z.unknown()).optional(),
        }),
      )
      .optional(),
    content: z.array(blockSchema).max(2000).optional(),
  }),
);
export const articleSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(2).max(150),
  slug: slugSchema,
  excerpt: z.string().min(10).max(250),
  category: z.string().min(1).max(40),
  status: z.enum(['draft', 'published']),
  theme: z.enum(['mint', 'blue', 'peach', 'lilac', 'yellow', 'gray']),
  read_minutes: z.number().int().min(1).max(120),
  cover: z.string().url().nullable(),
  document: blockSchema,
});
export const courseSchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  title: z.string().min(2).max(150),
  description: z.string().min(5).max(500),
  category: z.string().min(1).max(40),
  status: z.enum(['draft', 'published']),
  theme: z.enum(['dark', 'mint', 'lilac', 'blue']),
  lessons: z
    .array(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(150),
        duration: z.string().regex(/^\d{1,3}:\d{2}$/),
        vimeo_id: z.string().regex(/^\d{5,15}$/),
        vimeo_hash: z
          .string()
          .regex(/^[a-zA-Z0-9]*$/)
          .max(64),
      }),
    )
    .min(1)
    .max(100),
});
export function imageIds(block: Block): string[] {
  const own =
    block.type === 'image' ? [String(block.attrs?.src || '').replace('/api/media/', '')] : [];
  return [...own, ...(block.content || []).flatMap(imageIds)];
}
