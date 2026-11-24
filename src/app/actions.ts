'use server';
import { redirect } from 'next/navigation';
import { db, viewer, service } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { withBillingLock } from '@/lib/billing';
export async function logout() {
  const client = await db();
  await client?.auth.signOut();
  redirect('/');
}
export async function cancelSubscription() {
  const user = await viewer();
  if (!user) redirect('/login');
  await withBillingLock(user.id, async () => {
    const { error } = await service()
      .from('subscriptions')
      .update({ cancel_at_period_end: true, status: 'canceling' })
      .eq('user_id', user.id)
      .eq('status', 'active');
    if (error) throw new Error('구독 해지 예약에 실패했습니다.');
  });
  revalidatePath('/account');
}
