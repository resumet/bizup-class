import 'server-only';
import { db, demoMode } from './supabase';
import { demoArticles, demoCourses } from './demo';
import { Article, Course } from './model';
export async function articles(): Promise<Article[]> {
  const client = await db();
  if (!client) return demoMode() ? demoArticles.map(({ body, ...a }) => a) : [];
  const { data, error } = await client
    .from('articles')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false });
  if (error) throw error;
  return data || [];
}
export async function article(slug: string): Promise<Article | null> {
  const list = await articles();
  const a = list.find((a) => a.slug === slug);
  if (!a) return null;
  const client = await db();
  if (!client) return a;
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return a;
  const { data, error } = await client
    .from('article_bodies')
    .select('body')
    .eq('article_id', a.id)
    .maybeSingle();
  if (error) throw error;
  return { ...a, body: data?.body };
}
export async function courses(): Promise<Course[]> {
  const client = await db();
  if (!client) return demoMode() ? demoCourses : [];
  const { data, error } = await client
    .from('courses')
    .select('*,lessons(*)')
    .eq('status', 'published')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((c) => ({
    ...c,
    lessons: c.lessons.sort(
      (a: { position: number }, b: { position: number }) => a.position - b.position,
    ),
  }));
}
export async function subscription() {
  const client = await db();
  if (!client) return null;
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return null;
  const { data, error } = await client
    .from('subscriptions')
    .select('status,current_period_end,cancel_at_period_end')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}
