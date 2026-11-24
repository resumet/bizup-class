import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="center-page">
      <span className="eyebrow">404</span>
      <h1>이 페이지를 찾을 수 없어요.</h1>
      <p className="muted">주소가 바뀌었거나 아직 공개되지 않은 콘텐츠입니다.</p>
      <Link className="button" href="/">
        지식창고로 돌아가기
      </Link>
    </div>
  );
}
