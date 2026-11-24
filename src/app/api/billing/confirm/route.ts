import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { viewer, service } from '@/lib/supabase';
import { sameOrigin } from '@/lib/http';
import { billingReady, toss, charge, withBillingLock } from '@/lib/billing';
import { encrypt } from '@/lib/crypto';
import { createHash } from 'node:crypto';
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    const user = await viewer();
    if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    if (!billingReady())
      return NextResponse.json({ error: '결제 연결 준비 중입니다.' }, { status: 503 });
    const { authKey, customerKey } = z
      .object({ authKey: z.string().min(1).max(500), customerKey: z.string().max(100) })
      .parse(await req.json());
    if (customerKey !== `customer_${user.id}`)
      return NextResponse.json({ error: '결제 사용자 정보가 일치하지 않습니다.' }, { status: 403 });
    await withBillingLock(user.id, async () => {
      const client = service();
      const { data: sub, error: subError } = await client
        .from('subscriptions')
        .select('current_period_end,cancel_at_period_end,status')
        .eq('user_id', user.id)
        .maybeSingle();
      if (subError) throw subError;
      if (sub && Date.parse(sub.current_period_end) > Date.now()) return;
      const { data: pending, error: pendingError } = await client
        .from('billing_orders')
        .select('order_id')
        .eq('user_id', user.id)
        .in('status', ['pending', 'review'])
        .limit(1)
        .maybeSingle();
      if (pendingError) throw pendingError;
      if (pending) {
        await charge(user.id);
        return;
      }
      const { data: customer } = await client
        .from('billing_customers')
        .select('billing_key_encrypted,last_auth_hash')
        .eq('user_id', user.id)
        .single();
      if (!customer) throw new Error('결제 준비가 필요합니다.');
      const authHash = createHash('sha256').update(authKey).digest('hex');
      if (!customer.billing_key_encrypted || customer.last_auth_hash !== authHash) {
        const result = await toss(
          '/billing/authorizations/issue',
          { authKey, customerKey },
          `issue_${user.id}_${authHash}`,
        );
        if (!result.ok || !result.data.billingKey) throw new Error('카드 등록에 실패했습니다.');
        const { error } = await client
          .from('billing_customers')
          .update({
            billing_key_encrypted: encrypt(result.data.billingKey),
            last_auth_hash: authHash,
          })
          .eq('user_id', user.id);
        if (error) throw error;
      }
      if (
        sub &&
        (sub.cancel_at_period_end || sub.status === 'expired' || sub.status === 'past_due')
      ) {
        const { error } = await client
          .from('subscriptions')
          .update({
            status: 'past_due',
            cancel_at_period_end: false,
            current_period_end: new Date().toISOString(),
          })
          .eq('user_id', user.id);
        if (error) throw error;
      }
      await charge(user.id);
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      {
        error:
          '결제 완료 여부를 확인하지 못했습니다. 다시 결제하지 말고 내 계정의 결제 내역을 확인해주세요.',
      },
      { status: 400 },
    );
  }
}
