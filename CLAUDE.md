# 오늘의 두뇌운동 (brain-games) — 프로젝트 규칙

고령자(제작자의 어머니)를 위한 치매 예방 두뇌 게임 웹앱. 갤럭시 폴드7 크롬에서 PWA로 사용.
이 파일은 Claude Code가 작업할 때마다 읽는 설계 규칙입니다. 규칙을 바꿀 땐 이 파일도 같이 고치세요.

## 기술 스택

- Vite + React 19 + TypeScript (strict, `erasableSyntaxOnly` → enum/파라미터 프로퍼티 사용 금지, `as const` 객체 사용)
- 순수 CSS (CSS 변수, rem 단위). Tailwind 등 CSS 프레임워크 없음.
- 상태관리 라이브러리 없음. React context(`AppContext`) + 훅.
- 라우팅: 해시 라우터 자체 구현 (`src/app/router.ts`). react-router 쓰지 않음.
- PWA: vite-plugin-pwa (autoUpdate)
- 배포: GitHub Pages (GitHub Actions, `.github/workflows/deploy.yml`). `BASE_PATH` 환경변수로 저장소 경로 주입.
- 명령: `npm run dev` / `npm run build` (tsc + vite) / `npm test` (vitest, 순수 로직 테스트 `src/__tests__/`) / `npm run lint` (oxlint) / `npm run preview`

## 아키텍처 — 3층 구조

```
src/
  app/        셸: 라우터, AppContext(사용자·설정·레벨), 화면(Home/Game/Stats/Settings)
  engine/     공통 게임 루프: useSession, 적응 난이도, 점수, 피드백(소리·진동), GameDefinition 타입
  games/      ★ 게임 플러그인. 게임 하나 = 폴더 하나. games/index.ts 에 등록.
  data/       StorageAdapter 인터페이스 + LocalStorageAdapter. 데이터 모델(types.ts)
  auth/       AuthProvider 인터페이스 + AnonymousAuth
  content/    콘텐츠 슬롯(인터스티셜). 오늘의 한마디 → 나중에 협찬 카드/광고 회상 문제
  ui/         공통 컴포넌트(BigButton, NumPad, TopBar, ProgressBar, FeedbackOverlay), theme.css
  shared/     rng(시드 난수), track(이벤트), uuid, format
```

핵심 원칙: **게임은 플러그인, 나머지는 공통.** 게임 폴더는 셸/엔진/데이터 층을 직접 건드리지 않는다.

## 새 게임 추가하는 법

1. `src/games/<game-id>/` 폴더 생성. 파일: `types.ts`(Round 타입), `logic.ts`(문제 생성, 순수 함수), `RoundView.tsx`(문제 화면), `style.css`, `index.ts`(GameDefinition 객체).
2. `GameDefinition<Round>` 구현 (`src/engine/types.ts` 참고):
   - `id`: 영문 소문자-하이픈. **저장 키로 쓰이므로 한 번 정하면 절대 바꾸지 않는다.**
   - `makeRound(level, rng, ctx)`: **순수 함수. 난수는 반드시 `rng`만 사용** (Math.random 금지). `ctx.previous`로 직전 문제를 받아 중복 방지 등에 사용.
   - `RoundView`: 문제 하나만 담당. `onAnswer({correct, timedOut?, answer?})`를 **한 문제에 정확히 한 번** 호출. 점수·진행·피드백·저장은 엔진이 한다.
   - `mode`: `{kind:'rounds', count}` 또는 `{kind:'timed', seconds}`.
   - `minLevel/maxLevel/defaultLevel`, `levelLabel(level)`: 레벨을 사람 말로 ("숫자 5개").
   - `adaptive`(선택): 연속 정답 `upAfter`회 → 레벨+1, 연속 오답 `downAfter`회 → 레벨-1. 기본 3/2.
3. `src/games/index.ts`의 `GAMES` 배열에 추가. 홈 카드·통계·설정이 자동 생성됨.
4. `npm run build`로 타입 검사 통과 확인.

## 고령자 UX 규칙 (모든 화면 공통)

- 글자 최소 1rem(≈20px), 문제/선택지는 1.2rem 이상. 버튼 최소 높이 `var(--tap)`(≈68px).
- 한 화면에 선택지 4개 이하. 설명은 1~2문장, 쉬운 말. 존댓말("~해요", "~주세요").
- 정답/오답은 색 + 소리 + 진동 동시 피드백 (`engine/feedback.ts`). 오답은 정답보다 길게 보여준다.
- 확대/축소·더블탭 확대·당겨서 새로고침 금지 (index.html viewport, body의 touch-action/overscroll). 게임 중 화면 꺼짐 방지(Wake Lock).
- 게임 중 뒤로 가기는 즉시 홈 (확인창 없음). 실수로 종료해도 잃는 건 그 판뿐.
- 작은 글씨 링크, 스와이프 제스처, 롱프레스, 드래그는 쓰지 않는다. 탭만으로 모든 조작.
- `window.alert/confirm` 사용 금지 — 인앱 2단계 확인 버튼으로 (SettingsScreen 참고).

## 레이아웃 규칙 (일반 폰 + 폴드)

- 모든 크기는 **rem**. `html { font-size }`만 화면 폭에 따라 바뀜: <600px → 20px, ≥600px(폴드 펼침) → 24px. 설정 "글자 크게"는 `html[data-text-size='large']`로 ×1.15.
- 화면은 `.stage`(최대 폭 `--stage-max` 34rem, 가운데 정렬, `min-height: 100dvh`) 안에 그린다. 게임 코드는 뷰포트 크기를 JS로 계산하지 않는다 — 폴드를 접고 펼쳐도 CSS만으로 재배치되어야 한다.
- 주 타깃은 **폴드7 펼친 화면(CSS 약 750×830, 정사각형에 가까움)**. 커버 화면(약 385×900)과 일반 폰(390×844)도 깨지지 않아야 한다.
- 검증 뷰포트 3종: fold-open 750×830 / fold-cover 385×900 / phone 390×844. 화면을 바꾸면 세 가지 모두 확인.
- 홈 게임 카드는 ≥600px에서 2열.

## 데이터 규칙

- 화면/게임 코드는 `getStorage()`가 주는 `StorageAdapter` 인터페이스만 사용. `localStorage` 직접 접근 금지 (auth/*, data/LocalStorageAdapter, data/SupabaseSyncAdapter 내부 제외).
- 저장 구조는 **로컬 우선 + 백그라운드 동기화**: 읽기/쓰기는 항상 로컬(오프라인 보장), 카카오 로그인 상태면 쓰기를 Supabase에 upsert(실패분은 큐 재시도), 앱 시작 시 `syncDown`으로 병합. Supabase 환경변수(`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`)가 없으면 로컬 전용으로 동작. 설정법: `docs/SUPABASE_SETUP.md`, 스키마: `supabase/schema.sql` (모델 바꾸면 이 파일도 같이).
- 모든 기록에 `userId`가 붙는다. 지금은 익명 UUID. 나중에 카카오 로그인 시 익명 기록을 계정으로 병합한다는 전제.
- 저장 키 prefix `bg:v1`. 모델을 호환 안 되게 바꾸면 `v2`로 올리고 마이그레이션을 쓴다.
- 데이터 모델은 `src/data/types.ts`가 유일한 정의. 서버(Supabase) 테이블도 이 모델을 그대로 옮긴다.

## 로드맵 (설계 시 합의)

1. ✅ 1단계: 4개 게임(거꾸로 숫자·지는 가위바위보·빠른 암산·초성 퀴즈) + 로컬 저장 + 적응 난이도 + PWA + GitHub Pages
2. 2단계: 통계 강화(주간 그래프), 소리·진동 다듬기. 게임 추가는 완료 ✅ (스트룹 · 카드 짝 맞추기 · 숫자 순서 터치 · 사이먼 · 다른 것 찾기 · 시계 읽기). 남은 후보: 오늘의 지남력 체크(날짜·요일 출석 확인, 게임보다는 홈/콘텐츠 슬롯 성격)
3. 3단계: Supabase + 카카오 로그인 — 코드 완료 ✅ (`SupabaseSyncAdapter`, `SupabaseAuth`, 익명 기록 병합). 서버 쪽 설정은 `docs/SUPABASE_SETUP.md` 절차 필요
4. 4단계: 콘텐츠 슬롯에 협찬 카드 + 회상 문제(광고 회상률 모델), 필요 시 Capacitor/TWA로 앱 출시

## 작업 습관

- 기능을 바꾸면 `npm run build`와 `npm test`가 통과해야 하고, 화면을 바꾸면 3종 뷰포트에서 확인한다.
- 커밋 메시지는 한국어로 짧게 ("초성 퀴즈 문제 30개 추가").
- 커밋 후 push하면 GitHub Actions가 자동 배포한다 (2~3분). 어머니 폰의 PWA는 다음 실행 때 자동 갱신.
- 윈도우/맥 두 컴퓨터에서 작업하므로, 작업 시작 전 `git pull`, 끝나면 `git push`.
