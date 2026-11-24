import Link from 'next/link';
import { demoMode, requireAdmin, service } from '@/lib/supabase';
import { demoArticles, demoCourses } from '@/lib/demo';
export default async function Admin({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const demo = demoMode();
  if (!demo) {
    try {
      await requireAdmin();
    } catch {
      return null;
    }
  }
  const { tab = 'articles' } = await searchParams;
  const client = demo ? null : service();
  const [a, c, p, s, pay] = client
    ? await Promise.all([
        client.from('articles').select('*').order('published_at', { ascending: false }),
        client.from('courses').select('*'),
        client.from('profiles').select('*').order('created_at', { ascending: false }).limit(200),
        client.from('subscriptions').select('user_id,status,current_period_end'),
        client
          .from('payments')
          .select('order_id,user_id,amount,status,created_at')
          .order('created_at', { ascending: false })
          .limit(200),
      ])
    : [{ data: demoArticles }, { data: demoCourses }, { data: [] }, { data: [] }, { data: [] }];
  return (
    <>
      <div className="admin-title">
        <div>
          <span className="eyebrow">YOUR KNOWLEDGE, ORGANIZED.</span>
          <h1>지식창고 관리</h1>
        </div>
        <Link className="button" href={tab === 'courses' ? '/admin/courses/new' : '/admin/editor'}>
          {tab === 'courses' ? '강좌 등록' : '새 글 작성'}
        </Link>
      </div>
      {demo && (
        <p className="notice">
          관리자 화면 체험 · 회원 및 결제 정보는 가상으로 만들지 않습니다. 실제 데이터는 서비스 연결
          후 표시됩니다.
        </p>
      )}
      <div className="admin-stats">
        <div className="panel">
          <small>작성한 콘텐츠</small>
          <strong>{a.data?.length || 0}</strong>
        </div>
        <div className="panel">
          <small>전체 회원{!demo ? ' (최근 200명)' : ''}</small>
          <strong>{p.data?.length || 0}</strong>
        </div>
        <div className="panel">
          <small>이용 중인 구독</small>
          <strong>
            {s.data?.filter(
              (x) =>
                ['active', 'canceling'].includes(x.status) &&
                Date.parse(x.current_period_end) > Date.now(),
            ).length || 0}
          </strong>
        </div>
      </div>
      <nav className="admin-tabs">
        {[
          ['articles', '콘텐츠'],
          ['courses', 'VOD 강좌'],
          ['members', '회원'],
          ['payments', '결제 내역'],
        ].map(([key, label]) => (
          <Link
            key={key}
            className={`chip ${tab === key ? 'active' : ''}`}
            href={`/admin?tab=${key}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="panel table-wrap">
        {tab === 'articles' ? (
          <table>
            <thead>
              <tr>
                <th>제목</th>
                <th>카테고리</th>
                <th>상태</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {a.data?.map((x) => (
                <tr key={x.id}>
                  <td>{x.title}</td>
                  <td>{x.category}</td>
                  <td>
                    <span className="status">{x.status === 'published' ? '공개' : '초안'}</span>
                  </td>
                  <td>
                    <Link href={`/admin/editor?id=${x.id}`}>편집</Link> ·{' '}
                    <Link href={`/articles/${x.slug}`}>보기</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : tab === 'courses' ? (
          <table>
            <thead>
              <tr>
                <th>강좌</th>
                <th>카테고리</th>
                <th>상태</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {c.data?.map((x) => (
                <tr key={x.id}>
                  <td>{x.title}</td>
                  <td>{x.category}</td>
                  <td>{x.status === 'published' ? '공개' : '초안'}</td>
                  <td>
                    <Link href={`/admin/courses/${x.id}`}>편집</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : tab === 'members' ? (
          <>
            <table>
              <thead>
                <tr>
                  <th>이름</th>
                  <th>이메일</th>
                  <th>가입일</th>
                  <th>구독</th>
                </tr>
              </thead>
              <tbody>
                {p.data?.map((x) => (
                  <tr key={x.id}>
                    <td>{x.display_name}</td>
                    <td>{x.email}</td>
                    <td>{new Date(x.created_at).toLocaleDateString('ko-KR')}</td>
                    <td>{s.data?.find((sub) => sub.user_id === x.id)?.status || '무료 회원'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!p.data?.length && <p className="empty">아직 가입한 회원이 없습니다.</p>}
          </>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>주문번호</th>
                  <th>회원 ID</th>
                  <th>금액</th>
                  <th>상태</th>
                  <th>결제일</th>
                </tr>
              </thead>
              <tbody>
                {pay.data?.map((x) => (
                  <tr key={x.order_id}>
                    <td>{x.order_id}</td>
                    <td>{x.user_id}</td>
                    <td>{x.amount.toLocaleString()}원</td>
                    <td>{x.status}</td>
                    <td>{new Date(x.created_at).toLocaleDateString('ko-KR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!pay.data?.length && <p className="empty">아직 결제 내역이 없습니다.</p>}
          </>
        )}
      </div>
    </>
  );
}
