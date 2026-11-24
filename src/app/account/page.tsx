import { redirect } from 'next/navigation';
import Link from 'next/link';
import { viewer, db } from '@/lib/supabase';
import { subscription } from '@/lib/data';
import { logout, cancelSubscription } from '@/app/actions';
export const metadata = { title: '내 계정', robots: { index: false } };
export default async function Account() {
  const user = await viewer();
  if (!user) redirect('/login?next=/account');
  const sub = await subscription();
  const client = await db();
  const { data: payments } = await client!
    .from('payments')
    .select('order_id,amount,status,created_at,receipt_url')
    .order('created_at', { ascending: false });
  return (
    <div className="page">
      <div className="admin-title">
        <h1>나의 지식창고</h1>
        <form action={logout}>
          <button className="button secondary small">로그아웃</button>
        </form>
      </div>
      <div className="account-grid">
        <div className="panel">
          <h2>반가워요, {user.user_metadata?.name || '회원'}님</h2>
          <p className="muted">{user.email}</p>
          <span className="status">모든 글 무료 이용</span>
        </div>
        <div className="panel">
          <h2>VOD 멤버십</h2>
          {sub ? (
            <>
              <p>
                {sub.cancel_at_period_end
                  ? '해지 예약됨'
                  : sub.status === 'active'
                    ? '구독 중'
                    : '구독 만료 또는 결제 확인 필요'}
              </p>
              <p className="muted">
                이용 기간: {new Date(sub.current_period_end).toLocaleDateString('ko-KR')}까지
              </p>
              {sub.status === 'active' && !sub.cancel_at_period_end && (
                <form action={cancelSubscription}>
                  <button className="button secondary small">다음 결제부터 해지하기</button>
                </form>
              )}
            </>
          ) : (
            <>
              <p className="muted">월 19,900원으로 모든 VOD를 만나세요.</p>
              <Link className="button small" href="/membership">
                멤버십 알아보기
              </Link>
            </>
          )}
        </div>
      </div>
      <h2 style={{ marginTop: 40 }}>결제 내역</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>날짜</th>
              <th>상품</th>
              <th>금액</th>
              <th>상태</th>
              <th>영수증</th>
            </tr>
          </thead>
          <tbody>
            {payments?.map((p) => (
              <tr key={p.order_id}>
                <td>{new Date(p.created_at).toLocaleDateString('ko-KR')}</td>
                <td>월간 VOD 멤버십</td>
                <td>{p.amount.toLocaleString()}원</td>
                <td>{p.status}</td>
                <td>
                  {p.receipt_url && (
                    <a href={p.receipt_url} target="_blank" rel="noopener noreferrer">
                      보기
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!payments?.length && <p className="empty">아직 결제 내역이 없어요.</p>}
      </div>
    </div>
  );
}
