# Supabase + 카카오 로그인 설정 (한 번만 하면 됩니다)

코드는 이미 준비되어 있습니다. 아래 1~5를 순서대로 하고, 마지막에 나온 값 2개를 GitHub에 넣으면 끝입니다.
값을 넣기 전까지 앱은 지금처럼 로컬 전용으로 동작하니, 중간에 멈춰도 아무 문제 없습니다.

## 1. Supabase 프로젝트 만들기 (약 3분)

1. https://supabase.com/dashboard → **New project**
2. Name: `brain-games` (자유), Region: **Northeast Asia (Seoul)**, DB 비밀번호는 아무거나 만들어 보관
3. 생성 후 **Project Settings → API** 에서 두 값을 복사해 둡니다:
   - **Project URL** (예: `https://abcd1234.supabase.co`)
   - **anon public** key (긴 문자열. 공개되어도 되는 키입니다)

## 2. 테이블 만들기 (약 1분)

1. 왼쪽 메뉴 **SQL Editor** → **New query**
2. 이 저장소의 [`supabase/schema.sql`](../supabase/schema.sql) 내용 전체를 붙여넣고 **Run**
3. "Success" 가 나오면 완료 (Table Editor 에 profiles / game_settings / sessions / app_settings 4개가 보입니다)

## 3. 카카오 개발자 앱 만들기 (약 5분)

1. https://developers.kakao.com → 카카오 계정 로그인 → **내 애플리케이션 → 애플리케이션 추가하기**
   - 앱 이름: `오늘의 두뇌운동`, 회사명: 자유
2. 만든 앱 → **앱 설정 > 앱 키** 에서 **REST API 키** 복사해 두기
3. **제품 설정 > 카카오 로그인** → 활성화 **ON**
   - **Redirect URI 등록**: `https://<1번의 Project URL 호스트>/auth/v1/callback`
     (예: `https://abcd1234.supabase.co/auth/v1/callback`)
4. **제품 설정 > 카카오 로그인 > 보안** → **Client Secret** 발급 → 코드 복사, 상태 **사용함**
5. **제품 설정 > 카카오 로그인 > 동의항목** → **닉네임** 을 "필수 동의"로 설정
   (이메일은 필요 없습니다 — 앱이 수집하지 않아요)

## 4. Supabase에 카카오 연결 (약 1분)

1. Supabase 대시보드 → **Authentication → Sign In / Providers** → **Kakao**
2. **Enabled** 켜고:
   - Client ID: 3-2의 **REST API 키**
   - Client Secret: 3-4의 **Client Secret**
3. **Authentication → URL Configuration**:
   - Site URL: `https://ubwoo4175.github.io/brain-games/`
   - Redirect URLs 에 추가: `https://ubwoo4175.github.io/brain-games/**`
     (로컬 테스트도 하려면 `http://localhost:5173/**` 도 추가)

## 5. GitHub에 값 2개 넣고 재배포 (약 2분)

1. GitHub 저장소 → **Settings → Secrets and variables → Actions → Variables 탭 → New repository variable**
   - `VITE_SUPABASE_URL` = 1번의 Project URL
   - `VITE_SUPABASE_ANON_KEY` = 1번의 anon public key
2. **Actions 탭 → Deploy to GitHub Pages → Run workflow** (또는 아무 커밋이나 push)
3. 배포가 끝나면 앱 **설정 화면에 "계정" 카드**가 생기고, "카카오로 로그인" 버튼이 보입니다

## 동작 방식 (참고)

- 로그인 전: 지금과 100% 동일 (익명, 이 기기에만 저장)
- **첫 로그인 때**: 이 기기에 쌓인 익명 기록·레벨·설정을 계정으로 자동 병합
- 로그인 후: 게임은 여전히 로컬에 먼저 저장 → 뒤에서 서버로 올림 (오프라인이어도 게임 가능, 온라인 되면 자동 전송)
- 다른 폰에서 같은 카카오 계정으로 로그인하면 기록이 그대로 내려옵니다
- 설정의 "모든 기록 지우기"는 서버 기록도 함께 지웁니다

## 로컬에서 테스트하려면

프로젝트 루트에 `.env.local` 파일 (git에 안 올라감):

```
VITE_SUPABASE_URL=https://abcd1234.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

`npm run dev` 후 설정 화면에서 로그인해 보면 됩니다.
