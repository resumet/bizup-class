export const BRAND = '세상의모든AI지식창고';
export const PRICE = 19900;
export type Block = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: Block[];
};
export type Article = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  cover: string | null;
  theme: string;
  read_minutes: number;
  published_at: string;
  status: 'draft' | 'published';
  preview: Block;
  body?: Block;
};
export type Course = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  theme: string;
  status: string;
  lessons: Lesson[];
};
export type Lesson = {
  id: string;
  title: string;
  position: number;
  duration: string;
  course_id: string;
};
export const doc = (...texts: string[]): Block => ({
  type: 'doc',
  content: texts.map((text) => ({ type: 'paragraph', content: [{ type: 'text', text }] })),
});
export function splitContent(body: Block) {
  const blocks = body.content || [];
  const index = blocks.findIndex((b) => b.type === 'previewBreak');
  if (index < 0) throw new Error('무료 미리보기 경계를 추가해주세요.');
  return {
    preview: { type: 'doc', content: blocks.slice(0, index) } as Block,
    body: { type: 'doc', content: blocks.filter((b) => b.type !== 'previewBreak') } as Block,
  };
}
export function nextMonth(iso: string) {
  const d = new Date(iso);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + 1);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString();
}
export function canWatch(
  subscription: { current_period_end: string; status: string } | null,
  now = Date.now(),
) {
  return (
    !!subscription &&
    ['active', 'canceling'].includes(subscription.status) &&
    Date.parse(subscription.current_period_end) > now
  );
}
export function safeNext(value: string | null) {
  return value &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.includes('\\') &&
    !/[\u0000-\u0020\u007f]/.test(value)
    ? value
    : '/';
}
