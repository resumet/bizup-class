import Link from 'next/link';
export const metadata = { title: '결제 안내', robots: { index: false } };
export default function BillingFail() {
  return (
    <div className="center-page">
      <h1>결제가 완료되지 않았어요.</h1>
      <p className="muted">
        결제창을 닫았거나 카드 등록에 실패했습니다. 결제 내역을 확인한 후 다시 시도해주세요.
      </p>
      <div className="actions">
        <Link className="button" href="/account">
          결제 내역 확인
        </Link>
        <Link className="button secondary" href="/membership">
          멤버십으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
