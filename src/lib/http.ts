import { NextRequest, NextResponse } from 'next/server';
export function sameOrigin(req: NextRequest) {
  const origin = req.headers.get('origin');
  const expected = new URL(process.env.NEXT_PUBLIC_SITE_URL || req.url).origin;
  if (origin !== expected) throw new Error('요청 출처를 확인할 수 없습니다.');
}
export function failure(error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : '요청을 처리하지 못했습니다.';
  const safe = [
    '관리자 권한이 필요합니다.',
    '로그인이 필요합니다.',
    '무료 미리보기 경계를 추가해주세요.',
    '서버 연결 설정이 필요합니다.',
    '요청 출처를 확인할 수 없습니다.',
  ];
  return NextResponse.json(
    { error: safe.includes(message) ? message : '입력 내용 또는 연결 상태를 확인해주세요.' },
    { status },
  );
}
