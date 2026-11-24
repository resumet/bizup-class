'use client';
import { useState } from 'react';
import Link from 'next/link';
export function BillingConfirm({ authKey, customerKey }: { authKey: string; customerKey: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);
  async function confirm() {
    setBusy(true);
    try {
      const res = await fetch('/api/billing/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authKey, customerKey }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setDone(true);
      history.replaceState(null, '', '/billing/success');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '결제 확인 실패');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {done ? (
        <>
          <h1>배움의 다음 장이 열렸어요.</h1>
          <p>멤버십 구독이 시작되었습니다.</p>
          <Link className="button" href="/courses">
            클래스 보러 가기
          </Link>
        </>
      ) : (
        <>
          <h1>카드 등록을 마쳤습니다.</h1>
          <p>월 19,900원 결제를 완료하면 모든 VOD를 시청할 수 있어요.</p>
          <button className="button" disabled={busy || !authKey || !customerKey} onClick={confirm}>
            {busy ? '결제를 확인하고 있어요…' : '19,900원 결제하고 구독 시작'}
          </button>
        </>
      )}
      {message && (
        <p className="error-message" role="alert">
          {message}
        </p>
      )}
      <p>
        <Link className="text-link" href="/account">
          내 계정에서 결제 내역 확인
        </Link>
      </p>
    </>
  );
}
