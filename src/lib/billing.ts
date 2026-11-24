import 'server-only';
import { service } from './supabase';
import { decrypt } from './crypto';
import { PRICE, nextMonth } from './model';
export function billingReady() {
  return (
    process.env.BILLING_ENABLED === 'true' &&
    !!process.env.TOSS_SECRET_KEY &&
    !!process.env.BILLING_ENCRYPTION_KEY
  );
}
export async function toss(path: string, body?: unknown, idempotencyKey?: string) {
  const res = await fetch(`https://api.tosspayments.com/v1${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.TOSS_SECRET_KEY}:`).toString('base64')}`,
      'Content-Type': 'application/json',
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
    signal: AbortSignal.timeout(25000),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}
export async function withBillingLock<T>(userId: string, action: () => Promise<T>) {
  const client = service();
  const token = crypto.randomUUID();
  const { data, error } = await client.rpc('claim_billing_lock', {
    p_user: userId,
    p_token: token,
  });
  if (error || !data) throw new Error('결제를 처리하고 있습니다. 잠시 후 확인해주세요.');
  try {
    return await action();
  } finally {
    await client.from('billing_locks').delete().eq('user_id', userId).eq('token', token);
  }
}
export async function charge(userId: string) {
  const client = service();
  const { data: customer, error: customerError } = await client
    .from('billing_customers')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (customerError || !customer?.billing_key_encrypted)
    throw new Error('등록된 결제 수단이 없습니다.');
  const { data: sub, error: subError } = await client
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (subError) throw subError;
  const { data: pending, error: pendingError } = await client
    .from('billing_orders')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['pending', 'review'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (pendingError) throw pendingError;
  let order = pending;
  if (!order) {
    if (sub?.cancel_at_period_end) throw new Error('해지 예약된 구독입니다.');
    if (sub && Date.parse(sub.current_period_end) > Date.now()) return;
    const start = sub?.current_period_end || new Date().toISOString();
    const end = nextMonth(start);
    if (Date.parse(end) <= Date.now()) throw new Error('지난 구독 기간의 결제 확인이 필요합니다.');
    const { data, error } = await client
      .from('billing_orders')
      .insert({
        order_id: `ai_${crypto.randomUUID().replaceAll('-', '')}`,
        user_id: userId,
        period_start: start,
        period_end: end,
      })
      .select()
      .single();
    if (error) throw error;
    order = data;
  }
  // Always reconcile by order ID before another charge. Never retry unknown charges after the idempotency window.
  let result = await toss(`/payments/orders/${order.order_id}`);
  if (!result.ok) {
    if (result.status !== 404) throw new Error('결제 확인이 지연되고 있습니다.');
    if (sub?.cancel_at_period_end) {
      await client
        .from('billing_orders')
        .update({ status: 'review' })
        .eq('order_id', order.order_id);
      throw new Error('해지된 구독의 미완료 결제를 확인해야 합니다.');
    }
    if (Date.now() - Date.parse(order.created_at) > 23 * 60 * 60 * 1000) {
      await client
        .from('billing_orders')
        .update({ status: 'review' })
        .eq('order_id', order.order_id);
      throw new Error('관리자 결제 확인이 필요합니다.');
    }
    result = await toss(
      `/billing/${decrypt(customer.billing_key_encrypted)}`,
      {
        customerKey: customer.customer_key,
        amount: PRICE,
        orderId: order.order_id,
        orderName: '세상의모든AI지식창고 월간 VOD',
      },
      order.order_id,
    );
  }
  if (!result.ok || result.data.status !== 'DONE') {
    await client.from('notification_outbox').upsert(
      {
        event_key: `failed:${order.order_id}`,
        user_id: userId,
        event_type: 'payment_needs_attention',
        payload: { orderId: order.order_id },
      },
      { onConflict: 'event_key', ignoreDuplicates: true },
    );
    throw new Error('결제를 완료하지 못했습니다. 내 계정에서 상태를 확인해주세요.');
  }
  if (result.data.totalAmount !== PRICE || result.data.orderId !== order.order_id)
    throw new Error('결제 금액 확인에 실패했습니다.');
  const { error } = await client.rpc('settle_payment', {
    p_order_id: order.order_id,
    p_payment_key: result.data.paymentKey,
    p_receipt_url: result.data.receipt?.url || null,
  });
  if (error) throw error;
}
