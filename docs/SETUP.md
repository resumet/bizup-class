# 연결과 배포

## 1. Supabase

1. 이 서비스 전용 프로젝트를 정하고 `.env.local`에 URL, publishable key, server-only service role key를 설정합니다.
2. `supabase/migrations/20261124161430_initial_library.sql`을 새 프로젝트에 적용합니다. CLI 사용 시 `npx supabase --help`, `npx supabase link --help`, `npx supabase db push --help`로 설치 버전의 명령을 먼저 확인합니다. 기존 운영 DB에 적용하기 전에는 스키마 충돌을 검토해야 합니다.
3. Supabase Auth에서 Kakao provider를 활성화하고 익명 가입은 비활성화합니다. 서버와 DB 권한은 가입한 사용자를 전제로 합니다.
4. Supabase Auth Site URL에 실제 서비스 주소, Redirect URLs에 `https://서비스주소/auth/callback`과 로컬 개발 주소를 등록합니다.
5. 로그인한 계정의 `auth.users.id`를 확인한 후 SQL Editor에서 `insert into public.admins(user_id) values ('관리자-사용자-UUID');`를 실행합니다. 사용자 수정 가능한 metadata는 관리자 판정에 쓰지 않습니다.
6. `content-images`는 비공개, `covers`만 공개 버킷이어야 합니다. 클라이언트 Storage 정책을 임의로 추가하지 않습니다. 업로드는 관리자 API에서 처리합니다.
7. 실제 anon / 회원 / 구독자 / 관리자 계정으로 RLS와 Storage를 검증하고 Supabase advisors를 실행합니다. 로컬 PGlite 테스트는 Supabase 서비스 전체 통합 검증을 대체하지 않습니다.

## 2. 카카오

카카오 개발자 앱에 웹 플랫폼의 서비스 도메인을 등록하고 카카오 로그인을 켭니다. Redirect URI는 Supabase 대시보드에 표시되는 `https://<project-ref>.supabase.co/auth/v1/callback`입니다. Kakao REST API key와 Client Secret을 Supabase Kakao 설정에 입력합니다. 이름·이메일 동의 항목은 앱 권한에 맞게 설정합니다. 이메일이 제공되지 않아도 회원은 UUID로 구분됩니다.

[Supabase Kakao 안내](https://supabase.com/docs/guides/auth/social-sign-in/auth-kakao), [SSR 클라이언트 안내](https://supabase.com/docs/guides/auth/server-side/creating-a-client)

## 3. 토스페이먼츠

먼저 자동결제용 **테스트** 클라이언트 키와 시크릿 키를 사용합니다. `NEXT_PUBLIC_TOSS_CLIENT_KEY`, `TOSS_SECRET_KEY`를 설정하고 `BILLING_ENCRYPTION_KEY`는 임의의 32바이트를 64자리 hex로 저장합니다. 키를 분실하거나 교체하면 기존 암호화 빌링키를 읽을 수 없으므로 별도 보안 보관·이전 절차가 필요합니다.

`BILLING_ENABLED=true`는 테스트 환경을 연결할 때부터 명시적으로 설정합니다. 라이브로 변경하기 전 계약, 사업자 정보, 정식 약관·개인정보처리방침·환불 절차를 완료해야 합니다. `/terms`, `/privacy`는 현재 준비 안내 페이지이며 정식 법률 문서가 아닙니다.

흐름: 동의 → 서버 customerKey 준비 → 토스 카드 등록 → `/billing/success` → 명시적 결제 완료 버튼 → 서버 빌링키 발급·AES-GCM 암호화 → 고정 금액 승인 → DB 트랜잭션으로 결제·구독·알림 이벤트 반영.

카드번호는 저장하지 않습니다. 클라이언트가 금액이나 회원 권한을 정하지 못합니다. 서버는 19,900원과 주문번호를 토스 응답으로 재검증합니다. 회원별 결제 잠금과 주문별 멱등키를 사용하며, 승인 후 DB 장애가 나면 동일 주문을 조회해 복구합니다. 미확인 주문이 23시간을 넘으면 새로 청구하지 않고 `review` 상태로 남깁니다. 해당 주문은 토스 관리자와 대조한 후 운영자가 처리해야 합니다. 재시도를 위해 임의로 주문번호를 바꾸면 안 됩니다.

`/api/cron/billing`은 `Authorization: Bearer <CRON_SECRET>`이 필요합니다. `vercel.json`은 매시 실행으로 설정되어 있으므로 해당 주기를 지원하는 Vercel 플랜 또는 외부 스케줄러가 필요합니다. 실제 권한은 만료 시각 즉시 끝나며, 갱신 작업 사이에는 시청이 일시 중단될 수 있습니다. 정각 갱신이 필요하면 지원 플랜에서 주기를 단축하세요. 한 실행은 최대 20개 갱신 대상과 20개 미완료 주문을 모아 시간 제한 내에서 순차 처리합니다. 규모가 커지면 작업 큐로 확장해야 합니다.

토스 웹훅은 `/api/billing/webhook`으로 연결합니다. `TOSS_WEBHOOK_SECURITY_KEY`에는 토스 발급 64자리 hex 보안 키를 설정합니다. HMAC SHA-256 서명과 전송 시각을 검증하고 토스 결제 조회 API로 다시 대조합니다. 현재 `PAYMENT_STATUS_CHANGED`를 처리하며 전액 취소 시 해당 기간의 권한을 종료합니다. 이전 기간의 환불은 이후 정상 결제한 기간을 취소하지 않습니다. 부분 취소는 결제 상태만 기록하므로 이용권 조정이 필요하면 운영자가 확인해야 합니다. `BILLING_DELETED` 처리와 관리자 화면에서 직접 환불 실행은 포함하지 않았습니다. 환불은 토스 관리자에서 처리합니다.

출시 전 실제 테스트 카드로 최초 결제, 콜백 새로고침, 갱신, 중복 크론, 실패·타임아웃 복구, 해지와 갱신 경합, 전액 취소 웹훅, 만료 후 재가입을 검증하세요.

[자동결제 연동](https://docs.tosspayments.com/guides/v2/billing/integration), [웹훅 서명](https://docs.tosspayments.com/reference/using-api/webhook-events)

## 4. Vimeo

관리자에서 강좌를 만들고 회차별 Vimeo 영상 ID와 비공개 해시(해당 영상에 있는 경우)를 등록합니다. Vimeo 계정에서 서비스 도메인만 임베드하도록 제한하고 다운로드·Vimeo 공개 시청 설정을 검토합니다. 계정 플랜이 해당 설정을 지원하는지 확인해야 합니다. 미가입·무료 회원에게는 영상 ID를 내려보내지 않으며, 구독자는 플레이어 재생을 위해 주소를 볼 수 있습니다.

## 5. 알림톡

가입·결제 결과는 `notification_outbox`에 중복 방지 event_key와 함께 남습니다. 지금은 외부 API를 호출하지 않습니다. 서비스가 정해지면 수신 전화번호 수집·이용 동의, 템플릿 ID, API 인증, 발송 작업 및 실패 재시도를 연결합니다. `pending`을 성공 발송 후 `sent`로 바꾸는 발송 어댑터가 필요합니다.

## 6. GitHub · Vercel

현재 원격 저장소와 배포 프로젝트는 미지정입니다. 준비된 로컬 커밋에 GitHub 원격 저장소를 연결해 push한 뒤 Vercel에서 해당 저장소를 Import합니다. Next.js 프레임워크, Node.js 24, `npm run build`를 사용합니다.

환경별로 `.env.example`의 값을 등록하고 `NEXT_PUBLIC_SITE_URL`을 실제 HTTPS 도메인으로 설정하세요. Production은 `NEXT_PUBLIC_DEMO_MODE=false`입니다. Preview에는 운영 DB나 라이브 토스 키를 사용하지 마세요. Vercel 환경 변수 변경 후에는 재배포해야 합니다.

배포 후 확인할 것: 카카오 등록 도메인 및 리다이렉트, 로그인한 사용자 캐시 분리, 관리자 접근 차단, 이미지 업로드·비공개 접근, OG 이미지 PNG와 공유 미리보기, 실제 Vimeo 재생, 토스 테스트 결제, 스케줄러 인증과 실행 로그.

한국어 OG 이미지는 런타임에 Google Fonts에서 제목에 필요한 글자만 받아 생성합니다. 이 요청이 차단되면 OG 생성이 실패합니다. 외부 의존성을 없애려면 라이선스가 허용된 한국어 폰트를 배포 자산으로 추가하는 방식으로 전환할 수 있습니다.
