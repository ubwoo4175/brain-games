/**
 * 매일 알림 — 오늘(한국시간) 아직 게임을 안 한 사람에게 푸시를 보냅니다.
 *
 * 호출 방법
 *   - cron (pg_cron → pg_net): 헤더 `x-cron-secret` 에 app_secrets.cron_secret
 *   - 테스트 발송: 로그인한 사용자가 `Authorization: Bearer <access_token>` 으로 호출하면
 *     본인 기기에만 즉시 한 번 보냅니다 (설정 화면의 "테스트 알림" 버튼).
 *
 * VAPID 키·cron 시크릿은 코드가 아니라 DB(app_secrets, service_role 만 접근)에서 읽습니다.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { sendPush, type PushSubscriptionRow } from './webpush.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

async function getSecrets() {
  const { data, error } = await admin.from('app_secrets').select('name, value')
  if (error) throw new Error('시크릿을 읽지 못했습니다: ' + error.message)
  return Object.fromEntries((data ?? []).map((r) => [r.name, r.value])) as Record<string, string>
}

/** 며칠 쉬었는지에 따라 문구를 고릅니다 (고령자 대상 — 재촉하지 않고 반갑게) */
function messageFor(daysSince: number | null): { title: string; body: string } {
  if (daysSince === null) return { title: '오늘의 두뇌운동', body: '가볍게 한 판 어떠세요? 5분이면 충분해요 🌱' }
  if (daysSince <= 1) return { title: '오늘의 두뇌운동', body: '어제 하신 김에 오늘도 이어가 볼까요? 🔥' }
  if (daysSince <= 3) return { title: '오늘의 두뇌운동', body: `${daysSince}일 만이에요. 오늘 한 판 하고 가세요 🙂` }
  return { title: '오늘의 두뇌운동', body: '오랜만이에요! 쉬운 것 하나만 해볼까요? 😊' }
}

interface Target {
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  days_since: number | null
}

/** 알림을 켰고, 오늘(KST) 아직 안 한 사용자들의 구독 */
async function findTargets(onlyUserId?: string): Promise<Target[]> {
  const { data, error } = await admin.rpc('reminder_targets', { p_user_id: onlyUserId ?? null })
  if (error) throw new Error('대상 조회 실패: ' + error.message)
  return (data ?? []) as Target[]
}

async function deliver(targets: Target[], secrets: Record<string, string>) {
  const vapid = { publicKey: secrets.vapid_public, privateKey: secrets.vapid_private, subject: secrets.vapid_subject }
  let sent = 0
  const removed: string[] = []
  const failed: { endpoint: string; status: number; body?: string }[] = []

  for (const t of targets) {
    const msg = messageFor(t.days_since)
    const sub: PushSubscriptionRow = { endpoint: t.endpoint, p256dh: t.p256dh, auth: t.auth }
    try {
      const res = await sendPush(sub, JSON.stringify({ ...msg, tag: 'daily-reminder' }), vapid)
      if (res.ok) {
        sent++
        await admin.from('push_subscriptions').update({ last_sent_at: new Date().toISOString() }).eq('endpoint', t.endpoint)
      } else if (res.gone) {
        // 앱을 지웠거나 구독이 만료됨 → 정리
        await admin.from('push_subscriptions').delete().eq('endpoint', t.endpoint)
        removed.push(t.endpoint)
      } else {
        failed.push({ endpoint: t.endpoint.slice(0, 40) + '…', status: res.status, body: res.body?.slice(0, 200) })
      }
    } catch (e) {
      failed.push({ endpoint: t.endpoint.slice(0, 40) + '…', status: 0, body: String(e).slice(0, 200) })
    }
  }
  return { targets: targets.length, sent, removed: removed.length, failed }
}

Deno.serve(async (req) => {
  try {
    const secrets = await getSecrets()
    const cronSecret = req.headers.get('x-cron-secret')

    // 1) cron 호출 — 전체 대상에게
    if (cronSecret) {
      if (cronSecret !== secrets.cron_secret) return json({ error: 'forbidden' }, 403)
      const result = await deliver(await findTargets(), secrets)
      return json({ mode: 'cron', ...result })
    }

    // 2) 사용자 테스트 발송 — 본인 기기에만
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (!token) return json({ error: 'unauthorized' }, 401)
    const { data: userData, error: userErr } = await admin.auth.getUser(token)
    if (userErr || !userData.user) return json({ error: 'unauthorized' }, 401)

    const { data: subs, error } = await admin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userData.user.id)
      .eq('enabled', true)
    if (error) return json({ error: error.message }, 500)
    if (!subs?.length) return json({ error: 'no_subscription' }, 404)

    const targets: Target[] = subs.map((s) => ({ ...s, user_id: userData.user!.id, days_since: null }))
    const vapid = { publicKey: secrets.vapid_public, privateKey: secrets.vapid_private, subject: secrets.vapid_subject }
    let sent = 0
    const failed: unknown[] = []
    for (const t of targets) {
      const res = await sendPush(t, JSON.stringify({ title: '알림 테스트', body: '이렇게 알려드릴게요 🔔', tag: 'test' }), vapid)
      if (res.ok) sent++
      else failed.push({ status: res.status, body: res.body?.slice(0, 200) })
    }
    return json({ mode: 'test', sent, failed })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
