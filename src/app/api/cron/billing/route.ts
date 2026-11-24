import { NextRequest, NextResponse } from 'next/server';
import { service } from '@/lib/supabase';
import { billingReady, charge, withBillingLock } from '@/lib/billing';
export async function GET(req: NextRequest) {
  if (
    !process.env.CRON_SECRET ||
    req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`
  )
    return new NextResponse(null, { status: 401 });
  if (!billingReady()) return NextResponse.json({ skipped: 'Billing disabled' });
  const client = service();
  const { error: expireError } = await client
    .from('subscriptions')
    .update({ status: 'expired' })
    .eq('cancel_at_period_end', true)
    .lte('current_period_end', new Date().toISOString());
  if (expireError) return NextResponse.json({ error: 'Expiration failed' }, { status: 500 });
  const { data: due, error } = await client
    .from('subscriptions')
    .select('user_id')
    .eq('status', 'active')
    .eq('cancel_at_period_end', false)
    .lte('current_period_end', new Date().toISOString())
    .order('current_period_end')
    .limit(20);
  if (error) return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  const { data: pending, error: pendingError } = await client
    .from('billing_orders')
    .select('user_id')
    .eq('status', 'pending')
    .order('created_at')
    .limit(20);
  if (pendingError) return NextResponse.json({ error: 'Pending query failed' }, { status: 500 });
  const users = [
    ...new Set([...(due || []).map((x) => x.user_id), ...(pending || []).map((x) => x.user_id)]),
  ];
  const started = Date.now();
  let succeeded = 0,
    failed = 0;
  for (const userId of users) {
    if (Date.now() - started > 230000) break;
    try {
      await withBillingLock(userId, () => charge(userId));
      succeeded++;
    } catch {
      failed++;
    }
  }
  return NextResponse.json({ succeeded, failed });
}
