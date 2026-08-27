-- 오늘의 두뇌운동 — Supabase 스키마 (src/data/types.ts 를 그대로 옮긴 것)
-- 사용법: Supabase 대시보드 → SQL Editor → 이 파일 전체를 붙여넣고 Run.
-- 여러 번 실행해도 안전합니다 (if not exists / drop policy if exists).

-- 사용자 프로필
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  nickname   text not null default '',
  created_at timestamptz not null default now()
);

-- 게임별 난이도 레벨
create table if not exists public.game_settings (
  user_id    uuid not null references auth.users (id) on delete cascade,
  game_id    text not null,
  level      int  not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

-- 게임 한 판의 기록
create table if not exists public.sessions (
  id          uuid primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  game_id     text not null,
  started_at  timestamptz not null,
  duration_ms int not null,
  level_start int not null,
  level_end   int not null,
  correct     int not null,
  total       int not null,
  points      int not null,
  details     jsonb not null default '{}'::jsonb
);
create index if not exists sessions_user_game_idx on public.sessions (user_id, game_id, started_at desc);

-- 앱 설정 (소리·진동·글자 크기)
create table if not exists public.app_settings (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  settings   jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- RLS: 각자 자기 데이터만 읽고 쓸 수 있게
alter table public.profiles      enable row level security;
alter table public.game_settings enable row level security;
alter table public.sessions      enable row level security;
alter table public.app_settings  enable row level security;

drop policy if exists "own profiles"      on public.profiles;
drop policy if exists "own game_settings" on public.game_settings;
drop policy if exists "own sessions"      on public.sessions;
drop policy if exists "own app_settings"  on public.app_settings;

create policy "own profiles"      on public.profiles      for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own game_settings" on public.game_settings for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own sessions"      on public.sessions      for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own app_settings"  on public.app_settings  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
