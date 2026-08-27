import { SupabaseAuth } from './SupabaseAuth'

let instance: SupabaseAuth | null = null

/** 앱 전체가 공유하는 인증 인스턴스. Supabase 미설정 시 내부에서 익명으로 동작. */
export function getAuth(): SupabaseAuth {
  if (!instance) instance = new SupabaseAuth()
  return instance
}

export type { AuthProvider, AuthUser } from './AuthProvider'
