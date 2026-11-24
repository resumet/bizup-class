'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="center-page">
      <h1>잠시 연결이 원활하지 않아요.</h1>
      <p className="muted">잠시 후 다시 시도해주세요.</p>
      <button className="button" onClick={reset}>
        다시 시도하기
      </button>
    </div>
  );
}
