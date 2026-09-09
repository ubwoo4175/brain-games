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

**남은 것은 아래 카카오 설정뿐입니다.** 그전까지 앱은 지금처럼 잘 동작하고,
설정 화면의 "카카오로 로그인" 버튼만 눌러도 로그인이 안 되는 상태입니다.

## 1. 카카오 개발자 앱 만들기 (약 5분)

1. https://developers.kakao.com → 카카오 계정 로그인 → **내 애플리케이션 → 애플리케이션 추가하기**
   - 앱 이름: `오늘의 두뇌운동`, 회사명: 자유
2. 만든 앱 → **앱 설정 > 앱 키** 에서 **REST API 키** 복사해 두기
3. **제품 설정 > 카카오 로그인** → 활성화 **ON**
   - **Redirect URI 등록** (그대로 복사):
     ```
     https://fnqmizlykcmuigyldzre.supabase.co/auth/v1/callback
     ```
4. **제품 설정 > 카카오 로그인 > 보안** → **Client Secret** 발급 → 코드 복사, 상태 **사용함**

### ⚠️ 5. 동의항목 — 여기서 틀리면 `KOE205` 오류가 납니다

Supabase 는 카카오에 **`profile_nickname` + `profile_image`** (그리고 앱이 비즈앱이면 `account_email`)
동의를 요청합니다. 콘솔에 **설정되지 않은 항목을 요청하면 카카오가 `KOE205`(잘못된 요청) 로 막습니다.**

**제품 설정 > 카카오 로그인 > 동의항목** 에서 두 개를 모두 설정하세요:

| 항목 | 설정 |
|---|---|
| **닉네임** (`profile_nickname`) | 필수 동의 |
| **프로필 사진** (`profile_image`) | 선택 동의 ← **이것도 반드시 설정** |
| 카카오계정(이메일) (`account_email`) | **설정하지 않음** (개인 개발자 앱에서는 못 씁니다 — 비즈앱 전환 필요) |

이메일을 설정하지 않았으므로, 아래 2번에서 **"Allow users without an email"** 을 꼭 켜야 합니다.

## 2. Supabase에 카카오 연결 (약 2분)

1. https://supabase.com/dashboard/project/fnqmizlykcmuigyldzre/auth/providers → **Kakao**
   - **Enabled** 켜기
   - Client ID: 1-2의 **REST API 키**
   - Client Secret: 1-4의 **Client Secret**
   - ⚠️ **Allow users without an email** 을 **켜기**
     (이메일 동의항목을 안 썼기 때문에, 이걸 안 켜면 로그인 후 계정 생성이 실패합니다)
   - **Save**
2. https://supabase.com/dashboard/project/fnqmizlykcmuigyldzre/auth/url-configuration
   - **Site URL**: `https://ubwoo4175.github.io/brain-games/`
   - **Redirect URLs** 에 추가: `https://ubwoo4175.github.io/brain-games/**`
     (로컬 테스트도 하려면 `http://localhost:5173/**` 도 추가)

끝나면 폰에서 앱 → 설정 → "카카오로 로그인" 을 눌러 확인하세요.

## 로그인이 안 될 때

| 증상 | 원인과 해결 |
|---|---|
| **KOE205** "서비스 설정에 오류가 있어..." | 동의항목 미설정. 위 1-5 표대로 **닉네임 + 프로필 사진**을 설정하세요. 이메일은 설정하지 말고, Supabase 에서 "Allow users without an email" 을 켭니다. |
| **KOE006** "등록되지 않은 Redirect URI" | 카카오 콘솔의 Redirect URI 가 `https://fnqmizlykcmuigyldzre.supabase.co/auth/v1/callback` 과 정확히 같은지 확인 |
| 로그인 후 앱으로 안 돌아옴 | Supabase **URL Configuration** 의 Site URL / Redirect URLs 확인 |
| 버튼을 눌러도 카카오 화면이 안 뜸 (400) | Supabase Kakao provider 가 아직 Enabled 가 아니거나 Client ID/Secret 이 비어 있음 |

문제가 계속되면 [Auth 로그](https://supabase.com/dashboard/project/fnqmizlykcmuigyldzre/logs/auth-logs)에서
`/auth/v1/authorize` 요청이 **302**(정상 — 카카오로 넘어감)인지 **400**(Supabase 설정 문제)인지 볼 수 있습니다.

## 동작 방식

- **로그인 전**: 지금과 100% 동일 (익명, 이 기기에만 저장)
- **첫 로그인 때**: 이 기기에 쌓인 익명 기록·레벨·설정을 계정으로 자동 병합
- **로그인 후**: 게임은 여전히 로컬에 먼저 저장 → 뒤에서 서버로 올림
  (오프라인에서도 게임 가능, 온라인 되면 밀린 것 자동 전송)
- **다른 폰**에서 같은 카카오 계정으로 로그인하면 기록이 그대로 내려옵니다
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
