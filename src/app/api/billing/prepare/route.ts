import { NextRequest, NextResponse } from 'next/server';
import { viewer, service } from '@/lib/supabase';
import { sameOrigin } from '@/lib/http';
import { billingReady } from '@/lib/billing';
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    const user = await viewer();
    if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    if (!billingReady())
      return NextResponse.json({ error: '구독 결제를 준비하고 있습니다.' }, { status: 503 });
    const client = service();
    const { data: sub } = await client
      .from('subscriptions')
      .select('current_period_end')
      .eq('user_id', user.id)
      .maybeSingle();
    if (sub && Date.parse(sub.current_period_end) > Date.now())
      return NextResponse.json({ error: '이미 이용 중인 구독이 있습니다.' }, { status: 409 });
    const { error } = await client
      .from('billing_customers')
      .upsert(
        { user_id: user.id, customer_key: `customer_${user.id}` },
        { onConflict: 'user_id', ignoreDuplicates: true },
      );
    if (error) throw error;
    return NextResponse.json({ customerKey: `customer_${user.id}` });
  } catch {
    return NextResponse.json({ error: '결제 준비에 실패했습니다.' }, { status: 400 });
  }
}
