# 매일 알림 (푸시 알림)

매일 **오후 2시**, 그날 아직 게임을 안 하셨을 때만 폰으로 알림이 갑니다.
이미 하신 날은 보내지 않습니다 (잔소리처럼 느껴지지 않게).

## ✅ 서버 쪽은 모두 준비 완료

- `push_subscriptions` 테이블 (기기별 구독, RLS 로 본인 것만)
- `app_secrets` 테이블 — VAPID 개인키·cron 시크릿 (RLS 켜고 정책 없음 = 서버만 접근)
- Edge Function `daily-reminder` — 실제 호출해서 200 응답 확인 완료
- `pg_cron` 스케줄 `0 5 * * *` (UTC 05:00 = 한국시간 오후 2시)

메시지는 쉬신 기간에 따라 달라집니다:

| 마지막 플레이 | 문구 |
|---|---|
| 어제 | "어제 하신 김에 오늘도 이어가 볼까요? 🔥" |
| 2~3일 전 | "○일 만이에요. 오늘 한 판 하고 가세요 🙂" |
| 4일 이상 | "오랜만이에요! 쉬운 것 하나만 해볼까요? 😊" |

## 어머니 폰에서 할 일 (한 번만)

1. **구글 로그인** — 알림은 로그인한 계정에 연결되므로 먼저 로그인해야 합니다
   (아직 카카오 설정 전이면 `docs/SUPABASE_SETUP.md` 먼저)
2. 앱 → **설정 → 알림 → "매일 알림 받기"** 켜기
3. 크롬이 "알림을 보내도 될까요?" 물으면 **허용**
4. **"🔔 알림 한 번 보내보기"** 를 눌러 실제로 오는지 확인

> 홈 화면에 추가한 앱(PWA)으로 열어야 알림이 가장 잘 옵니다.
> 폰 설정에서 알림을 막아두면 앱에서 켤 수 없고, 그 경우 앱이 안내 문구를 보여줍니다.

## 끄고 싶으면

설정 → 알림 → 토글을 끄면 됩니다 (이 기기의 구독이 서버에서도 삭제됩니다).

## 기술 메모

- **Web Push 표준**(RFC 8291 aes128gcm + RFC 8292 VAPID)을 외부 라이브러리 없이 Web Crypto 로 구현
  (`supabase/functions/daily-reminder/webpush.ts`)
- 정확성 검증: `npx tsx scripts/verify-webpush.mjs`
  - 고정 입력에 대한 결정론적 암호문 스냅샷
  - 수신자 개인키로 실제 복호화하는 왕복 검증
  - (최초 작성 시 독립 구현 `http_ece` 로도 복호화되는 것을 교차 확인)
- 서비스 워커는 `src/sw.ts` (vite-plugin-pwa `injectManifest` 모드).
  오프라인 캐시는 그대로 두고 `push`·`notificationclick` 핸들러만 추가했습니다.
- 구독이 만료되면(앱 삭제 등) 발송 시 404/410 이 오고, 그 구독은 서버에서 자동 삭제됩니다.
- 하루에 기기당 한 번만 갑니다 (`last_sent_at` 로 중복 방지).

## 스케줄을 바꾸려면

```sql
-- 예: 오전 9시(KST) = UTC 00:00
select cron.unschedule('daily-reminder');
select cron.schedule('daily-reminder', '0 0 * * *', $$
  select net.http_post(
    url := 'https://fnqmizlykcmuigyldzre.supabase.co/functions/v1/daily-reminder',
    headers := jsonb_build_object('Content-Type','application/json',
      'x-cron-secret', (select value from public.app_secrets where name = 'cron_secret')),
    body := '{}'::jsonb, timeout_milliseconds := 60000);
$$);
```
