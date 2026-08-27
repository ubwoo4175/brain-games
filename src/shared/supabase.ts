import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase 클라이언트 (환경변수가 있을 때만 생성).
 * - VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 가 없으면 null → 앱은 지금처럼 로컬 전용으로 동작.
 * - anon key는 공개되어도 되는 키입니다(권한은 서버의 RLS가 지킴). 배포는 GitHub 저장소
 *   Variables 로 주입합니다 (.github/workflows/deploy.yml, docs/SUPABASE_SETUP.md 참고).
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (!url || !anonKey) return null
  if (!client) {
    client = createClient(url, anonKey, {
      auth: { flowType: 'pkce' }, // 리다이렉트 복귀 시 ?code= 교환 (해시 라우터와 충돌 없음)
    })
  }
  return client
}

export function isCloudConfigured(): boolean {
  return Boolean(url && anonKey)
}
