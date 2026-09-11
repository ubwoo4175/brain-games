# Supabase + 카카오 로그인 설정

## ✅ 이미 끝난 것 (Claude가 Supabase MCP로 처리)

- **프로젝트 생성**: `brain-games` (서울 리전, ref `fnqmizlykcmuigyldzre`)
  - Project URL: `https://fnqmizlykcmuigyldzre.supabase.co`
- **테이블 4개 + RLS 정책 적용 완료** (`supabase/schema.sql` 과 동일)
  - profiles / game_settings / sessions / app_settings — 모두 RLS 켜짐, 보안 점검 0건
  - 정책: 로그인한 사용자가 **자기 데이터만** 읽고 쓸 수 있음
- **앱에 키 연결 완료**: `.env.production` (배포 빌드가 자동으로 읽음)
  - 여기 든 두 값은 원래 브라우저에 공개되는 값입니다. 실제 권한은 서버의 RLS가 지킵니다.
  - 비밀 키(`service_role`, `sb_secret_...`)는 **절대** 저장소에 넣지 마세요.

**남은 것은 아래 구글 로그인 설정뿐입니다.** 그전까지 앱은 지금처럼 잘 동작하고,
설정 화면의 "구글로 로그인" 버튼만 눌러도 로그인이 안 되는 상태입니다.

> **왜 카카오가 아니라 구글인가요?**
> Supabase 의 카카오 provider 는 `account_email` 동의를 **반드시** 요청합니다
> (앱에서 `scopes` 를 지정해도 기본 scope 에 더해질 뿐 뺄 수 없음 — 실제 요청을 확인했습니다).
> 그런데 그 항목은 카카오 **비즈 앱**에서만 쓸 수 있어서, 개인 앱으로는 무엇을 해도 `KOE205` 가 납니다.
> 구글은 이런 제약이 없고, 어머니 폰(안드로이드)은 이미 구글 계정에 로그인되어 있어 탭 한두 번이면 끝납니다.
> 나중에 카카오 비즈 앱 전환을 하시면 카카오도 함께 붙일 수 있습니다.

## 1. 구글 OAuth 클라이언트 만들기 (약 10분)

1. https://console.cloud.google.com 접속 (구글 계정으로 로그인)
2. 상단 프로젝트 선택 → **새 프로젝트** → 이름 `brain-games` → 만들기
3. 왼쪽 메뉴 **API 및 서비스 → OAuth 동의 화면**
   - User Type: **외부** → 만들기
   - 앱 이름: `오늘의 두뇌운동`
   - 사용자 지원 이메일 / 개발자 연락처 이메일: 본인 이메일
   - 나머지는 기본값으로 저장하며 진행
   - **게시 상태는 "테스트"로 둡니다** (아래 "테스트 모드로 쓰기" 참고)
   - 브랜딩 화면에 넣을 값:
     | 항목 | 값 |
     |---|---|
     | 앱 로고 | `public/icons/logo-120.png` (120×120, 직접 만든 것이라 저작권 문제 없음) |
     | 애플리케이션 홈페이지 | `https://ubwoo4175.github.io/brain-games/` |
     | 개인정보처리방침 | `https://ubwoo4175.github.io/brain-games/privacy.html` |
     | 승인된 도메인 | (비워둠 — 테스트 모드에서는 필요 없음) |
4. **API 및 서비스 → 사용자 인증 정보 → 사용자 인증 정보 만들기 → OAuth 클라이언트 ID**
   - 애플리케이션 유형: **웹 애플리케이션**
   - 이름: 아무거나 (`brain-games web`)
   - **승인된 리디렉션 URI** 에 아래를 그대로 추가:
     ```
     https://fnqmizlykcmuigyldzre.supabase.co/auth/v1/callback
     ```
   - 만들기 → **클라이언트 ID** 와 **클라이언트 보안 비밀번호** 를 복사해 두기

## 1-2. 테스트 모드로 쓰기 (권장 — 어머니 + 본인만 쓰는 앱)

구글 콘솔에서 **앱 게시**(프로덕션)를 하려면 홈페이지 URL 의 도메인이 **내 소유임을 증명**해야 합니다.
`ubwoo4175.github.io` 는 GitHub 소유라 증명이 안 되고, 그래서 이런 오류가 납니다:

> The website of your home page URL "https://ubwoo4175.github.io/brain-games/" is not registered to you.

증명하려면 `xxx.com` 같은 **내 도메인을 사서**(보통 연 1~2만원) 거기에 붙여야 합니다.
가족끼리만 쓰는 앱이라 **돈 쓸 필요 없이 테스트 모드로 두면 됩니다.**

**테스트 모드에서 할 일** — OAuth 동의 화면 → **대상(Audience)** → **테스트 사용자 +ADD USERS**
- 어머니 구글 계정 (폰에 로그인되어 있는 그 계정)
- 본인 계정
을 추가하세요. 최대 100명까지 등록할 수 있습니다.

| 궁금한 점 | 답 |
|---|---|
| 처음 로그인할 때 "Google에서 확인하지 않은 앱" 경고가 떠요 | 정상입니다. **고급 → (안전하지 않음) 오늘의 두뇌운동(으)로 이동** 을 한 번만 누르면 됩니다. 어머니 폰에서 이 한 번은 옆에서 대신 눌러드리세요 |
| 테스트 모드는 7일 뒤에 만료되나요? | 구글의 리프레시 토큰 7일 제한은 **구글 API** 를 계속 부를 때 얘기입니다. 이 앱은 로그인 한 번으로 Supabase 가 자기 세션을 따로 발급해 유지하므로 어머니가 다시 로그인할 일은 없습니다 |
| 나중에 정식 게시하고 싶으면? | 도메인을 사서 홈페이지 URL 로 바꾸고 **승인된 도메인**에 등록한 뒤 게시하면 됩니다. 앱 코드는 바꿀 게 없습니다 |

## 2. Supabase에 구글 연결 (약 2분)

1. https://supabase.com/dashboard/project/fnqmizlykcmuigyldzre/auth/providers → **Google**
   - **Enabled** 켜기
   - **Client ID**: 1-4에서 복사한 클라이언트 ID
   - **Client Secret**: 1-4에서 복사한 보안 비밀번호
   - **Save**
2. https://supabase.com/dashboard/project/fnqmizlykcmuigyldzre/auth/url-configuration
   - **Site URL**: `https://ubwoo4175.github.io/brain-games/`
   - **Redirect URLs** 에 추가: `https://ubwoo4175.github.io/brain-games/**`
     (로컬 테스트도 하려면 `http://localhost:5173/**` 도 추가)

끝나면 폰에서 앱 → 설정 → "구글로 로그인" 을 눌러 확인하세요.

## 로그인이 안 될 때

| 증상 | 원인과 해결 |
|---|---|
| `redirect_uri_mismatch` | 구글 콘솔의 **승인된 리디렉션 URI** 가 `https://fnqmizlykcmuigyldzre.supabase.co/auth/v1/callback` 과 정확히 같은지 확인 (끝에 `/` 붙이지 말 것) |
| "이 앱은 확인되지 않았습니다" 경고 | 테스트 모드라 정상입니다. **고급 → 계속** 을 한 번 누르면 됩니다 |
| `access_blocked` / "앱이 Google 인증 절차를 완료하지 않았습니다" | 그 구글 계정이 **테스트 사용자**에 없습니다. OAuth 동의 화면 → 대상 → 테스트 사용자에 추가하세요 |
| 로그인 후 앱으로 안 돌아옴 | Supabase **URL Configuration** 의 Site URL / Redirect URLs 확인 |
| 버튼을 눌러도 구글 화면이 안 뜸 (400) | Supabase Google provider 가 아직 Enabled 가 아니거나 Client ID/Secret 이 비어 있음 |

문제가 계속되면 [Auth 로그](https://supabase.com/dashboard/project/fnqmizlykcmuigyldzre/logs/auth-logs)에서
`/auth/v1/authorize` 요청이 **302**(정상 — 구글로 넘어감)인지 **400**(Supabase 설정 문제)인지 볼 수 있습니다.

## 동작 방식

- **로그인 전**: 지금과 100% 동일 (익명, 이 기기에만 저장)
- **첫 로그인 때**: 이 기기에 쌓인 익명 기록·레벨·설정을 계정으로 자동 병합
- **로그인 후**: 게임은 여전히 로컬에 먼저 저장 → 뒤에서 서버로 올림
  (오프라인에서도 게임 가능, 온라인 되면 밀린 것 자동 전송)
- **다른 폰**에서 같은 구글 계정으로 로그인하면 기록이 그대로 내려옵니다
- 설정의 "모든 기록 지우기"는 서버 기록도 함께 지웁니다

## 주의: 무료 프로젝트는 안 쓰면 잠깁니다

Supabase 무료 티어는 **2주 동안 요청이 없으면 프로젝트를 일시정지**합니다.
그러면 로그인·동기화만 멈추고 **게임과 로컬 기록은 그대로 동작합니다.**
[대시보드](https://supabase.com/dashboard/project/fnqmizlykcmuigyldzre)에서 Restore 를 누르면 1~2분 만에 복구됩니다.
어머니가 매일 쓰시면 자동으로 계속 깨어 있습니다.

## 로컬에서 테스트하려면

`.env.production` 이 이미 있어서 `npm run build && npm run preview` 로 바로 확인됩니다.
`npm run dev` 로도 쓰려면 같은 두 줄을 `.env.local` 로 복사하세요 (git에 안 올라감).

## 스키마를 바꿀 때

`src/data/types.ts` 를 바꾸면 `supabase/schema.sql` 도 같이 고치고,
[SQL Editor](https://supabase.com/dashboard/project/fnqmizlykcmuigyldzre/sql/new) 에 붙여넣어 Run 하세요
(여러 번 실행해도 안전하게 작성되어 있습니다).
