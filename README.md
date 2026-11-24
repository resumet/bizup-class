# 세상의모든AI지식창고

무료 AI 콘텐츠로 회원을 모으고 월 19,900원 VOD 멤버십으로 연결하는 서비스입니다. Next.js App Router, Supabase, Tiptap 블록 편집기, 토스페이먼츠 SDK를 사용합니다.

## 실행

Node.js 24 LTS를 권장합니다.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Windows PowerShell에서는 `Copy-Item .env.example .env.local`을 사용하세요. 이미 설정한 `.env.local`은 덮어쓰지 마세요. 현재 작업 폴더에는 데모 실행 설정이 준비되어 있습니다.

`http://localhost:3000`에서 확인합니다. Supabase 설정이 없고 `NEXT_PUBLIC_DEMO_MODE=true`일 때만 샘플 콘텐츠와 관리자 편집기 체험이 제공됩니다. 데모 초안은 브라우저 localStorage에 저장됩니다. 가짜 로그인, 가짜 결제, 권한 우회는 없습니다. 실제 프로젝트를 연결하면 데모 관리자는 자동으로 차단됩니다.

## 구현 범위

- 반응형 홈, 카테고리 필터, 검색, 글별 공개 URL, 공유 버튼
- Tiptap 블록 편집기: 제목·본문·목록·인용·코드·이미지, `/` 블록 메뉴, 실행 취소
- 편집자가 정하는 미리보기 경계, 초안/공개 전환, SEO 요약과 대표 이미지
- 서버에서 분리하는 비회원 미리보기와 회원 전체 본문, DB RLS로 직접 API 접근도 제한
- Supabase Kakao OAuth, 로그인 후 원래 콘텐츠로 복귀, 회원 프로필
- 강좌와 정렬 가능한 여러 회차, 구독자 전용 Vimeo iframe
- 관리자 콘텐츠/강좌/회원/결제 내역, 개인 구독·결제 내역, 해지 예약
- 토스 카드 빌링 등록·승인, 월 갱신 작업, 결제 서명 웹훅, 중복 청구 및 중복 반영 방지
- 본문 이미지 WebP 변환 및 비공개 Storage, 공개 대표 이미지, 한국어 동적 OG PNG
- sitemap, robots, canonical, Article 구조화 데이터
- 알림톡 연결을 위한 `notification_outbox` (가입·결제·결제 확인 필요 이벤트 저장, 발송은 미연결)

## 계정 연결

전체 절차와 운영 전 확인 항목은 [연결·배포 안내](docs/SETUP.md)를 참고하세요. 현재 GitHub 원격 저장소, Vercel 배포 대상, Supabase 프로젝트, Kakao/Toss/Vimeo 계정이 지정되지 않아 외부 배포와 실서비스 연동 검증은 하지 않았습니다.

`.env.example`은 변수명만 제공하며 비밀키를 커밋하지 않습니다. 라이브 결제는 기본적으로 비활성화되어 있습니다.

## 검증

```sh
npm run typecheck
npm test
npm run build
# dev 서버를 실행한 뒤
npx playwright install chromium
npx playwright test
```

브라우저가 별도로 설치되어 있으면 `PLAYWRIGHT_CHROMIUM_EXECUTABLE`에 실행 파일 경로를 지정할 수 있습니다. 테스트 기본 주소는 `http://127.0.0.1:3000`입니다.

- 단위 테스트: 미리보기 분리, 구독 만료, 월말 날짜, 리다이렉트, AES-GCM, 웹훅 서명
- PGlite PostgreSQL 테스트: 마이그레이션 실행, anon/member 접근 정책, 구독 권한, 중복 결제 반영
- Playwright: 검색·카테고리, 글 잠금과 로그인 복귀 URL, 회차 선택, 편집기 초안 복원, 모바일 가로 넘침
- 실제 Supabase Auth/Storage, Kakao OAuth, Toss 테스트 결제 및 Vimeo 재생은 계정 연결 후 별도 검증 필요

## 구조

`src/app`은 페이지와 서버 API, `src/components`는 UI와 편집기, `src/lib`는 인증·콘텐츠·결제 공통 코드입니다. `supabase/migrations`에 DB 초기 스키마와 접근 정책이 있습니다. `tests`에 접근 제어와 브라우저 검증을 보관합니다.

본문 이미지 무단 외부 호출은 세션과 접근 권한으로 제한합니다. 정상 열람자의 저장·캡처와 영상 화면 녹화까지 방지하는 DRM 서비스는 아닙니다. OG 이미지는 Google Fonts의 제목별 서브셋 폰트를 서버에서 가져와 PNG로 렌더링하므로 해당 네트워크 접근이 필요합니다.
