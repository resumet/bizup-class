import Link from 'next/link';
import { Check } from 'lucide-react';
import { SubscribeButton } from '@/components/subscribe-button';
import { viewer } from '@/lib/supabase';
import { subscription } from '@/lib/data';
import { canWatch } from '@/lib/model';
export const metadata = { title: 'VOD 멤버십' };
export default async function Membership() {
  const [user, sub] = await Promise.all([viewer(), subscription()]);
  const enabled =
    process.env.BILLING_ENABLED === 'true' && !!process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
  return (
    <div className="page membership-page">
      <div>
        <span className="eyebrow">ONE MEMBERSHIP. MORE POSSIBILITIES.</span>
        <h1>
          혼자 알아가는 AI에서,
          <br />
          함께 해보는 AI로.
        </h1>
        <p className="muted">
          읽으며 이해했다면, 이제 직접 해볼 차례.
          <br />
          모든 클래스로 배움의 깊이를 더하세요.
        </p>
        <p className="muted">
          글은 언제나 무료입니다.
          <br />더 깊이 배우고 싶을 때 멤버십을 시작하세요.
        </p>
      </div>
      <div className="panel price-panel">
        <span className="status">ALL ACCESS</span>
        <h2 style={{ marginTop: 16 }}>AI 지식창고 멤버십</h2>
        <div className="price">
          19,900<small>원 / 월</small>
        </div>
        <ul className="benefits">
          {[
            '모든 VOD 클래스 무제한 시청',
            '새롭게 추가되는 클래스도 함께',
            '여러 회차로 나누어 차근차근 학습',
            '해지해도 남은 기간 동안 이용',
          ].map((b) => (
            <li key={b}>
              <Check size={17} />
              {b}
            </li>
          ))}
        </ul>
        {canWatch(sub) ? (
          <Link className="button wide" href="/courses">
            클래스 이어보기
          </Link>
        ) : (
          <SubscribeButton userId={user?.id} enabled={enabled} />
        )}
        <p className="muted" style={{ fontSize: 11, marginTop: 18, marginBottom: 0 }}>
          매월 자동결제 · 부가세 포함 · 내 계정에서 해지 예약
        </p>
        {!enabled && (
          <p className="notice">멤버십 오픈 준비 중입니다. 현재 실제 결제는 진행되지 않습니다.</p>
        )}
      </div>
    </div>
  );
}
