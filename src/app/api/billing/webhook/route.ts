import { NextRequest, NextResponse } from 'next/server';
import { service } from '@/lib/supabase';
import { validTossSignature } from '@/lib/webhook';
import { toss, withBillingLock } from '@/lib/billing';
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (raw.length > 100000) return new NextResponse(null, { status: 413 });
  if (
    !validTossSignature(
      raw,
      req.headers.get('tosspayments-webhook-transmission-time'),
      req.headers.get('tosspayments-webhook-signature'),
      process.env.TOSS_WEBHOOK_SECURITY_KEY,
    )
  )
    return new NextResponse(null, { status: 401 });
  try {
    const event = JSON.parse(raw);
    if (event.eventType !== 'PAYMENT_STATUS_CHANGED') return NextResponse.json({ ignored: true });
    const orderId = event.data?.orderId;
    if (typeof orderId !== 'string' || !/^ai_[a-f0-9]{32}$/.test(orderId))
      return NextResponse.json({ ignored: true });
    const client = service();
    const { data: order, error } = await client
      .from('billing_orders')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();
    if (error) throw error;
    if (!order) return NextResponse.json({ ignored: true });
    await withBillingLock(order.user_id, async () => {
      const result = await toss(`/payments/orders/${orderId}`);
      if (!result.ok || result.data.orderId !== orderId || result.data.totalAmount !== 19900)
        throw new Error('Verification failed');
      if (result.data.status === 'DONE') {
        const { error } = await client.rpc('settle_payment', {
          p_order_id: orderId,
          p_payment_key: result.data.paymentKey,
          p_receipt_url: result.data.receipt?.url || null,
        });
        if (error) throw error;
      } else if (['CANCELED', 'PARTIAL_CANCELED'].includes(result.data.status)) {
        const { error } = await client.rpc('record_payment_cancellation', {
          p_order_id: orderId,
          p_status: result.data.status,
        });
        if (error) throw error;
      }
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Retry later' }, { status: 500 });
  }
}
