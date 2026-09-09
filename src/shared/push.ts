import { getSupabase } from './supabase'

/**
 * 푸시 알림 구독 관리.
 * - 알림은 구글 로그인 상태에서만 켤 수 있습니다 (구독을 서버에 저장해야 하고,
 *   서버는 RLS 로 "본인 것만" 허용하기 때문).
 * - 실제 발송은 Supabase Edge Function(daily-reminder)이 매일 오후 2시에 합니다.
 */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export type PushState = 'unsupported' | 'need-login' | 'denied' | 'off' | 'on'

export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && Boolean(VAPID_PUBLIC_KEY)
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padded = base64.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(base64.length / 4) * 4, '=')
  const raw = atob(padded)
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

const b64u = (buf: ArrayBuffer | null): string =>
  buf ? btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : ''

async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.ready
  return reg.pushManager.getSubscription()
}

/** 지금 상태 (버튼 표시용) */
export async function getPushState(isLoggedIn: boolean): Promise<PushState> {
  if (!isPushSupported()) return 'unsupported'
  if (!isLoggedIn) return 'need-login'
  if (Notification.permission === 'denied') return 'denied'
  const sub = await currentSubscription()
  if (!sub) return 'off'
  // 서버에서 껐을 수도 있으니 DB 상태도 확인
  const sb = getSupabase()
  if (sb) {
    const { data } = await sb.from('push_subscriptions').select('enabled').eq('endpoint', sub.endpoint).maybeSingle()
    if (data && !data.enabled) return 'off'
    if (!data) return 'off'
  }
  return 'on'
}

/** 알림 켜기: 권한 요청 → 구독 → 서버에 저장 */
export async function enablePush(userId: string): Promise<{ ok: boolean; reason?: string }> {
  if (!isPushSupported()) return { ok: false, reason: 'unsupported' }
  const sb = getSupabase()
  if (!sb) return { ok: false, reason: 'no-server' }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return { ok: false, reason: permission }

  const reg = await navigator.serviceWorker.ready
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!) as BufferSource,
    }))

  const { error } = await sb.from('push_subscriptions').upsert(
    {
      endpoint: sub.endpoint,
      user_id: userId,
      p256dh: b64u(sub.getKey('p256dh')),
      auth: b64u(sub.getKey('auth')),
      enabled: true,
    },
    { onConflict: 'endpoint' },
  )
  if (error) return { ok: false, reason: error.message }
  return { ok: true }
}

/** 알림 끄기: 이 기기 구독 해제 + 서버에서 삭제 */
export async function disablePush(): Promise<void> {
  const sub = await currentSubscription()
  if (!sub) return
  const sb = getSupabase()
  if (sb) await sb.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe().catch(() => {})
}

/** 지금 이 기기로 테스트 알림 한 번 (설정 화면 확인용) */
export async function sendTestPush(): Promise<{ ok: boolean; reason?: string }> {
  const sb = getSupabase()
  if (!sb) return { ok: false, reason: 'no-server' }
  const { data } = await sb.auth.getSession()
  const token = data.session?.access_token
  if (!token) return { ok: false, reason: 'need-login' }

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/daily-reminder`
  try {
    const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    const body = (await res.json()) as { sent?: number; error?: string }
    if (!res.ok || !body.sent) return { ok: false, reason: body.error ?? '전송 실패' }
    return { ok: true }
  } catch (e) {
    return { ok: false, reason: String(e) }
  }
}
