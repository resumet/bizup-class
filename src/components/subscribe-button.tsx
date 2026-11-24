'use client';
import { useState } from 'react';
import Link from 'next/link';
export function SubscribeButton({ userId, enabled }: { userId?: string; enabled: boolean }) {
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function pay() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/billing/prepare', { method: 'POST' });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk');
      const toss = await loadTossPayments(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!);
      await toss.payment({ customerKey: result.customerKey }).requestBillingAuth({
        method: 'CARD',
        successUrl: `${location.origin}/billing/success`,
        failUrl: `${location.origin}/billing/fail`,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : '결제를 시작하지 못했습니다.');
      setBusy(false);
    }
  }
  if (!userId)
    return (
      <Link className="button wide" href="/login?next=/membership">
        카카오로 가입하고 시작하기
      </Link>
    );
  return (
    <>
      <label className="check-line">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>
          월 19,900원 자동결제와 <Link href="/terms">구독·해지 안내</Link>를 확인했습니다. 해지
          전까지 매월 결제됩니다.
        </span>
      </label>
      <button className="button wide" disabled={!agree || busy || !enabled} onClick={pay}>
        {busy
          ? '결제창을 여는 중…'
          : enabled
            ? '월 19,900원으로 구독하기'
            : '구독 결제를 준비하고 있어요'}
      </button>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
