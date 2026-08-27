# 오늘의 두뇌운동

어머니를 위한 치매 예방 두뇌 게임 웹앱. 폰 크롬에서 열고 "홈 화면에 추가"하면 앱처럼 씁니다.

게임 10종: 거꾸로 숫자(기억력) · 지는 가위바위보(순발력) · 빠른 암산(계산력) · 초성 퀴즈(언어력) · 색깔 고르기(주의력) · 카드 짝 맞추기(기억력) · 숫자 순서 터치(처리속도) · 순서 기억(기억력) · 다른 것 찾기(주의력) · 시계 읽기(시공간)

설계 규칙과 게임 추가 방법은 [CLAUDE.md](./CLAUDE.md)에 있습니다. Claude Code가 자동으로 읽습니다.
카카오 로그인으로 기기 간 기록 동기화를 켜려면 [docs/SUPABASE_SETUP.md](./docs/SUPABASE_SETUP.md)를 따라 하세요.

---

## 1. 내 컴퓨터에서 실행하기

필요한 것: [Node.js](https://nodejs.org) LTS(22 이상), [git](https://git-scm.com). 윈도우·맥 둘 다 같은 방법.

```bash
cd brain-games
npm install        # 처음 한 번 (node_modules 설치, 1~2분)
npm run dev        # 개발 서버 → 터미널에 뜨는 http://localhost:5173 을 브라우저로
```

폰에서 바로 보려면 `npm run dev -- --host` 로 켜고, 터미널에 뜨는 `Network: http://192.168.x.x:5173` 주소를 같은 와이파이의 폰 크롬에서 열면 됩니다. (진동·화면 꺼짐 방지 같은 기능은 HTTPS가 아니라 로컬에서는 안 될 수 있음 — 배포하면 됩니다.)

크롬 개발자도구(F12) → 기기 툴바(Ctrl+Shift+M)에서 크기를 **750×830**(폴드 펼침), **385×900**(폴드 커버), **390×844**(일반 폰)로 바꿔가며 확인하세요.

## 2. GitHub에 올리고 자동 배포하기 (처음 한 번)

### 2-1. GitHub에 저장소 만들기

1. https://github.com/new 접속
2. Repository name: `brain-games` (다른 이름도 되지만 그러면 주소가 바뀝니다)
3. **Public** 선택 (무료 계정은 Public이어야 Pages가 됩니다)
4. "Add a README" 등 체크박스는 **모두 체크하지 않고** Create repository

### 2-2. 이 폴더를 저장소에 올리기

터미널(윈도우: PowerShell 또는 Git Bash / 맥: 터미널)에서 이 폴더로 들어가서:

```bash
git init
git add .
git commit -m "첫 커밋: 두뇌운동 1단계"
git branch -M main
git remote add origin https://github.com/<내GitHub아이디>/brain-games.git
git push -u origin main
```

처음 push 할 때 GitHub 로그인 창이 뜹니다. 로그인하면 됩니다.
(Claude Code에게 "GitHub에 올려줘"라고 해도 같은 일을 해줍니다.)

### 2-3. GitHub Pages 켜기

1. GitHub 저장소 페이지 → 상단 **Settings** → 왼쪽 **Pages**
2. **Source** 를 `Deploy from a branch` 에서 **`GitHub Actions`** 로 변경
3. 저장소 상단 **Actions** 탭을 보면 "Deploy to GitHub Pages"가 돌고 있습니다. 2~3분 뒤 초록 체크가 뜨면 완료.
   (첫 push가 Pages 설정 전이었다면 Actions 탭에서 워크플로를 열고 **Run workflow** 를 한 번 눌러주세요.)
4. 주소: `https://<내GitHub아이디>.github.io/brain-games/`

이후로는 `git push` 만 하면 자동으로 다시 배포됩니다.

## 3. 어머니 폰에 설치하기

1. 폰 크롬에서 위 주소 열기
2. 크롬 메뉴(⋮) → **홈 화면에 추가** (또는 "앱 설치")
3. 홈 화면에 "두뇌운동" 아이콘이 생깁니다. 이걸로 열면 주소창 없이 전체 화면으로 실행되고, 인터넷이 잠깐 끊겨도 동작합니다.
4. 새 버전을 배포하면 앱을 다음에 열 때 자동으로 갱신됩니다.

## 4. 두 컴퓨터(윈도우·맥)에서 번갈아 작업하기

코드 폴더는 OneDrive 밖에 두고, GitHub를 동기화 수단으로 씁니다.

- 다른 컴퓨터에서 처음: `git clone https://github.com/<아이디>/brain-games.git` 후 `npm install`
- 작업 시작 전: `git pull`
- 작업 끝: `git add . && git commit -m "무엇을 했는지" && git push`

Claude Code에게 "pull 받아줘", "커밋하고 푸시해줘"라고 하면 됩니다.

## 5. 자주 하는 작업

- 초성 퀴즈 단어 추가: `src/games/chosung-quiz/data/words.ts`에 `{ w: '단어', c: '분류' }` 한 줄
- 암산 난이도 조정: `src/games/quick-math/logic.ts`의 `problemForLevel`
- 가위바위보 제한시간: `src/games/losing-rps/index.ts`의 `TIME_BY_LEVEL`
- 오늘의 한마디 문구: `src/content/sources/quotes.ts`
- 새 게임 추가: CLAUDE.md의 "새 게임 추가하는 법"
- 앱 이름/아이콘: `vite.config.ts`의 manifest, `public/icons/`

## 6. 폴더 구조

```
src/
  app/        화면(홈·게임·기록·설정), 라우터, 앱 상태
  engine/     게임 공통 루프(진행·점수·난이도·피드백)
  games/      게임 플러그인 (폴더 하나 = 게임 하나)
  data/       저장소 (지금은 브라우저 로컬, 나중에 서버)
  auth/       사용자 (지금은 익명, 나중에 카카오)
  content/    홈 하단 카드 (오늘의 한마디 → 나중에 협찬)
  ui/         공통 버튼·숫자패드 등, 테마 CSS
  shared/     난수·이벤트·유틸
```
